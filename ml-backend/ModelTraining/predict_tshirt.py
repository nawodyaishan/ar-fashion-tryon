import os
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import matplotlib.pyplot as plt

# --- Step 1: Load the trained model ---
model = load_model('tshirt_model.h5')

# --- Step 2: Define image preprocessing function ---
def preprocess_image(img_path, target_size=(150, 150)):
    img = image.load_img(img_path, target_size=target_size)
    img_array = image.img_to_array(img)
    img_array = img_array / 255.0  # Rescale to match training
    return np.expand_dims(img_array, axis=0), img  # Return batch format + original image for display

# --- Step 3: Predict function ---
def predict_tshirt(img_path):
    img_tensor, display_img = preprocess_image(img_path)
    prediction = model.predict(img_tensor)[0][0]
    
    label = 'T-SHIRT' if prediction > 0.5 else 'NOT A T-SHIRT'
    confidence = prediction if prediction > 0.5 else 1 - prediction
    
    # Show result
    plt.imshow(display_img)
    plt.title(f"{label} ({confidence*100:.2f}% confidence)")
    plt.axis('off')
    plt.show()

# --- Step 4: Run predictions on all images in a folder ---
test_folder = 'test_images'  # Create this folder and add test images
for filename in os.listdir(test_folder):
    if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
        print(f"\nPredicting: {filename}")
        predict_tshirt(os.path.join(test_folder, filename))