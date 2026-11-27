#!/usr/bin/env python3
"""Compose real browser screenshots into captioned, looping portfolio GIFs."""
import json
import os
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
CAPTURE = HERE / ".capture"
DEST = HERE.parent
SIZE = (1280, 1000)
GREEN = "#0cf574"
WHITE = "#f1f7f4"
MUTED = "#9baea6"
SECTIONS = ["home", "login", "dashboard", "books", "stock", "loans", "catalog", "history"]
NAMES = ["Início", "Acesso", "Painel", "Acervo", "Estoque", "Circulação", "Catálogo", "Histórico"]
# The payment GIF has its own progress bar, so the tour keeps its eight steps.
PAYMENT_SECTIONS = ["fines", "checkout", "paid"]
PAYMENT_NAMES = ["Multas", "Checkout Stripe", "Confirmação"]


def nav_for(section):
    if section in PAYMENT_SECTIONS:
        return PAYMENT_SECTIONS, PAYMENT_NAMES
    return SECTIONS, NAMES


def font(size, bold=False):
    override = os.environ.get("PREVIEW_FONT_BOLD" if bold else "PREVIEW_FONT")
    candidates = [
        override,
        f"/usr/share/fonts/google-noto/NotoSans-{'Bold' if bold else 'Regular'}.ttf",
        f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if bold else ''}.ttf",
        f"/usr/share/fonts/liberation-sans-fonts/LiberationSans-{'Bold' if bold else 'Regular'}.ttf",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    raise RuntimeError("Install Noto Sans or set PREVIEW_FONT and PREVIEW_FONT_BOLD.")


FONTS = {key: font(*value) for key, value in {
    "tag": (14, True), "title": (38, True), "body": (19, False),
    "tiny": (14, False), "nav": (14, True), "chrome": (13, False),
}.items()}


def background():
    image = Image.new("RGB", SIZE)
    draw = ImageDraw.Draw(image)
    for y in range(SIZE[1]):
        t = y / SIZE[1]
        draw.line((0, y, SIZE[0], y), fill=(
            round(11 - 4*t), round(27 - 12*t), round(23 - 9*t)))
    for x in range(0, SIZE[0], 48):
        draw.line((x, 0, x, 150), fill="#132b23")
    for y in range(0, 150, 48):
        draw.line((0, y, SIZE[0], y), fill="#132b23")
    draw.line((40, 150, 1240, 150), fill="#254438")
    return image


BG = background()


def compose(scene, series, progress, pointer=None, pulse=False):
    image = BG.copy()
    draw = ImageDraw.Draw(image)
    tag, title, description = scene["labels"]
    draw.rounded_rectangle((40, 24, 47, 44), radius=3, fill=GREEN)
    draw.text((59, 23), tag, font=FONTS["tag"], fill=GREEN)
    draw.text((40, 54), title, font=FONTS["title"], fill=WHITE)
    draw.text((42, 113), description, font=FONTS["body"], fill=MUTED)
    draw.rounded_rectangle((1050, 22, 1240, 50), radius=14,
                           fill="#143a2a", outline="#26513b")
    draw.ellipse((1064, 32, 1072, 40), fill=GREEN)
    draw.text((1082, 25), "PREVIEW DO PROJETO", font=FONTS["tiny"], fill=WHITE)

    # Editorial browser frame, not a fictional hosted URL.
    shadow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (37, 173, 1243, 933), radius=16, fill=(0, 0, 0, 120))
    image = Image.alpha_composite(image.convert("RGBA"),
                                 shadow.filter(ImageFilter.GaussianBlur(9))).convert("RGB")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((39, 167, 1241, 925), radius=12,
                           fill="#1c2c27", outline="#365045", width=1)
    for x, color in [(59, "#fb7771"), (79, "#f2c765"), (99, "#62d79b")]:
        draw.ellipse((x, 181, x+9, 190), fill=color)
    draw.rounded_rectangle((350, 175, 930, 197), radius=5, fill="#10231b")
    address = f"localhost   /   library-manager   {scene['route']}"
    draw.text((370, 175), address, font=FONTS["chrome"], fill=MUTED)
    draw.text((1104, 175), "EXECUÇÃO LOCAL", font=FONTS["chrome"], fill=MUTED)
    with Image.open(CAPTURE / scene["image"]) as screenshot:
        image.paste(screenshot.convert("RGB"), (40, 204))

    if pointer:
        x, y = 40 + pointer["x"], 204 + pointer["y"]
        if pulse:
            overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
            ring = ImageDraw.Draw(overlay)
            ring.ellipse((x-24, y-24, x+24, y+24), fill=(12, 245, 116, 45),
                         outline=(12, 245, 116, 220), width=3)
            image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(image)
        draw.polygon([(x, y), (x+2, y+24), (x+9, y+18), (x+15, y+30),
                      (x+21, y+27), (x+14, y+16), (x+24, y+15)],
                     fill=WHITE, outline="#0a1a12", width=2)

    draw = ImageDraw.Draw(image)
    draw.text((42, 937), scene["note"], font=FONTS["tiny"], fill=MUTED)
    series_width = draw.textlength(series, font=FONTS["tiny"])
    draw.text((1238-series_width, 937), series, font=FONTS["tiny"], fill=MUTED)
    selected = "home" if scene["section"] == "closing" else scene["section"]
    sections, names = nav_for(selected)
    step = 1200 // len(sections)
    for i, (section, name) in enumerate(zip(sections, names)):
        x = 40 + i*step
        width = step - 14
        active = section == selected
        draw.rounded_rectangle((x, 976, x+width, 979), radius=1, fill="#234234")
        if active:
            draw.rounded_rectangle((x, 976, x+max(2, int(width*progress)), 979),
                                   radius=1, fill=GREEN)
        draw.text((x, 956), name, font=FONTS["nav"], fill=GREEN if active else "#657e70")
    return image


def render(name, scenes, series):
    # Keep screenshot durations; a few intermediate cursor positions clarify the actions.
    frames, durations = [], []
    previous_scene = None
    previous_pointer = None
    section_elapsed = 0
    total_by_section = {}
    for scene in scenes:
        total_by_section[scene["section"]] = (
            total_by_section.get(scene["section"], 0) + scene["seconds"])
    for scene in scenes:
        changed = previous_scene and previous_scene["section"] != scene["section"]
        if changed:
            section_elapsed = 0
        section_elapsed += scene["seconds"]
        progress = section_elapsed / total_by_section[scene["section"]]
        frame = compose(scene, series, progress, scene["pointer"],
                        bool(scene["pointer"] and scene["pointer"]["clicked"]))
        if changed:
            source = frames[-1]
            for alpha in (0.25, 0.5, 0.75):
                frames.append(Image.blend(source, frame, alpha))
                durations.append(70)
        elif previous_pointer and scene["pointer"] and scene["seconds"] >= 0.6:
            for step in range(1, 5):
                t = step / 5
                ease = t*t*(3-2*t)
                cursor = {key: previous_pointer[key] +
                          (scene["pointer"][key]-previous_pointer[key])*ease
                          for key in ("x", "y")}
                frames.append(compose(previous_scene, series, progress, cursor))
                durations.append(60)
        frames.append(frame)
        durations.append(max(100, round(scene["seconds"]*1000) -
                             (240 if previous_pointer and scene["pointer"] and
                              not changed and scene["seconds"] >= 0.6 else 0)))
        previous_scene, previous_pointer = scene, scene["pointer"]

    # One shared palette avoids flicker between keyframes; no dithering keeps text clean.
    samples = Image.new("RGB", (320*4, 250*((len(frames)+3)//4)))
    for i, frame in enumerate(frames):
        samples.paste(frame.resize((320, 250)), ((i % 4)*320, (i//4)*250))
    base_palette = samples.quantize(colors=231, method=Image.Quantize.MEDIANCUT)
    # Large dark/green UI regions must not crowd out small pink, turquoise, red
    # or blue details. Reserve palette entries for those high-chroma accents.
    accents = []
    for count, color in samples.getcolors(samples.width*samples.height):
        r, g, b = color
        if max(color)-min(color) > 60 and not (g > r and g > b*1.3):
            accents.extend([color] * min(count, 1000))
    accent_sample = Image.new("RGB", (max(1, len(accents)), 1))
    if accents:
        accent_sample.putdata(accents)
    accent_palette = accent_sample.quantize(colors=24)
    palette = Image.new("P", (1, 1))
    palette.putpalette(base_palette.getpalette()[:231*3] +
                       accent_palette.getpalette()[:24*3] + [0, 0, 0])
    converted = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
    target = DEST / name
    converted[0].save(target, save_all=True, append_images=converted[1:],
                      duration=durations, loop=0, optimize=True, disposal=1)
    # Keep a content-derived palette: the GIF encoder's default RGB8 palette
    # would otherwise flatten the illustration's pink and turquoise colors.
    optimized = CAPTURE / name
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i",
                    str(target), "-filter_complex",
                    "[0:v]split[a][b];[a]palettegen=max_colors=256[p];"
                    "[b][p]paletteuse=dither=none",
                    "-c:v", "gif", "-gifflags", "+transdiff",
                    "-fps_mode", "passthrough", "-loop", "0", str(optimized)], check=True)
    if optimized.stat().st_size < target.stat().st_size:
        target.write_bytes(optimized.read_bytes())
    with Image.open(target) as gif:
        actual_duration = 0
        for i in range(gif.n_frames):
            gif.seek(i)
            actual_duration += gif.info.get("duration", 0)
        assert gif.info.get("loop") == 0
        assert gif.size == SIZE and gif.n_frames > 1
    assert target.stat().st_size < 10*1024*1024, f"{target.name} exceeds 10 MiB."
    print(f"{name}: {actual_duration/1000:.2f}s, "
          f"{target.stat().st_size/1024/1024:.2f} MiB")
    return {"file": name, "duration_seconds": actual_duration/1000,
            "bytes": target.stat().st_size, "width": SIZE[0], "height": SIZE[1]}


def main():
    scenes = json.loads((CAPTURE / "scenes.json").read_text())
    result = []
    # The overview runs a little faster; the focused GIFs keep a slower pace.
    overview = [dict(scene, seconds=scene["seconds"] * 0.85) for scene in scenes
                if scene["section"] not in PAYMENT_SECTIONS]
    result.append(render("library-manager-demo.gif", overview, "VISÃO GERAL"))
    catalog = [dict(scene) for scene in scenes if scene["section"] in {"catalog", "history"}]
    for scene in catalog:
        scene["seconds"] *= 1.3
    result.append(render("library-manager-catalogo.gif", catalog, "LEITORES & EMPRÉSTIMOS"))
    admin = [dict(scene) for scene in scenes
             if scene["section"] in {"dashboard", "books", "stock", "loans"}]
    for scene in admin:
        scene["seconds"] *= 1.15
    result.append(render("library-manager-admin.gif", admin, "OPERAÇÃO DO ACERVO"))
    payment = [dict(scene) for scene in scenes if scene["section"] in PAYMENT_SECTIONS]
    if payment:
        result.append(render("library-manager-pagamento.gif", payment, "MULTAS & STRIPE"))
    # Contact sheet for visual review. Intermediate files are intentionally not committed.
    reviewed = [section for section in SECTIONS + PAYMENT_SECTIONS
                if any(s["section"] == section for s in scenes)]
    review = Image.new("RGB", (1280, 500 * ((len(reviewed) + 1) // 2)), "#07130e")
    for i, section in enumerate(reviewed):
        scene = [s for s in scenes if s["section"] == section][-1]
        frame = compose(scene, "REVISÃO", 1, scene["pointer"])
        review.paste(frame.resize((640, 500)), ((i % 2)*640, (i//2)*500))
    review.save(CAPTURE / "review.jpg", quality=95)
    (CAPTURE / "render-validation.json").write_text(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
