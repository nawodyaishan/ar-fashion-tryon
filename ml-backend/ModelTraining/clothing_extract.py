import os
import json
import numpy as np
import cv2
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageTk
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import matplotlib.pyplot as plt


class ClothingBackgroundRemover:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Clothing Detection & Background Removal")
        self.root.geometry("900x750")
        
        # Load the trained clothing detection model
        self.load_model_and_classes()
        
        # Variables
        self.original_image = None
        self.processed_image = None
        self.image_path = None
        self.detected_class = None
        self.detection_confidence = 0.0
        self.all_predictions = None
        
        self.setup_ui()
    
    def load_model_and_classes(self):
        """Load model and class labels with proper validation"""
        # Try to load models in order of preference
        model_files = [
            'best_clothing_model.h5',
            'clothing_model_final.h5', 
            # 'clothing_model.h5'
        ]
        
        self.model = None
        self.model_name = None
        
        for model_file in model_files:
            try:
                self.model = load_model(model_file)
                self.model_name = model_file
                print(f"Successfully loaded: {model_file}")
                break
            except Exception as e:
                print(f"Could not load {model_file}: {e}")
        
        if self.model is None:
            self.model_loaded = False
            self.class_labels = []
            self.class_indices = {}
            self.class_names = []
            print("ERROR: No model file found!")
            return
        
        self.model_loaded = True
        
        # Load class labels from JSON file
        self.load_class_labels()
        
        print(f"Model loaded: {self.model_name}")
        print(f"Classes: {self.class_names}")
        print(f"Class indices: {self.class_indices}")
    
    def load_class_labels(self):
        """Load class labels with proper validation matching predict_clothing.py"""
        try:
            with open('class_labels.json', 'r') as f:
                self.class_indices = json.load(f)
            
            print(f"Loaded class indices: {self.class_indices}")
            
            # Validate indices
            expected_classes = self.model.output_shape[-1]
            if len(self.class_indices) != expected_classes:
                print(f"WARNING: Class indices count ({len(self.class_indices)}) doesn't match model output ({expected_classes})")
            
            # Create reverse mapping
            self.class_labels = {v: k for k, v in self.class_indices.items()}
            self.class_names = list(self.class_indices.keys())
            
            # Verify expected classes are present
            expected_names = {'tshirt', 'trousers'}
            found_names = set(self.class_names)
            
            if found_names != expected_names:
                print(f"WARNING: Unexpected class names found")
                print(f"Expected: {expected_names}")
                print(f"Found: {found_names}")
            
        except Exception as e:
            print(f"Error loading class labels: {e}")
            print("Using default labels...")
            
            # Default mapping - CRITICAL: This must match training!
            self.class_indices = {'trousers': 0, 'tshirt': 1}
            self.class_labels = {0: 'trousers', 1: 'tshirt'}
            self.class_names = ['trousers', 'tshirt']
    
    def setup_ui(self):
        # Main frame
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Title
        title_label = ttk.Label(main_frame, text="Clothing Detection & Background Removal",
                               font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=3, pady=20)
        
        # Model status
        if self.model_loaded:
            status_text = f"Model loaded: {self.model_name}\nSupported classes: {', '.join(self.class_names).upper()}"
            status_color = "green"
        else:
            status_text = "Failed to load clothing detection model\nPlease ensure model files exist"
            status_color = "red"
        
        model_status_label = ttk.Label(main_frame, text=status_text, foreground=status_color)
        model_status_label.grid(row=1, column=0, columnspan=3, pady=10)
        
        # Upload section
        upload_frame = ttk.LabelFrame(main_frame, text="Step 1: Upload Image", padding="10")
        upload_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=10)
        
        self.upload_btn = ttk.Button(upload_frame, text="Select Image", 
                                    command=self.upload_image, width=20)
        self.upload_btn.grid(row=0, column=0, padx=10)
        
        self.image_label = ttk.Label(upload_frame, text="No image selected")
        self.image_label.grid(row=0, column=1, padx=10)
        
        # Detection results section
        detection_frame = ttk.LabelFrame(main_frame, text="Detection Results", padding="10")
        detection_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=10)
        
        self.detection_label = ttk.Label(detection_frame, text="Upload an image to see detection results", 
                                        font=('Arial', 10))
        self.detection_label.grid(row=0, column=0, columnspan=2, pady=5)
        
        # Confidence details
        self.confidence_label = ttk.Label(detection_frame, text="", font=('Arial', 9), foreground="gray")
        self.confidence_label.grid(row=1, column=0, columnspan=2, pady=2)
        
        # Process section
        process_frame = ttk.LabelFrame(main_frame, text="Step 2: Process Image", padding="10")
        process_frame.grid(row=4, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=10)
        
        self.detect_btn = ttk.Button(process_frame, text="Detect Clothing Type",
                                    command=self.detect_clothing, state='disabled', width=20)
        self.detect_btn.grid(row=0, column=0, padx=10)
        
        self.process_btn = ttk.Button(process_frame, text="Remove Background",
                                     command=self.remove_background, state='disabled', width=20)
        self.process_btn.grid(row=0, column=1, padx=10)
        
        self.save_btn = ttk.Button(process_frame, text="Save Result",
                                  command=self.save_result, state='disabled', width=15)
        self.save_btn.grid(row=0, column=2, padx=10)
        
        # Preview section
        preview_frame = ttk.LabelFrame(main_frame, text="Image Preview", padding="10")
        preview_frame.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=10)
        
        # Original image preview
        original_frame = ttk.Frame(preview_frame)
        original_frame.grid(row=0, column=0, padx=20)
        ttk.Label(original_frame, text="Original Image", font=('Arial', 12, 'bold')).grid(row=0, column=0)
        self.original_preview = ttk.Label(original_frame, text="Upload image to preview")
        self.original_preview.grid(row=1, column=0, pady=5)
        
        # Processed image preview
        processed_frame = ttk.Frame(preview_frame)
        processed_frame.grid(row=0, column=1, padx=20)
        ttk.Label(processed_frame, text="Background Removed", font=('Arial', 12, 'bold')).grid(row=0, column=0)
        self.processed_preview = ttk.Label(processed_frame, text="Process image to preview")
        self.processed_preview.grid(row=1, column=0, pady=5)
        
        # Status section
        self.status_label = ttk.Label(main_frame, text="Ready", foreground="green", font=('Arial', 10))
        self.status_label.grid(row=6, column=0, columnspan=3, pady=20)
        
        # Progress bar
        self.progress = ttk.Progressbar(main_frame, mode='indeterminate')
        self.progress.grid(row=7, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5)
    
    def upload_image(self):
        """Upload and display image"""
        file_path = filedialog.askopenfilename(
            title="Select Image",
            filetypes=[("Image files", "*.jpg *.jpeg *.png *.bmp *.tiff")]
        )
        
        if file_path:
            self.image_path = file_path
            self.load_original_image()
            if self.model_loaded:
                self.detect_btn.config(state='normal')
            self.image_label.config(text=f"Selected: {os.path.basename(file_path)}")
            self.status_label.config(text="Image loaded. Click 'Detect Clothing Type' to identify the garment.", 
                                   foreground="blue")
            
            # Reset detection results
            self.detected_class = None
            self.detection_confidence = 0.0
            self.all_predictions = None
            self.detection_label.config(text="Click 'Detect Clothing Type' to analyze the image")
            self.confidence_label.config(text="")
            self.process_btn.config(state='disabled')
            self.save_btn.config(state='disabled')
    
    def load_original_image(self):
        """Load and display the original image"""
        try:
            self.original_image = cv2.imread(self.image_path)
            if self.original_image is None:
                messagebox.showerror("Error", "Could not load the selected image.")
                return
            
            self.show_original_preview()
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load image: {str(e)}")
    
    def show_original_preview(self):
        """Show preview of original image"""
        if self.original_image is not None:
            preview_size = (250, 250)
            
            # Resize image for preview while maintaining aspect ratio
            h, w = self.original_image.shape[:2]
            aspect = w / h
            if aspect > 1:
                new_w, new_h = preview_size[0], int(preview_size[0] / aspect)
            else:
                new_w, new_h = int(preview_size[1] * aspect), preview_size[1]
            
            preview_img = cv2.resize(self.original_image, (new_w, new_h))
            preview_img_rgb = cv2.cvtColor(preview_img, cv2.COLOR_BGR2RGB)
            
            pil_image = Image.fromarray(preview_img_rgb)
            photo = ImageTk.PhotoImage(pil_image)
            
            self.original_preview.config(image=photo, text="")
            self.original_preview.image = photo
    
    def show_processed_preview(self):
        """Show preview of processed image with background removed"""
        if self.processed_image is not None:
            preview_size = (250, 250)
            
            # Resize image for preview while maintaining aspect ratio
            h, w = self.processed_image.shape[:2]
            aspect = w / h
            if aspect > 1:
                new_w, new_h = preview_size[0], int(preview_size[0] / aspect)
            else:
                new_w, new_h = int(preview_size[1] * aspect), preview_size[1]
            
            preview_img = cv2.resize(self.processed_image, (new_w, new_h))
            
            # Convert BGRA to RGBA for display
            if preview_img.shape[2] == 4:
                preview_img_rgb = cv2.cvtColor(preview_img, cv2.COLOR_BGRA2RGBA)
            else:
                preview_img_rgb = cv2.cvtColor(preview_img, cv2.COLOR_BGR2RGB)
            
            pil_image = Image.fromarray(preview_img_rgb)
            photo = ImageTk.PhotoImage(pil_image)
            
            self.processed_preview.config(image=photo, text="")
            self.processed_preview.image = photo
    
    def preprocess_image_robust(self, img_path, target_size=(224, 224)):
        """Robust image preprocessing matching training conditions from predict_clothing.py"""
        try:
            # Load image
            img = cv2.imread(img_path)
            if img is None:
                raise ValueError(f"Could not load image: {img_path}")
            
            # Convert BGR to RGB
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Convert to PIL
            pil_img = Image.fromarray(img_rgb)
            
            # Resize (using same method as training)
            pil_img = pil_img.resize(target_size, Image.LANCZOS)
            
            # Convert to array
            img_array = np.array(pil_img)
            
            # Normalize exactly as training (rescale=1./255)
            img_array = img_array.astype(np.float32) / 255.0
            
            # Add batch dimension
            img_batch = np.expand_dims(img_array, axis=0)
            
            return img_batch
            
        except Exception as e:
            print(f"Error preprocessing {img_path}: {e}")
            return None
    
    def predict_clothing_enhanced(self, img_path):
        """Enhanced prediction matching predict_clothing.py"""
        
        # Preprocess image
        img_batch = self.preprocess_image_robust(img_path)
        
        if img_batch is None:
            return None, None, None
        
        # Get prediction
        raw_predictions = self.model.predict(img_batch, verbose=0)[0]
        
        # Get predicted class
        predicted_idx = np.argmax(raw_predictions)
        predicted_class = self.class_labels[predicted_idx]
        confidence = raw_predictions[predicted_idx]
        
        return predicted_class, confidence, raw_predictions
    
    def detect_clothing(self):
        """Detect clothing type in the uploaded image"""
        if not self.model_loaded:
            messagebox.showerror("Error", "Clothing detection model is not loaded.")
            return
        
        if self.original_image is None:
            messagebox.showerror("Error", "Please select an image first.")
            return
        
        try:
            # Start progress bar
            self.progress.start()
            self.status_label.config(text="Detecting clothing type...", foreground="blue")
            self.root.update()
            
            # Detect clothing type using enhanced prediction
            predicted_class, confidence, all_predictions = self.predict_clothing_enhanced(self.image_path)
            
            if predicted_class is None:
                raise Exception("Failed to process image")
            
            # Store results
            self.detected_class = predicted_class
            self.detection_confidence = confidence
            self.all_predictions = all_predictions
            
            # Create detailed results text
            results_text = f"Detected: {predicted_class.upper()} (Confidence: {confidence*100:.1f}%)"
            
            # Create confidence details
            pred_details = []
            for i, (name, prob) in enumerate(zip(self.class_names, all_predictions)):
                icon = "→" if i == np.argmax(all_predictions) else " "
                pred_details.append(f"{icon} {name.upper()}: {prob*100:.1f}%")
            
            confidence_text = " | ".join(pred_details)
            
            # Update detection results display
            self.detection_label.config(text=results_text)
            self.confidence_label.config(text=confidence_text)
            
            # Enable background removal based on confidence
            min_confidence = 0.6  # Slightly higher threshold for better results
            if confidence > min_confidence:
                self.process_btn.config(state='normal')
                self.status_label.config(text=f"{predicted_class.upper()} detected! You can now remove the background.", 
                                       foreground="green")
            else:
                self.process_btn.config(state='disabled')
                self.status_label.config(text=f"Low confidence ({confidence*100:.1f}%). Try a clearer image of clothing.", 
                                       foreground="orange")
            
            # Check for suspicious predictions
            filename_lower = os.path.basename(self.image_path).lower()
            suspicious = False
            
            if predicted_class == 'tshirt':
                if any(word in filename_lower for word in ['pant', 'trouser', 'jean', 'short']):
                    suspicious = True
            elif predicted_class == 'trousers':
                if any(word in filename_lower for word in ['shirt', 'tshirt', 'top', 'blouse']):
                    suspicious = True
            
            if suspicious:
                self.status_label.config(text=f"WARNING: Filename suggests different garment type!", 
                                       foreground="red")
            
            # Stop progress bar
            self.progress.stop()
            
        except Exception as e:
            self.progress.stop()
            messagebox.showerror("Error", f"Failed to detect clothing: {str(e)}")
            self.status_label.config(text="Detection failed.", foreground="red")
            print(f"Detection error: {e}")
    
    def remove_background_enhanced(self):
        """Enhanced background removal with better edge detection"""
        img = self.original_image.copy()
        height, width = img.shape[:2]
        
        # Convert to different color spaces
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Method 1: Adaptive thresholding for white/light backgrounds
        adaptive_mask = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                            cv2.THRESH_BINARY_INV, 11, 2)
        
        # Method 2: Edge-based detection with better parameters
        # Apply Gaussian blur first for better edge detection
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 30, 80)
        
        # Dilate edges to connect nearby edge pixels
        kernel = np.ones((3, 3), np.uint8)
        edges_dilated = cv2.dilate(edges, kernel, iterations=1)
        
        # Method 3: Improved color-based segmentation
        # Sample more points around the border for better background detection
        border_width = 30
        border_samples = [
            img[0:border_width, :],  # Top border
            img[height-border_width:height, :],  # Bottom border
            img[:, 0:border_width],  # Left border
            img[:, width-border_width:width]  # Right border
        ]
        
        # Calculate median background color (more robust than mean)
        all_border_pixels = np.vstack([sample.reshape(-1, 3) for sample in border_samples])
        bg_color = np.median(all_border_pixels, axis=0)
        
        # Create mask based on color distance to background
        color_diff = np.sqrt(np.sum((img.astype(np.float32) - bg_color) ** 2, axis=2))
        color_threshold = np.percentile(color_diff, 40)  # Use percentile for better threshold
        color_mask = (color_diff > color_threshold).astype(np.uint8) * 255
        
        # Method 4: Use saturation to help distinguish clothing from background
        # Clothing typically has more color variation
        saturation = hsv[:, :, 1]
        sat_threshold = np.percentile(saturation, 30)
        sat_mask = (saturation > sat_threshold).astype(np.uint8) * 255
        
        # Combine all masks
        combined_mask = cv2.bitwise_or(adaptive_mask, color_mask)
        combined_mask = cv2.bitwise_or(combined_mask, sat_mask)
        combined_mask = cv2.bitwise_or(combined_mask, edges_dilated)
        
        # Apply morphological operations for cleanup
        # Close small gaps
        kernel_close = np.ones((5, 5), np.uint8)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel_close, iterations=2)
        
        # Remove small noise
        kernel_open = np.ones((3, 3), np.uint8)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel_open, iterations=1)
        
        # Find contours and keep only the largest one (main garment)
        contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Keep only contours that are large enough
            min_area = (width * height) * 0.01  # At least 1% of image area
            large_contours = [c for c in contours if cv2.contourArea(c) > min_area]
            
            if large_contours:
                # Use the largest contour
                largest_contour = max(large_contours, key=cv2.contourArea)
                
                # Create clean mask from largest contour
                final_mask = np.zeros_like(combined_mask)
                cv2.fillPoly(final_mask, [largest_contour], 255)
                
                # Smooth the edges with Gaussian blur
                final_mask = cv2.GaussianBlur(final_mask, (5, 5), 0)
                
                # Apply additional morphological operations for smoother edges
                kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
                final_mask = cv2.morphologyEx(final_mask, cv2.MORPH_CLOSE, kernel)
            else:
                final_mask = combined_mask
        else:
            final_mask = combined_mask
        
        # Create alpha channel (normalize to 0-255 range)
        alpha = final_mask
        
        # Convert to 4-channel image (BGRA)
        b, g, r = cv2.split(img)
        img_with_alpha = cv2.merge([b, g, r, alpha])
        
        return img_with_alpha
    
    def remove_background(self):
        """Remove background from the detected clothing item"""
        if self.original_image is None:
            messagebox.showerror("Error", "Please select an image first.")
            return
        
        if self.detected_class is None:
            messagebox.showerror("Error", "Please detect clothing type first.")
            return
        
        try:
            # Start progress bar
            self.progress.start()
            self.status_label.config(text=f"Removing background from {self.detected_class}...", 
                                   foreground="blue")
            self.root.update()
            
            # Remove background with enhanced method
            self.processed_image = self.remove_background_enhanced()
            
            # Show processed preview
            self.show_processed_preview()
            
            # Enable save button
            self.save_btn.config(state='normal')
            
            # Stop progress bar
            self.progress.stop()
            self.status_label.config(text=f"Success! Background removed from {self.detected_class.upper()}. "
                                   f"Confidence: {self.detection_confidence*100:.1f}%", foreground="green")
            
        except Exception as e:
            self.progress.stop()
            messagebox.showerror("Error", f"Failed to remove background: {str(e)}")
            self.status_label.config(text="Background removal failed.", foreground="red")
            print(f"Background removal error: {e}")
    
    def save_result(self):
        """Save the processed image with background removed"""
        if self.processed_image is None:
            messagebox.showerror("Error", "No processed image to save.")
            return
        
        # Suggest filename based on detected class and confidence
        base_name = os.path.splitext(os.path.basename(self.image_path))[0]
        confidence_str = f"_{self.detection_confidence*100:.0f}pct" if self.detection_confidence else ""
        suggested_name = f"{base_name}_{self.detected_class}_no_bg{confidence_str}.png"
        
        # Get save path
        file_path = filedialog.asksaveasfilename(
            title="Save Processed Image",
            initialname=suggested_name,
            defaultextension=".png",
            filetypes=[("PNG files", "*.png"), ("All files", "*.*")]
        )
        
        if file_path:
            try:
                # Save the image
                success = cv2.imwrite(file_path, self.processed_image)
                
                if success:
                    self.status_label.config(text=f"Image saved successfully: {os.path.basename(file_path)}", 
                                           foreground="green")
                    
                    # Show save summary
                    summary = f"Image saved successfully!\n\n"
                    summary += f"File: {os.path.basename(file_path)}\n"
                    summary += f"Detected: {self.detected_class.upper()}\n"
                    summary += f"Confidence: {self.detection_confidence*100:.1f}%\n"
                    summary += f"Location: {file_path}"
                    
                    messagebox.showinfo("Success", summary)
                else:
                    raise Exception("Failed to write image file")
                
            except Exception as e:
                messagebox.showerror("Error", f"Failed to save image: {str(e)}")
    
    def run(self):
        """Start the application"""
        print("Starting Clothing Background Remover...")
        print(f"Model loaded: {self.model_loaded}")
        if self.model_loaded:
            print(f"Model file: {self.model_name}")
            print(f"Supported classes: {self.class_names}")
        
        self.root.mainloop()


# Main application
if __name__ == "__main__":
    app = ClothingBackgroundRemover()
    app.run()