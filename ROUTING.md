# Clean section navigation

Navigation uses the same homepage and existing smooth section scrolling. The History API displays paths such as `/taxpowertds` and `/pricing`. Existing `index.html#…` bookmarks are recognized and normalized. Back/Forward restore the corresponding section.

GitHub Pages needs real files for direct visits. Each route folder contains the same homepage with a `../` base; requests for a folder may first redirect to a trailing slash, which the router removes after loading. Assets and fetched sections resolve against the stable site base, including when hosted below a project path. Unknown paths still return the host's normal 404.

After any edit to the root `index.html`, regenerate and commit the entry pages:

```sh
python scripts/build-section-routes.py
```

The HTML page content remains single-source in `index.html`; route copies are generated deployment files. Existing standalone `.html` product pages remain available.

Routing checks require Node and jsdom:

```sh
NODE_PATH=/path/to/node_modules node tests/section-routes.cjs
```
