# Thumbnail Generator

Serverless PNG thumbnail / OG image generator. Pass a title (and optional logos) as query params and get a cached PNG back.

## Endpoint

```
GET /api/thumbnail.png
```

(`/api/thumbnail` works too.)

### Query parameters

| Param | Required | Default | Description |
| --- | --- | --- | --- |
| `title` | yes | — | Thumbnail heading. Supports markdown. |
| `bg` | no | `#000000` | Background color hex. |
| `images` | no | `[]` | Logo URL(s). Repeat the param or comma-separate. |
| `fontSize` | no | `64` | Heading size in px (clamped 16–800). |
| `logoHeight` | no | `144` | Logo height in px (clamped 16–800). |
| `logoWidth` | no | `auto` | Logo width in px, or `auto` for aspect ratio. |
| `nocache` | no | — | Set to `1` / `true` to force a fresh render. Aliases: `refresh=1`, `_=<token>`. |
| `v` | no | — | Cache-bust token (does not change pixels). Use the value from `/api/cache-version` after generator deploys. |

### Example

```
https://thumbnail-generator.vercel.app/api/thumbnail.png?title=Hoisting%20in%20**Javascript**&images=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2F6%2F6a%2FJavaScript-logo.png&logoHeight=160
```

Force a fresh render while testing:

```
https://thumbnail-generator.vercel.app/api/thumbnail.png?title=Hello&nocache=1
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

There are two layers:

| Layer | Invalidated on our deploy? | How |
| --- | --- | --- |
| In-memory (server) | Yes, automatically | New instances + deploy SHA in the cache key |
| CDN / browser | **No** (same URL = same cache) | Change the URL (e.g. `&v=…`) or use `nocache=1` |

### Bust CDN after a generator deploy (recommended for the blog)

```
GET /api/cache-version  →  { "version": "abc1234deadbf" }
```

At **blog build time** (or runtime), read that version and append it:

```
/api/thumbnail.png?title=...&v=abc1234deadbf
```

When this service redeploys, `version` changes → new URLs → CDN miss → fresh thumbs. The `v` param does not affect the image pixels.

### Other knobs

- **`nocache=1`:** always regenerates; sends `Cache-Control: no-store` (good for local testing).
- **localhost / `next dev`:** bypasses cache by default.
- **Production (no `v` / `nocache`):** CDN caches for 1 year on the exact URL.

## Local development

```bash
yarn
yarn dev
```

Requires Google Chrome installed locally (used by Puppeteer in development).

## Deploy

Built for Vercel. Production uses `@sparticuz/chromium` + `puppeteer-core` on the Node.js runtime.
