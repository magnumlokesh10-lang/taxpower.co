"""Run after editing index.html: python scripts/build-section-routes.py.
Static entry pages serve the exact same homepage, including all loaded sections.
"""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
source = (root / 'index.html').read_text()
page = source.replace('<head>', '<head>\n  <base href="../">', 1)
for route in ['taxpowergst', 'gst-return', 'gst-billing', 'taxpowertds', 'pricing',
              'downloads', 'aboutus', 'support', 'technical-support', 'demo-enquiry']:
    folder = root / route
    folder.mkdir(exist_ok=True)
    (folder / 'index.html').write_text(page)
