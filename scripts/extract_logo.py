import os
import numpy as np
from PIL import Image, ImageOps

INPUT_IMG = r'C:\Users\QING\.gemini\antigravity-ide\brain\2ff77192-5add-4e26-b842-1b67b943ae82\checkmate_solid_icon_1792955737854.jpg'
OUT_DIR = r'c:\Users\QING\Desktop\Qing\chess-platform\public\brand'
ICONS_DIR = r'c:\Users\QING\Desktop\Qing\chess-platform\public\icons'

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(ICONS_DIR, exist_ok=True)

img = Image.open(INPUT_IMG).convert('RGB')
arr = np.array(img, dtype=np.float32)

r = arr[:, :, 0]
g = arr[:, :, 1]
b = arr[:, :, 2]

# Chroma measure: how "magenta" is this pixel?
# Magenta has high R and high B, but very low G.
# Gold has high R and high G, but low B.
# Green has high G, low R and low B.
# Dark lines have low R, low G, low B.
# So magenta is uniquely identified by: min(R, B) - G
chroma_score = np.minimum(r, b) - g

# Let's map chroma_score to alpha:
# If chroma_score >= 60 -> fully transparent (alpha = 0)
# If chroma_score <= 10 -> fully opaque (alpha = 255)
# In between -> smooth linear interpolation
t_low = 10.0
t_high = 65.0

alpha = np.clip(1.0 - (chroma_score - t_low) / (t_high - t_low), 0.0, 1.0)

# Spill suppression on the color channels:
# Where alpha < 1, suppress excess magenta (R and B) towards G
spill_factor = np.clip((chroma_score - 0.0) / 60.0, 0.0, 1.0)
cleaned_r = r * (1.0 - 0.6 * spill_factor)
cleaned_b = b * (1.0 - 0.6 * spill_factor)
cleaned_g = g

rgba = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.uint8)
rgba[:, :, 0] = np.clip(cleaned_r, 0, 255).astype(np.uint8)
rgba[:, :, 1] = np.clip(cleaned_g, 0, 255).astype(np.uint8)
rgba[:, :, 2] = np.clip(cleaned_b, 0, 255).astype(np.uint8)
rgba[:, :, 3] = (alpha * 255.0).astype(np.uint8)

res_img = Image.fromarray(rgba, 'RGBA')

# Crop to bounding box of non-transparent pixels
bbox = res_img.getbbox()
print("Bounding box:", bbox)
cropped = res_img.crop(bbox)

# Center in square canvas with padding
w, h = cropped.size
max_dim = max(w, h)
canvas_size = int(max_dim * 1.15) # 15% padding
square_canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
offset_x = (canvas_size - w) // 2
offset_y = (canvas_size - h) // 2
square_canvas.paste(cropped, (offset_x, offset_y), cropped)

# Generate colored versions
colored_1024 = square_canvas.resize((1024, 1024), Image.Resampling.LANCZOS)
colored_512 = square_canvas.resize((512, 512), Image.Resampling.LANCZOS)
colored_192 = square_canvas.resize((192, 192), Image.Resampling.LANCZOS)
colored_32 = square_canvas.resize((32, 32), Image.Resampling.LANCZOS)

colored_1024.save(os.path.join(OUT_DIR, 'logo-colored.png'), 'PNG')
colored_512.save(os.path.join(OUT_DIR, 'logo-colored-512.png'), 'PNG')

# Generate Monochrome White version (crisp pure white with original alpha)
white_arr = np.array(colored_1024)
white_arr[:, :, 0] = 255
white_arr[:, :, 1] = 255
white_arr[:, :, 2] = 255
white_img = Image.fromarray(white_arr, 'RGBA')
white_img.save(os.path.join(OUT_DIR, 'logo-white.png'), 'PNG')
white_img.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(OUT_DIR, 'logo-white-512.png'), 'PNG')

# Generate Monochrome Black / Dark Charcoal version (#211f1c)
black_arr = np.array(colored_1024)
black_arr[:, :, 0] = 33
black_arr[:, :, 1] = 31
black_arr[:, :, 2] = 28
black_img = Image.fromarray(black_arr, 'RGBA')
black_img.save(os.path.join(OUT_DIR, 'logo-black.png'), 'PNG')
black_img.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(OUT_DIR, 'logo-black-512.png'), 'PNG')

# Generate PWA Icons
colored_512.save(os.path.join(ICONS_DIR, 'icon-512x512.png'), 'PNG')
colored_192.save(os.path.join(ICONS_DIR, 'icon-192x192.png'), 'PNG')
colored_32.save(os.path.join(ICONS_DIR, 'favicon-32x32.png'), 'PNG')
white_img.resize((180, 180), Image.Resampling.LANCZOS) # Apple touch icon
# For apple-touch-icon, use colored on solid dark background or transparent
colored_512.resize((180, 180), Image.Resampling.LANCZOS).save(os.path.join(ICONS_DIR, 'apple-touch-icon.png'), 'PNG')
colored_512.resize((180, 180), Image.Resampling.LANCZOS).save(r'c:\Users\QING\Desktop\Qing\chess-platform\public\apple-touch-icon.png', 'PNG')

# For maskable 512 icon: create icon with app dark background (#161512) and safe-zone padding
maskable = Image.new('RGBA', (512, 512), (22, 21, 18, 255))
icon_inner = colored_512.resize((410, 410), Image.Resampling.LANCZOS)
maskable.paste(icon_inner, (51, 51), icon_inner)
maskable.save(os.path.join(ICONS_DIR, 'icon-512x512-maskable.png'), 'PNG')

# Generate SVGs with embedded high-res PNG data
import base64
with open(os.path.join(OUT_DIR, 'logo-colored-512.png'), 'rb') as f:
    b64_colored = base64.b64encode(f.read()).decode('utf-8')
with open(os.path.join(OUT_DIR, 'logo-white-512.png'), 'rb') as f:
    b64_white = base64.b64encode(f.read()).decode('utf-8')
with open(os.path.join(OUT_DIR, 'logo-black-512.png'), 'rb') as f:
    b64_black = base64.b64encode(f.read()).decode('utf-8')

svg_colored = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image href="data:image/png;base64,{b64_colored}" width="512" height="512" />
</svg>'''

svg_white = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image href="data:image/png;base64,{b64_white}" width="512" height="512" />
</svg>'''

svg_black = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image href="data:image/png;base64,{b64_black}" width="512" height="512" />
</svg>'''

with open(os.path.join(ICONS_DIR, 'icon.svg'), 'w', encoding='utf-8') as f:
    f.write(svg_colored)
with open(os.path.join(OUT_DIR, 'logo-colored.svg'), 'w', encoding='utf-8') as f:
    f.write(svg_colored)
with open(os.path.join(OUT_DIR, 'logo-white.svg'), 'w', encoding='utf-8') as f:
    f.write(svg_white)
with open(os.path.join(OUT_DIR, 'logo-black.svg'), 'w', encoding='utf-8') as f:
    f.write(svg_black)

print("All transparent brand logo assets & SVGs generated successfully!")
