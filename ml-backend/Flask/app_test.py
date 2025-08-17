import os
import numpy as np
import cv2
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import base64
from io import BytesIO
from PIL import Image
import uuid

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['PROCESSED_FOLDER'] = 'processed'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['PROCESSED_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'tiff'}

class TShirtProcessor:
    def __init__(self):
        # For testing - assume model is loaded
        self.model_loaded = True
        self.error_message = ""
    
    def allowed_file(self, filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    
    def predict_tshirt(self, img_path):
        """Mock prediction - always return True for testing"""
        return True, 0.95  # 95% confidence
    
    def remove_background_threshold(self, img_path):
        """Your existing background removal code"""
        img = cv2.imread(img_path)
        if img is None:
            raise Exception("Could not load image")
        
        height, width = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        white_mask = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                          cv2.THRESH_BINARY_INV, 15, 10)
        
        corner_samples = [
            img[0:20, 0:20],
            img[0:20, width-20:width],
            img[height-20:height, 0:20],
            img[height-20:height, width-20:width]
        ]
        
        bg_color = np.mean([np.mean(sample.reshape(-1, 3), axis=0) for sample in corner_samples], axis=0)
        color_diff = np.sqrt(np.sum((img - bg_color) ** 2, axis=2))
        color_threshold = np.mean(color_diff) + np.std(color_diff) * 0.5
        color_mask = (color_diff > color_threshold).astype(np.uint8) * 255
        
        combined_mask = cv2.bitwise_or(white_mask, color_mask)
        
        kernel = np.ones((3, 3), np.uint8)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel, iterations=1)
        
        contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            final_mask = np.zeros_like(combined_mask)
            cv2.fillPoly(final_mask, [largest_contour], 255)
            final_mask = cv2.GaussianBlur(final_mask, (3, 3), 0)
            kernel = np.ones((2, 2), np.uint8)
            final_mask = cv2.morphologyEx(final_mask, cv2.MORPH_CLOSE, kernel)
        else:
            final_mask = combined_mask
        
        alpha = final_mask
        b, g, r = cv2.split(img)
        img_with_alpha = cv2.merge([b, g, r, alpha])
        
        return img_with_alpha
    
    def process_image(self, input_path):
        """Process image without model checking"""
        try:
            # Skip t-shirt detection for testing
            is_tshirt, confidence = self.predict_tshirt(input_path)
            
            processed_img = self.remove_background_threshold(input_path)
            
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
                'confidence': 0,
                'processed_image': None
            }
    
    def get_error_message(self):
        return self.error_message

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
        
        filename = secure_filename(file.filename)
        unique_id = str(uuid.uuid4())
        filename = f"{unique_id}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        result = processor.process_image(file_path)
        
        with open(file_path, 'rb') as img_file:
            original_img_b64 = base64.b64encode(img_file.read()).decode('utf-8')
        
        result['original_image'] = f"data:image/jpeg;base64,{original_img_b64}"
        
        if result['success']:
            with open(result['output_path'], 'rb') as img_file:
                processed_img_b64 = base64.b64encode(img_file.read()).decode('utf-8')
            result['processed_image_b64'] = f"data:image/png;base64,{processed_img_b64}"
        
        os.remove(file_path)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Server error: {str(e)}'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)