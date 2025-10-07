import os, io, json, uuid, math
from datetime import datetime
from PIL import Image
import numpy as np
import cv2

from flask import Flask, render_template, request, jsonify, send_from_directory, url_for

# --- ML / vision deps ---
from tensorflow.keras.models import load_model
import mediapipe as mp
from rembg import remove as rembg_remove

# ---------- CONFIG ----------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'models')
STATIC_DIR = os.path.join(BASE_DIR, 'static')
UPLOADS_DIR = os.path.join(STATIC_DIR, 'uploads')
OUTPUTS_DIR = os.path.join(STATIC_DIR, 'outputs')

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)

IMG_SIZE = (224, 224)  # must match training

# ---------- LOAD CLASSIFIER ----------
model = None
model_name = None
for fname in ['best_clothing_model.h5', 'clothing_model_final.h5']:
    path = os.path.join(MODELS_DIR, fname)
    if os.path.exists(path):
        model = load_model(path)
        model_name = fname
        break
if model is None:
    raise RuntimeError("No model file in ./models (expected best_clothing_model.h5 or clothing_model_final.h5)")

with open(os.path.join(MODELS_DIR, 'class_labels.json'),'r') as f:
    class_indices = json.load(f)
idx2label = {v:k for k,v in class_indices.items()}
class_names = [k for k,_ in sorted(class_indices.items(), key=lambda kv: kv[1])]

# head type + rejection threshold
head_type = 'softmax'
cfg_path = os.path.join(MODELS_DIR, 'model_config.json')
if os.path.exists(cfg_path):
    with open(cfg_path,'r') as f:
        head_type = json.load(f).get('head_type','softmax')

TAU = 0.75
tau_path = os.path.join(MODELS_DIR, 'rejection_threshold.json')
if os.path.exists(tau_path):
    try:
        with open(tau_path,'r') as f:
            TAU = float(json.load(f).get('tau', TAU))
    except:
        pass

# ---------- HELPERS ----------
def pil_from_bytes(b):
    return Image.open(io.BytesIO(b)).convert('RGBA')

def preprocess_for_model(pil_img):
    rgb = pil_img.convert('RGB').resize(IMG_SIZE, Image.LANCZOS)
    arr = np.asarray(rgb).astype(np.float32)/255.0
    return np.expand_dims(arr, 0)

def decide_label(probs):
    p = probs.reshape(-1)
    if head_type == 'softmax':
        idx = int(np.argmax(p)); conf = float(p[idx])
        if conf < TAU:
            return 'UNKNOWN', conf, {}
        return idx2label[idx], conf, {}
    else:
        # expect 2 outputs ordered as in class_names
        assert len(p) == 2, "sigmoid_ovr expects 2 outputs"
        p0, p1 = float(p[0]), float(p[1])
        # mapping relies on training order; our class_names are sorted by index
        label0, label1 = class_names[0], class_names[1]
        cond0 = (p0 >= TAU) and (p1 < TAU)
        cond1 = (p1 >= TAU) and (p0 < TAU)
        if cond0: return label0, p0, {}
        if cond1: return label1, p1, {}
        return 'UNKNOWN', max(p0,p1), {}

def save_image(pil_img, subdir, prefix):
    fname = f"{prefix}_{uuid.uuid4().hex[:8]}.png"
    out_dir = OUTPUTS_DIR if subdir=='outputs' else UPLOADS_DIR
    path = os.path.join(out_dir, fname)
    pil_img.save(path)
    # return a URL and a POSIX-style relative path to avoid Windows '\' issues
    rel = f"{subdir}/{fname}".replace("\\", "/")
    return path, url_for('static', filename=rel), rel

def overlay_rgba_on_rgb(bg_rgb, fg_rgba, center_xy, scale=1.0):
    """
    bg_rgb: HxWx3 uint8
    fg_rgba: HxWx4 uint8 (with alpha)
    center_xy: (cx, cy) location in bg where fg center will be placed
    """
    H, W = bg_rgb.shape[:2]
    fh, fw = fg_rgba.shape[:2]
    # scale
    new_w = max(1, int(fw * scale))
    new_h = max(1, int(fh * scale))
    fg = cv2.resize(fg_rgba, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    cx, cy = int(center_xy[0]), int(center_xy[1])
    x0 = int(cx - new_w/2); y0 = int(cy - new_h/2)
    x1 = x0 + new_w; y1 = y0 + new_h

    # bounds
    x0c, y0c = max(0, x0), max(0, y0)
    x1c, y1c = min(W, x1), min(H, y1)
    if x0c >= x1c or y0c >= y1c:
        return bg_rgb  # nothing to draw

    # crops
    fg_crop = fg[(y0c - y0):(y1c - y0), (x0c - x0):(x1c - x0)]
    alpha = (fg_crop[:,:,3:4] / 255.0).astype(np.float32)
    bg_crop = bg_rgb[y0c:y1c, x0c:x1c].astype(np.float32)

    comp = alpha * fg_crop[:,:,:3].astype(np.float32) + (1.0 - alpha) * bg_crop
    bg_rgb[y0c:y1c, x0c:x1c] = comp.astype(np.uint8)
    return bg_rgb

# --- MediaPipe Pose ---
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=True, model_complexity=1, enable_segmentation=False, min_detection_confidence=0.5)

def get_keypoints(pil_img):
    img = np.array(pil_img.convert('RGB'))
    results = pose.process(cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
    if not results.pose_landmarks:
        return None, img.shape[1], img.shape[0]
    lm = results.pose_landmarks.landmark
    W, H = img.shape[1], img.shape[0]
    # Useful landmarks
    kp = {
        'l_shoulder': (lm[mp_pose.PoseLandmark.LEFT_SHOULDER].x * W,  lm[mp_pose.PoseLandmark.LEFT_SHOULDER].y * H),
        'r_shoulder': (lm[mp_pose.PoseLandmark.RIGHT_SHOULDER].x * W, lm[mp_pose.PoseLandmark.RIGHT_SHOULDER].y * H),
        'l_hip':      (lm[mp_pose.PoseLandmark.LEFT_HIP].x * W,       lm[mp_pose.PoseLandmark.LEFT_HIP].y * H),
        'r_hip':      (lm[mp_pose.PoseLandmark.RIGHT_HIP].x * W,      lm[mp_pose.PoseLandmark.RIGHT_HIP].y * H),
        'l_ankle':    (lm[mp_pose.PoseLandmark.LEFT_ANKLE].x * W,     lm[mp_pose.PoseLandmark.LEFT_ANKLE].y * H),
        'r_ankle':    (lm[mp_pose.PoseLandmark.RIGHT_ANKLE].x * W,    lm[mp_pose.PoseLandmark.RIGHT_ANKLE].y * H),
    }
    return kp, W, H

def place_garment(body_pil, garment_rgba_pil, garment_label):
    """
    Improved placement:
    - T-shirt: scaled to shoulder width * 2.0, centered at chest (shoulder->hip mid)
    - Trousers: scaled to hip->ankle height, centered on legs
    """
    kp, W, H = get_keypoints(body_pil)
    if kp is None:
        raise RuntimeError("Could not detect body pose. Try a clearer, full-body image.")

    body_rgb = np.array(body_pil.convert('RGB'))
    gar_rgba = np.array(garment_rgba_pil.convert('RGBA'))

    def dist(a, b): return math.hypot(a[0]-b[0], a[1]-b[1])

    if garment_label.lower() in ['tshirt', 't-shirt']:
        # shoulders and hips
        ls, rs = kp['l_shoulder'], kp['r_shoulder']
        lh, rh = kp['l_hip'], kp['r_hip']
        shoulder_w = dist(ls, rs)
        torso_h = ((lh[1] + rh[1]) / 2.0) - ((ls[1] + rs[1]) / 2.0)

        # width scaling
        target_w = shoulder_w * 2.0
        scale = max(0.3, target_w / gar_rgba.shape[1])

        # vertical placement: a bit below shoulders, toward chest
        cx = (ls[0] + rs[0]) / 2.0
        cy = ((ls[1] + rs[1]) / 2.0) + torso_h * 0.35
        comp = overlay_rgba_on_rgb(body_rgb, gar_rgba, (cx, cy), scale=scale)

    elif garment_label.lower() in ['trousers', 'trouser']:
        lh, rh = kp['l_hip'], kp['r_hip']
        la, ra = kp['l_ankle'], kp['r_ankle']
        hip_w = dist(lh, rh)
        leg_h = ((la[1] + ra[1]) / 2.0) - ((lh[1] + rh[1]) / 2.0)

        # scale trousers height to exactly match leg length
        height_scale = leg_h / gar_rgba.shape[0]
        width_scale = (hip_w * 1.6) / gar_rgba.shape[1]
        scale = max(height_scale, width_scale)

        # center around thighs (mid hip → ankle)
        cx = (lh[0] + rh[0]) / 2.0
        cy = ( (lh[1] + rh[1]) / 2.0 + ( (la[1] + ra[1]) / 2.0 ) ) / 2.0
        comp = overlay_rgba_on_rgb(body_rgb, gar_rgba, (cx, cy), scale=scale)

    else:
        raise RuntimeError("Unsupported garment label for placement.")

    return Image.fromarray(comp)

def remove_bg(pil_img):
    # rembg expects bytes; but we can pass PIL directly
    out = rembg_remove(pil_img.convert('RGBA'))
    return out

# ---------- FLASK ----------
app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/classify_garment', methods=['POST'])
def classify_garment():
    if 'garment' not in request.files:
        return jsonify({'error': 'No garment file'}), 400
    f = request.files['garment']
    raw = f.read()
    if not raw:
        return jsonify({'error': 'Empty file'}), 400

    # save original garment
    pil = pil_from_bytes(raw).convert('RGB')
    garment_path, garment_url, _ = save_image(pil, 'uploads', 'garment')

    # classify
    x = preprocess_for_model(pil)
    probs = model.predict(x, verbose=0)[0]
    label, conf, _ = decide_label(probs)

    if label not in ('tshirt', 'trousers'):
        return jsonify({'error': f'Garment must be a T-shirt or Trousers. Detected: {label}'}), 400

    # remove background
    cutout = remove_bg(pil)
    cutout_path_abs, cutout_url, cutout_rel = save_image(cutout, 'outputs', f'cutout_{label}')

    return jsonify({
        'label': label,
        'confidence': float(conf),
        'garment_url': garment_url,
        'cutout_url': cutout_url,
        'cutout_path': cutout_rel  # POSIX-style relative path under /static
    })

@app.route('/try_on', methods=['POST'])
def try_on():
    # REQUIRE cutout_path in form (we now always send it from the frontend)
    cutout_rel = request.form.get('cutout_path')
    if not cutout_rel:
        return jsonify({'error':'Missing cutout_path (finish Step 1 first).'}), 400

    # sanitize/normalize
    cutout_rel = cutout_rel.replace("\\", "/")
    cutout_abs = os.path.join(STATIC_DIR, cutout_rel)
    if not os.path.exists(cutout_abs):
        return jsonify({'error': 'Cutout image not found on server.'}), 400

    # infer garment label from filename (tshirt / trousers)
    lower = cutout_abs.lower()
    if 'tshirt' in lower or 't-shirt' in lower:
        gar_label = 'tshirt'
    elif 'trousers' in lower or 'trouser' in lower:
        gar_label = 'trousers'
    else:
        gar_label = 'tshirt'  # default fallback

    if 'body' not in request.files:
        return jsonify({'error': 'No body image provided'}), 400

    body_bytes = request.files['body'].read()
    if not body_bytes:
        return jsonify({'error': 'Empty body image'}), 400

    body_pil = pil_from_bytes(body_bytes).convert('RGB')
    garment_rgba = Image.open(cutout_abs).convert('RGBA')

    try:
        composed = place_garment(body_pil, garment_rgba, gar_label)
    except Exception as e:
        return jsonify({'error': f'Pose/placement failed: {e}'}), 400

    out_path_abs, out_url, _ = save_image(composed, 'outputs', f'result_{gar_label}')
    return jsonify({'result_url': out_url})

# small helper so client can POST the cutout_path easily
@app.before_request
def inject_cutout_into_form():
    """
    Allow client to avoid manually attaching cutout_path by reusing
    what they stored in sessionStorage. We’ll accept it if provided.
    (In this minimal demo, the JS sends only the body; you can extend to also send cutout_path.)
    """
    # If front-end doesn’t send it, we can’t magically fetch sessionStorage here,
    # so keep this stub to clarify behavior.
    pass

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)