import os
import numpy as np
import cv2
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageTk
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import matplotlib.pyplot as plt


class TShirtBackgroundRemover:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("T-Shirt Detection & Background Removal")
        self.root.geometry("800x700")
        
        # Load the trained t-shirt detection model
        try:
            self.model = load_model('tshirt_model.h5')
            self.model_loaded = True
        except Exception as e:
            self.model_loaded = False
            print(f"Error loading model: {e}")
        
        # Variables
        self.original_image = None
        self.processed_image = None
        self.image_path = None
        
        self.setup_ui()
    
    def setup_ui(self):
        # Main frame
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Title
        title_label = ttk.Label(main_frame, text="T-Shirt Detection & Background Removal",
                               font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=2, pady=20)
        
        # Model status
        if self.model_loaded:
            status_text = "✓ T-Shirt detection model loaded successfully"
            status_color = "green"
        else:
            status_text = "✗ Failed to load t-shirt detection model"
            status_color = "red"
        
        model_status_label = ttk.Label(main_frame, text=status_text, foreground=status_color)
        model_status_label.grid(row=1, column=0, columnspan=2, pady=10)
        
        # Upload section
        upload_frame = ttk.LabelFrame(main_frame, text="Step 1: Upload Image", padding="10")
        upload_frame.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=10)
        
        self.upload_btn = ttk.Button(upload_frame, text="Select Image", 
                                    command=self.upload_image, width=20)
        self.upload_btn.grid(row=0, column=0, padx=10)
        
        self.image_label = ttk.Label(upload_frame, text="No image selected")
        self.image_label.grid(row=0, column=1, padx=10)
        
        # Process section
        process_frame = ttk.LabelFrame(main_frame, text="Step 2: Process Image", padding="10")
        process_frame.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=10)
        
        self.process_btn = ttk.Button(process_frame, text="Detect & Remove Background",
                                     command=self.process_image, state='disabled', width=25)
        self.process_btn.grid(row=0, column=0, padx=10)
        
        self.save_btn = ttk.Button(process_frame, text="Save Result",
                                  command=self.save_result, state='disabled', width=15)
        self.save_btn.grid(row=0, column=1, padx=10)
        
        # Preview section
        preview_frame = ttk.LabelFrame(main_frame, text="Image Preview", padding="10")
        preview_frame.grid(row=4, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=10)
        
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
        self.status_label.grid(row=5, column=0, columnspan=2, pady=20)
        
        # Progress bar
        self.progress = ttk.Progressbar(main_frame, mode='indeterminate')
        self.progress.grid(row=6, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)
    
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
                self.process_btn.config(state='normal')
            self.image_label.config(text=f"Selected: {os.path.basename(file_path)}")
            self.status_label.config(text="Image loaded. Click 'Detect & Remove Background' to process.", 
                                   foreground="blue")
    
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
    
    def preprocess_image_for_model(self, img_path, target_size=(150, 150)):
        """Preprocess image for t-shirt detection model"""
        img = image.load_img(img_path, target_size=target_size)
        img_array = image.img_to_array(img)
        img_array = img_array / 255.0  # Rescale to match training
        return np.expand_dims(img_array, axis=0)
    
    def predict_tshirt(self, img_path):
        """Predict if image contains a t-shirt"""
        img_tensor = self.preprocess_image_for_model(img_path)
        prediction = self.model.predict(img_tensor)[0][0]
        
        is_tshirt = prediction > 0.5
        confidence = prediction if prediction > 0.5 else 1 - prediction
        
        return is_tshirt, confidence
    
    def remove_background_threshold(self):
        """Remove background using automatic threshold detection for e-commerce images"""
        img = self.original_image.copy()
        height, width = img.shape[:2]
        
        # Convert to different color spaces for better background detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Method 1: Detect white/light background (common in e-commerce)
        # Use adaptive threshold to handle lighting variations
        white_mask = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                          cv2.THRESH_BINARY_INV, 15, 10)
        
        # Method 2: Use edge detection to find garment boundaries
        edges = cv2.Canny(gray, 50, 150)
        
        # Method 3: Use color-based segmentation
        # Sample corners to detect background color
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
            
            # Apply additional morphological operations for smoother edges
            kernel = np.ones((2, 2), np.uint8)
            final_mask = cv2.morphologyEx(final_mask, cv2.MORPH_CLOSE, kernel)
        else:
            # Fallback: if no contours found, use the combined mask
            final_mask = combined_mask
        
        # Create alpha channel
        alpha = final_mask
        
        # Convert to 4-channel image
        b, g, r = cv2.split(img)
        img_with_alpha = cv2.merge([b, g, r, alpha])
        
        return img_with_alpha
    
    def process_image(self):
        """Main processing function: detect t-shirt and remove background"""
        if not self.model_loaded:
            messagebox.showerror("Error", "T-shirt detection model is not loaded.")
            return
        
        if self.original_image is None:
            messagebox.showerror("Error", "Please select an image first.")
            return
        
        try:
            # Start progress bar
            self.progress.start()
            self.status_label.config(text="Detecting t-shirt...", foreground="blue")
            self.root.update()
            
            # Step 1: Check if image contains a t-shirt
            is_tshirt, confidence = self.predict_tshirt(self.image_path)
            
            if not is_tshirt:
                self.progress.stop()
                self.status_label.config(text="Error: No t-shirt detected in image!", foreground="red")
                messagebox.showerror("Detection Failed", 
                                   f"This image does not contain a t-shirt.\n"
                                   f"Confidence: {confidence*100:.2f}%\n\n"
                                   f"Please upload an image containing a t-shirt.")
                return
            
            # Step 2: If t-shirt detected, remove background
            self.status_label.config(text=f"T-shirt detected ({confidence*100:.2f}% confidence)! Removing background...", 
                                   foreground="green")
            self.root.update()
            
            # Remove background
            self.processed_image = self.remove_background_threshold()
            
            # Show processed preview
            self.show_processed_preview()
            
            # Enable save button
            self.save_btn.config(state='normal')
            
            # Stop progress bar
            self.progress.stop()
            self.status_label.config(text=f"Success! T-shirt detected and background removed. "
                                   f"Confidence: {confidence*100:.2f}%", foreground="green")
            
        except Exception as e:
            self.progress.stop()
            messagebox.showerror("Error", f"Failed to process image: {str(e)}")
            self.status_label.config(text="Processing failed.", foreground="red")
            print(f"Processing error: {e}")
    
    def save_result(self):
        """Save the processed image with background removed"""
        if self.processed_image is None:
            messagebox.showerror("Error", "No processed image to save.")
            return
        
        # Get save path
        file_path = filedialog.asksaveasfilename(
            title="Save Processed Image",
            defaultextension=".png",
            filetypes=[("PNG files", "*.png"), ("All files", "*.*")]
        )
        
        if file_path:
            try:
                # Save the image
                cv2.imwrite(file_path, self.processed_image)
                self.status_label.config(text=f"Image saved successfully: {os.path.basename(file_path)}", 
                                       foreground="green")
                messagebox.showinfo("Success", f"Image saved successfully!\n{file_path}")
                
            except Exception as e:
                messagebox.showerror("Error", f"Failed to save image: {str(e)}")
    
    def run(self):
        """Start the application"""
        self.root.mainloop()


# Main application
if __name__ == "__main__":
    app = TShirtBackgroundRemover()
    app.run()