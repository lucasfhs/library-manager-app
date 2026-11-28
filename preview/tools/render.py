#!/usr/bin/env python3
"""Compose real browser screenshots into captioned, looping portfolio GIFs."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
CAPTURE = HERE / ".capture"
DEST = HERE.parent
SIZE = (1280, 1000)
FPS = 25  # GIF delays are centiseconds: 40 ms gives an exact, browser-safe cadence.
FRAME_MS = 1000 // FPS
TRANSITION_FRAMES = 8
CURSOR_FRAMES = 12
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


def draw_pointer(image, pointer, pulse=0):
    if not pointer:
        return image
    x, y = 40 + pointer["x"], 204 + pointer["y"]
    if pulse:
        overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
        ring = ImageDraw.Draw(overlay)
        radius = 10 + 20*pulse
        ring.ellipse((x-radius, y-radius, x+radius, y+radius),
                     fill=(12, 245, 116, round(60*(1-pulse))),
                     outline=(12, 245, 116, round(220*(1-pulse))), width=3)
        image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(image)
    draw.polygon([(x, y), (x+2, y+24), (x+9, y+18), (x+15, y+30),
                  (x+21, y+27), (x+14, y+16), (x+24, y+15)],
                 fill=WHITE, outline="#0a1a12", width=2)
    return image


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
    # Pages outside the app (Stripe Checkout) record their host instead of a route.
    address = (f"{scene['host']}   /   pagamento seguro" if scene.get("host")
               else f"localhost   /   library-manager   {scene['route']}")
    draw.text((370, 175), address, font=FONTS["chrome"], fill=MUTED)
    draw.text((1104, 175), "MODO DE TESTE" if scene.get("host") else "EXECUÇÃO LOCAL",
              font=FONTS["chrome"], fill=MUTED)
    with Image.open(CAPTURE / scene["image"]) as screenshot:
        image.paste(screenshot.convert("RGB"), (40, 204))

    image = draw_pointer(image, pointer, 0.5 if pulse else 0)

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


def shared_palette(scenes, series):
    samples = Image.new("RGB", (320*4, 250*((len(scenes)+3)//4)))
    for i, scene in enumerate(scenes):
        frame = compose(scene, series, 0)
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
    return palette


def timeline_frames(scenes, series):
    """Render motion every 40 ms, not a static frame with a multi-second delay.

    These are still genuine screenshots, with editorial cursor/crossfade motion;
    do not invent intermediate states of the application or interpolate its data.
    """
    counts = []
    elapsed = 0
    assigned = 0
    for scene in scenes:
        elapsed += scene["seconds"]
        end = round(elapsed*FPS)
        counts.append(max(1, end-assigned))
        assigned += counts[-1]
    totals = {}
    for scene, count in zip(scenes, counts):
        totals[scene["section"]] = totals.get(scene["section"], 0) + count

    previous = None
    previous_plate = None
    previous_frame = None
    section_elapsed = 0
    for scene, count in zip(scenes, counts):
        changed = previous and previous["section"] != scene["section"]
        if changed:
            section_elapsed = 0
        plate = compose(scene, series, 0)
        pointer = scene["pointer"]
        old_pointer = previous["pointer"] if previous and not changed else None
        selected = "home" if scene["section"] == "closing" else scene["section"]
        sections, _ = nav_for(selected)
        step = 1200 // len(sections)
        x = 40 + sections.index(selected)*step
        width = step-14
        # Dissolve section changes and the landing animation's sampled poses.
        dissolve = min(TRANSITION_FRAMES, count) if changed else (
            min(4, count) if previous and scene["section"] in {"home", "closing"} else 0)
        travel = min(CURSOR_FRAMES, max(1, count//2))
        for index in range(count):
            frame = plate.copy()
            progress = (section_elapsed+index+1)/totals[scene["section"]]
            ImageDraw.Draw(frame).rounded_rectangle(
                (x, 976, x+max(2, round(width*progress)), 979), radius=1, fill=GREEN)
            cursor = pointer
            if old_pointer and pointer and index < travel:
                t = (index+1)/travel
                ease = t*t*(3-2*t)
                cursor = {key: old_pointer[key]+(pointer[key]-old_pointer[key])*ease
                          for key in ("x", "y")}
                # The cursor reaches the target before the recorded result is revealed.
                if not changed and index < travel-1:
                    frame.paste(previous_plate.crop((40, 204, 1240, 924)), (40, 204))
            pulse = 0
            if pointer and pointer.get("clicked") and travel <= index < travel+10:
                pulse = (index-travel+1)/11
            frame = draw_pointer(frame, cursor, pulse)
            if dissolve and index < dissolve:
                t = (index+1)/dissolve
                frame = Image.blend(previous_frame, frame, t*t*(3-2*t))
            yield frame
        section_elapsed += count
        previous, previous_plate, previous_frame = scene, plate, frame


def render(name, scenes, series):
    if not scenes:
        raise ValueError(f"No scenes for {name}")
    target = DEST / name
    # Stream frames into a lossless intermediate. Keeping hundreds of full-size
    # RGB frames in a Python list would consume gigabytes of memory.
    with tempfile.TemporaryDirectory(prefix="render-", dir=CAPTURE) as temporary:
        temporary = Path(temporary)
        movie = temporary / "motion.mkv"
        palette_path = temporary / "palette.png"
        palette = shared_palette(scenes, series)
        palette_image = Image.new("P", (16, 16))
        palette_image.putpalette(palette.getpalette())
        palette_image.putdata(range(256))
        palette_image.convert("RGB").save(palette_path)
        command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                   "-f", "rawvideo", "-pixel_format", "rgb24",
                   "-video_size", f"{SIZE[0]}x{SIZE[1]}", "-framerate", str(FPS),
                   "-i", "pipe:0", "-an", "-c:v", "ffv1", "-threads", "2", str(movie)]
        encoder = subprocess.Popen(command, stdin=subprocess.PIPE)
        rendered = 0
        try:
            for frame in timeline_frames(scenes, series):
                encoder.stdin.write(frame.tobytes())
                rendered += 1
        finally:
            encoder.stdin.close()
            code = encoder.wait()
        if code:
            raise subprocess.CalledProcessError(code, command)
        encoded = temporary / name
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(movie), "-i", str(palette_path),
            "-filter_complex", "[0:v][1:v]paletteuse=dither=none:diff_mode=rectangle",
            "-c:v", "gif", "-gifflags", "+transdiff", "-r", str(FPS),
            "-fps_mode", "cfr", "-loop", "0", str(encoded),
        ], check=True)
        # Validate before replacing an existing preview.
        validate_gif(encoded, rendered)
        target.write_bytes(encoded.read_bytes())
    return validate_gif(target, rendered, report=True)


def validate_gif(target, expected_frames, report=False):
    with Image.open(target) as gif:
        delays = []
        for i in range(gif.n_frames):
            gif.seek(i)
            gif.load()
            delays.append(gif.info.get("duration", 0))
        assert gif.info.get("loop") == 0
        assert gif.size == SIZE and gif.n_frames == expected_frames
        assert set(delays) == {FRAME_MS}, f"Uneven cadence in {target.name}: {set(delays)}"
    assert target.stat().st_size < 10*1024*1024, f"{target.name} exceeds 10 MiB."
    actual_duration = sum(delays)/1000
    if report:
        print(f"{target.name}: {actual_duration:.2f}s, {expected_frames} frames, "
              f"{FPS} fps, {target.stat().st_size/1024/1024:.2f} MiB", flush=True)
    return {"file": target.name, "duration_seconds": actual_duration,
            "frames": expected_frames, "fps": FPS, "frame_delay_ms": FRAME_MS,
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
