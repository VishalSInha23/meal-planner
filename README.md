# Ceres
A household meal planner: plan the week's meals from the dishes you cook, see rough calories and protein per person, and get a grocery list for each shopping trip.

## Setup

- Node 24 and PostgreSQL 18
- Copy `.env.example` to `.env`
- Copy `config/app.example.json` to `config/app.json`
- Copy `config/brand.example.json` to `config/brand.json`
- `npm install`

### Database

Create a role and two databases, `ceres` for development and `ceres_test` for the tests:

```
psql -d postgres -c "create role ceres login password 'ceres'"
psql -d postgres -c "create database ceres owner ceres"
psql -d postgres -c "create database ceres_test owner ceres"
```

Put the connection strings in `.env`:

```
DATABASE_URL=postgres://ceres:ceres@localhost:5432/ceres
DATABASE_URL_TEST=postgres://ceres:ceres@localhost:5432/ceres_test
```

Then run `npm run db:migrate` to create the tables. The tests migrate the test database themselves. After changing a schema file in `src/db/schema/`, run `npm run db:generate` and commit the new migration in `drizzle/`.

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

Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. Changing it signs everyone out.

### Environment

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | App db connection string |
| `DATABASE_URL_TEST` | Test db connection string (tests and CI) |
| `BETTER_AUTH_SECRET` | Signs sessions; see Google sign-in above |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client |
| `LOG_LEVEL` | `fatal`, `error`, `warn`, `info` (default), `debug` or `trace`; `debug` adds request and response bodies and db query timings |
| `LOG_ENABLED` | `false` turns logging off |
| `REQUEST_ID_FORMAT` | `base36` (8 characters, default) or `uuid` |

### Brand

`config/brand.json` sets the look. Without it, `config/brand.example.json` is used. `npm run dev`, `npm run build` and the checks run `npm run brand` first, which validates the file, checks the icon and writes `src/config/generated/` (not committed). An invalid file stops the run with a message naming the field. Restart `npm run dev` after editing the file.

| Field | Meaning |
|---|---|
| `name` | App name, 1 to 40 characters; the page title and the header text |
| `icon` | Path in `public/` starting with `/` and ending in `.svg` or `.png`; the tab icon and the header icon |
| `headerDisplay` | `icon` (default), `text` or `icon_text`: how the brand shows in the menu, header, sign-in and onboarding pages |
| `colors.light`, `colors.dark` | `ink` and `paper` as `#rrggbb` for each mode |
| `fonts.sans`, `fonts.serif` | Font names, installed as a Fontsource package |
| `fonts.defaultStyle` | `serif` or `sans`: the style used until a user picks one |

A font name maps to the package `@fontsource-variable/<name in lowercase, spaces as dashes>`, or `@fontsource/<name>` when the font has no variable version. To use another font, install its package with an exact version, for example `npm i --save-exact @fontsource-variable/lora`, and put its name in the file. The error names the command when the package is missing.

### Production

Use the same redirect URI with the production base URL, and run `npm run db:migrate` against the production database before starting the app.

## Run

- Development: `npm run dev`
- Production: `npm run build`, then `npm start`

## Checks

`npm run check`
