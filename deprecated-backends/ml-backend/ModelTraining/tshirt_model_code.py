import os
import zipfile
import numpy as np
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
import matplotlib.pyplot as plt

# --- Step 1: Unzip the dataset ---
zip_path = 'clothing.zip'  
extract_path = 'clothing_dataset'

if not os.path.exists(extract_path):
    if os.path.exists(zip_path):
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_path)
    else:
        print(f"Dataset folder '{extract_path}' not found. Please ensure your folder structure is correct.")

# --- Step 2: Check dataset structure and balance ---
def check_dataset_structure(dataset_path):
    """Check if dataset is properly structured and balanced"""
    if not os.path.exists(dataset_path):
        print(f"Error: Dataset path '{dataset_path}' does not exist!")
        return False
    
    classes = [d for d in os.listdir(dataset_path) 
               if os.path.isdir(os.path.join(dataset_path, d))]
    
    if len(classes) < 2:
        print(f"Error: Found only {len(classes)} class folders. Need at least 2 classes.")
        return False
    
    print(f"Found classes: {classes}")
    
    # Check class distribution
    class_counts = {}
    total_images = 0
    
    for class_name in classes:
        class_path = os.path.join(dataset_path, class_name)
        image_files = [f for f in os.listdir(class_path) 
                      if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff'))]
        count = len(image_files)
        class_counts[class_name] = count
        total_images += count
        
        print(f"  {class_name}: {count} images")
        
        if count < 50:
            print(f"  WARNING: {class_name} has very few images ({count}). Recommend at least 100+ images per class.")
    
    print(f"Total images: {total_images}")
    
    # Check for class imbalance
    max_count = max(class_counts.values())
    min_count = min(class_counts.values())
    imbalance_ratio = max_count / min_count if min_count > 0 else float('inf')
    
    if imbalance_ratio > 3:
        print(f"WARNING: Class imbalance detected! Ratio: {imbalance_ratio:.2f}")
        print("Consider balancing your dataset or using class weights.")
    
    return True

# Check dataset before training
if not check_dataset_structure(extract_path):
    exit(1)

# --- Step 3: Define Image Parameters ---
IMG_SIZE = (224, 224)  # Increased size for better feature extraction
BATCH_SIZE = 16  # Reduced batch size for better gradient updates

# --- Step 4: Enhanced Data Generators ---
# Training data generator with extensive augmentation
train_datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2,
    rotation_range=30,
    width_shift_range=0.3,
    height_shift_range=0.3,
    shear_range=0.2,
    zoom_range=0.3,
    horizontal_flip=True,
    brightness_range=[0.7, 1.3],
    channel_shift_range=0.2,
    fill_mode='nearest'
)

# Validation data generator (only rescaling)
val_datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2
)

train_generator = train_datagen.flow_from_directory(
    extract_path,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='training',
    shuffle=True,
    seed=42
)

val_generator = val_datagen.flow_from_directory(
    extract_path,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation',
    shuffle=False,
    seed=42
)

# Check if generators have data
if train_generator.samples == 0:
    print("ERROR: No training images found! Check your dataset structure.")
    exit(1)
if val_generator.samples == 0:
    print("ERROR: No validation images found! Check your dataset structure.")
    exit(1)

print(f"Training samples: {train_generator.samples}")
print(f"Validation samples: {val_generator.samples}")

# Print class indices and save them
print("Class indices:", train_generator.class_indices)
num_classes = len(train_generator.class_indices)

# Save class labels for later use
import json
with open('class_labels.json', 'w') as f:
    json.dump(train_generator.class_indices, f)
print("Class labels saved to 'class_labels.json'")

# --- Step 5: Build Improved CNN Model ---
def create_improved_model(input_shape, num_classes):
    model = Sequential([
        # First Convolutional Block
        Conv2D(32, (3, 3), activation='relu', input_shape=input_shape, padding='same'),
        BatchNormalization(),
        Conv2D(32, (3, 3), activation='relu', padding='same'),
        MaxPooling2D(2, 2),
        Dropout(0.25),
        
        # Second Convolutional Block
        Conv2D(64, (3, 3), activation='relu', padding='same'),
        BatchNormalization(),
        Conv2D(64, (3, 3), activation='relu', padding='same'),
        MaxPooling2D(2, 2),
        Dropout(0.25),
        
        # Third Convolutional Block
        Conv2D(128, (3, 3), activation='relu', padding='same'),
        BatchNormalization(),
        Conv2D(128, (3, 3), activation='relu', padding='same'),
        MaxPooling2D(2, 2),
        Dropout(0.25),
        
        # Fourth Convolutional Block
        Conv2D(256, (3, 3), activation='relu', padding='same'),
        BatchNormalization(),
        Conv2D(256, (3, 3), activation='relu', padding='same'),
        MaxPooling2D(2, 2),
        Dropout(0.25),
        
        # Classifier
        Flatten(),
        Dense(512, activation='relu'),
        BatchNormalization(),
        Dropout(0.5),
        Dense(256, activation='relu'),
        BatchNormalization(),
        Dropout(0.5),
        Dense(num_classes, activation='softmax')
    ])
    
    return model

model = create_improved_model((IMG_SIZE[0], IMG_SIZE[1], 3), num_classes)

# --- Step 6: Compile Model with Better Optimizer ---
optimizer = Adam(learning_rate=0.0001)  # Lower learning rate for better convergence
model.compile(
    optimizer=optimizer,
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# Print model summary
model.summary()

# --- Step 7: Enhanced Callbacks ---
callbacks = [
    ModelCheckpoint(
        'best_clothing_model.h5',
        monitor='val_accuracy',
        save_best_only=True,
        save_weights_only=False,
        verbose=1
    ),
    EarlyStopping(
        monitor='val_accuracy',
        patience=10,
        verbose=1,
        restore_best_weights=True
    ),
    ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.2,
        patience=5,
        min_lr=0.00001,
        verbose=1
    )
]

# --- Step 8: Calculate class weights to handle imbalance ---
from sklearn.utils.class_weight import compute_class_weight

# Get class distribution from training generator
class_counts = {}
for class_name, class_index in train_generator.class_indices.items():
    class_path = os.path.join(extract_path, class_name)
    image_files = [f for f in os.listdir(class_path) 
                  if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff'))]
    class_counts[class_index] = len(image_files)

# Compute class weights
classes = np.array(list(class_counts.keys()))
counts = np.array(list(class_counts.values()))
class_weights = compute_class_weight('balanced', classes=classes, y=np.repeat(classes, counts))
class_weight_dict = dict(zip(classes, class_weights))

print(f"Class weights: {class_weight_dict}")

# --- Step 9: Train Model ---
print("Starting training...")
EPOCHS = 50

# Calculate steps per epoch
steps_per_epoch = max(1, train_generator.samples // BATCH_SIZE)
validation_steps = max(1, val_generator.samples // BATCH_SIZE)

print(f"Steps per epoch: {steps_per_epoch}")
print(f"Validation steps: {validation_steps}")

history = model.fit(
    train_generator,
    steps_per_epoch=steps_per_epoch,
    epochs=EPOCHS,
    validation_data=val_generator,
    validation_steps=validation_steps,
    callbacks=callbacks,
    class_weight=class_weight_dict,
    verbose=1
)

# --- Step 10: Save Final Model ---
model.save('clothing_model_final.h5')
print("✅ Final model saved as 'clothing_model_final.h5'")

# --- Step 11: Training Visualization ---
def plot_training_history(history):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    
    # Accuracy plot
    ax1.plot(history.history['accuracy'], label='Training Accuracy')
    ax1.plot(history.history['val_accuracy'], label='Validation Accuracy')
    ax1.set_title('Model Accuracy')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Accuracy')
    ax1.legend()
    ax1.grid(True)
    
    # Loss plot
    ax2.plot(history.history['loss'], label='Training Loss')
    ax2.plot(history.history['val_loss'], label='Validation Loss')
    ax2.set_title('Model Loss')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Loss')
    ax2.legend()
    ax2.grid(True)
    
    plt.tight_layout()
    plt.savefig('training_history.png', dpi=300, bbox_inches='tight')
    plt.show()

# Plot training results
plot_training_history(history)

# --- Step 12: Final Results ---
print(f"\n{'='*60}")
print("TRAINING COMPLETED")
print(f"{'='*60}")
print(f"Final Training Accuracy: {history.history['accuracy'][-1]:.4f}")
print(f"Final Validation Accuracy: {history.history['val_accuracy'][-1]:.4f}")
print(f"Best Validation Accuracy: {max(history.history['val_accuracy']):.4f}")
print(f"Classes: {train_generator.class_indices}")
print(f"Models saved: 'best_clothing_model.h5' and 'clothing_model_final.h5'")
print(f"Class labels saved: 'class_labels.json'")
print(f"Training history plot saved: 'training_history.png'")