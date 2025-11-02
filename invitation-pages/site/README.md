# site — sample wedding invitation landing page

This folder contains a small static sample of the wedding invitation landing page described in the repo `README.md`.

Files:
- `index.html` — single-page static site (hero, greeting, details, RSVP form, map iframe).
- `styles.css` — minimal responsive styles.
- `script.js` — client-side form validation and submission logic. It reads `config.json`.
- `config.json` — set `apiEndpoint` to your API Gateway URL to enable real submission. Leave empty to use mocked submission.

Run locally (macOS / zsh):

```bash
# From repository root or inside site/
python3 -m http.server 8000
# Open http://localhost:8000/site/ or http://localhost:8000 in your browser
```

Notes:
- The site uses a mock submission when `config.json.apiEndpoint` is empty. When you provide a real API Gateway endpoint, the site will POST JSON with the form fields.
- Replace the placeholder SVG hero with optimized WebP images and add alt text for accessibility.
- The README.md in repository is the canonical spec — follow its field names and validation rules.
