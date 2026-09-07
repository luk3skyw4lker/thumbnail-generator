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
| `icons` | no | `[]` | Iconify icon name(s), e.g. `logos:react`. Resolved from icon sets bundled in this deploy — no external CDN request. Repeat the param or comma-separate. |
| `iconColor` | no | `#ffffff` | Color for monochrome icon sets. Multi-color sets (`logos`, `devicon`, `skill-icons`) ignore it. |
| `fontSize` | no | `64` | Heading size in px (clamped 16–800). |
| `logoHeight` | no | `144` | Logo height in px (clamped 16–800). |
| `logoWidth` | no | `auto` | Logo width in px, or `auto` for aspect ratio. |
| `nocache` | no | — | Set to `1` / `true` to force a fresh render. Aliases: `refresh=1`, `_=<token>`. |
| `v` | no | — | Cache-bust token (does not change pixels). Use the value from `/api/cache-version` after generator deploys. |

`images` and `icons` can be combined — remote images render first, then icons.

### Icons

Icons are served from icon data bundled into the deploy, so rendering makes no
network request. Previously logos were `<img>` tags pointing at
`api.iconify.design`; that CDN started blocking the headless renderer, which
produced thumbnails with missing logos.

Bundled collections:

| Prefix | Aliases | Contents |
| --- | --- | --- |
| `logos` | — | Full-color brand logos (default when no prefix is given) |
| `simple-icons` | `si`, `simple` | Monochrome brand marks |
| `devicon` | `dev`, `devicons` | Language / tool logos |
| `skill-icons` | `skill`, `skills` | Rounded-square tech badges |
| `lucide` | — | General-purpose UI icons |
| `mdi` | — | Material Design Icons |
| `tabler` | — | Tabler outline icons |

Names accept `logos:react`, `logos--react`, or a bare `react` (defaults to
`logos`). Unknown names return `400` with the reason instead of rendering a
thumbnail with a hole in it.

Adding a collection: `yarn add @iconify-json/<prefix>` and add one line to
`COLLECTIONS` in `lib/icons.ts`.

Browse the bundled sets at **`/icons`** — a searchable catalog with a
collection filter and click-to-copy names. The full upstream index lives at
<https://icon-sets.iconify.design/>.

The catalog is backed by `GET /api/icons?q=&collection=&limit=&offset=`, which
returns matching icons as `{ id, svg }` plus per-collection counts. The SVG
markup ships inline with the results (sized by `previewHeight`, default 48) so a
result page costs one request instead of one per icon. Monochrome previews keep
`currentColor`, so the catalog's color picker recolors them in CSS with no
refetch.

#### Standalone SVG endpoint

```
GET /api/icon?name=logos:react&height=225
```

Optional: `width` (px or `auto`), `color`. Returns `image/svg+xml` with a
one-year immutable cache — a drop-in replacement for `api.iconify.design` URLs
used elsewhere on the blog.

### Example

```
https://thumbnail-generator.vercel.app/api/thumbnail.png?title=Hoisting%20in%20**Javascript**&icons=logos:javascript&logoHeight=160
```

Force a fresh render while testing:

```
https://thumbnail-generator.vercel.app/api/thumbnail.png?title=Hello&nocache=1
```

```html
<img
  src="https://thumbnail-generator.vercel.app/api/thumbnail.png?title=Hello%20World&icons=logos:react,logos:nodejs-icon&logoHeight=180"
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
