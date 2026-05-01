import logging
import os
from logging.handlers import RotatingFileHandler


def setup_logger(log_level: str = "warning", log_file: str = None, base_dir: str = None) -> logging.Logger:
    logger = logging.getLogger("web-note-clipper")
    logger.handlers.clear()

    level = getattr(logging, log_level.upper(), logging.WARNING)
    logger.setLevel(level)

    if log_file is None:
        if base_dir is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
        log_file = os.path.join(base_dir, "web-note-clipper.log")

    log_dir = os.path.dirname(log_file)
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)

    fh = RotatingFileHandler(
        log_file, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
    )
    fh.setFormatter(logging.Formatter(
        "[%(asctime)s] %(levelname)s %(filename)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    logger.addHandler(fh)
    return logger


def get_logger() -> logging.Logger:
    return logging.getLogger("web-note-clipper")
