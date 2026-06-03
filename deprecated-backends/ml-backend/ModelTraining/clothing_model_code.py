# --- UPDATED: train script with open-set friendly options ---
import os, zipfile, json, random
import numpy as np
from tensorflow.keras.preprocessing.image import ImageDataGenerator, load_img, img_to_array
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
from sklearn.utils.class_weight import compute_class_weight
import matplotlib.pyplot as plt

# -------------------- dataset paths --------------------
zip_path = 'clothing.zip'
extract_path = 'clothing_dataset'

if not os.path.exists(extract_path):
    if os.path.exists(zip_path):
        with zipfile.ZipFile(zip_path, 'r') as z: z.extractall(extract_path)
    else:
        print("ERROR: dataset missing"); exit(1)

# -------------------- discover classes --------------------
all_dirs = [d for d in os.listdir(extract_path)
            if os.path.isdir(os.path.join(extract_path, d))]
required = {'tshirt','trousers'}
missing = required - set(all_dirs)
if missing:
    print(f"ERROR: missing required class folders: {missing}")
    exit(1)

# allow optional 'other'
classes = ['trousers','tshirt']  # keep stable order for your project
if 'other' in all_dirs: classes.append('other')
num_classes = len(classes)
print(f"Using classes: {classes}  (num_classes={num_classes})")

# -------------------- generators --------------------
IMG_SIZE = (224,224); BATCH_SIZE = 16
train_datagen = ImageDataGenerator(
    rescale=1./255, validation_split=0.2,
    rotation_range=15, width_shift_range=0.1, height_shift_range=0.1,
    shear_range=0.1, zoom_range=0.1, horizontal_flip=True,
    brightness_range=[0.8,1.2], fill_mode='nearest'
)
val_datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)

train_gen = train_datagen.flow_from_directory(
    extract_path, target_size=IMG_SIZE, batch_size=BATCH_SIZE,
    class_mode='categorical', subset='training', shuffle=True, seed=42,
    classes=classes
)
val_gen = val_datagen.flow_from_directory(
    extract_path, target_size=IMG_SIZE, batch_size=BATCH_SIZE,
    class_mode='categorical', subset='validation', shuffle=False, seed=42,
    classes=classes
)
print("Class indices:", train_gen.class_indices)

# -------------------- class counts & weights --------------------
class_counts = {}
for cname, cidx in train_gen.class_indices.items():
    cpath = os.path.join(extract_path, cname)
    n = len([f for f in os.listdir(cpath)
             if f.lower().endswith(('.jpg','.jpeg','.png','.bmp','.tiff'))])
    class_counts[cidx] = n
print("Class counts:", class_counts)

classes_np = np.array(list(class_counts.keys()))
counts_np  = np.array(list(class_counts.values()))
cw = compute_class_weight('balanced', classes=classes_np, y=np.repeat(classes_np, counts_np))
class_weight = dict(zip(classes_np, cw))
print("Class weights:", class_weight)

# -------------------- model --------------------
def create_model(input_shape, num_classes):
    m = Sequential([
        Conv2D(32, 3, activation='relu', padding='same', input_shape=input_shape),
        BatchNormalization(), MaxPooling2D(2), Dropout(0.2),

        Conv2D(64, 3, activation='relu', padding='same'),
        BatchNormalization(), MaxPooling2D(2), Dropout(0.3),

        Conv2D(128, 3, activation='relu', padding='same'),
        BatchNormalization(), MaxPooling2D(2), Dropout(0.3),

        Conv2D(256, 3, activation='relu', padding='same'),
        BatchNormalization(), MaxPooling2D(2), Dropout(0.4),

        Flatten(),
        Dense(256, activation='relu'),
        BatchNormalization(), Dropout(0.5),

        # HEAD (softmax for >=3, sigmoid for exactly 2)
        Dense(num_classes, activation=('softmax' if num_classes>=3 else 'sigmoid'))
    ])
    return m

model = create_model((IMG_SIZE[0], IMG_SIZE[1], 3), num_classes)

# compile appropriately
if num_classes >= 3:
    loss = 'categorical_crossentropy'
    head_type = 'softmax'
else:
    # two independent one-vs-rest sigmoids
    loss = 'binary_crossentropy'
    head_type = 'sigmoid_ovr'

model.compile(optimizer=Adam(5e-4), loss=loss, metrics=['accuracy'])
model.summary()

# save labels + config
with open('class_labels.json','w') as f: json.dump(train_gen.class_indices, f, indent=2)
with open('model_config.json','w') as f: json.dump({'head_type': head_type}, f, indent=2)
print(f"Saved class_labels.json and model_config.json (head_type={head_type})")

# callbacks
cbs = [
    ModelCheckpoint('best_clothing_model.h5', monitor='val_accuracy', save_best_only=True, mode='max', verbose=1),
    EarlyStopping(monitor='val_accuracy', patience=15, restore_best_weights=True, mode='max', verbose=1),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=7, min_lr=1e-5, verbose=1)
]

# train
EPOCHS = 50
steps_per_epoch = max(1, train_gen.samples // BATCH_SIZE)
val_steps = max(1, val_gen.samples // BATCH_SIZE)
history = model.fit(train_gen, epochs=EPOCHS, steps_per_epoch=steps_per_epoch,
                    validation_data=val_gen, validation_steps=val_steps,
                    callbacks=cbs, class_weight=class_weight, verbose=1)

model.save('clothing_model_final.h5')
print("Saved best_clothing_model.h5 and clothing_model_final.h5")

# optional: quickly estimate a rejection threshold from validation (for softmax)
try:
    val_batch = next(iter(val_gen))
    probs = model.predict(val_batch[0], verbose=0)
    maxp = probs.max(axis=1)
    tau = max(0.6, float(np.quantile(maxp, 0.10)))  # conservative
    with open('rejection_threshold.json','w') as f: json.dump({'tau': tau}, f)
    print(f"Estimated TAU={tau:.2f} from validation; saved to rejection_threshold.json")
except Exception as e:
    print("Could not estimate TAU:", e)