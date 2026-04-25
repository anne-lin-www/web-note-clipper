import os


def _safe_join(base: str, *parts: str) -> str:
    """Join paths and raise ValueError if the result escapes base directory."""
    result = os.path.realpath(os.path.join(base, *parts))
    base_real = os.path.realpath(base)
    if not result.startswith(base_real + os.sep) and result != base_real:
        raise ValueError(f"Path traversal detected: {result!r} is outside {base_real!r}")
    return result
