# Ceres

Ceres is a household meal planner: plan the week's meals from the dishes you cook, see rough calories and protein per person, and get a grocery list for each shopping trip. Product behaviour is described in `docs/spec/`.

## Setup

Prerequisites: Node 24, PostgreSQL 18 and a Google OAuth client.

Create the role and the development and test databases:

```
psql -d postgres -c "create role ceres login password 'ceres'"
psql -d postgres -c "create database ceres owner ceres"
psql -d postgres -c "create database ceres_test owner ceres"
```

Copy `.env.example` to `.env` and fill it:

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Db connection string for the app |
| `DATABASE_URL_TEST` | Db connection string for the tests |
| `BETTER_AUTH_SECRET` | Signs sessions; generate with `openssl rand -base64 32` (changing it signs everyone out) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | From the Google OAuth client (see Google sign-in below) |
| `LOG_LEVEL` | `fatal`, `error`, `warn`, `info` (default), `debug` or `trace` |
| `LOG_ENABLED` | `false` turns logging off |
| `REQUEST_ID_FORMAT` | `base36` (default, 8 characters) or `uuid` |

Copy `config/app.example.json` to `config/app.json` (`port` and `baseUrl`, no trailing slash) and `config/brand.example.json` to `config/brand.json`. The brand fields:

| Field | Meaning |
|---|---|
| `name` | App name, 1 to 40 characters |
| `icon` | Path inside `public/`, starting with `/` and ending in `.svg` or `.png` |
| `headerDisplay` | `icon` (in the example), `text` or `icon_text`: how the brand shows in the menu, header, sign-in and onboarding pages |
| `colors.light`, `colors.dark` | `ink` and `paper` as `#rrggbb` for each mode |
| `fonts.sans`, `fonts.serif` | Font names; each needs its Fontsource package installed (`@fontsource-variable/<name>` or `@fontsource/<name>`, lowercase with dashes for spaces, exact version) |
| `fonts.defaultStyle` | `serif` or `sans`: the style used until a user picks one |

Then:

```
npm install
npm run db:migrate
```

To reset the development database (this deletes all its data), stop the app and run:

```
psql postgres://ceres:ceres@localhost:5432/ceres -c "drop schema if exists drizzle cascade; drop schema public cascade; create schema public;"
npm run db:migrate
```

### Google sign-in

Once per deployment, in the Google Cloud console (console.cloud.google.com):

1. Create a project.
2. In Google Auth Platform, set the branding (app name, support email) and the audience: External. While it is in Testing, only the test users you add can sign in.
3. Create a client of type "Web application" with the authorised JavaScript origin `<baseUrl>` and the redirect URI `<baseUrl>/api/auth/callback/google`, where `<baseUrl>` is the `baseUrl` in `config/app.json` (`http://localhost:3000` in development). One client can hold the origins and redirect URIs of several environments.
4. Put the client id and secret in `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The secret is shown only once; if it is lost, add a new secret to the same client.

## Run

- Development: `npm run dev`
- Production: `npm run build`, `npm run db:migrate` (against the production db), then `npm start`
- Vercel: set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (and optionally the `LOG_*` and `REQUEST_ID_FORMAT` variables). The gitignored `config/app.json` and `config/brand.json` are not in the build, so the example files are used. Add `<baseUrl>/api/auth/callback/google` to the Google client's redirect URIs, with the `baseUrl` from `config/app.example.json`. Run `npm run db:migrate` with the production `DATABASE_URL`; the build does not migrate.

## Checks

- `npm run check` runs lint, typecheck and tests.
- `npm run test:coverage` runs the tests with coverage.

## Licence

MIT
