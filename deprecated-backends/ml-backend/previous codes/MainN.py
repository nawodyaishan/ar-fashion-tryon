import cv2
import mediapipe as mp
import numpy as np
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageTk
import threading
import os


class ARGarmentTryOn:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("AR Garment Try-On Tool")
        self.root.geometry("900x600")

        # Initialize MediaPipe
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_pose = mp.solutions.pose

        # Variables
        self.original_garment_image = None
        self.processed_garment_image = None
        self.garment_path = None
        self.camera_running = False
        self.cap = None
        self.garment_type = "tshirt"

        # Set default background removal settings
        self.bg_method = "threshold"
        self.threshold_value = 0

        self.setup_ui()

    def setup_ui(self):
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Title
        title_label = ttk.Label(main_frame, text="AR Garment Try-On Tool",
                                font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=3, pady=10)

        # Garment type selection
        type_frame = ttk.LabelFrame(main_frame, text="Garment Type", padding="5")
        type_frame.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5)

        self.garment_type_var = tk.StringVar(value="tshirt")
        ttk.Radiobutton(type_frame, text="T-Shirt", variable=self.garment_type_var,
                        value="tshirt").grid(row=0, column=0, padx=5)
        ttk.Radiobutton(type_frame, text="Shirt", variable=self.garment_type_var,
                        value="shirt").grid(row=0, column=1, padx=5)
        ttk.Radiobutton(type_frame, text="Dress", variable=self.garment_type_var,
                        value="dress").grid(row=0, column=2, padx=5)
        ttk.Radiobutton(type_frame, text="Jacket", variable=self.garment_type_var,
                        value="jacket").grid(row=0, column=3, padx=5)

        # Upload section
        upload_frame = ttk.LabelFrame(main_frame, text="Upload Garment Image", padding="5")
        upload_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5)

        self.upload_btn = ttk.Button(upload_frame, text="Select Garment Image",
                                     command=self.upload_garment)
        self.upload_btn.grid(row=0, column=0, padx=5)

        self.process_btn = ttk.Button(upload_frame, text="Remove Background",
                                      command=self.process_background, state='disabled')
        self.process_btn.grid(row=0, column=1, padx=5)

        self.image_label = ttk.Label(upload_frame, text="No image selected")
        self.image_label.grid(row=1, column=0, columnspan=2, pady=5)

        # Preview frame with before/after
        preview_frame = ttk.LabelFrame(main_frame, text="Image Preview", padding="5")
        preview_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5)

        # Original image preview
        original_frame = ttk.Frame(preview_frame)
        original_frame.grid(row=0, column=0, padx=10)
        ttk.Label(original_frame, text="Original", font=('Arial', 10, 'bold')).grid(row=0, column=0)
        self.original_preview = ttk.Label(original_frame, text="Upload image to preview")
        self.original_preview.grid(row=1, column=0)

        # Processed image preview
        processed_frame = ttk.Frame(preview_frame)
        processed_frame.grid(row=0, column=1, padx=10)
        ttk.Label(processed_frame, text="Processed", font=('Arial', 10, 'bold')).grid(row=0, column=0)
        self.processed_preview = ttk.Label(processed_frame, text="Process image to preview")
        self.processed_preview.grid(row=1, column=0)

        # Control buttons
        control_frame = ttk.Frame(main_frame)
        control_frame.grid(row=4, column=0, columnspan=3, pady=20)

        self.start_btn = ttk.Button(control_frame, text="Start Camera",
                                    command=self.start_camera, state='disabled')
        self.start_btn.grid(row=0, column=0, padx=5)

        self.stop_btn = ttk.Button(control_frame, text="Stop Camera",
                                   command=self.stop_camera, state='disabled')
        self.stop_btn.grid(row=0, column=1, padx=5)

        # Auto-fit settings
        autofit_frame = ttk.LabelFrame(main_frame, text="Auto-Fit Settings", padding="5")
        autofit_frame.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5)

        # Fine-tuning multipliers
        ttk.Label(autofit_frame, text="Width Multiplier:").grid(row=0, column=0, sticky=tk.W)
        self.width_mult_var = tk.DoubleVar(value=1.5)
        width_scale = ttk.Scale(autofit_frame, from_=1.0, to=3.0, variable=self.width_mult_var,
                                orient=tk.HORIZONTAL, length=150)
        width_scale.grid(row=0, column=1, padx=5)

        ttk.Label(autofit_frame, text="Height Multiplier:").grid(row=0, column=2, sticky=tk.W, padx=(20, 0))
        self.height_mult_var = tk.DoubleVar(value=1.2)
        height_scale = ttk.Scale(autofit_frame, from_=1.0, to=2.5, variable=self.height_mult_var,
                                 orient=tk.HORIZONTAL, length=150)
        height_scale.grid(row=0, column=3, padx=5)

        # Transparency
        ttk.Label(autofit_frame, text="Transparency:").grid(row=1, column=0, sticky=tk.W)
        self.transparency_var = tk.DoubleVar(value=0.8)
        transparency_scale = ttk.Scale(autofit_frame, from_=0.3, to=1.0,
                                       variable=self.transparency_var, orient=tk.HORIZONTAL, length=150)
        transparency_scale.grid(row=1, column=1, padx=5)

        # Status label
        self.status_label = ttk.Label(main_frame, text="Ready", foreground="green")
        self.status_label.grid(row=6, column=0, columnspan=3, pady=10)

    def upload_garment(self):
        file_path = filedialog.askopenfilename(
            title="Select Garment Image",
            filetypes=[("Image files", "*.jpg *.jpeg *.png *.bmp *.tiff")]
        )

        if file_path:
            self.garment_path = file_path
            self.load_original_image()
            self.process_btn.config(state='normal')
            self.image_label.config(text=f"Selected: {os.path.basename(file_path)}")
            self.status_label.config(text="Image loaded. Please remove background.", foreground="orange")

    def load_original_image(self):
        """Load the original garment image"""
        try:
            self.original_garment_image = cv2.imread(self.garment_path)
            if self.original_garment_image is None:
                messagebox.showerror("Error", "Could not load the selected image.")
                return

            self.show_original_preview()

        except Exception as e:
            messagebox.showerror("Error", f"Failed to load garment image: {str(e)}")

    def show_original_preview(self):
        """Show preview of original image"""
        if self.original_garment_image is not None:
            preview_size = (200, 200)
            preview_img = cv2.resize(self.original_garment_image, preview_size)
            preview_img_rgb = cv2.cvtColor(preview_img, cv2.COLOR_BGR2RGB)

            pil_image = Image.fromarray(preview_img_rgb)
            photo = ImageTk.PhotoImage(pil_image)

            self.original_preview.config(image=photo, text="")
            self.original_preview.image = photo

    def show_processed_preview(self):
        """Show preview of processed image with background removed"""
        if self.processed_garment_image is not None:
            preview_size = (200, 200)
            preview_img = cv2.resize(self.processed_garment_image, preview_size)

            # Convert BGRA to RGBA for display
            if preview_img.shape[2] == 4:
                preview_img_rgb = cv2.cvtColor(preview_img, cv2.COLOR_BGRA2RGBA)
            else:
                preview_img_rgb = cv2.cvtColor(preview_img, cv2.COLOR_BGR2RGB)

            pil_image = Image.fromarray(preview_img_rgb)
            photo = ImageTk.PhotoImage(pil_image)

            self.processed_preview.config(image=photo, text="")
            self.processed_preview.image = photo

    def process_background(self):
        """Remove background from the garment image using automatic background detection"""
        if self.original_garment_image is None:
            messagebox.showerror("Error", "Please select an image first.")
            return

        try:
            self.status_label.config(text="Processing background removal...", foreground="orange")
            self.root.update()

            # Use automatic background removal optimized for e-commerce images
            self.processed_garment_image = self.remove_background_threshold()

            self.show_processed_preview()
            self.start_btn.config(state='normal')
            self.status_label.config(text="Background removed successfully!", foreground="green")

        except Exception as e:
            messagebox.showerror("Error", f"Failed to remove background: {str(e)}")
            self.status_label.config(text="Background removal failed.", foreground="red")
            print(f"Background removal error: {e}")  # Debug information

    def remove_background_threshold(self):
        """Remove background using automatic threshold detection for e-commerce images"""
        img = self.original_garment_image.copy()
        height, width = img.shape[:2]

        # Convert to different color spaces for better background detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # Method 1: Detect white/light background (common in e-commerce)
        # Use adaptive threshold to handle lighting variations
        white_mask = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                           cv2.THRESH_BINARY_INV, 15, 10)

        # Method 2: Use edge detection to find garment boundaries
        edges = cv2.Canny(gray, 50, 150)

        # Method 3: Use color-based segmentation
        # Assume background is relatively uniform
        # Sample corners to detect background color
        corner_samples = [
            img[0:20, 0:20],  # Top-left
            img[0:20, width - 20:width],  # Top-right
            img[height - 20:height, 0:20],  # Bottom-left
            img[height - 20:height, width - 20:width]  # Bottom-right
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

    def start_camera(self):
        if not self.camera_running:
            self.camera_running = True
            self.start_btn.config(state='disabled')
            self.stop_btn.config(state='normal')
            self.status_label.config(text="Camera started. Press 'q' to quit camera view.", foreground="blue")

            # Start camera in a separate thread
            self.camera_thread = threading.Thread(target=self.camera_loop)
            self.camera_thread.daemon = True
            self.camera_thread.start()

    def stop_camera(self):
        self.camera_running = False
        self.start_btn.config(state='normal')
        self.stop_btn.config(state='disabled')
        self.status_label.config(text="Camera stopped.", foreground="green")

        if self.cap:
            self.cap.release()
        cv2.destroyAllWindows()

    def camera_loop(self):
        self.cap = cv2.VideoCapture(0)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        with self.mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
            while self.camera_running:
                ret, frame = self.cap.read()
                if not ret:
                    break

                # Flip frame horizontally for mirror effect
                frame = cv2.flip(frame, 1)

                # Process the frame
                frame_with_garment = self.process_frame(frame, pose)

                # Display the frame
                cv2.imshow('AR Garment Try-On', frame_with_garment)

                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break

        self.cap.release()
        cv2.destroyAllWindows()

    def process_frame(self, frame, pose):
        """Process each frame to detect pose and overlay garment"""
        # Convert to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)

        if results.pose_landmarks and self.processed_garment_image is not None:
            frame = self.overlay_garment(frame, results.pose_landmarks)

        return frame

    def calculate_auto_size_by_shoulders(self, landmarks, garment_type):
        """Calculate automatic size based on shoulder points specifically"""
        frame_height, frame_width = 720, 1280  # Default camera resolution

        # Get landmark positions
        landmarks_dict = {}
        for idx, landmark in enumerate(landmarks.landmark):
            landmarks_dict[idx] = {
                'x': int(landmark.x * frame_width),
                'y': int(landmark.y * frame_height)
            }

        # Get shoulder points
        r_shoulder = landmarks_dict[12]  # Right shoulder
        l_shoulder = landmarks_dict[11]  # Left shoulder

        # Calculate shoulder width
        shoulder_width = np.sqrt((l_shoulder['x'] - r_shoulder['x']) ** 2 +
                                 (l_shoulder['y'] - r_shoulder['y']) ** 2)

        # Calculate shoulder center
        shoulder_center_x = (l_shoulder['x'] + r_shoulder['x']) // 2
        shoulder_center_y = (l_shoulder['y'] + r_shoulder['y']) // 2

        if garment_type in ['tshirt', 'shirt', 'jacket']:
            # For upper body garments, use shoulder width as primary reference
            r_hip = landmarks_dict[24]
            l_hip = landmarks_dict[23]

            # Calculate torso height from shoulders to hips
            hip_center_y = (r_hip['y'] + l_hip['y']) // 2
            torso_height = hip_center_y - shoulder_center_y

            # Calculate garment dimensions with multipliers
            width_mult = self.width_mult_var.get()
            height_mult = self.height_mult_var.get()

            if garment_type == 'jacket':
                width_mult += 0.2  # Jackets are slightly wider
                height_mult += 0.1

            garment_width = int(shoulder_width * width_mult)
            garment_height = int(torso_height * height_mult)

            # Position garment centered on shoulders
            x_pos = shoulder_center_x - garment_width // 2
            y_pos = shoulder_center_y - garment_height // 4

        elif garment_type == 'dress':
            # For dresses, use shoulder width but extend to ankles
            r_ankle = landmarks_dict[28]
            l_ankle = landmarks_dict[27]

            # Calculate full body height from shoulders to ankles
            ankle_center_y = (r_ankle['y'] + l_ankle['y']) // 2
            dress_height = ankle_center_y - shoulder_center_y

            # Calculate garment dimensions
            width_mult = self.width_mult_var.get() + 0.3  # Dresses are wider
            height_mult = self.height_mult_var.get() + 0.6  # Dresses are longer

            garment_width = int(shoulder_width * width_mult)
            garment_height = int(dress_height * height_mult)

            # Position garment centered on shoulders
            x_pos = shoulder_center_x - garment_width // 2
            y_pos = shoulder_center_y - garment_height // 8

        return garment_width, garment_height, x_pos, y_pos

    def overlay_garment(self, frame, landmarks):
        """Overlay the garment on the detected person with shoulder-based automatic sizing"""
        try:
            frame_height, frame_width = frame.shape[:2]
            garment_type = self.garment_type_var.get()

            # Calculate automatic size and position based on shoulders
            garment_width, garment_height, x_pos, y_pos = self.calculate_auto_size_by_shoulders(landmarks, garment_type)

            # Ensure positive dimensions
            garment_width = max(1, garment_width)
            garment_height = max(1, garment_height)

            # Resize garment to calculated dimensions
            resized_garment = cv2.resize(self.processed_garment_image, (garment_width, garment_height))

            # Apply the garment overlay
            frame = self.apply_garment_overlay(frame, resized_garment, x_pos, y_pos)

        except Exception as e:
            print(f"Error overlaying garment: {e}")

        return frame

    def apply_garment_overlay(self, frame, garment, x_pos, y_pos):
        """Apply the garment overlay with proper alpha blending"""
        try:
            frame_height, frame_width = frame.shape[:2]
            garment_height, garment_width = garment.shape[:2]

            # Ensure position is within frame bounds
            x_pos = max(0, min(x_pos, frame_width - 1))
            y_pos = max(0, min(y_pos, frame_height - 1))

            # Calculate ROI boundaries
            x_end = min(x_pos + garment_width, frame_width)
            y_end = min(y_pos + garment_height, frame_height)

            # Calculate actual ROI dimensions
            roi_width = x_end - x_pos
            roi_height = y_end - y_pos

            if roi_width <= 0 or roi_height <= 0:
                return frame

            # Crop garment to fit ROI
            garment_roi = garment[0:roi_height, 0:roi_width]
            frame_roi = frame[y_pos:y_end, x_pos:x_end]

            # Apply alpha blending
            if garment_roi.shape[2] == 4:  # Has alpha channel
                alpha = garment_roi[:, :, 3] / 255.0
                transparency = self.transparency_var.get()
                alpha = alpha * transparency

                # Expand alpha to 3 channels for blending
                alpha_expanded = np.stack([alpha, alpha, alpha], axis=2)

                # Blend images
                blended = (1 - alpha_expanded) * frame_roi + alpha_expanded * garment_roi[:, :, :3]
                frame[y_pos:y_end, x_pos:x_end] = blended.astype(np.uint8)
            else:
                # No alpha channel, use transparency setting
                transparency = self.transparency_var.get()
                blended = cv2.addWeighted(frame_roi, 1 - transparency, garment_roi, transparency, 0)
                frame[y_pos:y_end, x_pos:x_end] = blended

        except Exception as e:
            print(f"Error in apply_garment_overlay: {e}")

        return frame

    def run(self):
        self.root.mainloop()


# Main application
if __name__ == "__main__":
    app = ARGarmentTryOn()
    app.run()