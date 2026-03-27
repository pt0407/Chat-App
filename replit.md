# Cultural and Identity Quiz

A browser-based quiz app that tests knowledge on cultural and historical topics, with a global leaderboard powered by Replit's built-in PostgreSQL database.

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no build system)
- **Backend**: Node.js + Express (serves static files and API)
- **Database**: Replit PostgreSQL (via `pg` npm package)

## Project Structure

```
.
├── index.html      # Main app UI (start, quiz, result, leaderboard screens)
├── script.js       # Quiz logic, timer, API calls for leaderboard
├── style.css       # Styling and animations
├── server.js       # Express server — serves static files + leaderboard API
└── SETUP.md        # Original Supabase setup guide (no longer needed)
```

## Running the App

The app is served via the `Start application` workflow using `node server.js` on port 5000.

## API Endpoints

- `GET /api/leaderboard` — Returns all scores ordered by score desc, time asc
- `POST /api/leaderboard` — Submits a new score (name, score, total, time, accuracy)

## Database

Uses Replit's built-in PostgreSQL. The `leaderboard` table is created automatically on first run.

Environment variables set automatically: `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`.

## Deployment

Configured as an **autoscale** deployment running `node server.js`.
