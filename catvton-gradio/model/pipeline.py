import inspect
import os
from typing import Union

import PIL
import numpy as np
import torch
import tqdm
from accelerate import load_checkpoint_in_model
from diffusers import AutoencoderKL, DDIMScheduler, UNet2DConditionModel
from diffusers.pipelines.stable_diffusion.safety_checker import StableDiffusionSafetyChecker
from diffusers.utils.torch_utils import randn_tensor
from huggingface_hub import snapshot_download
from transformers import CLIPImageProcessor

from model.attn_processor import SkipAttnProcessor
from model.utils import get_trainable_module, init_adapter
from utils import (
    compute_vae_encodings,
    numpy_to_pil,
    prepare_image,
    prepare_mask_image,
    resize_and_crop,
    resize_and_padding,
)


class CatVTONPipeline:
    def __init__(
        self,
        base_ckpt,
        attn_ckpt,
        attn_ckpt_version="mix",
        weight_dtype=torch.float32,
        device="cuda",
        compile=False,
        skip_safety_check=False,
        use_tf32=True,
    ):
        # normalize device
        self.device = torch.device(device) if not isinstance(device, torch.device) else device
        self.weight_dtype = weight_dtype
        self.skip_safety_check = skip_safety_check

        print(f"[INFO] Pipeline başlatılıyor - Device: {self.device}, dtype: {self.weight_dtype}")

        # TF32 sadece CUDA'da anlamlı
        if use_tf32 and self.device.type == "cuda":
            torch.set_float32_matmul_precision("high")
            torch.backends.cuda.matmul.allow_tf32 = True
            print("[INFO] TF32 etkinleştirildi")

        # Scheduler
        try:
            self.noise_scheduler = DDIMScheduler.from_pretrained(base_ckpt, subfolder="scheduler")
            print("[INFO] Scheduler yüklendi")
        except Exception as e:
            print(f"[ERROR] Scheduler yüklenirken hata: {e}")
            raise

        # VAE yükleme (hata durumunda fallback)
        try:
            self.vae = AutoencoderKL.from_pretrained("stabilityai/sd-vae-ft-mse").to(
                self.device, dtype=self.weight_dtype
            )
            print("[INFO] VAE yüklendi")
        except Exception as e:
            print(f"[WARN] VAE yüklenirken hata: {e}. float32 fallback yapılıyor.")
            try:
                self.vae = AutoencoderKL.from_pretrained("stabilityai/sd-vae-ft-mse").to(
                    self.device, dtype=torch.float32
                )
                print("[INFO] VAE float32 ile yüklendi")
            except Exception as e2:
                print(f"[ERROR] VAE yüklenemedi: {e2}")
                raise

        # Safety checker - ZeroGPU uyumlu hata yakalama
        if not skip_safety_check:
            try:
                self.feature_extractor = CLIPImageProcessor.from_pretrained(base_ckpt, subfolder="feature_extractor")
                
                # Safety checker için çoklu deneme stratejisi
                safety_checker_loaded = False
                
                # 1. Önce safetensors formatını dene
                try:
                    self.safety_checker = StableDiffusionSafetyChecker.from_pretrained(
                        base_ckpt, 
                        subfolder="safety_checker",
                        use_safetensors=True,
                        torch_dtype=self.weight_dtype
                    ).to(self.device, dtype=self.weight_dtype)
                    safety_checker_loaded = True
                    print("[INFO] Safety checker (safetensors) yüklendi")
                except Exception as e1:
                    print(f"[WARN] Safetensors safety checker yüklenemedi: {e1}")
                
                # 2. Eğer safetensors başarısızsa, farklı model dene
                if not safety_checker_loaded:
                    try:
                        self.safety_checker = StableDiffusionSafetyChecker.from_pretrained(
                            "CompVis/stable-diffusion-safety-checker",
                            torch_dtype=self.weight_dtype
                        ).to(self.device, dtype=self.weight_dtype)
                        safety_checker_loaded = True
                        print("[INFO] Safety checker (CompVis) yüklendi")
                    except Exception as e2:
                        print(f"[WARN] CompVis safety checker yüklenemedi: {e2}")
                
                # 3. Son çare olarak safety checker'ı devre dışı bırak
                if not safety_checker_loaded:
                    print("[WARN] Safety checker yüklenemedi, devre dışı bırakılıyor")
                    self.safety_checker = None
                    self.feature_extractor = None
                    self.skip_safety_check = True
                    
            except Exception as e:
                print(f"[WARN] Safety checker başlatılamadı: {e}. Devre dışı bırakılıyor.")
                self.feature_extractor = None
                self.safety_checker = None
                self.skip_safety_check = True
        else:
            self.feature_extractor = None
            self.safety_checker = None
            print("[INFO] Safety checker devre dışı")

        # UNet ve adapter
        try:
            self.unet = UNet2DConditionModel.from_pretrained(base_ckpt, subfolder="unet").to(
                self.device, dtype=self.weight_dtype
            )
            print("[INFO] UNet yüklendi")
            
            init_adapter(self.unet, cross_attn_cls=SkipAttnProcessor)
            self.attn_modules = get_trainable_module(self.unet, "attention")
            print("[INFO] Adapter başlatıldı")
            
            self.auto_attn_ckpt_load(attn_ckpt, attn_ckpt_version)
            print("[INFO] Attention checkpoint yüklendi")
        except Exception as e:
            print(f"[ERROR] UNet yüklenirken hata: {e}")
            raise

        # Compile (isteğe bağlı)
        if compile:
            try:
                print("[INFO] Model compile ediliyor...")
                self.unet = torch.compile(self.unet)
                self.vae = torch.compile(self.vae, mode="reduce-overhead")
                print("[INFO] Model compile edildi")
            except Exception as e:
                print(f"[WARN] Compile sırasında hata: {e}. Compile edilmemiş sürüm devam ediyor.")

        print("[INFO] Pipeline başarıyla başlatıldı")

    def auto_attn_ckpt_load(self, attn_ckpt, version):
        sub_folder = {
            "mix": "mix-48k-1024",
            "vitonhd": "vitonhd-16k-512", 
            "dresscode": "dresscode-16k-512",
        }[version]
        
        if os.path.exists(attn_ckpt):
            checkpoint_path = os.path.join(attn_ckpt, sub_folder, "attention")
            if os.path.exists(checkpoint_path):
                load_checkpoint_in_model(self.attn_modules, checkpoint_path)
                print(f"[INFO] Local checkpoint yüklendi: {checkpoint_path}")
            else:
                print(f"[WARN] Local checkpoint bulunamadı: {checkpoint_path}")
        else:
            try:
                repo_path = snapshot_download(repo_id=attn_ckpt)
                checkpoint_path = os.path.join(repo_path, sub_folder, "attention")
                load_checkpoint_in_model(self.attn_modules, checkpoint_path)
                print(f"[INFO] Downloaded checkpoint yüklendi: {checkpoint_path}")
            except Exception as e:
                print(f"[ERROR] Checkpoint indirilemedi: {e}")
                raise

    def run_safety_checker(self, image):
        if self.safety_checker is None or self.skip_safety_check:
            has_nsfw_concept = None
        else:
            try:
                safety_checker_input = self.feature_extractor(image, return_tensors="pt").to(self.device)
                image, has_nsfw_concept = self.safety_checker(
                    images=image, clip_input=safety_checker_input.pixel_values.to(self.weight_dtype)
                )
            except Exception as e:
                print(f"[WARN] Safety checker çalıştırılamadı: {e}")
                has_nsfw_concept = None
        return image, has_nsfw_concept

    def check_inputs(self, image, condition_image, mask, width, height):
        if isinstance(image, torch.Tensor) and isinstance(condition_image, torch.Tensor) and isinstance(mask, torch.Tensor):
            return image, condition_image, mask
        assert image.size == mask.size, "Image and mask must have the same size"
        image = resize_and_crop(image, (width, height))
        mask = resize_and_crop(mask, (width, height))
        condition_image = resize_and_padding(condition_image, (width, height))
        return image, condition_image, mask

    def prepare_extra_step_kwargs(self, generator, eta):
        accepts_eta = "eta" in set(inspect.signature(self.noise_scheduler.step).parameters.keys())
        extra_step_kwargs = {}
        if accepts_eta:
            extra_step_kwargs["eta"] = eta

        accepts_generator = "generator" in set(inspect.signature(self.noise_scheduler.step).parameters.keys())
        if accepts_generator and generator is not None:
            extra_step_kwargs["generator"] = generator
        return extra_step_kwargs

    @torch.no_grad()
    def __call__(
        self,
        image: Union[PIL.Image.Image, torch.Tensor],
        condition_image: Union[PIL.Image.Image, torch.Tensor],
        mask: Union[PIL.Image.Image, torch.Tensor],
        num_inference_steps: int = 50,
        guidance_scale: float = 2.5,
        height: int = 1024,
        width: int = 768,
        generator=None,
        eta=1.0,
        **kwargs
    ):
        concat_dim = -2  # y ekseni

        image, condition_image, mask = self.check_inputs(image, condition_image, mask, width, height)
        image = prepare_image(image).to(self.device, dtype=self.weight_dtype)
        condition_image = prepare_image(condition_image).to(self.device, dtype=self.weight_dtype)
        mask = prepare_mask_image(mask).to(self.device, dtype=self.weight_dtype)

        masked_image = image * (mask < 0.5)

        masked_latent = compute_vae_encodings(masked_image, self.vae)
        condition_latent = compute_vae_encodings(condition_image, self.vae)
        mask_latent = torch.nn.functional.interpolate(mask, size=masked_latent.shape[-2:], mode="nearest")
        del image, mask, condition_image

        masked_latent_concat = torch.cat([masked_latent, condition_latent], dim=concat_dim)
        mask_latent_concat = torch.cat([mask_latent, torch.zeros_like(mask_latent)], dim=concat_dim)

        latents = randn_tensor(
            masked_latent_concat.shape,
            generator=generator,
            device=masked_latent_concat.device,
            dtype=self.weight_dtype,
        )

        self.noise_scheduler.set_timesteps(num_inference_steps, device=self.device)
        timesteps = self.noise_scheduler.timesteps
        latents = latents * self.noise_scheduler.init_noise_sigma

        do_classifier_free_guidance = guidance_scale > 1.0
        if do_classifier_free_guidance:
            masked_latent_concat = torch.cat(
                [
                    torch.cat([masked_latent, torch.zeros_like(condition_latent)], dim=concat_dim),
                    masked_latent_concat,
                ]
            )
            mask_latent_concat = torch.cat([mask_latent_concat] * 2)

        extra_step_kwargs = self.prepare_extra_step_kwargs(generator, eta)
        num_warmup_steps = (len(timesteps) - num_inference_steps * self.noise_scheduler.order)

        with tqdm.tqdm(total=num_inference_steps) as progress_bar:
            for i, t in enumerate(timesteps):
                latent_model_input = (torch.cat([latents] * 2) if do_classifier_free_guidance else latents)
                latent_model_input = self.noise_scheduler.scale_model_input(latent_model_input, t)
                inpainting_latent_model_input = torch.cat(
                    [latent_model_input, mask_latent_concat, masked_latent_concat], dim=1
                )

                noise_pred = self.unet(
                    inpainting_latent_model_input,
                    t.to(self.device),
                    encoder_hidden_states=None,
                    return_dict=False,
                )[0]

                if do_classifier_free_guidance:
                    noise_pred_uncond, noise_pred_text = noise_pred.chunk(2)
                    noise_pred = noise_pred_uncond + guidance_scale * (noise_pred_text - noise_pred_uncond)

                latents = self.noise_scheduler.step(
                    noise_pred, t, latents, **extra_step_kwargs
                ).prev_sample

                if i == len(timesteps) - 1 or (
                    (i + 1) > num_warmup_steps and (i + 1) % self.noise_scheduler.order == 0
                ):
                    progress_bar.update()

        latents = latents.split(latents.shape[concat_dim] // 2, dim=concat_dim)[0]
        latents = 1 / self.vae.config.scaling_factor * latents
        image = self.vae.decode(latents.to(self.device, dtype=self.weight_dtype)).sample
        image = (image / 2 + 0.5).clamp(0, 1)
        image = image.cpu().permute(0, 2, 3, 1).float().numpy()
        image = numpy_to_pil(image)

        # Safety checker kontrolü
        if not self.skip_safety_check and self.safety_checker is not None:
            current_script_directory = os.path.dirname(os.path.realpath(__file__))
            nsfw_image_path = os.path.join(os.path.dirname(current_script_directory), "resource", "img", "NSFW.png")
            try:
                nsfw_image = PIL.Image.open(nsfw_image_path).resize(image[0].size)
            except Exception:
                nsfw_image = None
                
            try:
                image_np = np.array(image)
                _, has_nsfw_concept = self.run_safety_checker(image=image_np)
                if has_nsfw_concept is not None:
                    for i, not_safe in enumerate(has_nsfw_concept):
                        if not_safe and nsfw_image is not None:
                            image[i] = nsfw_image
                            print(f"[WARN] NSFW içerik tespit edildi, görüntü {i} değiştirildi")
            except Exception as e:
                print(f"[WARN] Safety check sırasında hata: {e}")

        return image

