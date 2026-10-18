# SEO deployment and owner checks

The preferred site origin is https://taxpower.co. Sitemap: https://taxpower.co/sitemap.xml. Robots permits public crawling and points to this sitemap. Page titles, descriptions, canonical URLs, social metadata and JSON-LD are generated from scripts/seo-routes.json.

HTTP and www redirects to HTTPS/non-www were observed in the October 17 audit. Keep GitHub Pages Enforce HTTPS enabled. Canonical tags consolidate .html, trailing-slash and subsection aliases; they are hints, not server 301 redirects. Do not add a blanket SPA 404 fallback. Unknown URLs should remain genuine 404 responses.

## Requires the owner account

1. Add/verify the taxpower.co Domain property in Google Search Console using its provided DNS TXT record. Do not invent a token. Existing DNS verification may already be present.
2. Submit sitemap.xml after deployment.
3. Inspect /home, /taxpowergst, /taxpowertds and /pricing. Check live crawl accessibility and Google-selected canonical, then request indexing if appropriate.
4. Review Page Indexing, Search Performance and Core Web Vitals after data becomes available. New domains may not yet have field performance data.
5. Measure mobile LCP, INP and CLS with PageSpeed Insights/field data; compare lab and field results separately. No ranking, indexing date, memory reduction or Core Web Vitals pass is guaranteed by these code changes.

No Search Console verification, DNS mutation, live enquiry submission or backlink outreach has been performed by this code update. Browser visual checks were unavailable because the Chromium download failed. DOM and static checks cover routing, headings, schema, pricing and enquiry prefill.

Keep genuine business/product facts in schema; do not add invented ratings or testimonials. Performance changes preserve visible design and interaction, and pause background work when hidden/offscreen. Prefer useful original product guides and legitimate dealer/association links over purchased backlink packages.
