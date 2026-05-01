import sys
import threading
import uvicorn

from config_loader import get_base_dir, load_config
from logger import get_logger, setup_logger
from server import app, init_app

_server_thread: threading.Thread = None
_server: uvicorn.Server = None


def start_server(config: dict):
    global _server_thread, _server
    port = config.get('api_port', 8765)
    log_level = config.get('log_level', 'warning').lower()
    uv_config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level=log_level)
    _server = uvicorn.Server(uv_config)
    _server_thread = threading.Thread(target=_server.run, daemon=True)
    _server_thread.start()


def stop_server():
    if _server:
        _server.should_exit = True


def main():
    config = load_config()
    setup_logger(
        log_level=config.get('log_level', 'warning'),
        log_file=config.get('log_file') or None,
        base_dir=get_base_dir(),
    )
    init_app(config)
    start_server(config)
    get_logger().info("Server started on port %s", config.get('api_port', 8765))

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
