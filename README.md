# ATX Tee Times

A [Next.js](https://nextjs.org) app that aggregates golf tee times from ~19 Austin-area courses. Because every course books through a different platform, the app has one scraper per platform, runs them in parallel behind a Server Action, and caches results in Redis to keep things fast and avoid hammering the booking sites.

## How it works

1. The user picks a date and selects courses on `app/page.tsx`.
2. The `POST /api/tee-times` route (`app/api/tee-times/route.ts`) launches a single Puppeteer browser, groups the selected courses by platform, and runs each platform group **in parallel** while **serializing courses within a group** (1.5s delay) to avoid rate limits. It streams newline-delimited JSON, emitting one event per course as it finishes, then a final `complete` event.
3. Each course calls its per-course module in `app/scrape/courses/`, which first checks the Redis cache and only scrapes on a miss.
4. `useTeeTimeStream` (`app/hooks/useTeeTimeStream.ts`) reads the stream, and results render as they arrive in a per-course progress strip (`app/components/courseProgress.tsx`) and a sortable/filterable table (`app/components/teeTimeTable.tsx`).

There is no database and no REST API in the Next.js app — data flows entirely through the Server Action and the cache.

## Scraping strategies

Different booking providers require very different approaches, from simple JSON API calls to full browser automation that defeats Cloudflare. Platforms are defined in `app/types/index.ts` and each course is mapped to one in `app/courses.ts`.

| Platform | Strategy | Browser? | Runs in | Example courses |
|---|---|---|---|---|
| **teeitup** | Direct REST API call | No | Next.js | Crystal Falls, Shadowglen, Harvey Penick |
| **foreup** | Direct REST API call | No | Next.js | Riverside, Colovista |
| **golfback** | Direct REST API call | No | Next.js | Falconhead, Avery Ranch, Teravista |
| **golfwithaccess** | Direct REST API via residential proxy | Optional (proxy) | Next.js | Kissing Tree |
| **golfatx** | Full DOM scrape (CSRF token + paginated table) | Yes (Puppeteer) | Next.js | Lions, Jimmy Clay, Roy Kizer, Morris Williams |
| **clubprophet** | Token fetch + in-page API replay | Yes (Puppeteer) | Next.js | Double J Ranch, Plum Creek |
| **ezlinks** | Browser bypasses Cloudflare, then replays API | Yes (`puppeteer-real-browser`) | Microservice | Star Ranch, Grey Rock, Lost Pines |
| **chronogolf** | Browser bypasses Cloudflare, then replays API | Yes (`puppeteer-real-browser`) | Microservice | Forest Creek |

The strategies fall into three broad tiers:

### 1. Direct API calls (no browser)

The easiest courses expose a public JSON booking API. These scrapers just `fetch` the endpoint with the right query params/headers and parse the response — no browser needed, so they're fast and cheap.

- **TeeItUp** (`app/scrape/scrapeTeeItUp.ts`) — hits the Kenna API, deriving the facility alias from the subdomain and the course from the booking URL.
- **ForeUp** (`app/scrape/scrapeForeUp.ts`) — hits `foreupsoftware.com/.../booking/times` with a `schedule_id`.
- **GolfBack** (`app/scrape/scrapeGolfBack.ts`) — POSTs to the GolfBack API using a per-course UUID.
- **GolfWithAccess** (`app/scrape/scrapeGolfWithAccess.ts`) — hits the GolfWithAccess API, optionally routed through a Decodo residential proxy (`app/scrape/proxy.ts`).

### 2. In-app browser scraping (Puppeteer)

Some sites need a real browser to obtain tokens/cookies or because the data is only in the DOM. These run inside the Next.js Server Action using the shared Puppeteer browser (`app/scrape/browser.ts`, which uses `@sparticuz/chromium` in production and system Chrome locally).

- **Golf ATX** (`app/scrape/courses/golf-atx.ts`) — navigates the Austin municipal booking site, extracts a CSRF token, paginates, and scrapes the results table. All four muni courses share one scrape (deduplicated with an in-flight promise map) and are filtered by `golfAtxKey`.
- **Club Prophet** (`app/scrape/scrapeClubProphet.ts`) — fetches an auth token, warms up bot-check cookies in the browser, then replays the tee-times API from inside the page context.

### 3. Cloudflare-protected sites (external microservice)

**EzLinks** and **ChronoGolf** sit behind Cloudflare Turnstile, which can't reliably be solved from a Vercel serverless function. These are handled by a separate Dockerized microservice in `services/ezlinks-scraper/`.

- The Next.js side (`app/scrape/scrapeEzLinks.ts`, `app/scrape/scrapeChronoGolf.ts`) just POSTs to the microservice (`/scrape` and `/scrape-chronogolf`) with a Bearer token.
- The microservice (a [Hono](https://hono.dev) server) uses `puppeteer-real-browser` with Turnstile support (and an optional Decodo proxy) to solve Cloudflare, then replays the booking API. It keeps a **warm browser session (~15 min TTL)**, serializes requests with a lock, and retries with exponential backoff when Cloudflare blocks it.

## Caching

Scrapes are relatively expensive (especially the browser-based ones), so results are cached in **Upstash Redis** (`app/cache.ts`).

- **Backend:** Upstash Redis via `Redis.fromEnv()`.
- **TTL:** 600 seconds (10 minutes) by default.
- **Key format:** `{YYYY-MM-DD}::{courseKey}` — e.g. `2026-07-08::lostPines`.
- **Flow:** every module in `app/scrape/courses/` does `cacheGet` → return on hit; scrape → `cacheSet` → return on miss.
- **Date revival:** `reviveTeeTimes()` rehydrates `Date` objects after JSON deserialization, since Redis stores plain JSON.

There are two additional layers on top of the Redis cache:

- **Warm browser sessions (microservice):** EzLinks/ChronoGolf keep a launched browser alive for ~15 minutes so subsequent requests skip the costly Cloudflare solve.
- **In-flight deduplication (Golf ATX):** because all four muni courses share one scrape, a module-level promise map ensures concurrent requests trigger only a single scrape.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Set these in `.env.local`:

| Variable | Purpose |
|---|---|
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Redis cache |
| `EZLINKS_SERVICE_URL` | Base URL of the EzLinks/ChronoGolf microservice |
| `EZLINKS_SERVICE_API_KEY` | Bearer token used to call the microservice |
| `DECODO_PROXY_HOST` / `DECODO_PROXY_PORT` / `DECODO_PROXY_USERNAME` / `DECODO_PROXY_PASSWORD` | Optional residential proxy |

The microservice (`services/ezlinks-scraper/`) is a separate package with its own `API_KEY` and proxy env vars. It's excluded from the root TypeScript config and deploys independently as a Docker container (Xvfb + Chromium, port 3001).

## Adding a new course

1. Create `app/scrape/courses/my-course.ts` with the platform-specific IDs/URLs and a cache wrapper (`cacheGet` → scrape → `cacheSet`).
2. Register it in the `courses` array in `app/courses.ts` with its `platform` and `fetchFunction`.
3. Add a matching checkbox entry in `app/page.tsx`.
4. If it's an EzLinks/ChronoGolf course, make sure the microservice is deployed and its env vars are set.

## Course list

| Course | Platform |
|---|---|
| Crystal Falls, Shadowglen, Harvey Penick | TeeItUp |
| Riverside, Colovista | ForeUp |
| Falconhead, Avery Ranch, Teravista | GolfBack |
| Kissing Tree | GolfWithAccess |
| Lions, Jimmy Clay, Roy Kizer, Morris Williams | Golf ATX |
| Double J Ranch, Plum Creek | Club Prophet |
| Star Ranch, Grey Rock, Lost Pines | EzLinks |
| Forest Creek | ChronoGolf |
