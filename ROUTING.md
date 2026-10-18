# TaxPower static scrolling site

The design and section order remain a single scrolling site. Every route has static content, one primary H1 and a primary main landmark for its topic. Other sections remain available for scrolling. Shared content can still be consolidated by search engines; canonical hints and distinct titles do not guarantee separate rankings.

## Editing and building

Edit `_site-source/index.html` for the homepage layout and `_site-source/<product>.html` for section content. Shared navigation and footer are `nav.html` and `footer.html`. Metadata is in `scripts/seo-routes.json`.

Run `python scripts/build-section-routes.py` after edits (Python dependencies: lxml and Pillow). Commit the generated HTML, JS metadata, sitemap and robots file together. Do not edit generated root or route HTML directly.

Each route has identical `<route>.html` and `<route>/index.html` output. This avoids GitHub Pages serving different content for extensionless and directory requests. `<base href="/">` targets the custom domain root. JavaScript normalizes bookmarks and updates the URL, title, description, canonical, primary heading and social metadata during navigation. Existing .html and hash bookmarks remain supported. Server-level redirects are not simulated with a 404 page.

Home canonical: https://taxpower.co/home. GST Returns is a subsection alias of /taxpowergst. Demo and Technical Support are subsection aliases of /support. Only preferred URLs are in the sitemap.

The HTML already contains navigation, footer and all six product/company sections; no six-page fetch burst is needed. Image dimensions and WebP variants reduce avoidable image transfer and layout movement. Decorative images retain empty alt attributes.

Validation: `NODE_PATH=/path/to/node_modules node tests/seo-routes.cjs` (requires jsdom). This tests route pairs, metadata, headings, navigation/history, pricing combinations and enquiry prefill without sending enquiries.
