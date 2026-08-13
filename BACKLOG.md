# FPL Helper — Backlog

Idea list dari Ekky, dicatat 2026-08-12 (pre-season, sebelum GW1). Belum ada prioritas/estimasi — ini ide dump yang bakal di-breakdown per item kalau mau dikerjain (kemungkinan di-delegate ke Rey via cmd CLI).

---

## 1. Pitch shape & ratio — fix sesuai aslinya
**Status:** Done (2026-08-13)
**Fix:** Container `aspect-square max-h-[400px]` → `aspect-[300/430] max-w-[320px] mx-auto`. Root cause: di desktop, kolom lebar ~550px + max-h 400px bikin pitch render 550×400 (ratio 1.375, landscape) padahal SVG didesain 300×430 (portrait, 0.698). Cap lebar (bukan tinggi) biar ratio selalu match viewBox di semua viewport. `pitchPosition` %-based jadi nggak perlu diubah. Verified: container 320×459 (ratio 0.698) di browser, shirts GK 86% / DEF 66% / MID 43% / FWD 18% rapi.

## 2. XI picker: GW score vs power rating — hasilnya mirip banget, intentional?
**Status:** Done (2026-08-13) — bukan bug di mode switching, tapi dFDR kolaps di pre-season
**Root cause:** FPL API pre-season ngasih `strength_defence_home/away = 0` untuk SEMUA tim. `computeDynamicFdrFromStrength` jadi fallback ke 0.5 (static) + 2.6 (rolling, karena belum ada pertandingan) = **2.76 untuk semua fixture**. Akibatnya `avgDFdr3` identik semua pemain → GW Score = Power × konstan → corr(power, GWScore) = 1.000, overlap 100%, top-10 identik.
**Fix (lib/fpl.ts):**
- `buildAppState`: deteksi `hasStrengthData` (ada tim dgn strength_defence > 0); kalau nggak ada, `dDifficulty = fix.difficulty` (static FDR per fixture yang vary 1-5)
- `computeDynamicFdrFromStrength`: skip rolling component kalau `rollingConceded` kosong (pre-season/GW1)
- Wildcard score: `power × (6-avgDFdr3)/5` (range 0.2-1.0, over-punish) → `power × (1 + (3-avgDFdr3)×0.06)` (±0.12, power dominan, fixture cuma tiebreaker)
**Hasil:** corr 0.945, overlap 53%, dFDR range 2.3-4.0. Freehit pick GW1-fixture (Raya, Awoniyi, Cherki), wildcard pick run 3GW (Palmer, Tavernier, João Pedro). Formasi beda: 5-3-2 vs 5-2-2.
**Verify:** `npx tsx scripts/compare-modes.ts` (overlap & korelasi; target: overlap < 80%, corr < 0.99)

## 3. XI picker manual builder
**Status:** DONE 2026-08-13 (merge `1738d7d`) — manual XI builder di PreSeasonBuilder
**Context:** Sekarang PreSeasonBuilder cuma auto-recommend (buildChipSquad) — user nggak bisa manual pilih pemain sendiri buat starting XI / bench.
**Yang sudah diimplementasi:**
- Klik pemain di Player Pool → swap pemain terlemah di posisi yang sama (score sesuai mode aktif: GW Score / Power Rating), enforce budget £100m, posisi {2,5,5,3}, max 3/club, no dupes
- Persist di localStorage (`fpl-manual-squad`, keyed by teamId + mode) — reload aman, ganti team/mode auto-reset
- UI: badge "Manual", "Reset to Auto" button, flash animation pemain yang ke-swap out, label "Manual Starting XI"
- Auto squad tetap jadi fallback (`manualSquad ?? chipSquad`)

## 4. News segment — berita tim & pemain di squad kita
**Status:** Partially done (2026-08-13) — injury report live di Dashboard, external news feed placeholder
**Context:** Mau ada section berita mingguan yang relevan sama tim kita (injury, rotation risk, transfer news, dll) buat pemain yang ada di starting XI/bench.
**Yang sudah diimplementasi:**
- **Injury report** di Dashboard: filter bootstrap elements (news non-empty OR chance_of_playing_next_round < 75), grouped per club, badge chance %
- `/news` route = placeholder "coming soon"
**Yang belum:**
- Sumber data eksternal (BBC RSS / scraping / keyed API) — keputusan masih pending
- Filter berita per pemain dari squad kita

## 6. Sidebar navigation + multi-route restructure
**Status:** DONE 2026-08-13 (merge `e292bb2`) — satu run Rey (branch feat/sidebar-nav) + 3 fix operator
**Scope:** 10 routes (Dashboard, My Team, Standings, Players, Fixtures, News, Leagues, History, Watchlist, Settings), AppProvider context (data loading, chipPreview, watchlist, leagues), Sidebar desktop + MobileNav bottom scroll, PreSeasonBuilder full-width di /team pas pre-season.
**Operator fixes setelah review:** (1) standings empty state — computePLTable selalu return 20 row, cek jadi `table.every(r => r.played === 0)`; (2) sidebar VALUE — `fmt(null)` render "£0.0m", guard jadi '—'; (3) fixtures kickoff dobel — hapus badge kanan.
**Catatan:** News feed external masih pending (item #4). Leagues API verified via proxy: `leagues-classic/{id}/standings/` + `leagues-h2h/{id}/standings/` (standings.results kosong pre-season — normal FPL behavior).

## 5. Better dFDR algorithm & approach
**Status:** DONE 2026-08-13 — dFDR v2 position-aware (commit `e9207cf`, verify: `scripts/verify-dfdr-v2.ts`)
**Context:** Current dFDR di `lib/fpl.ts`: 60% rolling goals conceded (last 6 games) + 40% FPL team strength ratings. User mau di-improve.
**Yang sudah diimplementasi:**
- **Position-aware static component**: GK/DEF berat ke opponent ATTACK strength (w=0.65), FWD ke opponent DEFENCE (w=0.65), MID blend (0.5/0.5). Home/away split tetep (pake split lawan: away saat kita home).
- **`fixtureDifficulty(f, positionType)` helper** di lib/fpl.ts: fallback chain `dDifficultyByPos → dDifficulty → difficulty`. Semua konsumen (playerGWScore, playerScore, calculateSquadRating, enrichAllPlayers, buildSquad) udah pake ini.
- **`dDifficultyByPos` field** di UpcomingFixture, di-inject per fixture di buildAppState. `dDifficulty` = rata-rata 4 posisi (buat display).
- Pre-season fallback intact: strength semua 0 → dDifficulty = difficulty.
**Yang belum:**
- **Understat DEAD** (2026-08): understat.com nggak ngembed `teamsData` lagi di HTML (cuma ads), endpoint `/api/understat` selalu return `{}`. `lib/dynamicFdr.ts` (computeDynamicFdr) = dead code. Kalau mau xG beneran, cari API lain (butuh key) atau backtest pas musim jalan.
- **Backtest**: belum ada validasi historis — bisa dilakuin pas data musim ini numpuk (rolling conceded + strength beneran aktif).
