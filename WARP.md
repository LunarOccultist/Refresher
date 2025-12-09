# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

This is a Node.js CLI tool that logs into Buildertrend using Playwright, scrapes project financial data, writes it into a Supabase `project` table, and is intended to push the refreshed data to a Monday.com board.

The repository root contains a short `README.md` describing this at a high level; the actual Node project (including `package.json`) lives under `src/`.

## Commands

All commands assume you run them from the repository root unless otherwise specified.

### Install dependencies

```bash path=null start=null
cd src
npm install
```

### Run the scraper (main entrypoint)

```bash path=null start=null
cd src
npm start
# or
cd src
node main.js
```

There are currently no linting or test scripts configured in `src/package.json`. If you add tooling (e.g. Jest, ESLint), prefer to expose them via `npm test`, `npm run lint`, etc., and update this file accordingly.

## High-level architecture

### Execution flow (`main.js`)

- `src/main.js` is the primary entrypoint invoked by `npm start`.
- On startup it:
  - Connects to Supabase via `db.connect()`.
  - Enters an infinite loop displaying a CLI menu via `menu.printMenu(...)`.
  - Based on the selected mode:
    - Modes `1` and `2`:
      - Log into Buildertrend using `scraper.login()` (interactive login using Playwright and stored cookies/state).
      - Initialize a scraping browser context with `scraper.scraperInit()`.
      - Fetch a set of projects from Supabase via `db.getProjects()` (projects updated within the last hour or with `updated` null).
      - For each project address, sequentially call:
        - `scraper.selectJob(address)`
        - `scraper.estimate(address)`
        - `scraper.jobCost(address)`
        - `scraper.invoices(address)`
        - `scraper.changeOrders(address)`
      - Close the scraper browser via `scraper.scraperQuit()`.
    - Modes `1` and `3`:
      - Fetch all projects via `db.getAllProjects()` and currently just log their addresses; the “push to Monday.com” behavior is not yet implemented (see `main.js` and `api.js`).
    - Mode `q` exits the process cleanly after clearing the terminal.
- Logging and small timing utilities (`log`, `sleep`, `clear`) are all provided by `utility.js`.

### Configuration (`config.json`)

- `src/config.json` is the central runtime configuration for:
  - Buildertrend login credentials and page URLs.
  - Monday.com API key, board ID, group ID, and column IDs.
  - Supabase URL and anon key.
  - Debug settings (`debugStatus`, `headless`, log file path).
  - Which Buildertrend sections to scrape.
- Several modules (`utility.js`, `menu.js`, `db.js`, `scraper.js`, `api.js`) import this file directly.
- Be careful when editing this file:
  - It currently contains real credentials and API keys; avoid echoing them into logs or prompts and prefer refactoring toward environment variables or other secure configuration if you change how auth works.

### CLI menu and UX (`menu.js` + `utility.js`)

- `src/utility.js` centralizes:
  - ANSI color codes.
  - A structured `log` helper (info/warn/error/success/debug) that is gated by `config.debug.debugStatus` for debug output.
  - Terminal sizing helpers (`termWidth`, `termLine`) and `centerTextBlock` for rendering the ASCII-art title and status lines.
  - Generic helpers like `parseCurrency`, `sleep`, `clear`, `clamp`, `isNumeric`.
- `src/menu.js` is responsible for the interactive terminal menu:
  - Renders a large ASCII-art “Refresher” title showing app version (`pkg.version`) and status icons for package, config, and database connectivity.
  - Presents the main mode selection menu (scrape & push, scrape only, push only, settings, quit).
  - Implements a nested “Settings” submenu that toggles `config.debug.debugStatus` and `config.debug.headless` and persists them back to `config.json` using `fs.writeFileSync`.
  - Uses a single `readline` interface (`rl`) to prompt for user choices; `printMenu` returns the selected mode back to `main.js`.

### Database access layer (`db.js`)

- `src/db.js` wraps the Supabase JS client (`@supabase/supabase-js`) and exposes a small data access layer around the `project` table:
  - `connect()` runs a simple `select('id').limit(1)` to verify connectivity and sets `status.connected` accordingly.
  - `getProjects()` returns “fresh” projects: those whose `updated` timestamp is null or within the last hour.
  - `getAllProjects()` returns all projects.
  - `updateProject(address, fields)` updates a project by address, stamping `updated` with the current ISO timestamp.
  - `insertProject(address)` inserts a new project row if needed and returns the inserted record.
- This module is the only place that should be mutating Supabase directly; scraping code delegates updates via `updateProject`.

### Scraping layer (`scraper.js`)

- `src/scraper.js` encapsulates all Playwright-based automation against Buildertrend.
- It maintains a separation between:
  - An initial login browser/context (`login()`), which is always launched non-headless and used to establish authenticated cookies/state.
  - A separate scraping browser/context (`scraperInit()`), which reuses stored state and can respect `config.debug.headless` for headless or headed scraping.
- Key responsibilities:
  - `login()` navigates to the Buildertrend landing page, fills username/password, waits for potential reCAPTCHA resolution, and saves cookies/storage state.
  - `scraperInit()` creates a new Playwright context with `storageState` and navigates to the Buildertrend landing page for scraping.
  - `selectJob(jobName)` uses the search input and job list selector to pick a project, handling the “clear search” button and logging warnings on failure.
  - `estimate()`, `jobCost()`, `invoices()`, and `changeOrders()` each:
    - Navigate to the respective Buildertrend section using URLs defined in `config.buildertrend.urls`.
    - Extract specific numeric totals using CSS selectors encoded in the `selectors` object.
    - Clean and parse the text using `parseCurrency` and write results back into Supabase via `updateProject`.
  - `scrapeField(...)` is the shared helper for safely reading a selector, skipping placeholder values, parsing currency, and writing to the DB.
  - `scraperQuit()` closes the scraping browser.

### Monday.com integration (`api.js` and main modes)

- `src/api.js` contains a low-level `itemUpdate(itemID, columnID, value)` helper that:
  - Constructs a GraphQL `change_column_value` mutation using the Monday.com API key and board ID from `config.monday`.
  - Sends the request via `node-fetch` and logs the JSON response.
- `api.js` is currently not wired into `main.js`’s mode `1`/`3` flows beyond a “Push not yet implemented” log; the sample call at the bottom of `api.js` is effectively a debug/demo usage.
- Any future “push” functionality should:
  - Use `db` to read project records and `api.itemUpdate` (or a higher-level wrapper) to write derived data into Monday.com.
  - Be careful not to hard-code real item IDs / column IDs beyond what `config.json` already contains.

### Other notes

- `src/database.db` exists but is not referenced in the current Node code; treat it as legacy or auxiliary data unless you introduce SQLite-based functionality.
- The bulk of the repository under `src/node_modules/` is standard dependency code; do not edit it directly.

## Guidance for future Warp agents

- When making changes, keep the separation of concerns intact:
  - `main.js` should remain a thin orchestrator and menu loop.
  - `scraper.js` should own all Playwright and selector logic.
  - `db.js` should remain the single place that knows about Supabase schemas.
  - `api.js` should own Monday.com GraphQL calls.
- If you introduce tests or linting, prefer placing configuration and scripts alongside the existing `src/package.json`, and update the "Commands" section above so future agents know how to run them.
- Be cautious editing `config.json`; it is consumed by multiple modules and currently contains credentials. Prefer non-breaking additive changes and, if refactoring auth/config handling, ensure all dependent modules are updated together.
