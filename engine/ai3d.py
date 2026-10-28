"""AI-made 3D models for world3d (docs/DRAW3D.md §7): a picture -> a textured 3D model (GLB), free, on Hugging Face Spaces.

    python3 vg.py ai3d bus --prompt "an old rusty abandoned city bus, three-quarter view, white background"
    python3 vg.py ai3d statue --image projects/<id>/refs/statue.png

--prompt first makes the picture with FLUX.1-schnell, then Hunyuan3D-2 (Tencent) turns it into a mesh with a texture.
The result: assets3d/ai/<name>.glb (+ <name>.png — the source picture); in world3d: {prop: model, src: "ai/<name>.glb"}.
Free ZeroGPU quota: without a token a few runs a day per IP (shared!), with a free Hugging Face token (HF_TOKEN in the
environment, huggingface.co/settings/tokens, "read") considerably more.
"""
import os
import shutil

from .common import ROOT

OUT = os.path.join(ROOT, "assets3d", "ai")
IMAGE_SPACE = "black-forest-labs/FLUX.1-schnell"
MESH_SPACE = "tencent/Hunyuan3D-2"


def _client(space):
    from gradio_client import Client
    tok = os.environ.get("HF_TOKEN")
    return Client(space, verbose=False, **({"hf_token": tok} if tok else {}))


def picture(prompt, path, seed=7):
    r = _client(IMAGE_SPACE).predict(prompt=prompt + ", isolated object, plain white background, soft studio light, full view",
                                     seed=seed, randomize_seed=False, width=1024, height=1024, num_inference_steps=4, api_name="/infer")
    shutil.copy(r[0], path)
    return path


def mesh(image, path, textured=True, seed=1234):
    from gradio_client import handle_file
    r = _client(MESH_SPACE).predict(caption=None, image=handle_file(image), mv_image_front=None, mv_image_back=None, mv_image_left=None,
                                    mv_image_right=None, steps=30, guidance_scale=5.0, seed=seed, octree_resolution=256, check_box_rembg=True,
                                    num_chunks=8000, randomize_seed=False, api_name="/generation_all" if textured else "/shape_generation")
    src = r[1] if textured else r[0]          # generation_all: (white mesh, textured mesh, html, stats, seed)
    shutil.copy(src, path)
    return path


def run(name, prompt=None, image=None, textured=True):
    try:
        import gradio_client  # noqa: F401
    except ImportError:
        raise SystemExit("pip install gradio_client  (or: uv pip install --python .venv/bin/python gradio_client)")
    os.makedirs(OUT, exist_ok=True)
    img = os.path.join(OUT, f"{name}.png")
    if prompt:
        print(f"  picture: {IMAGE_SPACE}")
        picture(prompt, img)
    elif image:
        shutil.copy(image, img)
    else:
        raise SystemExit("ai3d: give --prompt or --image")
    print(f"  3D model: {MESH_SPACE}")
    out = mesh(img, os.path.join(OUT, f"{name}.glb"), textured)
    print(f"  -> {os.path.relpath(out, ROOT)}  (world3d: {{prop: model, src: \"ai/{name}.glb\", height: …}})")
