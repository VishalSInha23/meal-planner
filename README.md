# Ceres
A household meal planner: plan the week's meals from the dishes you cook, see rough calories and protein per person, and get a grocery list for each shopping trip.

## Setup

- Node 24 and PostgreSQL 18
- Copy `.env.example` to `.env`
- Copy `config/app.example.json` to `config/app.json`
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

### Production

Use the same redirect URI with the production base URL, and run `npm run db:migrate` against the production database before starting the app.

## Run

- Development: `npm run dev`
- Production: `npm run build`, then `npm start`

## Checks

`npm run check`
