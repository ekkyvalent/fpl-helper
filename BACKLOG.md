# FPL Helper — Backlog

Idea list dari Ekky, dicatat 2026-08-12 (pre-season, sebelum GW1). Belum ada prioritas/estimasi — ini ide dump yang bakal di-breakdown per item kalau mau dikerjain (kemungkinan di-delegate ke Rey via cmd CLI).

---

## 1. Pitch shape & ratio — fix sesuai aslinya
**Status:** Open
**Context:** `components/PreSeasonBuilder.tsx` — `MiniPitch` SVG pakai `viewBox="0 0 300 430"` dengan `preserveAspectRatio="none"` di-stretch ke container `aspect-square` (1:1). Hasilnya lapangan kepanjangan/kelebarnya nggak proporsional vs lapangan FPL asli (yang portrait, rasio ~2:3).
**Yang perlu dipikirin:**
- Ganti container dari `aspect-square` → rasio yang lebih mirip pitch asli (misal `aspect-[2/3]` atau `aspect-[3/4]`)
- Penyesuaian posisi shirts (`pitchPosition` di `lib/fpl.ts` pakai persen, harusnya tetap work kalau viewBox diubah konsisten)
- Cek di mobile juga, jangan sampai pitch ke-kecil/ke-besar
- Kalau ada referensi dimensi lapangan asli FPL (68m x 105m), pakai rasio itu

## 2. XI picker: GW score vs power rating — hasilnya mirip banget, intentional?
**Status:** Open — perlu investigasi dulu
**Context:** Di PreSeasonBuilder, toggle mode `freehit` (GW Score) vs `wildcard` (Power Rating). User notice kedua mode ngasih rekomendasi yang basically sama. Bisa jadi intentional (dua metric itu emang correlated), bisa jadi bug (mode switch nggak ngefek ke sorting/pemilihan).
**Yang perlu dipikirin:**
- Cek `buildChipSquad(state, 1000, mode)` di `lib/fpl.ts` — apakah `mode` bener-bener ngarah ke scoring function yang beda
- Cek apakah `playerGWScore` dan `playerPowerRating` punya varians yang cukup buat bedain urutan
- Kalau correlated, pertimbangkan: weights beda, atau fitur pembeda lain (form, fixtures, xG)
- Reproduce: jalanin kedua mode, bandingin squad yang dihasilkan, hitung overlap

## 3. XI picker manual builder
**Status:** Open
**Context:** Sekarang PreSeasonBuilder cuma auto-recommend (buildChipSquad) — user nggak bisa manual pilih pemain sendiri buat starting XI / bench.
**Yang perlu dipikirin:**
- UI: klik pemain dari pool → masuk squad (ganti salah satu posisi yang sama)
- Constraint: tetap enforce budget £100m, posisi (2 GK / 5 DEF / 5 MID / 3 FWD), max 3 per club
- Start dari rekomendasi auto, terus user bisa tweak
- Simpan state di localStorage kayak team ID biar persist antar session
- Reuse `SquadRow`, `MiniShirt`, `MiniPitch` yang udah ada

## 4. News segment — berita tim & pemain di squad kita
**Status:** Open
**Context:** Mau ada section berita mingguan yang relevan sama tim kita (injury, rotation risk, transfer news, dll) buat pemain yang ada di starting XI/bench.
**Yang perlu dipikirin:**
- Sumber data: FPL API punya injury news (element.status, news, news_added), tapi buat berita eksternal perlu scraping/RSS (BBC Sport, Sky, dll) atau API pihak ketiga
- Filter: ambil pemain dari chipSquad → cari berita per pemain + per club
- UI: section baru di PreSeasonBuilder (kolom kanan?) atau halaman sendiri
- Note: ini bisa jadi scope gede, mulai dari yang simpel (status injury dari FPL API) dulu

## 5. Better dFDR algorithm & approach
**Status:** Open — perlu riset
**Context:** Current dFDR di `lib/fpl.ts`: 60% rolling goals conceded (last 6 games) + 40% FPL team strength ratings. User mau di-improve.
**Yang perlu dipikirin:**
- Data tambahan yang bisa dipake: home/away split, attack strength lawan, xG (ada endpoint understat di repo? cek `/api/understat`), form terbaru
- Approach: weighted blend yang lebih granular per position (GK/DEF lebih sensitif ke opponent attack, FWD ke opponent defense)
- Validation: backtest ke data musim lalu, bandingin prediksi vs actual points
- Jangan overfit — pre-season data terbatas, validasi pake historical seasons
