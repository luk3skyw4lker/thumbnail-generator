# Thumbnail Generator

Serverless PNG thumbnail / OG image generator. Pass a title (and optional logos) as query params and get a cached PNG back.

## Endpoint

```
GET /api/thumbnail.png
```

(` /api/thumbnail` works too.)

### Query parameters

| Param | Required | Default | Description |
| --- | --- | --- | --- |
| `title` | yes | — | Thumbnail heading. Supports markdown. |
| `bg` | no | `#000000` | Background color hex. |
| `images` | no | `[]` | Logo URL(s). Repeat the param or comma-separate. |
| `fontSize` | no | `64` | Heading size in px (clamped 16–800). |
| `logoHeight` | no | `144` | Logo height in px (clamped 16–800). |
| `logoWidth` | no | `auto` | Logo width in px, or `auto` for aspect ratio. |

### Example

```
https://thumbnail-generator.vercel.app/api/thumbnail.png?title=Hoisting%20in%20**Javascript**&images=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2F6%2F6a%2FJavaScript-logo.png&logoHeight=160
```

```html
<img
  src="https://thumbnail-generator.vercel.app/api/thumbnail.png?title=Hello%20World&images=https://example.com/logo.svg&logoHeight=180"
  alt="Hello World"
  width="1200"
  height="630"
/>
```

## Caching

- **localhost / `next dev`:** always bypasses cache (`X-Cache: BYPASS`). Browsers may still show an old PNG if it was cached earlier with long-lived headers — hard-refresh or append `&_=1` (ignored by the API) to bust it.
- **Production:** CDN `Cache-Control` with `s-maxage=31536000` (1 year). Change query params to get a new image.
- Warm production instances also keep an in-memory LRU of recently generated PNGs.

First request for a unique param set still runs Chromium; repeats should be fast from CDN.

## Local development

```bash
yarn
yarn dev
```

Requires Google Chrome installed locally (used by Puppeteer in development).

## Deploy

Built for Vercel. Production uses `@sparticuz/chromium` + `puppeteer-core` on the Node.js runtime.
