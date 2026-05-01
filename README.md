# FPL Helper

A smart Fantasy Premier League assistant that goes beyond the official FPL app. Get fixture difficulty ratings based on actual recent form, optimal starting XI recommendations, transfer suggestions, and captain picks — all from your existing FPL team ID.

---

## Features

### Squad View
Visual football pitch layout showing your current 15-player squad in formation. Switch between your current XI and an AI-recommended starting XI with a single toggle. Swapped players are highlighted with a yellow ring and a summary of suggested changes is shown above the pitch.

### Smart FDR (Dynamic Fixture Difficulty Rating)
The standard FPL fixture difficulty ratings are static and rarely updated. FPL Helper computes a blended **dFDR** score using two signals:

- **60% — Rolling goals conceded (last 6 games):** actual recent match results from the FPL fixtures API, capturing current defensive form. A team that's been leaky recently will have a lower dFDR even if they're historically strong.
- **40% — FPL team strength ratings:** FPL's own weekly-updated `strength_defence_home/away` fields, which provide a slower-moving season-long quality anchor to prevent fluky results from distorting the score.

The result is a 1–5 decimal score that reflects what's actually happening right now, not just pre-season reputation.

### Fixtures Tab
Table view of all 15 squad players (starters + bench) showing the next 5 gameweeks for each player. Columns include price, form, ownership %, points per game, and colour-coded fixture chips using the dFDR scale. A legend at the bottom explains the colour bands.

### Recommended XI
An optimised starting XI picker that uses a position-aware scoring formula:

| Position | Scoring basis |
|---|---|
| GK | Saves per 90 + clean sheet rate × 6 |
| DEF | Clean sheet rate × 6 + xGI/90 × 6 |
| MID | xG/90 × 5 + xA/90 × 3 + clean sheet rate × 1 |
| FWD | xG/90 × 6 + xA/90 × 2.5 |

Each player's attacking contribution is multiplied by **fixture ease** `(6 - dFDR) / 5`, an **availability gate** (1.0 / 0.75 / 0.40 / 0.10 based on injury status), and a **form nudge** (±20% max) so recent form is a minor modifier rather than the dominant factor.

Formation rules are respected: 1 GK, min 3 DEF / 2 MID / 1 FWD, max 5 DEF / 5 MID / 3 FWD.

### Transfers Tab
Identifies sell candidates from your starting XI based on tough upcoming fixtures (avg dFDR ≥ 3.7), poor form (< 2.0), or injury doubt (< 75% chance of playing). For each candidate, it surfaces affordable replacements at the same position who are fully fit and have easier upcoming fixtures.

### Captain Tab
Ranks your starting XI players for captaincy using the same scoring formula as the recommended XI, with a 10% home advantage bonus. Displays the top 3 picks with their key stats, flags differentials (< 15% ownership), and provides a short written summary of the top recommendation.

### Squad Rating
An overall squad health score (1–100) shown as an arc gauge, broken down into form (40 pts), fixture ease (35 pts), and availability (25 pts).

---

## How It Works

FPL Helper uses only the **official FPL public API** — no third-party data sources, no API keys, no authentication required.

```
browser → Next.js app → /api/fpl/* proxy → api.fantasy.premierleague.com
```

A server-side proxy route handles all FPL API calls to avoid CORS issues. The app fetches four endpoints on load:

1. `/bootstrap-static` — all player data, team data, gameweek events
2. `/entry/{teamId}` — manager info, squad value, bank, rank
3. `/entry/{teamId}/event/{gw}/picks` — your squad picks for the latest GW
4. `/fixtures` — full season fixture list including completed match scores

Everything is computed client-side from this data — no database, no backend state.

---

## Getting Started

### Prerequisites
- Node.js 18+
- An FPL team ID (find it in the URL at fantasy.premierleague.com → Points)

### Run locally

```bash
git clone https://github.com/your-username/fpl-helper.git
cd fpl-helper
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your FPL team ID, and hit **Load Team**.

Your team ID is saved to `localStorage` so you won't need to enter it again on the next visit.

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/fpl-helper)

> **Note:** Do not commit `package-lock.json` to the repo. The `.gitignore` already excludes it so Vercel generates a fresh lockfile on each build, avoiding version resolution issues with optional platform-specific binaries.

---

## Project Structure

```
fpl-helper/
├── app/
│   ├── page.tsx              # Root page — input, loading, and app screens
│   ├── layout.tsx            # Root layout and global styles
│   └── api/fpl/[...path]/    # Server-side FPL API proxy
│
├── components/
│   ├── SquadTab.tsx          # Pitch view + recommended XI toggle
│   ├── FixturesTab.tsx       # Fixture difficulty table for all 15 players
│   ├── TransfersTab.tsx      # Transfer recommendations
│   ├── CaptainTab.tsx        # Captain picks + narrative
│   ├── SummaryBar.tsx        # Manager info, squad value, rank, GW points
│   └── SquadRatingCard.tsx   # Arc gauge squad health score
│
└── lib/
    ├── fpl.ts                # All core logic: dFDR, scoring, recommendations
    └── types.ts              # TypeScript interfaces for FPL API data
```

---

## Tech Stack

- **[Next.js 16](https://nextjs.org)** — App Router, server-side API proxy
- **[React 19](https://react.dev)** — UI components
- **[Tailwind CSS v4](https://tailwindcss.com)** — Styling
- **TypeScript** — End-to-end type safety
- **[Vercel](https://vercel.com)** — Deployment

---

## The dFDR Formula in Detail

The standard FPL FDR (1–5 integer) is assigned pre-season and updated infrequently. FPL Helper replaces it with a decimal dFDR computed fresh on each page load.

**Static component (40%)** — FPL publishes `strength_defence_home` and `strength_defence_away` for every team. When your player is at home, the opponent plays away, so we use the opponent's `strength_defence_away`. These values are normalised across all 20 teams to a 1–5 scale.

**Rolling component (60%)** — We scan all completed fixtures in the season, take each team's last 6 results, and compute their average goals conceded per game. This is normalised across all 20 teams (0 conceded/game → dFDR 5, 2+ conceded/game → dFDR 1) and inverted — more goals conceded means an easier fixture for attackers.

The two components are blended: `dFDR = 0.4 × staticFdr + 0.6 × rollingFdr`

The 60/40 split means recent form drives the rating, but a single fluky scoreline (e.g. a 5-0) can't collapse a team's rating entirely.

---

## Player Scoring Formula

Used by both the Recommended XI picker and the Captain tab:

```
score = attackContrib × fixtureEase × availability × formNudge
```

Where:
- `fixtureEase = (6 - dFDR) / 5` — ranges from 0.2 (hardest) to 1.0 (easiest)
- `availability` — 1.0 (fit) / 0.75 (≥75% chance) / 0.40 (50–74%) / 0.10 (<50%)
- `formNudge = 1 + (form / 10) × 0.2` — form adjusts score by ±20% at most
- `attackContrib` — position-specific (see Recommended XI section above)

Players with fewer than 3 games worth of minutes fall back to `points_per_game × 0.3` to avoid cold-start noise from small sample sizes.

---

## Data & Privacy

FPL Helper makes API calls to `api.fantasy.premierleague.com` via a server-side proxy. Your team ID is stored only in your browser's `localStorage` — nothing is sent to any server other than the FPL API itself. There is no tracking, no database, and no user accounts.

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss what you'd like to change.

```bash
npm run dev    # development server
npm run build  # production build
npm run lint   # ESLint
```

---

## License

MIT
