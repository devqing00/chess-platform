import os
import math
from PIL import Image, ImageDraw, ImageFilter

def evaluate_bezier(p0, p1, p2, p3, steps=60):
    points = []
    for i in range(steps + 1):
        t = i / float(steps)
        u = 1.0 - t
        tt = t * t
        uu = u * u
        uuu = uu * u
        ttt = tt * t

        x = uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0]
        y = uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1]
        points.append((x, y))
    return points

def draw_thick_polyline(draw, points, width, fill):
    half = width / 2.0
    for i in range(len(points) - 1):
        draw.line([points[i], points[i+1]], fill=fill, width=int(width))
        draw.ellipse([points[i][0] - half, points[i][1] - half, points[i][0] + half, points[i][1] + half], fill=fill)
    last = points[-1]
    draw.ellipse([last[0] - half, last[1] - half, last[0] + half, last[1] + half], fill=fill)

def render_logo(size=1024, mode="colored", bg="transparent"):
    # Render at 2x super-sampling for pristine antialiasing
    render_size = size * 2
    img = Image.new("RGBA", (render_size, render_size), (0, 0, 0, 0))
    if bg == "dark":
        # #161512
        img = Image.new("RGBA", (render_size, render_size), (22, 21, 18, 255))
        # Add subtle emerald ambient glow for app icons
        if mode == "colored":
            glow = Image.new("RGBA", (render_size, render_size), (0, 0, 0, 0))
            gdraw = ImageDraw.Draw(glow)
            c = (render_size // 2, int(render_size * 0.48))
            rad = int(render_size * 0.42)
            for r in range(rad, 0, -12):
                alpha = int(45 * (1.0 - r / float(rad)) ** 2)
                gdraw.ellipse([c[0]-r, c[1]-r, c[0]+r, c[1]+r], fill=(34, 197, 94, alpha))
            glow = glow.filter(ImageFilter.GaussianBlur(radius=render_size // 36))
            img.alpha_composite(glow)

    draw = ImageDraw.Draw(img)

    # Scale mapping from 100x100 reference to render_size
    padding = render_size * 0.10
    scale = (render_size - padding * 2) / 100.0

    def pt(x, y):
        return (padding + x * scale, padding + y * scale)

    # Color tokens
    if mode == "colored":
        green_body = (34, 197, 94, 255)   # #22c55e
        green_light = (74, 222, 128, 255) # #4ade80
        green_dark = (21, 128, 61, 255)   # #15803d
        crown_fill = (234, 179, 8, 255)   # #eab308
        crown_pearl = (254, 240, 138, 255)# #fef08a
        white_accent = (255, 255, 255, 255)
        dot_color = (34, 197, 94, 255)
    elif mode == "white":
        green_body = (255, 255, 255, 255)
        green_light = (255, 255, 255, 255)
        green_dark = (255, 255, 255, 255)
        crown_fill = (255, 255, 255, 255)
        crown_pearl = (255, 255, 255, 255)
        white_accent = (255, 255, 255, 255)
        dot_color = (255, 255, 255, 255)
    else: # black
        dark_c = (22, 21, 18, 255)
        green_body = dark_c
        green_light = dark_c
        green_dark = dark_c
        crown_fill = dark_c
        crown_pearl = dark_c
        white_accent = dark_c
        dot_color = dark_c

    stroke_thick = 7.0 * scale
    stroke_medium = 5.0 * scale
    stroke_thin = 2.5 * scale

    # 1. Crown Polygon
    crown_pts = [
        pt(44, 26),
        pt(42, 16),
        pt(49, 20),
        pt(56, 12),
        pt(63, 20),
        pt(70, 16),
        pt(68, 26),
    ]
    draw.polygon(crown_pts, fill=crown_fill)
    # Crown outline with rounded joints
    draw_thick_polyline(draw, crown_pts + [crown_pts[0]], 2.0 * scale, crown_fill)

    # Crown Pearls
    pr1 = 2.4 * scale
    pr2 = 2.9 * scale
    draw.ellipse([pt(42, 15)[0]-pr1, pt(42, 15)[1]-pr1, pt(42, 15)[0]+pr1, pt(42, 15)[1]+pr1], fill=crown_pearl)
    draw.ellipse([pt(56, 11)[0]-pr2, pt(56, 11)[1]-pr2, pt(56, 11)[0]+pr2, pt(56, 11)[1]+pr2], fill=crown_pearl)
    draw.ellipse([pt(70, 15)[0]-pr1, pt(70, 15)[1]-pr1, pt(70, 15)[0]+pr1, pt(70, 15)[1]+pr1], fill=crown_pearl)

    # 2. Main Checkmark + Knight Body Curve
    # Path:
    # Segment 1: Line M18 48 -> L28 62
    p_check_start = pt(18, 48)
    p_check_vertex = pt(28, 62)

    # Segment 2: Bezier C(33,52), (41,38) -> (52,28)
    b1 = evaluate_bezier(pt(28, 62), pt(33, 52), pt(41, 38), pt(52, 28))
    # Segment 3: Forehead arc C(56,24), (64,24) -> (68,28)
    b2 = evaluate_bezier(pt(52, 28), pt(56, 24), pt(64, 24), pt(68, 28))
    # Segment 4: Snout arc C(70,30), (71,33) -> (72,36)
    b3 = evaluate_bezier(pt(68, 28), pt(70, 30), pt(71, 33), pt(72, 36))
    # Segment 5: Mouth notch (72,36) -> (66,38) -> (65,41) -> (69,44)
    # Segment 6: Jaw curve C(66,48), (61,49) -> (57,48)
    b4 = evaluate_bezier(pt(69, 44), pt(66, 48), pt(61, 49), pt(57, 48))
    # Segment 7: Lower neck curve C(53,47), (50,51) -> (52,57)
    b5 = evaluate_bezier(pt(57, 48), pt(53, 47), pt(50, 51), pt(52, 57))
    # Segment 8: Base curve C(54,62), (60,64) -> (68,64)
    b6 = evaluate_bezier(pt(52, 57), pt(54, 62), pt(60, 64), pt(68, 64))

    full_body_points = [p_check_start, p_check_vertex] + b1[1:] + b2[1:] + b3[1:] + [pt(66, 38), pt(65, 41), pt(69, 44)] + b4[1:] + b5[1:] + b6[1:]
    draw_thick_polyline(draw, full_body_points, stroke_thick, green_body)

    # 3. Inner White Chest Contour: C(36,66) -> C(36,57), (40,46) -> (44,40)
    chest_pts = evaluate_bezier(pt(36, 66), pt(36, 57), pt(40, 46), pt(44, 40))
    draw_thick_polyline(draw, chest_pts, stroke_medium, white_accent)

    # 4. Knight Eye: C(60,32) -> C(61,31), (63,31) -> (64,33)
    if mode == "colored" or mode == "white":
        eye_pts = evaluate_bezier(pt(60, 32), pt(61, 31), pt(63, 31), pt(64, 33))
        draw_thick_polyline(draw, eye_pts, stroke_thin, (255, 255, 255, 255))

    # 5. Terminal Base Sphere
    sr = 4.8 * scale
    scenter = pt(73, 64)
    draw.ellipse([scenter[0] - sr, scenter[1] - sr, scenter[0] + sr, scenter[1] + sr], fill=dot_color)

    # Downsample with Lanczos for pristine crisp antialiasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def main():
    brand_dir = os.path.join(os.path.dirname(__file__), "..", "public", "brand")
    icons_dir = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
    public_dir = os.path.join(os.path.dirname(__file__), "..", "public")
    os.makedirs(brand_dir, exist_ok=True)
    os.makedirs(icons_dir, exist_ok=True)

    print("Generating Brand Logos on transparent backgrounds...")
    # 1. Colored on Transparent (1024x1024 and 512x512)
    c1024 = render_logo(1024, mode="colored", bg="transparent")
    c1024.save(os.path.join(brand_dir, "logo-colored.png"), "PNG")
    c512 = render_logo(512, mode="colored", bg="transparent")
    c512.save(os.path.join(brand_dir, "logo-colored-512.png"), "PNG")
    print("Saved logo-colored.png & logo-colored-512.png")

    # 2. White on Transparent (1024x1024 and 512x512)
    w1024 = render_logo(1024, mode="white", bg="transparent")
    w1024.save(os.path.join(brand_dir, "logo-white.png"), "PNG")
    w512 = render_logo(512, mode="white", bg="transparent")
    w512.save(os.path.join(brand_dir, "logo-white-512.png"), "PNG")
    print("Saved logo-white.png & logo-white-512.png")

    # 3. Black on Transparent (1024x1024 and 512x512)
    b1024 = render_logo(1024, mode="black", bg="transparent")
    b1024.save(os.path.join(brand_dir, "logo-black.png"), "PNG")
    b512 = render_logo(512, mode="black", bg="transparent")
    b512.save(os.path.join(brand_dir, "logo-black-512.png"), "PNG")
    print("Saved logo-black.png & logo-black-512.png")

    print("Generating Updated PWA Icons with the new rounded emblem on dark theme...")
    pwa512 = render_logo(512, mode="colored", bg="dark")
    pwa512.save(os.path.join(icons_dir, "icon-512x512.png"), "PNG")
    pwa512.save(os.path.join(icons_dir, "icon-512x512-maskable.png"), "PNG")

    pwa192 = render_logo(192, mode="colored", bg="dark")
    pwa192.save(os.path.join(icons_dir, "icon-192x192.png"), "PNG")

    apple180 = render_logo(180, mode="colored", bg="dark")
    apple180.save(os.path.join(icons_dir, "apple-touch-icon.png"), "PNG")
    apple180.save(os.path.join(public_dir, "apple-touch-icon.png"), "PNG")

    fav32 = render_logo(32, mode="colored", bg="dark")
    fav32.save(os.path.join(icons_dir, "favicon-32x32.png"), "PNG")

    # Also update public/icons/icon.svg with the new colored SVG
    with open(os.path.join(brand_dir, "logo-colored.svg"), "r", encoding="utf-8") as f_in:
        svg_content = f_in.read()
    with open(os.path.join(icons_dir, "icon.svg"), "w", encoding="utf-8") as f_out:
        f_out.write(svg_content)

    print("All Brand and PWA assets generated successfully!")

if __name__ == "__main__":
    main()
