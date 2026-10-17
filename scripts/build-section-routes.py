"""Run after editing index.html: python scripts/build-section-routes.py.
Static entry pages serve the exact same homepage, including all loaded sections.
"""
from pathlib import Path
import json
import re
from html import escape
root = Path(__file__).resolve().parents[1]
source = (root / 'index.html').read_text()
titles = json.loads(re.search(r'const titles = (\{.*?\});', (root / 'js/section-routes.js').read_text(), re.S).group(1))
page = source.replace('<head>', '<head>\n  <base href="../">', 1)
for route in ['home', 'taxpowergst', 'gst-return', 'gst-billing', 'taxpowertds', 'pricing',
              'downloads', 'aboutus', 'support', 'technical-support', 'demo-enquiry']:
    folder = root / route
    folder.mkdir(exist_ok=True)
    route_page = re.sub(r'<title>.*?</title>', '<title>' + escape(titles[route]) + '</title>', page, flags=re.S)
    (folder / 'index.html').write_text(route_page)
