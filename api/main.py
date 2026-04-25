import sys
import threading
import uvicorn

from config_loader import load_config
from server import app, init_app

_server_thread: threading.Thread = None
_server: uvicorn.Server = None


def start_server(config: dict):
    global _server_thread, _server
    port = config.get('api_port', 8765)
    uv_config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning")
    _server = uvicorn.Server(uv_config)
    _server_thread = threading.Thread(target=_server.run, daemon=True)
    _server_thread.start()


def stop_server():
    if _server:
        _server.should_exit = True


def main():
    config = load_config()
    init_app(config)
    start_server(config)

    try:
        from tray import run_tray

        def on_start(icon, item):
            start_server(config)

        def on_stop(icon, item):
            stop_server()

        def on_exit(icon, item):
            stop_server()
            icon.stop()
            sys.exit(0)

        run_tray(on_start, on_stop, on_exit)
    except Exception:
        # If tray is not available (e.g. headless), just keep server running
        _server_thread.join()


if __name__ == '__main__':
    main()
