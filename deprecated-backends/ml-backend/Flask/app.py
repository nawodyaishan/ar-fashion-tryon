import os
import numpy as np
import cv2
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import base64
from io import BytesIO
from PIL import Image
import uuid

# Helper function to ensure JSON serialization
def ensure_json_serializable(obj):
    """Convert numpy types to Python native types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: ensure_json_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [ensure_json_serializable(item) for item in obj]
    else:
        return obj

# Try to import TensorFlow with error handling
try:
    from tensorflow.keras.models import load_model
    from tensorflow.keras.preprocessing import image
    TENSORFLOW_AVAILABLE = True
except ImportError:
    print("Warning: TensorFlow not found. Model loading will be disabled.")
    TENSORFLOW_AVAILABLE = False

app = Flask(__name__)

# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['PROCESSED_FOLDER'] = 'processed'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload and processed folders exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['PROCESSED_FOLDER'], exist_ok=True)

# Allowed extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'tiff'}

class TShirtProcessor:
    def __init__(self):
        self.model_loaded = False
        self.model = None
        self.error_message = ""
        
        if not TENSORFLOW_AVAILABLE:
            self.error_message = "TensorFlow is not available. Please install it using: pip install tensorflow"
            print(f"Error: {self.error_message}")
            return
            
        # Check if model file exists
        if not os.path.exists('tshirt_model.h5'):
            self.error_message = "tshirt_model.h5 file not found in project directory"
            print(f"Error: {self.error_message}")
            return
            
        try:
            print("Attempting to load tshirt_model.h5...")
            
            # Try different loading methods for compatibility
            try:
                # Method 1: Standard loading
                self.model = load_model('tshirt_model.h5')
            except Exception as e1:
                print(f"Standard loading failed: {e1}")
                try:
                    # Method 2: Loading with custom objects
                    self.model = load_model('tshirt_model.h5', compile=False)
                    print("Loaded model without compilation")
                except Exception as e2:
                    print(f"Loading without compilation failed: {e2}")
                    try:
                        # Method 3: Try loading with safe mode
                        import tensorflow as tf
                        self.model = tf.keras.models.load_model('tshirt_model.h5', safe_mode=False)
                        print("Loaded model with safe_mode=False")
                    except Exception as e3:
                        print(f"Safe mode loading failed: {e3}")
                        raise e1  # Raise the original error
            
            self.model_loaded = True
            print("✅ T-shirt detection model loaded successfully")
            
        except Exception as e:
            self.error_message = f"Model compatibility issue: {str(e)}"
            print(f"❌ Error loading model: {e}")
            print("\nPossible solutions:")
            print("1. Update TensorFlow: pip install --upgrade tensorflow")
            print("2. Try TensorFlow 2.15+: pip install tensorflow==2.15.0")
            print("3. Re-train the model with current TensorFlow version")
    
    def get_error_message(self):
        return self.error_message
    
    def allowed_file(self, filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    
    def preprocess_image_for_model(self, img_path, target_size=(150, 150)):
        """Preprocess image for t-shirt detection model"""
        if not TENSORFLOW_AVAILABLE:
            return None
            
        img = image.load_img(img_path, target_size=target_size)
        img_array = image.img_to_array(img)
        img_array = img_array / 255.0  # Rescale to match training
        return np.expand_dims(img_array, axis=0)
    
    def predict_tshirt(self, img_path):
        """Predict if image contains a t-shirt"""
        if not self.model_loaded:
            return False, 0.0
        
        img_tensor = self.preprocess_image_for_model(img_path)
        prediction = self.model.predict(img_tensor)[0][0]
        
        is_tshirt = prediction > 0.5
        confidence = prediction if prediction > 0.5 else 1 - prediction
        
        # Convert numpy float32 to Python float for JSON serialization
        return bool(is_tshirt), float(confidence)
    
    def remove_background_threshold(self, img_path):
        """Remove background using automatic threshold detection for e-commerce images"""
        img = cv2.imread(img_path)
        if img is None:
            raise Exception("Could not load image")
        
        height, width = img.shape[:2]
        
        # Convert to different color spaces for better background detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Method 1: Detect white/light background (common in e-commerce)
        white_mask = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                          cv2.THRESH_BINARY_INV, 15, 10)
        
        # Method 2: Use edge detection to find garment boundaries
        edges = cv2.Canny(gray, 50, 150)
        
        # Method 3: Use color-based segmentation
        corner_samples = [
            img[0:20, 0:20],  # Top-left
            img[0:20, width-20:width],  # Top-right
            img[height-20:height, 0:20],  # Bottom-left
            img[height-20:height, width-20:width]  # Bottom-right
        ]
        
        # Calculate average background color from corners
        bg_color = np.mean([np.mean(sample.reshape(-1, 3), axis=0) for sample in corner_samples], axis=0)
        
        # Create mask based on color similarity to background
        color_diff = np.sqrt(np.sum((img - bg_color) ** 2, axis=2))
        color_threshold = np.mean(color_diff) + np.std(color_diff) * 0.5
        color_mask = (color_diff > color_threshold).astype(np.uint8) * 255
        
        # Combine masks
        combined_mask = cv2.bitwise_or(white_mask, color_mask)
        
        # Apply morphological operations to clean up
        kernel = np.ones((3, 3), np.uint8)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel, iterations=1)
        
        # Remove small noise and keep only the largest contour (main garment)
        contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Keep only the largest contour (main garment)
            largest_contour = max(contours, key=cv2.contourArea)
            
            # Create clean mask from largest contour
            final_mask = np.zeros_like(combined_mask)
            cv2.fillPoly(final_mask, [largest_contour], 255)
            
            # Smooth the edges
            final_mask = cv2.GaussianBlur(final_mask, (3, 3), 0)
            
            # Additional morphological operations for smoother edges
            kernel = np.ones((2, 2), np.uint8)
            final_mask = cv2.morphologyEx(final_mask, cv2.MORPH_CLOSE, kernel)
        else:
            final_mask = combined_mask
        
        # Create alpha channel
        alpha = final_mask
        
        # Convert to 4-channel image
        b, g, r = cv2.split(img)
        img_with_alpha = cv2.merge([b, g, r, alpha])
        
        return img_with_alpha
    
    def process_image(self, input_path):
        """Main processing function"""
        try:
            # Step 1: Check if image contains a t-shirt
            is_tshirt, confidence = self.predict_tshirt(input_path)
            
            # Ensure values are JSON serializable
            is_tshirt = bool(is_tshirt)
            confidence = float(confidence)
            
            if not is_tshirt:
                return {
                    'success': False,
                    'error': 'No t-shirt detected in image',
                    'confidence': confidence * 100,
                    'processed_image': None
                }
            
            # Step 2: Remove background
            processed_img = self.remove_background_threshold(input_path)
            
            # Save processed image
            unique_id = str(uuid.uuid4())
            output_filename = f"processed_{unique_id}.png"
            output_path = os.path.join(app.config['PROCESSED_FOLDER'], output_filename)
            cv2.imwrite(output_path, processed_img)
            
            return {
                'success': True,
                'confidence': confidence * 100,
                'processed_image': output_filename,
                'output_path': output_path
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'confidence': 0.0,
                'processed_image': None
            }

# Initialize processor
processor = TShirtProcessor()

@app.route('/')
def index():
    return render_template('index.html', 
                         model_loaded=processor.model_loaded,
                         error_message=processor.get_error_message())

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'})
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'})
        
        if not processor.allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Invalid file type. Please upload an image file.'})
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        unique_id = str(uuid.uuid4())
        filename = f"{unique_id}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Process the image
        result = processor.process_image(file_path)
        
        # Ensure all values are JSON serializable
        result = ensure_json_serializable(result)
        
        # Convert original image to base64 for display
        with open(file_path, 'rb') as img_file:
            original_img_b64 = base64.b64encode(img_file.read()).decode('utf-8')
        
        result['original_image'] = f"data:image/jpeg;base64,{original_img_b64}"
        
        if result['success']:
            # Convert processed image to base64 for display
            with open(result['output_path'], 'rb') as img_file:
                processed_img_b64 = base64.b64encode(img_file.read()).decode('utf-8')
            result['processed_image_b64'] = f"data:image/png;base64,{processed_img_b64}"
        
        # Clean up uploaded file
        os.remove(file_path)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Server error: {str(e)}'})

@app.route('/download/<filename>')
def download_file(filename):
    try:
        file_path = os.path.join(app.config['PROCESSED_FOLDER'], filename)
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True, download_name=f"tshirt_extracted_{filename}")
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({'success': False, 'error': 'File too large. Maximum size is 16MB.'}), 413

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)