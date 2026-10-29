"""
Vercel Serverless Function entry point.
Routes all /api/* requests to LostAndFoundHandler.
"""

import sys
import os
from http.server import BaseHTTPRequestHandler

# Add project root to sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from server import LostAndFoundHandler

class handler(LostAndFoundHandler):
    pass
