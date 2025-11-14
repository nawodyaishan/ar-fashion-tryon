import argparse
import os
os.environ['CUDA_HOME'] = '/usr/local/cuda'
os.environ['PATH'] = os.environ['PATH'] + ':/usr/local/cuda/bin'
from datetime import datetime

import gradio as gr
import spaces
import numpy as np
import torch
from diffusers.image_processor import VaeImageProcessor
from huggingface_hub import snapshot_download
from PIL import Image
torch.jit.script = lambda f: f
from model.cloth_masker import AutoMasker, vis_mask
from model.pipeline import CatVTONPipeline
from utils import init_weight_dtype, resize_and_crop, resize_and_padding

def parse_args():
    parser = argparse.ArgumentParser(description="Simple example of a training script.")
    parser.add_argument(
        "--base_model_path",
        type=str,
        default="booksforcharlie/stable-diffusion-inpainting",
        help=(
            "The path to the base model to use for evaluation. This can be a local path or a model identifier from the Model Hub."
        ),
    )
    parser.add_argument(
        "--resume_path",
        type=str,
        default="zhengchong/CatVTON",
        help=(
            "The Path to the checkpoint of trained tryon model."
        ),
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="resource/demo/output",
        help="The output directory where the model predictions will be written.",
    )

    parser.add_argument(
        "--width",
        type=int,
        default=768,
        help=(
            "The resolution for input images, all the images in the train/validation dataset will be resized to this"
            " resolution"
        ),
    )
    parser.add_argument(
        "--height",
        type=int,
        default=1024,
        help=(
            "The resolution for input images, all the images in the train/validation dataset will be resized to this"
            " resolution"
        ),
    )
    parser.add_argument(
        "--repaint", 
        action="store_true", 
        help="Whether to repaint the result image with the original background."
    )
    parser.add_argument(
        "--allow_tf32",
        action="store_true",
        default=True,
        help=(
            "Whether or not to allow TF32 on Ampere GPUs. Can be used to speed up training. For more information, see"
            " https://pytorch.org/docs/stable/notes/cuda.html#tensorfloat-32-tf32-on-ampere-devices"
        ),
    )
    parser.add_argument(
        "--mixed_precision",
        type=str,
        default="bf16",
        choices=["no", "fp16", "bf16"],
        help=(
            "Whether to use mixed precision. Choose between fp16 and bf16 (bfloat16). Bf16 requires PyTorch >="
            " 1.10.and an Nvidia Ampere GPU.  Default to the value of accelerate config of the current system or the"
            " flag passed with the `accelerate.launch` command. Use this argument to override the accelerate config."
        ),
    )
    
    args = parser.parse_args()
    env_local_rank = int(os.environ.get("LOCAL_RANK", -1))
    if env_local_rank != -1 and env_local_rank != args.local_rank:
        args.local_rank = env_local_rank

    return args

def image_grid(imgs, rows, cols):
    """Create a grid of images."""
    assert len(imgs) == rows * cols, f"Expected {rows * cols} images, got {len(imgs)}"

    w, h = imgs[0].size
    grid = Image.new("RGB", size=(cols * w, rows * h))

    for i, img in enumerate(imgs):
        grid.paste(img, box=(i % cols * w, i // cols * h))
    return grid


def extract_mask_from_image_editor(person_image_data):
    """Extract and process mask from Gradio ImageEditor if present."""
    if "layers" not in person_image_data or not person_image_data["layers"]:
        return person_image_data["background"], None

    person_img = person_image_data["background"]
    mask = Image.open(person_image_data["layers"][0]).convert("L")

    # Check if mask is empty (all same values)
    if len(np.unique(np.array(mask))) == 1:
        return person_img, None

    # Convert to binary mask
    mask_array = np.array(mask)
    mask_array[mask_array > 0] = 255
    return person_img, Image.fromarray(mask_array)


def create_output_path():
    """Generate timestamped output path for results."""
    date_str = datetime.now().strftime("%Y%m%d%H%M%S")
    output_dir = os.path.join(args.output_dir, date_str[:8])
    os.makedirs(output_dir, exist_ok=True)
    return os.path.join(output_dir, f"{date_str[8:]}.png")


def load_and_resize_images(person_path, cloth_path, target_size):
    """Load images from paths and resize them appropriately."""
    person_img = Image.open(person_path).convert("RGB")
    cloth_img = Image.open(cloth_path).convert("RGB")

    person_img = resize_and_crop(person_img, target_size)
    cloth_img = resize_and_padding(cloth_img, target_size)

    return person_img, cloth_img


def create_display_image(person_img, cloth_img, result_img, masked_person, show_type):
    """Create final display image based on show_type preference."""
    if show_type == "result only":
        return result_img

    width, height = person_img.size

    if show_type == "input & result":
        condition_width = width // 2
        conditions = image_grid([person_img, cloth_img], 2, 1)
    else:  # "input & mask & result"
        condition_width = width // 3
        conditions = image_grid([person_img, masked_person, cloth_img], 3, 1)

    conditions = conditions.resize((condition_width, height), Image.NEAREST)
    display_img = Image.new("RGB", (width + condition_width + 5, height))
    display_img.paste(conditions, (0, 0))
    display_img.paste(result_img, (condition_width + 5, 0))

    return display_img


args = parse_args()
repo_path = snapshot_download(repo_id=args.resume_path)
# Pipeline
pipeline = CatVTONPipeline(
    base_ckpt=args.base_model_path,
    attn_ckpt=repo_path,
    attn_ckpt_version="mix",
    weight_dtype=init_weight_dtype(args.mixed_precision),
    use_tf32=args.allow_tf32,
    device='cuda'
)
# AutoMasker
mask_processor = VaeImageProcessor(vae_scale_factor=8, do_normalize=False, do_binarize=True, do_convert_grayscale=True)
automasker = AutoMasker(
    densepose_ckpt=os.path.join(repo_path, "DensePose"),
    schp_ckpt=os.path.join(repo_path, "SCHP"),
    device='cuda', 
)

@spaces.GPU(duration=120)
def submit_function(
    person_image,
    cloth_image,
    cloth_type,
    num_inference_steps,
    guidance_scale,
    seed,
    show_type
):
    """
    Main function to perform virtual try-on.

    Args:
        person_image: ImageEditor data containing person photo and optional mask
        cloth_image: Path to clothing image
        cloth_type: Type of garment ("upper", "lower", or "overall")
        num_inference_steps: Number of diffusion steps
        guidance_scale: Guidance scale for generation
        seed: Random seed (-1 for random)
        show_type: Display mode for results

    Returns:
        PIL.Image: Final try-on result
    """
    # Extract person image and mask from ImageEditor
    person_img_path, user_mask = extract_mask_from_image_editor(person_image)

    # Load and resize images
    target_size = (args.width, args.height)
    person_img, cloth_img = load_and_resize_images(person_img_path, cloth_image, target_size)

    # Process or generate mask
    if user_mask is not None:
        mask = resize_and_crop(user_mask, target_size)
    else:
        mask = automasker(person_img, cloth_type)['mask']

    mask = mask_processor.blur(mask, blur_factor=9)

    # Setup random generator
    generator = torch.Generator(device='cuda').manual_seed(seed) if seed != -1 else None

    # Run inference
    result_img = pipeline(
        image=person_img,
        condition_image=cloth_img,
        mask=mask,
        num_inference_steps=num_inference_steps,
        guidance_scale=guidance_scale,
        generator=generator
    )[0]

    # Save full result grid
    masked_person = vis_mask(person_img, mask)
    save_path = create_output_path()
    full_result = image_grid([person_img, masked_person, cloth_img, result_img], 1, 4)
    full_result.save(save_path)

    # Create display image based on user preference
    return create_display_image(person_img, cloth_img, result_img, masked_person, show_type)


def person_example_fn(image_path):
    return image_path

def app_gradio():
    custom_css = """
        /* Dark Theme Colors */
        :root {
            --bg-primary: #0f0f23;
            --bg-secondary: #1a1a2e;
            --bg-tertiary: #16213e;
            --text-primary: #e4e4e7;
            --text-secondary: #a1a1aa;
            --border-color: #27272a;
            --accent-primary: #6366f1;
            --accent-secondary: #8b5cf6;
        }

        @media (max-width: 768px) {
            .gr-column {
                width: 100% !important;
                padding: 0.5rem;
            }
            .gr-row {
                flex-direction: column !important;
            }
            .container {
                margin: 0.5rem !important;
                padding: 1rem !important;
            }
            #try-on-btn {
                padding: 1rem 2rem;
                font-size: 1.1rem;
            }
        }

        @media (max-width: 480px) {
            .gr-slider, .gr-radio-group, .gr-markdown, .gr-accordion {
                font-size: 0.9rem !important;
                padding: 0.5rem;
            }
            #try-on-btn {
                font-size: 1rem;
                padding: 0.8rem 1.5rem;
            }
            .gr-form {
                margin: 0.5rem;
            }
        }

        /* Main Background */
        body {
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%) !important;
            color: var(--text-primary) !important;
        }

        .gradio-container {
            background: var(--bg-primary) !important;
        }

        /* Section Cards */
        .section-card {
            background: var(--bg-secondary) !important;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            margin-bottom: 1.5rem;
            border: 1px solid var(--border-color);
        }

        /* Step Headers */
        .step-header {
            font-size: 1.1rem;
            font-weight: 600;
            color: #a78bfa !important;
            margin-bottom: 1rem;
            padding: 0.8rem;
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
            border-radius: 8px;
            border-left: 4px solid #8b5cf6;
            box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);
        }

        #try-on-btn {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
            padding: 1.2rem 3rem !important;
            font-size: 1.3rem !important;
            font-weight: 600 !important;
            border: none !important;
            border-radius: 12px !important;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3) !important;
            transition: all 0.3s ease !important;
            color: white !important;
            width: 100%;
            margin: 1.5rem 0;
        }

        #try-on-btn:hover {
            transform: translateY(-3px) !important;
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4) !important;
            background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
        }

        #try-on-btn span {
            color: white !important;
        }

        /* Buttons */
        .gr-button {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
            color: white !important;
            border: 1px solid #4338ca !important;
            padding: 0.6rem 1.2rem;
            border-radius: 8px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
        }

        .gr-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
            background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%) !important;
        }

        .gr-button span {
            color: white !important;
        }

        /* Containers */
        .container {
            border-radius: 12px;
            background: var(--bg-secondary) !important;
        }

        /* Forms */
        .gr-form {
            border-radius: 8px;
            background: var(--bg-tertiary) !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 1px solid var(--border-color);
        }

        /* Input Fields */
        .gr-input, .gr-text-input, .gr-number-input {
            background: var(--bg-tertiary) !important;
            border: 1px solid var(--border-color) !important;
            color: var(--text-primary) !important;
        }

        .gr-input:focus, .gr-text-input:focus {
            border-color: var(--accent-primary) !important;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
        }

        /* Radio Groups */
        .gr-radio-group {
            background: var(--bg-tertiary) !important;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }

        .gr-radio-group label {
            color: var(--text-primary) !important;
        }

        /* Sliders */
        .gr-slider input[type="range"] {
            background: var(--bg-tertiary) !important;
        }

        .gr-slider input[type="range"]::-webkit-slider-thumb {
            background: var(--accent-primary) !important;
        }

        .gr-slider input[type="range"]::-moz-range-thumb {
            background: var(--accent-primary) !important;
        }

        /* Accordion */
        .gr-accordion {
            border-radius: 8px;
            overflow: hidden;
            margin-top: 1rem;
            background: var(--bg-secondary) !important;
            border: 1px solid var(--border-color);
        }

        .gr-accordion-header {
            background: var(--bg-tertiary) !important;
            color: var(--text-primary) !important;
        }

        /* Tabs */
        .gr-tabitem {
            padding: 1rem;
            background: var(--bg-secondary) !important;
        }

        .gr-tabs {
            border-bottom: 1px solid var(--border-color);
        }

        .gr-tabs button {
            color: var(--text-secondary) !important;
            border-bottom: 2px solid transparent;
        }

        .gr-tabs button.selected {
            color: var(--accent-primary) !important;
            border-bottom-color: var(--accent-primary) !important;
        }

        /* Image Components */
        .gr-image, .gr-image-editor {
            background: var(--bg-tertiary) !important;
            border: 1px solid var(--border-color) !important;
        }

        /* Labels */
        .gr-label, label {
            color: var(--text-primary) !important;
        }

        /* Info Text */
        .gr-info {
            color: var(--text-secondary) !important;
        }

        /* Examples */
        .gr-examples {
            background: var(--bg-secondary) !important;
            border: 1px solid var(--border-color);
            border-radius: 8px;
        }

        /* Markdown */
        .gr-markdown {
            color: var(--text-primary) !important;
        }

        .gr-markdown h1, .gr-markdown h2, .gr-markdown h3 {
            color: var(--text-primary) !important;
        }

        /* Result Actions */
        .result-actions {
            margin-top: 1rem;
            display: flex;
            gap: 1rem;
            justify-content: center;
        }

        /* Scrollbars */
        ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }

        ::-webkit-scrollbar-track {
            background: var(--bg-secondary);
        }

        ::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--accent-primary);
        }
    """

    with gr.Blocks(title="AI Fashion Try-On", css=custom_css, theme=gr.themes.Base(
        primary_hue="indigo",
        secondary_hue="purple",
        neutral_hue="slate",
    ).set(
        body_background_fill="*neutral_950",
        body_background_fill_dark="*neutral_950",
        background_fill_primary="*neutral_900",
        background_fill_primary_dark="*neutral_900",
        background_fill_secondary="*neutral_800",
        background_fill_secondary_dark="*neutral_800",
        border_color_primary="*neutral_700",
        border_color_primary_dark="*neutral_700",
        button_primary_background_fill="*primary_600",
        button_primary_background_fill_dark="*primary_600",
        button_primary_background_fill_hover="*primary_700",
        button_primary_background_fill_hover_dark="*primary_700",
        button_primary_text_color="white",
        button_primary_text_color_dark="white",
        input_background_fill="*neutral_800",
        input_background_fill_dark="*neutral_800",
    )) as demo:
        gr.Markdown(
            """
            <div style="text-align: center; background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
                padding: 3rem 2rem; color: white; border-radius: 0 0 24px 24px; margin-bottom: 2rem;
                box-shadow: 0 8px 20px rgba(79, 70, 229, 0.4); border: 1px solid rgba(139, 92, 246, 0.3);">
                <h1 style="margin: 0; font-size: 2.5rem; font-weight: 700; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                    ✨ AI Fashion Try-On
                </h1>
                <p style="margin: 1rem 0 0 0; font-size: 1.2rem; opacity: 0.95;">
                    Experience the future of fashion with cutting-edge AI technology
                </p>
            </div>
            """
        )

        with gr.Row():
            with gr.Column(scale=1, min_width=320):
                # Step 1: Upload Photo
                gr.Markdown('<div class="step-header">📸 Step 1: Upload Your Photo</div>')
                image_path = gr.Image(
                    type="filepath",
                    interactive=True,
                    visible=False,
                )
                person_image = gr.ImageEditor(
                    interactive=True,
                    label="",
                    type="filepath",
                    height=400
                )

                gr.Markdown(
                    """
                    <div style="background: rgba(79, 70, 229, 0.15); padding: 0.8rem; border-radius: 8px;
                        margin: 0.8rem 0; border-left: 3px solid #6366f1; border: 1px solid rgba(99, 102, 241, 0.3);">
                        <small style="color: #c7d2fe;"><b>💡 Tips:</b> Use plain background • Full body visible • High quality image</small>
                    </div>
                    """
                )

                # Step 2: Select Clothing
                gr.Markdown('<div class="step-header">👕 Step 2: Choose Garment</div>')

                cloth_type = gr.Radio(
                    label="Garment Type",
                    choices=["upper", "lower", "overall"],
                    value="upper",
                    info="Select the type of clothing item"
                )

                cloth_image = gr.Image(
                    interactive=True,
                    label="Upload or select from examples below",
                    type="filepath",
                    height=300
                )

                # Step 3: Generate
                gr.Markdown('<div class="step-header">⚡ Step 3: Generate Try-On</div>')
                submit = gr.Button("✨ Try On Now", elem_id="try-on-btn")

                gr.Markdown(
                    """
                    <div style="text-align: center; color: #94a3b8; font-size: 0.9rem; margin-top: 0.5rem;">
                        ⏱️ Processing takes 20-40 seconds
                    </div>
                    """
                )
                
                with gr.Accordion("⚙️ Advanced Settings", open=False):
                    num_inference_steps = gr.Slider(
                        label="Quality Steps",
                        minimum=10,
                        maximum=100,
                        step=5,
                        value=50,
                        info="Higher = better quality but slower"
                    )
                    guidance_scale = gr.Slider(
                        label="Guidance Scale",
                        minimum=0.0,
                        maximum=7.5,
                        step=0.5,
                        value=2.5,
                        info="Controls adherence to garment details"
                    )
                    seed = gr.Slider(
                        label="Random Seed",
                        minimum=-1,
                        maximum=10000,
                        step=1,
                        value=42,
                        info="-1 for random results"
                    )
                    show_type = gr.Radio(
                        label="Display Mode",
                        choices=["result only", "input & result", "input & mask & result"],
                        value="input & result",
                    )

            with gr.Column(scale=2, min_width=400):
                # Result Section
                gr.Markdown('<div class="step-header">✨ Your Result</div>')
                result_image = gr.Image(
                    interactive=False,
                    label="",
                    height=500
                )

                # Examples Section with Tabs
                gr.Markdown('<div style="color: #e4e4e7; font-size: 1.2rem; font-weight: 600; margin: 1.5rem 0 1rem 0;">📚 Quick Examples</div>')
                root_path = "resource/demo/example"

                with gr.Tabs():
                    with gr.Tab("👤 Person Photos"):
                        with gr.Row():
                            with gr.Column():
                                gr.Examples(
                                    examples=[
                                        os.path.join(root_path, "person", "men", _)
                                        for _ in os.listdir(os.path.join(root_path, "person", "men"))
                                    ],
                                    examples_per_page=4,
                                    inputs=image_path,
                                    label="Men"
                                )
                            with gr.Column():
                                gr.Examples(
                                    examples=[
                                        os.path.join(root_path, "person", "women", _)
                                        for _ in os.listdir(os.path.join(root_path, "person", "women"))
                                    ],
                                    examples_per_page=4,
                                    inputs=image_path,
                                    label="Women"
                                )

                    with gr.Tab("👕 Clothing"):
                        with gr.Tabs():
                            with gr.Tab("Shirts & Tops"):
                                gr.Examples(
                                    examples=[
                                        os.path.join(root_path, "condition", "upper", _)
                                        for _ in os.listdir(os.path.join(root_path, "condition", "upper"))
                                    ],
                                    examples_per_page=6,
                                    inputs=cloth_image,
                                    label=""
                                )
                            with gr.Tab("Dresses & Full Outfits"):
                                gr.Examples(
                                    examples=[
                                        os.path.join(root_path, "condition", "overall", _)
                                        for _ in os.listdir(os.path.join(root_path, "condition", "overall"))
                                    ],
                                    examples_per_page=6,
                                    inputs=cloth_image,
                                    label=""
                                )

            image_path.change(
                person_example_fn, 
                inputs=image_path, 
                outputs=person_image
            )

            submit.click(
                submit_function,
                [
                    person_image,
                    cloth_image,
                    cloth_type,
                    num_inference_steps,
                    guidance_scale,
                    seed,
                    show_type,
                ],
                result_image,
            )
            
    demo.queue().launch(share=True, show_error=True)


if __name__ == "__main__":
    app_gradio()