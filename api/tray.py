import pystray
from PIL import Image, ImageDraw


def _create_icon_image() -> Image.Image:
    """Create a simple colored square icon."""
    img = Image.new('RGB', (64, 64), color=(52, 152, 219))
    draw = ImageDraw.Draw(img)
    draw.rectangle([8, 8, 56, 56], fill=(41, 128, 185))
    draw.text((16, 20), "W", fill=(255, 255, 255))
    return img


def create_tray_icon(start_cb, stop_cb, exit_cb) -> pystray.Icon:
    image = _create_icon_image()
    menu = pystray.Menu(
        pystray.MenuItem("Start Service", start_cb),
        pystray.MenuItem("Stop Service", stop_cb),
        pystray.MenuItem("Exit", exit_cb),
    )
    icon = pystray.Icon("web-note-clipper", image, "Web Note Clipper", menu)
    return icon


def run_tray(start_cb, stop_cb, exit_cb):
    icon = create_tray_icon(start_cb, stop_cb, exit_cb)
    icon.run()
