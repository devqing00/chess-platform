import os
import cv2
import numpy as np
from PIL import Image

TARGET_CANVAS = 512
BASELINE_Y = 450
TARGET_HEIGHT = 385

def build_all_master_styles():
    neo_dir = 'public/pieces/neo'
    if not os.path.exists(neo_dir):
        print("Error: Neo source directory does not exist")
        return

    wood_dir = 'public/pieces/wood'
    staunton_dir = 'public/pieces/staunton'
    vinyl_dir = 'public/pieces/vinyl'
    glass_dir = 'public/pieces/glass'
    alpha_dir = 'public/pieces/alpha'
    eightbit_dir = 'public/pieces/8bit'

    for d in [wood_dir, staunton_dir, vinyl_dir, glass_dir, alpha_dir, eightbit_dir]:
        os.makedirs(d, exist_ok=True)

    pieces = ['k', 'q', 'b', 'n', 'r', 'p']
    colors = ['w', 'b']

    for p in pieces:
        # Load white piece to extract 100% clean geometric mask & stroke
        ref_white_file = os.path.join(neo_dir, f"w_{p}.png")
        if not os.path.exists(ref_white_file):
            print(f"Missing {ref_white_file}")
            continue

        ref_img = Image.open(ref_white_file).convert('RGBA')
        ref_arr = np.array(ref_img)
        h, w = ref_arr.shape[:2]
        alpha = ref_arr[:, :, 3]
        mask = alpha > 40

        # In neo_white, interior is bright white (>130) and stroke is dark charcoal (<100)
        gray_ref = cv2.cvtColor(ref_arr[:, :, :3], cv2.COLOR_RGB2GRAY)
        is_stroke = mask & (gray_ref < 100)
        is_fill = mask & ~is_stroke

        # Compute smooth distance transform for 3D curved surface shading
        dist_transform = cv2.distanceTransform(is_fill.astype(np.uint8), cv2.DIST_L2, 5)
        norm_dist = cv2.normalize(dist_transform, None, 0, 1.0, cv2.NORM_MINMAX)

        y_idx, x_idx = np.indices((h, w))

        for color in colors:
            # ========================================================
            # 1. WOOD STYLE (Golden Boxwood White & Rich Walnut Black)
            # ========================================================
            wood_arr = np.zeros((h, w, 4), dtype=np.uint8)
            wood_arr[:, :, 3] = alpha

            if color == 'w':
                # Golden Boxwood with warm maple woodgrain
                base_c = np.array([234, 194, 136], dtype=np.float32)
                stroke_c = np.array([48, 30, 18], dtype=np.uint8)
                grain = np.sin(y_idx * 0.08 + np.sin(x_idx * 0.035) * 3.5) * 16.0
                lighting = 0.85 + 0.32 * norm_dist
                fill_layer = np.zeros((h, w, 3), dtype=np.float32)
                for c in range(3):
                    fill_layer[:, :, c] = np.clip(base_c[c] * lighting + grain, 0, 255)
            else:
                # RICH WARM WALNUT & ROSEWOOD (Visible warm brown with golden-amber grain ripples!)
                base_c = np.array([105, 68, 48], dtype=np.float32)       # Warm roasted walnut
                stroke_c = np.array([28, 16, 12], dtype=np.uint8)        # Deep espresso outline
                grain = np.sin(y_idx * 0.09 + np.sin(x_idx * 0.04) * 4.0) * 22.0  # Clear visible grain
                amber_sheen = np.clip(np.sin((x_idx + y_idx) * 0.035) * 18.0, 0, 22.0)
                lighting = 0.82 + 0.42 * norm_dist                       # Beveled satin curvature
                fill_layer = np.zeros((h, w, 3), dtype=np.float32)
                for c in range(3):
                    fill_layer[:, :, c] = np.clip(base_c[c] * lighting + grain + amber_sheen, 0, 255)

            wood_arr[is_fill, :3] = fill_layer[is_fill].astype(np.uint8)
            wood_arr[is_stroke, :3] = stroke_c
            Image.fromarray(wood_arr).save(os.path.join(wood_dir, f"{color}_{p}.png"), 'PNG')
            Image.fromarray(wood_arr).save(os.path.join(staunton_dir, f"{color}_{p}.png"), 'PNG')

            # ========================================================
            # 2. VINYL STYLE (Matte Porcelain White & Obsidian Vinyl Black)
            # ========================================================
            vinyl_arr = np.zeros((h, w, 4), dtype=np.uint8)
            vinyl_arr[:, :, 3] = alpha

            if color == 'w':
                # Silky matte porcelain ivory
                v_base = np.array([246, 244, 238], dtype=np.float32)
                v_stroke = np.array([34, 34, 38], dtype=np.uint8)
                v_light = 0.90 + 0.18 * norm_dist
                v_fill = np.zeros((h, w, 3), dtype=np.float32)
                for c in range(3):
                    v_fill[:, :, c] = np.clip(v_base[c] * v_light, 0, 255)
            else:
                # SLEEK MATTE OBSIDIAN VINYL (Rich dark charcoal slate with smooth satin curves)
                v_base = np.array([72, 72, 80], dtype=np.float32)        # Visible charcoal vinyl body
                v_stroke = np.array([18, 18, 22], dtype=np.uint8)        # Pure dark obsidian outline
                v_light = 0.80 + 0.42 * norm_dist                        # Volumetric curve
                v_fill = np.zeros((h, w, 3), dtype=np.float32)
                for c in range(3):
                    v_fill[:, :, c] = np.clip(v_base[c] * v_light, 0, 255)

            vinyl_arr[is_fill, :3] = v_fill[is_fill].astype(np.uint8)
            vinyl_arr[is_stroke, :3] = v_stroke
            Image.fromarray(vinyl_arr).save(os.path.join(vinyl_dir, f"{color}_{p}.png"), 'PNG')

            # ========================================================
            # 3. GLASS STYLE (Frosted Ice Blue White & Smoked Crystal Glass Black)
            # ========================================================
            glass_arr = np.zeros((h, w, 4), dtype=np.uint8)
            glass_arr[:, :, 3] = alpha

            if color == 'w':
                # Frosted ice blue crystal
                g_base = np.array([225, 242, 255], dtype=np.float32)
                g_stroke = np.array([55, 88, 120], dtype=np.uint8)
                specular = np.clip(np.sin((x_idx - y_idx * 0.7) * 0.04) * 28.0, 0, 36)
                g_light = 0.82 + 0.32 * norm_dist
                g_fill = np.zeros((h, w, 3), dtype=np.float32)
                for c in range(3):
                    g_fill[:, :, c] = np.clip(g_base[c] * g_light + specular, 0, 255)
                glass_arr[is_fill, :3] = g_fill[is_fill].astype(np.uint8)
                glass_arr[is_stroke, :3] = g_stroke
                glass_arr[is_fill, 3] = 238
            else:
                # SMOKED OBSIDIAN CRYSTAL (Cool smoked indigo-charcoal with bright crystal specular highlights!)
                g_base = np.array([92, 102, 120], dtype=np.float32)      # Distinct smoked glass tone
                g_stroke = np.array([26, 32, 42], dtype=np.uint8)        # Deep smoked perimeter
                specular = np.clip(np.sin((x_idx - y_idx * 0.7) * 0.045) * 45.0, 0, 55)  # Crystal reflection streak
                rim_reflection = np.clip(norm_dist * 22.0, 0, 28.0)
                g_light = 0.76 + 0.42 * norm_dist
                g_fill = np.zeros((h, w, 3), dtype=np.float32)
                for c in range(3):
                    g_fill[:, :, c] = np.clip(g_base[c] * g_light + specular + rim_reflection, 0, 255)
                glass_arr[is_fill, :3] = g_fill[is_fill].astype(np.uint8)
                glass_arr[is_stroke, :3] = g_stroke
                glass_arr[is_fill, 3] = 232  # Translucent smoked glass

            Image.fromarray(glass_arr).save(os.path.join(glass_dir, f"{color}_{p}.png"), 'PNG')

            # ========================================================
            # 4. ALPHA MINIMALIST STYLE (High-Contrast Clean Vector Icons)
            # ========================================================
            alpha_arr = np.zeros((h, w, 4), dtype=np.uint8)
            alpha_arr[:, :, 3] = alpha

            if color == 'w':
                # Clean luminous white with crisp dark charcoal outline
                alpha_arr[is_fill, :3] = [255, 255, 255]
                alpha_arr[is_stroke, :3] = [24, 24, 26]
            else:
                # Authentic slate charcoal with crisp jet black outline
                alpha_arr[is_fill, :3] = [68, 65, 62]
                alpha_arr[is_stroke, :3] = [18, 18, 20]

            Image.fromarray(alpha_arr).save(os.path.join(alpha_dir, f"{color}_{p}.png"), 'PNG')

            # ========================================================
            # 5. 8-BIT ARCADE STYLE (Pixelated Wide Retro Arcade Sprites)
            # ========================================================
            # Build directly from the wide, stout Neo silhouette
            grid_res = 38
            small = cv2.resize(ref_arr, (grid_res, grid_res), interpolation=cv2.INTER_AREA)
            s_alpha = small[:, :, 3]
            s_mask = s_alpha > 35
            s_gray = cv2.cvtColor(small[:, :, :3], cv2.COLOR_RGB2GRAY)
            s_stroke = s_mask & (s_gray < 100)
            s_fill = s_mask & ~s_stroke

            s_arr = np.zeros((grid_res, grid_res, 4), dtype=np.uint8)
            s_arr[:, :, 3] = s_alpha
            s_y, s_x = np.indices((grid_res, grid_res))

            if color == 'w':
                # Retro ivory arcade sprite with golden shade step
                s_arr[s_fill, :3] = [242, 238, 222]
                shade_step = s_fill & ((s_y > grid_res * 0.48) & (s_x > grid_res * 0.45) | (s_y > grid_res * 0.72))
                s_arr[shade_step, :3] = [205, 194, 168]
                s_arr[s_stroke, :3] = [24, 22, 20]
            else:
                # Retro arcade charcoal-slate with lavender highlight step and deep shadow
                s_arr[s_fill, :3] = [78, 82, 96]
                hi_step = s_fill & (s_x < grid_res * 0.45) & (s_y < grid_res * 0.58)
                s_arr[hi_step, :3] = [125, 132, 152]  # Lavender highlight
                shade_step = s_fill & (s_y > grid_res * 0.70)
                s_arr[shade_step, :3] = [45, 48, 58]  # Deep shadow
                s_arr[s_stroke, :3] = [18, 18, 22]

            # Upscale back to TARGET_CANVAS using Nearest Neighbor for razor-sharp pixel art
            upscaled = cv2.resize(s_arr, (TARGET_CANVAS, TARGET_CANVAS), interpolation=cv2.INTER_NEAREST)
            Image.fromarray(upscaled).save(os.path.join(eightbit_dir, f"{color}_{p}.png"), 'PNG')

    # Generate preview verification sheets for all styles
    from extract_all_pieces import create_preview_sheet
    create_preview_sheet(neo_dir, 'neo')
    create_preview_sheet(wood_dir, 'wood')
    create_preview_sheet(vinyl_dir, 'vinyl')
    create_preview_sheet(glass_dir, 'glass')
    create_preview_sheet(alpha_dir, 'alpha')
    create_preview_sheet(eightbit_dir, '8bit')

    print("\nSUCCESS: All styles built with rich, distinctive black pieces and wide Neo silhouettes!")

if __name__ == '__main__':
    build_all_master_styles()
