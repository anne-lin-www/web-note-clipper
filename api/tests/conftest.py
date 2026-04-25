import os
import sys

# Ensure api package is importable from tests
api_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
repo_dir = os.path.dirname(api_dir)
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)
if repo_dir not in sys.path:
    sys.path.insert(0, repo_dir)
