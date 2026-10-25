import os
import cv2
import numpy as np
from PIL import Image

TARGET_CANVAS = 512
BASELINE_Y = 450
TARGET_HEIGHT = 385

def build_alpha_minimal():
    neo_dir = 'public/pieces/neo'
    alpha_dir = 'public/pieces/alpha'
    os.makedirs(alpha_dir, exist_ok=True)

    pieces = ['k', 'q', 'b', 'n', 'r', 'p']
    colors = ['w', 'b']

    for p in pieces:
        ref_file = os.path.join(neo_dir, f"w_{p}.png")
        if not os.path.exists(ref_file):
            print(f"Missing {ref_file}")
            continue

        ref_img = Image.open(ref_file).convert('RGBA')
        ref_arr = np.array(ref_img)
        h, w = ref_arr.shape[:2]
        alpha = ref_arr[:, :, 3]
        mask = alpha > 40

        # Extract interior fill and outer stroke
        gray_ref = cv2.cvtColor(ref_arr[:, :, :3], cv2.COLOR_RGB2GRAY)
        is_stroke = mask & (gray_ref < 100)
        is_fill = mask & ~is_stroke

        # Centroid for vertical split
        y_idx, x_idx = np.indices((h, w))
        # Find horizontal center of each row
        center_x = w // 2

        # Right-side shadow mask (split-tone shading as in flat2d)
        is_right_half = is_fill & (x_idx >= center_x)
        is_left_half = is_fill & (x_idx < center_x)

        # Distance transform for highlights
        dist_transform = cv2.distanceTransform(is_fill.astype(np.uint8), cv2.DIST_L2, 5)
        norm_dist = cv2.normalize(dist_transform, None, 0, 1.0, cv2.NORM_MINMAX)

        # Curved crescent highlight for black pieces (upper-left curve like in flat2d_black.jpg)
        crescent_highlight = is_left_half & (norm_dist > 0.45) & (norm_dist < 0.75) & (x_idx < center_x - 15)

        for color in colors:
            out_arr = np.zeros((h, w, 4), dtype=np.uint8)
            out_arr[:, :, 3] = alpha

            if color == 'w':
                # Alpha White:
                # Left side: pure clean white (#FFFFFF)
                # Right side: flat graphic shadow (#DFDFE6) exactly like flat2d_white.jpg
                # Bold jet-black outline (#161618)
                out_arr[is_left_half, :3] = [255, 255, 255]
                out_arr[is_right_half, :3] = [224, 224, 230]
                out_arr[is_stroke, :3] = [22, 22, 24]
            else:
                # Alpha Black:
                # Left side: rich dark charcoal slate (#3E3D42) exactly like flat2d_black.jpg
                # Right side: deep shadow (#262529)
                # Crisp crescent highlight (#9090A0 to #B8B8C8) as in flat2d_black.jpg
                # Bold jet-black outline (#141416)
                out_arr[is_left_half, :3] = [62, 60, 66]
                out_arr[is_right_half, :3] = [38, 37, 42]
                out_arr[crescent_highlight, :3] = [168, 172, 185]  # Crisp graphic highlight!
                out_arr[is_stroke, :3] = [18, 18, 20]

            out_path = os.path.join(alpha_dir, f"{color}_{p}.png")
            Image.fromarray(out_arr).save(out_path, 'PNG')

    from extract_all_pieces import create_preview_sheet
    create_preview_sheet(alpha_dir, 'alpha')
    print("SUCCESS: Alpha Minimal pieces built matching flat2d split-tone style with wide Neo crowns!")

if __name__ == '__main__':
    build_alpha_minimal()
