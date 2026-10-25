import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_brand_icon(size=1024, is_maskable=False):
    # Base canvas
    img = Image.new("RGBA", (size, size), (22, 21, 18, 255)) # #161512
    draw = ImageDraw.Draw(img)

    # Scale factor
    scale = size / 32.0
    # For maskable icons, Android requires an 80% safe zone (10% padding on each side)
    # For regular icons, we can use slightly larger margins
    content_scale = 0.72 if is_maskable else 0.82
    offset_x = (size * (1 - content_scale)) / 2.0
    offset_y = (size * (1 - content_scale)) / 2.0

    def transform(x, y):
        # 32x32 coordinate system from BrandLogo SVG
        px = offset_x + (x / 32.0) * (size * content_scale)
        py = offset_y + (y / 32.0) * (size * content_scale)
        return (px, py)

    # Subtle radial glow behind the emblem
    glow_radius = int(size * 0.4)
    center = (size // 2, int(size * 0.48))
    glow_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    for r in range(glow_radius, 0, -8):
        alpha = int(45 * (1 - r / glow_radius) ** 2)
        glow_draw.ellipse(
            [center[0] - r, center[1] - r, center[0] + r, center[1] + r],
            fill=(34, 197, 94, alpha)
        )
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=size // 32))
    img.alpha_composite(glow_img)

    # Re-obtain draw after composite
    draw = ImageDraw.Draw(img)

    # 1. Base pedestal: M6 25 to M26 25, height ~ 2
    # In SVG: M6 25 C6 24.44... H25 ... V26 ... H7 ... V25
    p1 = transform(6, 24)
    p2 = transform(26, 27)
    draw.rounded_rectangle([p1[0], p1[1], p2[0], p2[1]], radius=int(size * 0.015), fill=(91, 134, 48, 255))

    # 2. Main Crown / Knight body: M7 23 L9 11 L13 15 L16 6 L19 15 L23 11 L25 23 H7Z
    crown_pts = [
        transform(7, 23),
        transform(9, 11),
        transform(13, 15),
        transform(16, 6),
        transform(19, 15),
        transform(23, 11),
        transform(25, 23),
    ]

    # Create crown with gradient fill
    crown_mask = Image.new("L", (size, size), 0)
    crown_mask_draw = ImageDraw.Draw(crown_mask)
    crown_mask_draw.polygon(crown_pts, fill=255)

    crown_grad = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    crown_grad_draw = ImageDraw.Draw(crown_grad)
    top_y = transform(16, 6)[1]
    bot_y = transform(16, 23)[1]
    grad_height = max(1, bot_y - top_y)

    for y in range(int(top_y), int(bot_y) + 1):
        ratio = (y - top_y) / grad_height
        # Gradient from #4ade80 (74, 222, 128) to #16a34a (22, 163, 74)
        r = int(74 * (1 - ratio) + 22 * ratio)
        g = int(222 * (1 - ratio) + 163 * ratio)
        b = int(128 * (1 - ratio) + 74 * ratio)
        crown_grad_draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    crown_composite = Image.composite(crown_grad, Image.new("RGBA", (size, size), (0, 0, 0, 0)), crown_mask)
    img.alpha_composite(crown_composite)
    draw = ImageDraw.Draw(img)

    # 3. Left wing facet: M7 23 L9 11 L13 15 L16 23 H7Z
    left_facet_pts = [
        transform(7, 23),
        transform(9, 11),
        transform(13, 15),
        transform(16, 23),
    ]
    facet_left_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    facet_left_draw = ImageDraw.Draw(facet_left_img)
    facet_left_draw.polygon(left_facet_pts, fill=(111, 163, 62, 102)) # 40% opacity
    img.alpha_composite(facet_left_img)

    # 4. Right wing facet: M25 23 L23 11 L19 15 L16 23 H25Z
    right_facet_pts = [
        transform(25, 23),
        transform(23, 11),
        transform(19, 15),
        transform(16, 23),
    ]
    facet_right_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    facet_right_draw = ImageDraw.Draw(facet_right_img)
    facet_right_draw.polygon(right_facet_pts, fill=(69, 108, 32, 115)) # 45% opacity
    img.alpha_composite(facet_right_img)

    draw = ImageDraw.Draw(img)

    # 5. Center Pinnacle Diamond: 16,8 to 18,13 to 16,18 to 14,13
    diamond_pts = [
        transform(16, 8),
        transform(18, 13),
        transform(16, 18),
        transform(14, 13),
    ]
    diamond_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    diamond_draw = ImageDraw.Draw(diamond_img)
    diamond_draw.polygon(diamond_pts, fill=(255, 255, 255, 230))
    img.alpha_composite(diamond_img)

    draw = ImageDraw.Draw(img)

    # 6. Checkmark notch cut: M11 18.5 L14.5 22 L21 14
    chk_p1 = transform(11, 18.5)
    chk_p2 = transform(14.5, 22)
    chk_p3 = transform(21, 14)
    stroke_w = max(2, int(size * 0.04))

    # Shadow for notch
    draw.line([chk_p1, chk_p2], fill=(23, 22, 19, 255), width=stroke_w, joint="round")
    draw.line([chk_p2, chk_p3], fill=(23, 22, 19, 255), width=stroke_w, joint="round")

    # Round endpoints
    half_w = stroke_w / 2
    for pt in [chk_p1, chk_p2, chk_p3]:
        draw.ellipse([pt[0] - half_w, pt[1] - half_w, pt[0] + half_w, pt[1] + half_w], fill=(23, 22, 19, 255))

    # 7. Apex pearls:
    # Center: 16, 5 r=1.5 fill=#facc15
    cp = transform(16, 5)
    cr = size * 0.038
    draw.ellipse([cp[0] - cr, cp[1] - cr, cp[0] + cr, cp[1] + cr], fill=(250, 204, 21, 255))

    # Left: 9, 10 r=1.1 fill=#e4e4e7
    lp = transform(9, 10)
    lr = size * 0.028
    draw.ellipse([lp[0] - lr, lp[1] - lr, lp[0] + lr, lp[1] + lr], fill=(228, 228, 231, 255))

    # Right: 23, 10 r=1.1 fill=#e4e4e7
    rp = transform(23, 10)
    rr = size * 0.028
    draw.ellipse([rp[0] - lr, rp[1] - lr, rp[0] + lr, rp[1] + lr], fill=(228, 228, 231, 255))

    return img

def main():
    target_dir = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
    os.makedirs(target_dir, exist_ok=True)

    print("Generating Master 1024x1024 rendering...")
    master = create_brand_icon(size=1024, is_maskable=False)
    master_maskable = create_brand_icon(size=1024, is_maskable=True)

    # 1. 512x512
    p512 = master.resize((512, 512), Image.Resampling.LANCZOS)
    p512.save(os.path.join(target_dir, "icon-512x512.png"), "PNG")
    print("Saved icon-512x512.png")

    # 2. 512x512 maskable
    p512_mask = master_maskable.resize((512, 512), Image.Resampling.LANCZOS)
    p512_mask.save(os.path.join(target_dir, "icon-512x512-maskable.png"), "PNG")
    print("Saved icon-512x512-maskable.png")

    # 3. 192x192
    p192 = master.resize((192, 192), Image.Resampling.LANCZOS)
    p192.save(os.path.join(target_dir, "icon-192x192.png"), "PNG")
    print("Saved icon-192x192.png")

    # 4. Apple Touch Icon 180x180
    p180 = master.resize((180, 180), Image.Resampling.LANCZOS)
    p180.save(os.path.join(target_dir, "apple-touch-icon.png"), "PNG")
    print("Saved apple-touch-icon.png")

    # 5. Favicon 32x32
    p32 = master.resize((32, 32), Image.Resampling.LANCZOS)
    p32.save(os.path.join(target_dir, "favicon-32x32.png"), "PNG")
    print("Saved favicon-32x32.png")

    # Also save to public root as fallback apple-touch-icon
    root_public = os.path.join(os.path.dirname(__file__), "..", "public")
    p180.save(os.path.join(root_public, "apple-touch-icon.png"), "PNG")

    print("All PWA icons generated successfully!")

if __name__ == "__main__":
    main()
