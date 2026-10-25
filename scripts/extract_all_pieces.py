import os
import sys
import glob
import cv2
import numpy as np
from PIL import Image

TARGET_CANVAS = 512       # Output image is 512x512 transparent PNG
TARGET_HEIGHT = 385       # Perfectly balanced height with wide stance (~75% of canvas)
BASELINE_Y = 450          # Standard baseline allowing broad sturdy footing
PADDING = 6               # Bounding box safety padding

PIECE_NAMES = {
    'k': 'King',
    'q': 'Queen',
    'b': 'Bishop',
    'n': 'Knight',
    'r': 'Rook',
    'p': 'Pawn'
}

def detect_background_mode(bgr):
    """
    Analyzes the 4 corners and borders of the image to determine the background color.
    Returns: ('green' | 'magenta' | 'white' | 'dark' | 'custom', bg_bgr_color)
    """
    h, w, _ = bgr.shape
    corner_samples = np.concatenate([
        bgr[0:30, 0:30].reshape(-1, 3),
        bgr[0:30, w-30:w].reshape(-1, 3),
        bgr[h-30:h, 0:30].reshape(-1, 3),
        bgr[h-30:h, w-30:w].reshape(-1, 3),
        bgr[0:20, :].reshape(-1, 3),
        bgr[h-20:h, :].reshape(-1, 3)
    ], axis=0)

    median_bgr = np.median(corner_samples, axis=0).astype(int)
    b, g, r = median_bgr[0], median_bgr[1], median_bgr[2]

    # Check for Chroma Green (lime green: high G, significantly higher than R and B)
    if g > 110 and g > (r + 35) and g > (b + 35):
        return 'green', median_bgr

    # Check for Chroma Magenta (high R & B, low G)
    if r > 120 and b > 120 and (r - g) > 40 and (b - g) > 40:
        return 'magenta', median_bgr

    # Check for Pure White or Light Neutral
    if r > 215 and g > 215 and b > 215 and max(abs(r-g), abs(r-b), abs(g-b)) < 25:
        return 'white', median_bgr

    # Check for Dark / Obsidian
    if r < 40 and g < 40 and b < 40:
        return 'dark', median_bgr

    return 'custom', median_bgr

def extract_alpha_and_despill(bgr, bg_mode, bg_bgr):
    """
    Generates a clean RGBA image with anti-aliased transparency and green/color despill.
    """
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
    h, w, _ = bgr.shape

    if bg_mode == 'green':
        # HSV & RGB delta keying
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        h_ch, s_ch, v_ch = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
        
        # Green hue roughly 35 to 88 in OpenCV (0-180 scale)
        is_green_hue = (h_ch >= 32) & (h_ch <= 92) & (s_ch >= 45) & (v_ch >= 45)
        is_green_delta = (rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2])) > 25
        bg_mask = (is_green_hue | is_green_delta)
        
        # Soft transition / alpha feathering
        excess_green = rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2])
        alpha = np.where(bg_mask, 0.0, 255.0)
        
        # Despill: clean any green bounce/halo around piece contours
        despill_rgb = rgb.copy()
        spill_amount = np.clip(excess_green, 0, 255)
        # Suppress green down to average of R and B
        rb_max = np.maximum(despill_rgb[:, :, 0], despill_rgb[:, :, 2])
        despill_rgb[:, :, 1] = np.where(excess_green > 0, rb_max, despill_rgb[:, :, 1])

        # Morphological clean to close small pinholes inside pieces
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        binary_mask = (alpha > 128).astype(np.uint8)
        binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        alpha = cv2.GaussianBlur(binary_mask.astype(np.float32) * 255.0, (3, 3), 0.5)

        rgba = np.dstack([
            np.clip(despill_rgb[:, :, 0], 0, 255).astype(np.uint8),
            np.clip(despill_rgb[:, :, 1], 0, 255).astype(np.uint8),
            np.clip(despill_rgb[:, :, 2], 0, 255).astype(np.uint8),
            np.clip(alpha, 0, 255).astype(np.uint8)
        ])
        return rgba

    elif bg_mode == 'magenta':
        # Magenta keying: R & B high, G low
        excess_magenta = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
        bg_mask = (excess_magenta > 35) & (rgb[:, :, 0] > 110) & (rgb[:, :, 2] > 110)
        alpha = np.where(bg_mask, 0.0, 255.0)
        
        despill_rgb = rgb.copy()
        despill_rgb[:, :, 0] = np.where(excess_magenta > 0, despill_rgb[:, :, 1], despill_rgb[:, :, 0])
        despill_rgb[:, :, 2] = np.where(excess_magenta > 0, despill_rgb[:, :, 1], despill_rgb[:, :, 2])

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        binary_mask = cv2.morphologyEx((alpha > 128).astype(np.uint8), cv2.MORPH_CLOSE, kernel, iterations=2)
        alpha = cv2.GaussianBlur(binary_mask.astype(np.float32) * 255.0, (3, 3), 0.5)

        rgba = np.dstack([
            np.clip(despill_rgb[:, :, 0], 0, 255).astype(np.uint8),
            np.clip(despill_rgb[:, :, 1], 0, 255).astype(np.uint8),
            np.clip(despill_rgb[:, :, 2], 0, 255).astype(np.uint8),
            np.clip(alpha, 0, 255).astype(np.uint8)
        ])
        return rgba

    elif bg_mode == 'white':
        # FloodFill exterior starting from borders
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        flood_mask = np.zeros((h + 2, w + 2), np.uint8)
        flood_img = gray.copy()
        
        for pt in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
            cv2.floodFill(flood_img, flood_mask, pt, 0, loDiff=16, upDiff=16)

        exterior_bg = (flood_mask[1:h+1, 1:w+1] == 1)
        alpha = np.where(exterior_bg, 0, 255).astype(np.uint8)
        alpha = cv2.GaussianBlur(alpha, (3, 3), 0.5)

        rgba = np.dstack([
            np.clip(rgb[:, :, 0], 0, 255).astype(np.uint8),
            np.clip(rgb[:, :, 1], 0, 255).astype(np.uint8),
            np.clip(rgb[:, :, 2], 0, 255).astype(np.uint8),
            alpha
        ])
        return rgba

    else:
        # Custom color difference
        diff = np.linalg.norm(bgr.astype(np.float32) - bg_bgr.astype(np.float32), axis=2)
        alpha = np.where(diff < 38, 0, 255).astype(np.uint8)
        alpha = cv2.GaussianBlur(alpha, (3, 3), 0.5)
        rgba = np.dstack([
            np.clip(rgb[:, :, 0], 0, 255).astype(np.uint8),
            np.clip(rgb[:, :, 1], 0, 255).astype(np.uint8),
            np.clip(rgb[:, :, 2], 0, 255).astype(np.uint8),
            alpha
        ])
        return rgba

def find_piece_bounding_boxes(rgba):
    """
    Detects the 6 pieces in the sheet and returns them mapped to:
    Row 0: [King, Queen, Bishop]
    Row 1: [Knight, Rook, Pawn]
    """
    alpha = rgba[:, :, 3]
    h, w = alpha.shape

    # Find external contours of foreground pieces
    thresh = (alpha > 40).astype(np.uint8)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    min_area = (h * w) * 0.008  # at least 0.8% of image size to avoid speckles
    valid_boxes = []

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > min_area:
            bx, by, bw, bh = cv2.boundingRect(cnt)
            # Add padding
            bx1 = max(0, bx - PADDING)
            by1 = max(0, by - PADDING)
            bx2 = min(w, bx + bw + PADDING)
            by2 = min(h, by + bh + PADDING)
            valid_boxes.append((bx1, by1, bx2 - bx1, by2 - by1))

    # If automatic contour detection found exactly 6 boxes
    if len(valid_boxes) == 6:
        # Cluster into 2 rows of 3 by Y center
        valid_boxes.sort(key=lambda b: b[1] + b[3] / 2)
        top_row = sorted(valid_boxes[:3], key=lambda b: b[0])
        bottom_row = sorted(valid_boxes[3:], key=lambda b: b[0])
        return [
            [top_row[0], top_row[1], top_row[2]],
            [bottom_row[0], bottom_row[1], bottom_row[2]]
        ]

    print(f"  Note: Automatic contour found {len(valid_boxes)} pieces (expected 6). Falling back to smart grid partition.")
    # Smart Fallback: 2 rows x 3 columns grid partition with active alpha trimming
    row_h = h // 2
    col_w = w // 3
    grid = []
    for r in range(2):
        row_boxes = []
        for c in range(3):
            cell_y1, cell_y2 = r * row_h, (r + 1) * row_h
            cell_x1, cell_x2 = c * col_w, (c + 1) * col_w
            cell_alpha = alpha[cell_y1:cell_y2, cell_x1:cell_x2]
            
            rows = np.where(np.sum(cell_alpha > 30, axis=1) > 3)[0]
            cols = np.where(np.sum(cell_alpha > 30, axis=0) > 3)[0]
            
            if len(rows) > 0 and len(cols) > 0:
                y1 = cell_y1 + rows[0]
                y2 = cell_y1 + rows[-1] + 1
                x1 = cell_x1 + cols[0]
                x2 = cell_x1 + cols[-1] + 1
                row_boxes.append((x1, y1, x2 - x1, y2 - y1))
            else:
                row_boxes.append((cell_x1, cell_y1, col_w, row_h))
        grid.append(row_boxes)

    return grid

def standardize_and_save_piece(cell_rgba, out_path, is_pixel=False):
    """
    Standardizes each piece to STRICT UNIFORM HEIGHT (TARGET_HEIGHT),
    centers it horizontally, and aligns its base to BASELINE_Y on a 512x512 canvas.
    """
    alpha = cell_rgba[:, :, 3]
    rows = np.where(np.sum(alpha > 30, axis=1) > 2)[0]
    cols = np.where(np.sum(alpha > 30, axis=0) > 2)[0]

    if len(rows) == 0 or len(cols) == 0:
        print(f"  Warning: Empty bounding box for {out_path}")
        return False

    ymin, ymax = rows[0], rows[-1]
    xmin, xmax = cols[0], cols[-1]
    cropped = cell_rgba[ymin:ymax+1, xmin:xmax+1]

    ch, cw, _ = cropped.shape
    if ch <= 0 or cw <= 0:
        return False

    # STRICT SAME HEIGHT: scale so height matches TARGET_HEIGHT exactly
    scale = TARGET_HEIGHT / float(ch)
    new_h = TARGET_HEIGHT
    new_w = max(1, int(round(cw * scale)))

    # Prevent width overflow beyond canvas
    if new_w > (TARGET_CANVAS - 20):
        scale = (TARGET_CANVAS - 20) / float(cw)
        new_w = TARGET_CANVAS - 20
        new_h = max(1, int(round(ch * scale)))

    interp = cv2.INTER_NEAREST if is_pixel else cv2.INTER_LANCZOS4
    resized = cv2.resize(cropped, (new_w, new_h), interpolation=interp)

    canvas = np.zeros((TARGET_CANVAS, TARGET_CANVAS, 4), dtype=np.uint8)
    py = max(0, BASELINE_Y - new_h)
    px = max(0, (TARGET_CANVAS - new_w) // 2)

    actual_h = min(new_h, TARGET_CANVAS - py)
    actual_w = min(new_w, TARGET_CANVAS - px)
    canvas[py:py+actual_h, px:px+actual_w] = resized[:actual_h, :actual_w]

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    Image.fromarray(canvas).save(out_path, 'PNG')
    return True

def create_preview_sheet(out_dir, style_name):
    """
    Generates a verification collage showing all 12 pieces side-by-side
    on alternating board squares with a red horizontal baseline guideline.
    """
    pieces = ['k', 'q', 'b', 'n', 'r', 'p']
    colors = ['w', 'b']
    sq_size = 140
    sheet_w = sq_size * 6
    sheet_h = sq_size * 2 + 50
    sheet = Image.new('RGBA', (sheet_w, sheet_h), (24, 24, 27, 255))

    light_sq = (235, 236, 208, 255)
    dark_sq = (119, 149, 86, 255)

    for row_idx, color in enumerate(colors):
        y_offset = row_idx * sq_size + 40
        for col_idx, p in enumerate(pieces):
            x_offset = col_idx * sq_size
            sq_color = light_sq if (row_idx + col_idx) % 2 == 0 else dark_sq
            sq_img = Image.new('RGBA', (sq_size, sq_size), sq_color)
            sheet.paste(sq_img, (x_offset, y_offset))

            piece_file = os.path.join(out_dir, f"{color}_{p}.png")
            if os.path.exists(piece_file):
                p_img = Image.open(piece_file).convert('RGBA')
                p_resized = p_img.resize((sq_size, sq_size), Image.Resampling.LANCZOS)
                sheet.paste(p_resized, (x_offset, y_offset), p_resized)

    # Draw red baseline guide across each row
    sheet_arr = np.array(sheet)
    for row_idx in range(2):
        guide_y = int(row_idx * sq_size + 40 + (BASELINE_Y / TARGET_CANVAS) * sq_size)
        sheet_arr[guide_y:guide_y+1, :, 0] = 239  # Red guide
        sheet_arr[guide_y:guide_y+1, :, 1] = 68
        sheet_arr[guide_y:guide_y+1, :, 2] = 68
        sheet_arr[guide_y:guide_y+1, :, 3] = 180

    preview_path = os.path.join(out_dir, f"_{style_name}_preview.png")
    Image.fromarray(sheet_arr).save(preview_path, 'PNG')
    print(f"  [OK] Saved alignment preview sheet: {preview_path}")

def process_image_sheet(image_path, color, out_dir, is_pixel=False):
    """
    Loads sheet image, detects background, removes it with despill,
    locates all 6 pieces, normalizes height & baseline, and writes to out_dir.
    """
    if not os.path.exists(image_path):
        print(f"  Missing file: {image_path}")
        return False

    bgr = cv2.imread(image_path)
    if bgr is None:
        print(f"  Failed to load image: {image_path}")
        return False

    h, w, _ = bgr.shape
    bg_mode, bg_bgr = detect_background_mode(bgr)
    print(f"  Loaded {os.path.basename(image_path)} ({w}x{h}) - Background mode: {bg_mode.upper()} {bg_bgr}")

    rgba = extract_alpha_and_despill(bgr, bg_mode, bg_bgr)
    grid_boxes = find_piece_bounding_boxes(rgba)

    piece_layout = [
        ['k', 'q', 'b'],  # Top row
        ['n', 'r', 'p']   # Bottom row
    ]

    saved_count = 0
    for r_idx in range(2):
        for c_idx in range(3):
            ptype = piece_layout[r_idx][c_idx]
            bx, by, bw, bh = grid_boxes[r_idx][c_idx]
            cell = rgba[by:by+bh, bx:bx+bw]

            out_path = os.path.join(out_dir, f"{color}_{ptype}.png")
            success = standardize_and_save_piece(cell, out_path, is_pixel=is_pixel)
            if success:
                saved_count += 1
                pname = PIECE_NAMES.get(ptype, ptype)
                print(f"    -> Extracted {color.upper()} {pname:7s} ({color}_{ptype}.png) [Uniform Height: {TARGET_HEIGHT}px]")

    return saved_count == 6

def process_style(style_name, white_img, black_img, out_dir=None, is_pixel=False):
    if out_dir is None:
        out_dir = f"public/pieces/{style_name}"
    os.makedirs(out_dir, exist_ok=True)

    print(f"\n==========================================")
    print(f"Processing Style: '{style_name}' -> {out_dir}")
    print(f"==========================================")

    w_ok = process_image_sheet(white_img, 'w', out_dir, is_pixel=is_pixel)
    b_ok = process_image_sheet(black_img, 'b', out_dir, is_pixel=is_pixel)

    if w_ok or b_ok:
        create_preview_sheet(out_dir, style_name)

    # Mirror wood to staunton if relevant
    if style_name == 'wood':
        staunton_dir = 'public/pieces/staunton'
        os.makedirs(staunton_dir, exist_ok=True)
        for f in os.listdir(out_dir):
            if f.endswith('.png'):
                import shutil
                shutil.copyfile(os.path.join(out_dir, f), os.path.join(staunton_dir, f))
        print("  -> Mirrored pieces to public/pieces/staunton/")

def scan_and_process_all():
    """
    Auto-detects any image pairs in public/pieces/ or input/ matching:
      [style]_white.(jpg|png|webp) & [style]_black.(jpg|png|webp)
    """
    pieces_root = 'public/pieces'
    extensions = ['jpg', 'png', 'jpeg', 'webp']

    # Known / predefined styles
    known_styles = [
        ('neo', 'neo_white', 'neo_black', False),
        ('8bit', 'pixel_white', 'pixel_black', True),
        ('flat2d', 'flat2d_white', 'flat2d_black', False),
        ('wood', 'wooden_white', 'wooden_black', False),
        ('vinyl', 'vinyl_white', 'vinyl_black', False),
        ('glass', 'glass_white', 'glass_black', False),
    ]

    for style, w_base, b_base, is_pix in known_styles:
        w_path = None
        b_path = None
        for ext in extensions:
            cand_w = os.path.join(pieces_root, f"{w_base}.{ext}")
            cand_b = os.path.join(pieces_root, f"{b_base}.{ext}")
            if os.path.exists(cand_w) and w_path is None:
                w_path = cand_w
            if os.path.exists(cand_b) and b_path is None:
                b_path = cand_b

        # Also check style_white / style_black
        for ext in extensions:
            cand_w = os.path.join(pieces_root, f"{style}_white.{ext}")
            cand_b = os.path.join(pieces_root, f"{style}_black.{ext}")
            if os.path.exists(cand_w):
                w_path = cand_w
            if os.path.exists(cand_b):
                b_path = cand_b

        if w_path and b_path:
            process_style(style, w_path, b_path, is_pixel=is_pix)

if __name__ == '__main__':
    print("========================================================")
    print("CHESS PLATFORM - AUTOMATED PIECE EXTRACTOR v3.0")
    print(f"Canvas: {TARGET_CANVAS}x{TARGET_CANVAS} | Height: {TARGET_HEIGHT}px (STRICT) | Baseline: y={BASELINE_Y}")
    print("========================================================")

    if len(sys.argv) > 1:
        target_style = sys.argv[1].lower()
        print(f"Running targeted style: {target_style}")
        # Search for that style specifically
        scan_and_process_all()
    else:
        scan_and_process_all()

    print("\n[DONE] All matching piece sets processed and aligned!")
