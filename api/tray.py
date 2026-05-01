import os
import sys
import pystray
from PIL import Image, ImageDraw


def _get_icon_dir() -> str:
    # Frozen (PyInstaller --onefile): bundled resources land in sys._MEIPASS
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


def _create_icon_image() -> Image.Image:
    icon_path = os.path.join(_get_icon_dir(), 'icon16.png')
    if os.path.exists(icon_path):
        return Image.open(icon_path).convert('RGBA')
    # Fallback if icon file is missing
    img = Image.new('RGB', (64, 64), color=(52, 152, 219))
    draw = ImageDraw.Draw(img)
    draw.rectangle([8, 8, 56, 56], fill=(41, 128, 185))
    draw.text((16, 20), "W", fill=(255, 255, 255))
    return img


def create_tray_icon(start_cb, stop_cb, exit_cb) -> pystray.Icon:
    image = _create_icon_image()
    menu = pystray.Menu(
        pystray.MenuItem("啟動服務", start_cb),
        pystray.MenuItem("停止服務", stop_cb),
        pystray.MenuItem("結束", exit_cb),
    )
    icon = pystray.Icon("web-note-clipper", image, "網頁筆記小工具", menu)
    return icon


def run_tray(start_cb, stop_cb, exit_cb):
    icon = create_tray_icon(start_cb, stop_cb, exit_cb)
    icon.run()
