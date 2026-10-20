# soulsync-website

The public website for [SoulSync](https://github.com/Nezreka/SoulSync), live at
[https://www.ssync.net/](https://www.ssync.net/).

Plain static HTML/CSS/JavaScript, no build step:

- `index.html` — page content, SEO/social meta, and JSON-LD structured data
  (`SoftwareApplication` and `FAQPage`, kept in sync with the visible FAQ)
- `style.css` / `script.js` — the site's design and animations
- `sitemap.xml` / `robots.txt` — crawler files, both pointing at the canonical
  `https://www.ssync.net/` URL
- `CNAME` — the GitHub Pages custom domain (`www.ssync.net`), matching the
  website link in the main SoulSync README
- `.nojekyll` — serve the files as-is, without Jekyll processing
- `assets/` — images

Preview locally with any static server, for example:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
