# Ceres: conventions for contributors and Claude Code

Ceres is a household meal planner built as one Next.js app (pages and API). Product behaviour lives in `docs/spec/`. Read the spec files your task names before writing code. This file lists the conventions every change follows.

## Stack

- Next.js 16 (App Router), React 19, TypeScript 5.9 in strict mode, Node 24.
- PostgreSQL 18 through Drizzle ORM (`drizzle-orm`, `drizzle-kit`) and the `pg` driver.
- Better Auth with Google sign-in only. No passwords.
- Tailwind CSS 4 and Radix primitives (`radix-ui`). Fonts are self-hosted from Fontsource packages.
- zod for every input and every config file. date-fns with `@date-fns/tz` for dates and timezones.
- Vitest with v8 coverage. pino for logs.
- Exact versions in `package.json` (no `^` or `~`). Don't add a dependency the task doesn't name. If one is really needed, stop and explain why.

## Layout

```
src/
  app/                  pages and route handlers (thin)
  modules/<model>/      one folder per db model: <model>-schema.ts (zod), <model>-repository.ts (db access),
                        <model>-service.ts (logic), tests next to the code (<name>.test.ts)
  db/                   client, transaction helper, schema/<model>.ts (Drizzle tables)
  lib/                  config, env, logger, request context, http (route wrapper, errors), auth
  components/ui/        primitives (button, field, dialog, ...)
  components/<feature>/ feature components
  config/               brand schema; generated/ holds files written by scripts (gitignored)
scripts/                Node scripts
config/                 *.example.json (committed) and the real *.json files (gitignored)
docs/spec/              product behaviour
drizzle/                generated migrations (committed)
```

## Layering

- Route handler → service → repository. A route handler parses input with zod, calls one service function and returns JSON. It holds no logic.
- Pages (server components) may call services directly for reads. Mutations always go through a route handler under `/api`; no server actions, so future native apps use the same API.
- Only files in `src/db/` and `*-repository.ts` files import Drizzle or run queries.
- Every repository function that reads or writes household data takes `householdId` and filters by it. The household id always comes from the signed-in user's member record, never from the request body, query or URL. A record from another household is reported as not found (404), not forbidden.
- Transactions go through `withTransaction(fn)` from `src/db/transaction.ts`; repository functions accept an optional transaction.

## Naming

- File names are kebab-case. db tables are singular snake_case (`meal_slot`), columns snake_case, TypeScript camelCase. A module folder is named after its db model.
- URL paths are plural (`/api/dishes`).
- Comments say "db", never the engine's name. Module code never names a vendor; vendor specifics live behind one adapter file (db client, auth provider, future storage or mail).

## Config

- Secrets live only in env (`.env`, copied from the committed `.env.example`): `DATABASE_URL`, `DATABASE_URL_TEST`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `LOG_LEVEL`, `LOG_ENABLED`, `REQUEST_ID_FORMAT`.
- Every other configurable value (port, base URL, branding) lives in JSON under `config/`: a committed `<name>.example.json` and a gitignored `<name>.json` copied from it. Loaders validate with zod and fall back to the example file when the real one is missing (a Vercel build only has what is in git), logging which file they used.
- Never hardcode a value that config provides.
- Env and config files carry no explanatory comments, only the keys and necessary values, with blank lines grouping related keys so they stay readable. Optional keys sit under an `# Optional` line, each with a one-line comment listing its allowed values. Explanations (what each variable or field means, allowed values) go in the README.

## API

- JSON in and out. Errors use one shape: `{ "error": { "code": "snake_case_code", "message": "Readable message", "fields": { "name": "..." } } }` (`fields` for validation errors and for a 409 on a unique value, naming the field). Status codes: 400 validation, 401 not signed in, 403 not allowed, 404 not found (including other households' records), 409 conflict, 500 unexpected. A 500 response carries a generic message; details go to the logs only.
- Every route handler is wrapped with `route()` from `src/lib/http/route.ts`, which sets up the request context, logs the request, and maps errors to the shape above.

## Logging

- pino. Production writes JSON lines to stdout. Development writes one line per entry through an in-process formatter (`src/lib/log/log-pretty.ts`, no worker transport): time, level, requestId, message, then `key=value` fields with text values unquoted. The pid is hidden; an error's stack goes on the following lines. Tests log nothing (`silent`).
- Request id: 8 random base36 characters in uppercase by default (short, less verbose logs), or a UUID with `REQUEST_ID_FORMAT=uuid`. A valid incoming `x-request-id` (8–64 characters of `A-Z a-z 0-9 -`) is reused. The id is returned in the `x-request-id` response header.
- Every line logged during a request carries `requestId` (and `userId` once known) through an `AsyncLocalStorage` request context (`src/lib/log/request-context.ts`). Code logs with `currentLog()`, which falls back to the app logger outside a request.
- Each API request logs "incoming request" `{ method, path, route, ip, bytes }` (path without the query string) and "request completed" `{ status, bytes, durationMs }`. Every duration is named `durationMs` and rounded to 3 decimals (`roundMs`).
- Bodies are logged only at debug: JSON only, never multipart; any field whose name contains password, secret, token or key is logged as `****`. JSON is shortened at every depth: arrays keep their first 3 items followed by `"... N more"`, strings over 200 characters are cut and end with `...`.
- Debug-level timed events: "db query" `{ sql, durationMs }` from a timing db client. Query parameters are never logged.
- `LOG_LEVEL` (default `info`). `LOG_ENABLED=false` turns logging off entirely.

## UI

- Two colours only, `ink` and `paper`, from the brand config. Other shades are ink at an opacity. Nothing relies on colour alone: over or under a target is shown with text and ▲ or ▼.
- Body text at least 16 px, font weight at least 400, borders at least 1.5 px, no shadows or gradients, touch targets at least 44 px. Phone first; desktop must work too.
- Feedback: a pressed state on every button, a spinner on the control that started an async action (which is disabled meanwhile), errors shown inline next to what failed. No toasts, banners or in-app notifications.
- Buttons show an icon (`lucide-react`), not text. Every icon button has an `aria-label` and a matching `title` tooltip; when a task names a button ("Add dish"), that name is its label. Text stays only where an icon alone can't say it: the sign-in button and the final confirmation of a destructive action.
- Theme: light or dark only, no "system" option. Until someone picks one, the page follows the device setting.
- Layout: dashboard style. Navigation is a menu on the left: a fixed sidebar on wide screens (768 px and up), and on phones a drawer that slides in from the left, opened by a menu icon button in the header. Content is grouped in cards (`Card` from `src/components/ui/card.tsx`: 1.5 px ink border, rounded corners, padding, no shadow), laid out in a grid that becomes one column on phones.
- No card that holds only a single button or link: the button or link itself becomes the card (whole card clickable, title, one line of description, chevron).
- Accessible: every input labelled, focus visible, everything works by keyboard.

## Tests

- Pure logic gets unit tests with values checked by hand. Services and route handlers get integration tests against the test db (`DATABASE_URL_TEST`), migrated once per run, with tables truncated between tests.
- Every bug fix comes with a test that fails without it.
- `npm run check` (lint, typecheck, tests) must pass before a task is finished.

## Docs

- Markdown and text files: no hard line breaks inside a paragraph; each paragraph is one line.
- A behaviour change updates the matching `docs/spec/` file in the same change. The README covers setup and running only.

## Working rules for agents

- Do what the task asks and nothing more. Note anything out of scope you noticed at the end instead of changing it.
- Don't commit, push or create branches; the maintainer does that.
- Finish with a short report: what changed (files), any deviation from the task and why, what you verified and how, anything left open.
