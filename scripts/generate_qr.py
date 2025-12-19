#!/usr/bin/env python3
import os
import subprocess
import sys

if len(sys.argv) < 3:
    print("Usage: generate_qr.py <URL> <output_png_path>")
    sys.exit(2)

url = sys.argv[1]
out = sys.argv[2]

# Ensure output dir exists
os.makedirs(os.path.dirname(out), exist_ok=True)

# Try to import qrcode, install if missing
try:
    import qrcode
except Exception:
    print("qrcode not found, installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "qrcode[pil]"])
    import qrcode

# Generate image
img = qrcode.make(url)
img.save(out)

# Print ASCII representation
try:
    qr = qrcode.QRCode(border=1)
    qr.add_data(url)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    black = "\u2588\u2588"
    white = "  "
    print("\nASCII QR Code:\n")
    for row in matrix:
        print("".join(black if col else white for col in row))
    print("\n")
except Exception as e:
    print("Could not render ASCII QR:", e)

print("Saved QR PNG to:", os.path.abspath(out))
