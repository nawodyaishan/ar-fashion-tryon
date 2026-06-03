import cv2
import mediapipe as mp
import numpy as np
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageTk
import threading
import os
import torch
import pytorch3d
from pytorch3d.structures import Meshes
from pytorch3d.renderer import (
    MeshRenderer,
    MeshRasterizer,
    SoftPhongShader,
    TexturesVertex,
    PerspectiveCameras
)
from pytorch3d.io import load_objs_as_meshes
import torchvision.transforms as T
from depth_anything_v2.dpt import DepthAnythingV2

class ARGarmentTryOn:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("AR/VR Garment Try-On Tool with 3D Model")
        self.root.geometry("900x600")

        # Initialize MediaPipe
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_pose = mp.solutions.pose

        # Initialize DepthAnythingV2
        self.depth_model = DepthAnythingV2(encoder='vitb', features=128)
        self.depth_model.eval()
        if torch.cuda.is_available():
            self.depth_model = self.depth_model.cuda()

        # Variables
        self.original_garment_image = None
        self.processed_garment_image = None
        self.garment_mesh = None
        self.garment_path = None
        self.camera_running = False
        self.cap = None
        self.garment_type = "tshirt"

        # Camera parameters for 3D rendering
        self.focal_length = 1000
        self.principal_point = (640, 360)  # Assuming 1280x720 resolution
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.setup_ui()

    def setup_ui(self):
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Title
        title_label = ttk.Label(main_frame, text="AR/VR Garment Try-On Tool with 3D Model",
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

        self.process_btn = ttk.Button(upload_frame, text="Remove Background & Generate 3D",
                                      command=self.process_background_and_3d, state='disabled')
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
        ttk.Label(processed_frame, text="Processed", font=('Arial', -motorsports.com10, 'bold')).grid(row=0, column=0)
        self.processed_preview = ttk.Label(processed_frame, text="Process image to preview")
        self.processed_preview.grid(row=1, column=0)

        # Control buttons
        control_frame = ttk.Frame(main_frame)
        control_frame.grid(row=20, column=0, columnspan=3, pady=20)

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
            self.status_label.config(text Seguridad="Image loaded. Please process for 3D model.", foreground="orange")

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

    def process_background_and_3d(self):
        """Remove background and generate 3D model from garment image"""
        if self.original_garment_image is None:
            messagebox.showerror("Error", "Please select an image first.")
            return

        try:
            self.status_label.config(text="Processing background removal and 3D model...", foreground="orange")
            self.root.update()

            # Remove background
            self.processed_garment_image = self.remove_background_threshold()

            # Generate 3D model
            self.garment_mesh = self.generate_3d_model()

            self.show_processed_preview()
            self.start_btn.config(state='normal')
            self.status_label.config(text="3D model generated successfully!", foreground="green")

        except Exception as e:
            messagebox.showerror("Error", f"Failed to process image: {str(e)}")
            self.status_label.config(text="Processing failed.", foreground="red")
            print(f"Processing error: {e}")

    def remove_background_threshold(self):
        """Remove background using automatic threshold detection for e-commerce images"""
        img = self.original_garment_image.copy()
        height, width = img.shape[:2]

        # Convert to different color spaces for better background detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # Detect white/light background
        white_mask = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                           cv2.THRESH_BINARY_INV, 15, 10)

        # Edge detection
        edges = cv2.Canny(gray, 50, 150)

        # Color-based segmentation
        corner_samples = [
            img[0:20, 0:20],
            img[0:20, width - 20:width],
            img[height - 20:height, 0:20],
            img[height - 20:height, width - 20:width]
        ]
        bg_color = np.mean([np.mean(sample.reshape(-1, 3), axis=0) for sample in corner_samples], axis=0)
        color_diff = np.sqrt(np.sum((img - bg_color) ** 2, axis=2))
        color_threshold = np.mean(color_diff) + np.std(color_diff) * 0.5
        color_mask = (color_diff > color_threshold).astype(np.uint8) * 255

        # Combine masks
        combined_mask = cv2.bitwise_or(white_mask, color_mask)
        kernel = np.ones((3, 3), np.uint8)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel, iterations=1)

        # Keep largest contour
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

        # Create alpha channel
        alpha = final_mask
        b, g, r = cv2.split(img)
        img_with_alpha = cv2.merge([b, g, r, alpha])

        return img_with_alpha

    def generate_3d_model(self):
        """Generate a 3D mesh from the processed garment image using depth estimation"""
        try:
            # Convert image to tensor for depth estimation
            img_rgb = cv2.cvtColor(self.processed_garment_image, cv2.COLOR_BGRA2RGB)
            img_tensor = T.ToTensor()(img_rgb).unsqueeze(0).to(self.device)

            # Estimate depth using DepthAnythingV2
            with torch.no_grad():
                depth_map = self.depth_model(img_tensor)[0]

            # Normalize depth map
            depth_map = depth_map.squeeze().cpu().numpy()
            depth_map = (depth_map - depth_map.min()) / (depth_map.max() - depth_map.min())

            # Generate point cloud from depth map
            height, width = depth_map.shape
            vertices = []
            for i in range(height):
                for j in range(width):
                    if self.processed_garment_image[i, j, 3] > 0:  # Check alpha channel
                        z = depth_map[i, j]
                        vertices.append([j / width, i / height, z])

            vertices = torch.tensor(vertices, dtype=torch.float32, device=self.device)

            # Create simple triangular faces (basic triangulation for demo)
            faces = []
            for i in range(height - 1):
                for j in range(width - 1):
                    if (self.processed_garment_image[i, j, 3] > 0 and
                        self.processed_garment_image[i + 1, j, 3] > 0 and
                        self.processed_garment_image[i, j + 1, 3] > 0):
                        idx = i * width + j
                        faces.append([idx, idx + 1, idx + width])
                        faces.append([idx + 1, idx + width + 1, idx + width])

            faces = torch.tensor(faces, dtype=torch.int64, device=self.device)

            # Create texture from the processed image
            texture_image = torch.tensor(img_rgb / 255.0, dtype=torch.float32, device=self.device)
            textures = TexturesVertex(verts_features=torch.ones_like(vertices) * texture_image.mean(dim=(0, 1)))

            # Create PyTorch3D mesh
            mesh = Meshes(verts=[vertices], faces=[faces], textures=textures)

            return mesh

        except Exception as e:
            print(f"Error generating 3D model: {e}")
            return None

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

        # Initialize PyTorch3D renderer
        cameras = PerspectiveCameras(
            focal_length=((self.focal_length, self.focal_length),),
            principal_point=(self.principal_point,),
            device=self.device
        )
        renderer = MeshRenderer(
            rasterizer=MeshRasterizer(cameras=cameras),
            shader=SoftPhongShader(device=self.device)
        )

        with self.mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
            while self.camera_running:
                ret, frame = self.cap.read()
                if not ret:
                    break

                # Flip frame horizontally for mirror effect
                frame = cv2.flip(frame, 1)

                # Process the frame
                frame_with_garment = self.process_frame(frame, pose, renderer, cameras)

                # Display the frame
                cv2.imshow('AR/VR Garment Try-On', frame_with_garment)

                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break

        self.cap.release()
        cv2.destroyAllWindows()

    def process_frame(self, frame, pose, renderer, cameras):
        """Process each frame to detect pose and render 3D garment"""
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)

        if results.pose_landmarks and self.garment_mesh is not None:
            frame = self.render_3d_garment(frame, results.pose_landmarks, renderer, cameras)

        return frame

    def calculate_3d_pose(self, landmarks):
        """Calculate 3D pose transformation based on landmarks"""
        frame_height, frame_width = 720, 1280
        landmarks_dict = {}
        for idx, landmark in enumerate(landmarks.landmark):
            landmarks_dict[idx] = {
                'x': landmark.x * frame_width,
                'y': landmark.y * frame_height,
                'z': landmark.z  # MediaPipe provides z-coordinate
            }

        # Get shoulder points
        r_shoulder = landmarks_dict[12]
        l_shoulder = landmarks_dict[11]

        # Calculate shoulder center and scale
        shoulder_center = torch.tensor([(l_shoulder['x'] + r_shoulder['x']) / 2,
                                       (l_shoulder['y'] + r_shoulder['y']) / 2,
                                       (l_shoulder['z'] + r_shoulder['z']) / 2],
                                      dtype=torch.float32, device=self.device)

        shoulder_width = np.sqrt((l_shoulder['x'] - r_shoulder['x']) ** 2 +
                                 (l_shoulder['y'] - r_shoulder['y']) ** 2 +
                                 (l_shoulder['z'] - r_shoulder['z']) ** 2)

        scale = shoulder_width * self.width_mult_var.get() / 200.0  # Normalize to mesh scale

        # Simple rotation based on shoulder orientation
        rotation = torch.eye(3, device=self.device)
        return shoulder_center, scale, rotation

    def render_3d_garment(self, frame, landmarks, renderer, cameras):
        """Render the 3D garment onto the frame"""
        try:
            # Get 3D pose transformation
            translation, scale, rotation = self.calculate_3d_pose(landmarks)

            # Transform mesh
            verts = self.garment_mesh.verts_padded()[0]
            verts = verts * scale
            verts = torch.matmul(verts, rotation.T) + translation

            transformed_mesh = self.garment_mesh.offset_verts(verts - self.garment_mesh.verts_padded()[0])

            # Render mesh
            rendered_image = renderer(transformed_mesh)[0, ..., :3]
            rendered_image = rendered_image.cpu().numpy() * 255.0
            rendered_image = rendered_image.astype(np.uint8)

            # Overlay rendered image onto frame
            mask = (rendered_image.sum(axis=2) > 0).astype(np.uint8) * 255
            alpha = mask / 255.0 * self.transparency_var.get()
            alpha_expanded = np.stack([alpha, alpha, alpha], axis=2)

            frame_roi = frame[:rendered_image.shape[0], :rendered_image.shape[1]]
            blended = (1 - alpha_expanded) * frame_roi + alpha_expanded * rendered_image
            frame[:rendered_image.shape[0], :rendered_image.shape[1]] = blended.astype(np.uint8)

        except Exception as e:
            print(f"Error rendering 3D garment: {e}")

        return frame

    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    app = ARGarmentTryOn()
    app.run()