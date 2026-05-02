# FPL Helper

A smart Fantasy Premier League assistant that goes beyond the official FPL app. Get fixture difficulty ratings based on actual recent form, player power ratings, optimal chip squad recommendations, and captain picks — all from your existing FPL team ID, with no API keys required.

---

## Features

### Squad View (Pitch)
Visual football pitch layout showing your current 15-player squad in formation. Each player card on the pitch shows:

- **Actual GW points** (colour-coded: green = haul, amber = ok, grey = blank) — updates live during a gameweek and applies the captain ×2 multiplier automatically
- **Fixture pill(s)** — shows the current GW opponent while the gameweek is live; switches to the next GW only after all matches are complete. DGW players show both opponents stacked
- **DGW badge** when a player has a Double Gameweek
- **Injury/availability %** for doubts

Toggle between your current XI, the recommended next-GW XI, or a chip squad preview pushed from the Chip tab. Recommended mode highlights swapped players with a yellow ring and shows a change summary above the pitch.

### Transfer Deadline Banner
A persistent banner below the header shows the upcoming GW transfer deadline with a live countdown. Turns amber with a ⚠️ warning when under 24 hours away, and disappears automatically once the deadline has passed.

### Smart FDR (Dynamic Fixture Difficulty Rating)
The standard FPL fixture difficulty ratings are static and rarely updated. FPL Helper computes a blended **dFDR** score using two signals:

- **60% — Rolling goals conceded (last 6 games):** actual recent match results from the FPL fixtures API, capturing current defensive form. A team that's been leaky recently will have a lower dFDR even if they're historically strong.
- **40% — FPL team strength ratings:** FPL's own weekly-updated `strength_defence_home/away` fields, which provide a slower-moving season-long quality anchor to prevent fluky results from distorting the score.

The result is a 1–5 decimal score that reflects what's actually happening right now, not just pre-season reputation.

### Player Power Rating & GW Score
Two complementary scores (1–99) are computed for every player:

**Power Rating** — intrinsic quality, fixture-agnostic. Answers "how good is this player based on their season output?" Normalised against realistic PL ceilings per position. Players with under 3 games worth of minutes blend toward 40 (unknown) to avoid cold-start noise.

| Position | Scoring basis |
|---|---|
| GK | Saves/90 × 35 + CS rate × 35 + PPG × 30 |
| DEF | CS rate × 40 + xGI/90 × 30 + PPG × 30 |
| MID | xG/90 × 25 + xA/90 × 25 + PPG × 35 + form × 15 |
| FWD | xG/90 × 40 + xA/90 × 20 + PPG × 30 + form × 10 |

**GW Score** — Power Rating adjusted for the upcoming fixture(s). Fixture multiplier ranges from ×0.75 (dFDR 5, hardest) to ×1.25 (dFDR 1, easiest).

**Double & Blank Gameweek handling:** DGW players combine both fixture multipliers (full value for the better fixture + 85% for the second, accounting for diminishing returns on clean sheet bonuses). BGW players score near-zero since they don't play. Both `playerScore` (used for XI selection) and `playerGWScore` apply the same logic.

### Squad Rating
Two large colour-coded metric blocks replace the old three-metric layout:

- **Team Quality** — average Power Rating of the starting XI. Answers "how good is this squad, ignoring this week's fixtures?"
- **This GW** — Team Quality adjusted for this week's fixtures. Shows how well set-up the squad is right now.

Supporting stats (form average, avg dFDR, availability count) shown in the header row. A delta hint appears when the two scores diverge by 3+ points.

### Fixtures Tab
Table view of all 15 squad players (starters + bench) showing the next 5 gameweeks. Columns include price, form, ownership %, PPG, Power Rating badge, GW Score badge, and colour-coded fixture chips. **DGW columns show stacked chips for both opponents.** BGW columns show a grey "BGW" chip. Player names carry DGW/BGW pill badges for quick scanning.

### Transfers Tab
Identifies sell candidates from your starting XI based on tough upcoming fixtures (avg dFDR ≥ 3.7), poor form (< 2.0), or injury doubt (< 75% chance of playing). For each candidate it surfaces affordable replacements at the same position who are fully fit and have easier upcoming fixtures.

### Captain Tab
Ranks your starting XI for captaincy using the player scoring formula with a 10% home advantage bonus. DGW players are correctly boosted by the double-fixture multiplier so they naturally float to the top when they have two games. The top 3 cards show all GW fixtures (both opponents for DGW), a DGW/BGW badge, Power Rating + GW Score badges, and a flag for differentials (< 15% ownership). The "Our Take" narrative calls out Double Gameweeks explicitly.

### Chip Tab — Wildcard & Free Hit
Recommends an optimal 15-player squad for your chip usage within your current budget (squad value + bank).

**Free Hit** mode ranks players by GW Score — pure short-term output optimised for the current gameweek. DGW players with two easy fixtures rank highest.

**Wildcard** mode ranks by `Power Rating × fixture ease over next 3 GWs` — builds long-term quality rather than chasing a single week.

Both modes enforce: 2 GK / 5 DEF / 5 MID / 3 FWD slots, max 3 players per club, and a budget safety floor (checks the minimum cost to fill remaining slots before each pick so you're never stranded short of a position).

The recommended squad is previewed on the pitch in the Squad tab (pushed via chip preview mode), showing the chip captain/vice and both fixture opponents for DGW players. The Chip tab also includes a full player pool ranked by position so you can explore alternatives.

---

## How It Works

FPL Helper uses only the **official FPL public API** — no third-party data sources, no API keys, no authentication required.

```
browser → Next.js app → /api/fpl/* proxy → api.fantasy.premierleague.com
```

A server-side proxy route handles all FPL API calls to avoid CORS issues. The app fetches four endpoints on load:

1. `/bootstrap-static` — all player data, team data, gameweek events (including deadline times and `event_points`)
2. `/entry/{teamId}` — manager info, squad value, bank, rank
3. `/entry/{teamId}/event/{gw}/picks` — your squad picks for the latest GW (tried for current GW, falls back up to 2 GWs)
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
│   ├── page.tsx              # Root page — input, loading, app screens, deadline banner
│   ├── layout.tsx            # Root layout and global styles
│   └── api/fpl/[...path]/    # Server-side FPL API proxy
│
├── components/
│   ├── SquadTab.tsx          # Pitch view — live GW points, DGW pills, chip preview
│   ├── FixturesTab.tsx       # Fixture difficulty table, DGW/BGW chips
│   ├── TransfersTab.tsx      # Transfer recommendations
│   ├── CaptainTab.tsx        # Captain picks + DGW-aware narrative
│   ├── ChipTab.tsx           # Wildcard & Free Hit squad builder
│   ├── SummaryBar.tsx        # GW points, season rank, squad value, manager info
│   └── SquadRatingCard.tsx   # Team Quality + This GW two-metric card
│
└── lib/
    ├── fpl.ts                # All core logic: dFDR, power rating, DGW/BGW, chip squad
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

The 60/40 split means recent form drives the rating, but a single fluky scoreline can't collapse a team's rating entirely.

---

## Player Scoring Formula

Used by the Recommended XI picker, Captain tab, and Chip squad builder:

```
playerScore = attackContrib × fixtureEase × availability × formNudge
```

Where:
- `fixtureEase` — `(6 - dFDR) / 5` for a single GW (0.2–1.0); for DGW, sums both eases with 85% diminishing return on the second; for BGW, 0.08
- `availability` — 1.0 (fit) / 0.75 (≥75% chance) / 0.40 (50–74%) / 0.10 (<50%)
- `formNudge = 1 + (form / 10) × 0.2` — adjusts score by ±20% at most
- `attackContrib` — position-specific (see Player Power Rating section above)

Players with fewer than 3 games worth of minutes fall back to `PPG × 0.3` to avoid cold-start noise.

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
