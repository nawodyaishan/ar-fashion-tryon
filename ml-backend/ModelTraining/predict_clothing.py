# --- UPDATED: batch predict all images in test_images/ ---
import os, json, numpy as np, cv2, csv
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import matplotlib.pyplot as plt
from PIL import Image

# -------------------- Load model --------------------
for fname in ['best_clothing_model.h5', 'clothing_model_final.h5']:
    try:
        model = load_model(fname); model_name = fname; break
    except: continue
if 'model' not in locals():
    print("ERROR: no model file"); exit(1)

# -------------------- Load labels --------------------
with open('class_labels.json','r') as f: class_indices = json.load(f)
class_labels = {v:k for k,v in class_indices.items()}
class_names  = [k for k,_ in sorted(class_indices.items(), key=lambda kv: kv[1])]

# -------------------- Head type + threshold --------------------
head_type = 'softmax'
if os.path.exists('model_config.json'):
    with open('model_config.json','r') as f: head_type = json.load(f).get('head_type','softmax')

TAU = float(os.environ.get('REJECT_TAU', '0.75'))
if os.path.exists('rejection_threshold.json'):
    try:
        with open('rejection_threshold.json','r') as f: TAU = float(json.load(f).get('tau', TAU))
    except: pass

print(f"Model={model_name}, head_type={head_type}, classes={class_names}, TAU={TAU:.2f}")

# -------------------- Preprocess --------------------
def preprocess(img_path, target=(224,224)):
    img = cv2.imread(img_path)
    if img is None: raise ValueError(f"Cannot read {img_path}")
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(rgb).resize(target, Image.LANCZOS)
    arr = np.asarray(pil).astype(np.float32)/255.0
    return np.expand_dims(arr,0), pil

# -------------------- Decide label --------------------
def decide_label(probs):
    p = probs.reshape(-1)
    if head_type == 'softmax':
        idx = int(np.argmax(p)); conf = float(p[idx])
        if conf < TAU:
            return 'UNKNOWN', conf, {'reason':'low_max_softmax','max_prob':conf}
        return class_labels[idx], conf, {}
    else:
        assert len(p) == 2, "sigmoid_ovr expects 2 outputs"
        p_trou, p_tee = float(p[0]), float(p[1])
        cond_trou = p_trou >= TAU and p_tee < TAU
        cond_tee  = p_tee >= TAU and p_trou < TAU
        if cond_trou: return 'trousers', p_trou, {}
        if cond_tee:  return 'tshirt',   p_tee,  {}
        return 'UNKNOWN', max(p_trou,p_tee), {'reason':'sigmoid_reject','p_trousers':p_trou,'p_tshirt':p_tee}

# -------------------- Predict one --------------------
def predict_one(img_path, show=True):
    batch, disp = preprocess(img_path)
    raw = model.predict(batch, verbose=0)[0]
    label, conf, meta = decide_label(raw)

    if show:
        fig, (ax1, ax2) = plt.subplots(1,2, figsize=(12,5))
        ax1.imshow(disp); ax1.axis('off')
        title = f"Predicted: {label} | conf: {conf*100:.1f}%"
        ax1.set_title(title, color=('gray' if label=='UNKNOWN' else 'green'), fontweight='bold')

        names = class_names
        vals  = (raw*100.0).tolist()
        bars = ax2.bar(range(len(names)), vals)
        ax2.set_xticks(range(len(names))); ax2.set_xticklabels([n.upper() for n in names])
        ax2.set_ylim(0,100); ax2.set_ylabel('Confidence (%)')
        ax2.axhline(y=TAU*100, linestyle='--', alpha=0.7, label=f'TAU {TAU:.2f}')
        ax2.legend()
        for b,v in zip(bars, vals):
            ax2.text(b.get_x()+b.get_width()/2., v+1, f"{v:.1f}%", ha='center', fontweight='bold')
        plt.tight_layout(); plt.show()

    return {'label':label, 'confidence':conf, 'raw':raw.tolist(), 'meta':meta}

# -------------------- Batch predict test_images/ --------------------
if __name__ == "__main__":
    folder = "test_images"
    exts = (".jpg",".jpeg",".png",".bmp",".tiff")
    files = [os.path.join(folder,f) for f in os.listdir(folder) if f.lower().endswith(exts)]

    if not files:
        print("No images found in test_images/"); exit(0)

    results = []
    for f in files:
        print(f"\n>>> {f}")
        out = predict_one(f, show=True)
        results.append({'file':f, 'label':out['label'], 'confidence':out['confidence'], 'raw':out['raw']})

    # save to CSV
    with open("predictions.csv","w",newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=["file","label","confidence","raw"])
        writer.writeheader(); writer.writerows(results)
    print("\nSaved all predictions to predictions.csv")
