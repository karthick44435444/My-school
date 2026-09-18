import os
from PIL import Image, ImageDraw

def render_master(size=2048, with_bg=True, corner_radius_ratio=0.0, bg_colors=((99, 102, 241), (67, 56, 202)), logo_scale=1.0):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    
    if with_bg:
        c1, c2 = bg_colors
        bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        pixels = bg.load()
        for y in range(size):
            ty = y / size
            for x in range(size):
                tx = x / size
                t = (tx * 0.7 + ty * 0.7) / 1.4
                r = int(c1[0] * (1 - t) + c2[0] * t)
                g = int(c1[1] * (1 - t) + c2[1] * t)
                b = int(c1[2] * (1 - t) + c2[2] * t)
                pixels[x, y] = (r, g, b, 255)
        
        if corner_radius_ratio > 0:
            mask = Image.new('L', (size, size), 0)
            mask_draw = ImageDraw.Draw(mask)
            rad = int(size * corner_radius_ratio)
            mask_draw.rounded_rectangle([0, 0, size, size], radius=rad, fill=255)
            img.paste(bg, (0, 0), mask)
        else:
            img.paste(bg, (0, 0))
            
    draw = ImageDraw.Draw(img)
    cx = size / 2.0
    cy = size / 2.0
    s = (size / 1000.0) * logo_scale
    white = (255, 255, 255, 255)
    
    # 1. Graduation Cap Diamond
    top_y = cy - 235 * s
    mid_y = cy - 145 * s
    bot_y = cy - 55 * s
    left_x = cx - 250 * s
    right_x = cx + 250 * s
    
    diamond = [
        (cx, top_y),
        (right_x, mid_y),
        (cx, bot_y),
        (left_x, mid_y)
    ]
    draw.polygon(diamond, fill=white)
    
    # Cap Apex button
    btn_r = 13 * s
    draw.ellipse([cx - btn_r, mid_y - 20 * s - btn_r, cx + btn_r, mid_y - 20 * s + btn_r], fill=white)
    
    # Tassel ribbon & bob
    tassel_ribbon = [
        (cx, mid_y - 20 * s),
        (right_x - 15 * s, mid_y + 12 * s),
        (right_x + 36 * s, mid_y + 40 * s),
        (right_x + 36 * s, mid_y + 135 * s),
        (right_x + 22 * s, mid_y + 135 * s),
        (right_x + 22 * s, mid_y + 44 * s),
        (right_x - 15 * s, mid_y + 24 * s),
    ]
    draw.polygon(tassel_ribbon, fill=white)
    # Tassel bell
    draw.rounded_rectangle(
        [right_x + 18 * s, mid_y + 130 * s, right_x + 40 * s, mid_y + 175 * s],
        radius=5 * s,
        fill=white
    )
    
    # Skullcap headband
    band_w = 120 * s
    band_top = mid_y + 22 * s
    band_bot = mid_y + 68 * s
    draw.rounded_rectangle([cx - band_w, band_top, cx + band_w, band_bot], radius=18 * s, fill=white)
    
    # 2. Student Head
    head_cy = cy + 25 * s
    head_r = 75 * s
    draw.ellipse([cx - head_r, head_cy - head_r, cx + head_r, head_cy + head_r], fill=white)
    
    # 3. Student Robe / Shoulders with V-neck dip
    body_top_y = cy + 120 * s
    body_bot_y = cy + 290 * s
    body_w = 260 * s
    
    body_pts = [
        (cx - body_w, body_bot_y),
        (cx - body_w + 35 * s, body_top_y + 80 * s),
        (cx - 120 * s, body_top_y + 12 * s),
        (cx - 60 * s, body_top_y),
        (cx, body_top_y + 65 * s),
        (cx + 60 * s, body_top_y),
        (cx + 120 * s, body_top_y + 12 * s),
        (cx + body_w - 35 * s, body_top_y + 80 * s),
        (cx + body_w, body_bot_y),
    ]
    draw.polygon(body_pts, fill=white)
    
    return img

def main():
    os.makedirs('apps/mobile/assets', exist_ok=True)
    os.makedirs('apps/web/public', exist_ok=True)
    
    # 1. Mobile App Icon (1024x1024, brand background, pure white logo)
    print('Generating apps/mobile/assets/icon.png...')
    master_icon = render_master(size=2048, with_bg=True, corner_radius_ratio=0.0, logo_scale=0.95)
    icon_1024 = master_icon.resize((1024, 1024), Image.Resampling.LANCZOS)
    icon_1024.save('apps/mobile/assets/icon.png', 'PNG')
    
    # 2. Android Adaptive Icon Foreground (1024x1024, transparent background, pure white logo inside safe zone)
    print('Generating apps/mobile/assets/adaptive-icon.png...')
    master_adaptive = render_master(size=2048, with_bg=False, logo_scale=0.62)
    adaptive_1024 = master_adaptive.resize((1024, 1024), Image.Resampling.LANCZOS)
    adaptive_1024.save('apps/mobile/assets/adaptive-icon.png', 'PNG')
    
    # 3. Notification Icon (192x192 silhouette)
    print('Generating apps/mobile/assets/notification-icon.png...')
    master_notif = render_master(size=1024, with_bg=False, logo_scale=0.85)
    notif_192 = master_notif.resize((192, 192), Image.Resampling.LANCZOS)
    notif_192.save('apps/mobile/assets/notification-icon.png', 'PNG')
    
    # 4. Web Favicon / Icon with rounded corner radius (512x512, corner radius ~22%)
    print('Generating apps/web/public/icon.png...')
    master_web_icon = render_master(size=2048, with_bg=True, corner_radius_ratio=0.22, logo_scale=0.88)
    web_icon_512 = master_web_icon.resize((512, 512), Image.Resampling.LANCZOS)
    web_icon_512.save('apps/web/public/icon.png', 'PNG')
    
    # 5. Web Apple Touch Icon (180x180)
    print('Generating apps/web/public/apple-touch-icon.png...')
    apple_icon_180 = master_web_icon.resize((180, 180), Image.Resampling.LANCZOS)
    apple_icon_180.save('apps/web/public/apple-touch-icon.png', 'PNG')
    
    # 6. Web Favicon PNG (64x64 & 32x32)
    print('Generating apps/web/public/favicon.png...')
    fav_64 = master_web_icon.resize((64, 64), Image.Resampling.LANCZOS)
    fav_64.save('apps/web/public/favicon.png', 'PNG')
    
    fav_32 = master_web_icon.resize((32, 32), Image.Resampling.LANCZOS)
    fav_32.save('apps/web/public/favicon-32x32.png', 'PNG')
    
    fav_16 = master_web_icon.resize((16, 16), Image.Resampling.LANCZOS)
    fav_16.save('apps/web/public/favicon-16x16.png', 'PNG')
    
    # 7. Web Favicon ICO (Multi-resolution: 16, 32, 48, 64, 128)
    print('Generating apps/web/public/favicon.ico...')
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128)]
    master_web_icon.save('apps/web/public/favicon.ico', format='ICO', sizes=ico_sizes)
    
    print('All icons generated successfully!')

if __name__ == '__main__':
    main()
