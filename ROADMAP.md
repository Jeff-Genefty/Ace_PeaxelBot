# Roadmap v3 — Bot Peaxel Community Hub

> **Objectif :** Community Hub Discord + web, connecté à [peaxel.me](https://peaxel.me) et [game.peaxel.me](https://game.peaxel.me), prêt pour la fin de beta et le scale.
>
> **Légende :** `⬜ À faire` · `🔄 En cours` · `✅ Terminé` · `⏸️ En pause` · `❌ Annulé`

**Dernière mise à jour :** 2026-09-15 (roadmap v3 — alignement code réel post Hub Pass)

**Docs liées :** [HUB_XP_LEADERBOARD.md](./HUB_XP_LEADERBOARD.md) · [GROWTH_STRATEGY.md](./GROWTH_STRATEGY.md) · [README.md](./README.md)

---

## Vue d'ensemble des phases

| Phase | Nom | Statut global | Cible |
|-------|-----|---------------|-------|
| 0 | Stabilisation & cleanup | ✅ Terminé | — |
| 1 | Hub Pass & Community Web | ✅ Terminé (polish restant ↓) | — |
| 2 | Launch Ready & pont jeu | 🔄 En cours | 0–4 semaines |
| 3 | Engagement Discord++ | ⬜ À faire | 6–8 semaines |
| 4 | Plateforme web v2 | ⬜ À faire | 8–12 semaines |
| 5 | Intégration API Peaxel | ⬜ À faire | Dépend API |
| 6 | Scale & polish | ⬜ À faire | Continu |

---

## Phase 0 — Stabilisation & cleanup ✅

> Base saine avant Hub Pass. Conservée pour historique.

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 0.1 | Alignement closing 18:59 / deadline 23:59 | ✅ | |
| 0.2–0.4 | Persistance scheduler + rewards counters | ✅ | `scheduler_state.json`, `reward_state.json` |
| 0.5 | Écriture JSON atomique | ✅ | `jsonStore.js` |
| 0.6 | `totalBans` dashboard | ✅ | |
| 0.7 / 0.15 | Slash commands via CLI uniquement | ✅ | `npm run register-commands` |
| 0.8 | Commentaire Coach Ace aligné 10 % | ✅ | |
| 0.9 | Handler `GuildMemberAdd` unique | ✅ | `memberJoinHandler.js` |
| 0.10–0.14 | Cleanup deps / exports morts / gitignore | ✅ | |
| 0.16–0.18 | Config centralisée `.env` > `config.json` | ✅ | `configManager.js` |
| 0.19–0.20 | `.env.example` + `SESSION_SECRET` prod | ✅ | |
| 0.21–0.22 | README + `/health` | ✅ | |
| 0.23 | Scout Quiz module partagé | ✅ | `scoutQuizRunner.js` |
| 0.24 | Analytics unifié | ✅ | |
| 0.25–0.26 | CSRF + rate limit login | ✅ | |

---

## Phase 1 — Hub Pass & Community Web ✅

> Livré sept. 2026. Détail économie XP → [HUB_XP_LEADERBOARD.md](./HUB_XP_LEADERBOARD.md).

### Hub XP & Discord

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 1.1 | Courbe XP + anti-farm messages 60 s | ✅ | `hubXpService.js` |
| 1.2 | `/daily` + streak 7 / 14 / 30 (+ carte) | ✅ | `commands/daily.js` |
| 1.3 | Message Daily Connect 09:00 Paris | ✅ | `dailyConnectMessage.js` |
| 1.4 | `/rank` [user] — niveau, barre, rang GW, streak | ✅ | `commands/rank.js` |
| 1.5 | XP feedback / quiz join·win / giveaway | ✅ | +30 / +15 / +50+carte / +10 |
| 1.6 | Défis hebdo auto (lun 00:05) + quête 10 msgs | ✅ | `weeklyChallengeService.js` |
| 1.7 | Podium #1 dimanche 20:05 (+150 XP + carte) | ✅ | `scheduler.js` |
| 1.8 | Footers Discord brandés (daily/rank/podium/pass) | ✅ | `hubFooter.js` + assets |
| 1.9 | i18n Discord FR/EN (`/daily` `/rank` `/help` `/how-to-play`) | ✅ | `discordLocale.js` |
| 1.10 | `/help` Hub Pass + contenu partagé FAQ | ✅ | `hubHelp.js` |

### Web Hub (joueurs)

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 1.11 | Landing publique + FAQ bilingue | ✅ | `web/routes/public.js` |
| 1.12 | OAuth Discord (membres guild uniquement) | ✅ | `discordAuth.js` |
| 1.13 | `/app` — XP, défis, vault, rappel GW | ✅ | `appDashboardService.js` |
| 1.14 | Leaderboards hebdo + all-time | ✅ | `/app/leaderboard` |
| 1.15 | Profil manager public `/app/manager/:id` | ✅ | |
| 1.16 | Claim coffre V1 (notify staff + ticket) | ✅ | Remise carte encore manuelle |
| 1.17 | Toggle rappel deadline GW (DM) | ✅ | `gwReminderService.js` |
| 1.18 | i18n web FR/EN (cookie `/lang`) | ✅ | `web/i18n/*` |

### Cycle Arena (bot) — déjà en place

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 1.19 | Opening lundi 00:00 | ✅ | |
| 1.20 | Scout Quiz mardi 19:00 | ✅ | Fenêtre 2 h |
| 1.21 | Spotlight mercredi 16:00 | ✅ | `athletes.json` |
| 1.22 | Closing jeudi 18:59 + DM rappel 21:59 | ✅ | |
| 1.23 | Giveaway sam 10:00 → tirage dim 20:00 | ✅ | 1 gagnant |
| 1.24 | Welcome Ace + chat rewards Coach Ace | ✅ | |
| 1.25 | Feedback modal + store + export admin | ✅ | |

### Console staff (Express v1)

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 1.26 | Auth admin bcrypt + path secret | ✅ | `ADMIN_PANEL_PATH` |
| 1.27 | Analytics, modération, broadcast whitelist | ✅ | |
| 1.28 | Vault claims admin + leaderboard XP | ✅ | `routes/vault.js`, `leaderboard.js` |
| 1.29 | Config messages / réactions / salons | ✅ | Partiel no-code |
| 1.30 | Validation Discord IDs / CSRF / sessions FileStore | ✅ | |

### Polish Phase 1 restant

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 1.31 | i18n Discord sur welcome / opening / giveaway / spotlight | ⬜ | Embeds encore surtout EN |
| 1.32 | Unifier URLs Zealy (`c/peaxel` vs `cw/peaxel-quest`) | ⬜ | help / welcome / FAQ |
| 1.33 | Remplacer assets `*_beta*` (logo how-to-play) | ⬜ | Post-beta |
| 1.34 | SLA / file claims vault documentée pour staff | ⬜ | Avant pic launch |
| 1.35 | Smoke tests étendus (auth OAuth mock, vault) | ⬜ | `tests/web-smoke.test.js` partiel |

---

## Phase 2 — Launch Ready & pont jeu (0–4 semaines) 🔄

> Priorité absolue fin de beta. Voir aussi [GROWTH_STRATEGY.md](./GROWTH_STRATEGY.md) Phase L.

### Launch / cohérence produit

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 2.1 | Rework FAQ Discord — retirer Alpha/Beta | ⬜ | `scripts/post-faq-channel.js` |
| 2.2 | Rewrite welcome — 1 CTA primaire (jouer) | ⬜ | `memberJoinHandler.js` |
| 2.3 | `#start-here` / parcours 60 s documenté | ⬜ | Ops Discord |
| 2.4 | UTM / `?ref=` sur liens bot → game.peaxel.me | ⬜ | opening, welcome, spotlight |
| 2.5 | Deep links launch (`?ref=discord_launch`) | ⬜ | |

### Pont Discord ↔ jeu (sans API complète)

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 2.6 | **GW Check-in** — bouton « Lineup soumise » (+50 XP) | ⬜ | Honor system · HUB sprint 4 |
| 2.7 | Streak GW check-in (4 GW → reward) | ⬜ | |
| 2.8 | Commande `/link` — liaison Discord ↔ pseudo/ID Peaxel | ⬜ | Stockage mapping JSON d’abord |
| 2.9 | Rôle `@Verified Manager` si compte lié | ⬜ | |
| 2.10 | Giveaway : éligibilité verified + check-in GW | ⬜ | |
| 2.11 | Prediction Challenge — thread Discord miroir X | ⬜ | |

### Qualité & ops

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 2.12 | Escape / XSS live logs admin | ⬜ | |
| 2.13 | Historique modération (raison + auteur) | ⬜ | |
| 2.14 | Feedback par saison / GW + NPS dashboard | ⬜ | Remplace feedback « 1× à vie » si encore le cas |
| 2.15 | `/ping` santé bot (slash) | ⬜ | Optionnel — `/health` HTTP existe |

---

## Phase 3 — Engagement Discord++ (6–8 semaines)

### Enrichir l’existant

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 3.1 | Scout Quiz — timer visible + indices progressifs | ⬜ | |
| 3.2 | Scout Quiz — leaderboard saisonnier (Discord + web) | ⬜ | |
| 3.3 | Spotlight — vote « Athlète de la semaine » | ⬜ | |
| 3.4 | Spotlight — deep link fiche Peaxel riche | ⬜ | |
| 3.5 | Giveaway multi-gagnants / tirage pondéré | ⬜ | |
| 3.6 | Coach Ace — messages contextuels (jour GW) | ⬜ | |
| 3.7 | Chat rewards — barre progression visible | ⬜ | |

### Nouvelles mécaniques

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 3.8 | **Lineup Show & Tell** `#lineups` | ⬜ | |
| 3.9 | **Card Drop Events** + Flash Drop (15 min) | ⬜ | |
| 3.10 | **Duel Manager** 1v1 score GW | ⬜ | |
| 3.11 | Rewards fin de saison Hub (rôle, carte, early access) | ⬜ | |
| 3.12 | Rôle `@Scout Pro` — top quiz saison | ⬜ | |
| 3.13 | Rôle `@GW Warrior` — streaks GW | ⬜ | |
| 3.14 | Rôle `@Community MVP` — contributeurs | ⬜ | |
| 3.15 | Rôles dynamiques top XP Hub | ⬜ | |

### Zealy

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 3.16 | Intégration Zealy API | ⬜ | Remplace validation manuelle |
| 3.17 | Quêtes sync : quiz, check-in, 7j actif, feedback, giveaway | ⬜ | |

### Leaderboards additionnels

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 3.18 | LB quiz | ⬜ | |
| 3.19 | LB streaks GW / daily | ⬜ | |
| 3.20 | LB predictions | ⬜ | |

> Note : le « Season Pass Discord » de l’ancienne roadmap = **Hub Pass déjà livré** (Phase 1). Les items 3.x sont des extensions.

---

## Phase 4 — Plateforme web v2 (8–12 semaines)

> Aujourd’hui : Express HTML + OAuth suffit. v2 = scale UX / admin / analytics.

### Stack

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 4.1 | Décider stack front v2 (Next.js + Supabase recommandé) | ⬜ | Ou itérer Express |
| 4.2 | Choisir DB (Supabase/PostgreSQL) + schéma | ⬜ | users, hub_xp, claims, links… |
| 4.3 | Migration JSON → DB | ⬜ | Script import |
| 4.4 | Restructurer code `bot/` `api/` `services/` `db/` | ⬜ | |

### Admin v2

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 4.5 | Calendrier événements CRUD (quiz, spotlight, giveaways, drops) | ⬜ | |
| 4.6 | Modération + historique raison | ⬜ | |
| 4.7 | Broadcast programmés / templates | ⬜ | |
| 4.8 | Analytics funnel GW (opening → check-in → closing) | ⬜ | |
| 4.9 | Rétention / heatmap horaire | ⬜ | |
| 4.10 | File claims fluide (validation 1-clic, SLA) | ⬜ | Avant API auto |
| 4.11 | Config no-code complète | ⬜ | |
| 4.12 | CRUD athlètes / sync spotlight | ⬜ | |
| 4.13 | Export CSV feedbacks (UI) | ⬜ | Commande Discord existe |

### Joueur v2

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 4.14 | Profil enrichi (badges, lien Peaxel, historique) | ⬜ | Base `/app/manager` existe |
| 4.15 | Stats quiz / drops / GW | ⬜ | |
| 4.16 | Historique rewards + statut claim | ⬜ | Vault V1 partiel |
| 4.17 | Préférences notifs (opening, quiz, drop) | ⬜ | Rappel GW déjà OK |
| 4.18 | Calendrier communautaire public | ⬜ | |
| 4.19 | Web mobile-friendly audit / polish | ⬜ | |

---

## Phase 5 — Intégration API Peaxel (dépend équipe game)

### Spec

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 5.1 | Spec API bot ↔ game.peaxel.me | ⬜ | |
| 5.2 | Validation avec équipe Peaxel | ⬜ | |
| 5.3 | `PEAXEL_API_BASE_URL` + `PEAXEL_BOT_API_KEY` | ⬜ | |

### Endpoints (côté Peaxel)

| # | Endpoint | Statut | Usage |
|---|----------|--------|-------|
| 5.4 | `GET /gameweek/current` | ⬜ | GW, deadline, statut |
| 5.5 | `GET /users/{id}/lineup` | ⬜ | Check-in auto |
| 5.6 | `GET /users/{id}/cards` | ⬜ | Collection |
| 5.7 | `GET /leaderboard/gw/{n}` | ⬜ | Recap / opening |
| 5.8 | `GET /athletes` (+ stats) | ⬜ | Spotlight / quiz |
| 5.9 | `POST /rewards/grant` | ⬜ | Fin tickets manuels |
| 5.10 | `POST /webhooks/subscribe` | ⬜ | Events live |

### Intégration bot / Hub

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 5.11 | OAuth / link Discord ↔ Peaxel (prod) | ⬜ | Remplace `/link` manuel |
| 5.12 | Check-in lineup vérifié API | ⬜ | |
| 5.13 | Opening — athlètes trending live | ⬜ | |
| 5.14 | Quiz — indices stats réelles | ⬜ | |
| 5.15 | Recap post-GW perso Discord | ⬜ | « X pts · rank #Y » |
| 5.16 | Sync athlètes API | ⬜ | Remplace CSV / `athletes.json` |
| 5.17 | Grant rewards auto (vault → jeu) | ⬜ | |
| 5.18 | Webhooks GW / results / cards | ⬜ | |

### Interim (sans API)

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 5.19 | Deep links UTM systématiques | ⬜ | Chevauche 2.4 |
| 5.20 | Vérif lineup screenshot + mod | ⬜ | Fallback check-in |
| 5.21 | Sync athlètes CSV périodique | 🔄 | `sync_peaxel.js` (deps à revalider) |

---

## Phase 6 — Scale & polish (continu)

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 6.1 | Tests auto scheduler / XP / défis / vault | ⬜ | Smoke partiel ✅ |
| 6.2 | Monitoring (Sentry ou équivalent) | ⬜ | |
| 6.3 | i18n Discord 100 % (scheduler inclus) | ⬜ | |
| 6.4 | CI — tests avant deploy FTP | ⬜ | Deploy FTP existe |
| 6.5 | A/B tests messages opening | ⬜ | |
| 6.6 | Doc technique architecture | ⬜ | |
| 6.7 | Hardening scale JSON → DB sous charge | ⬜ | Lié 4.2–4.3 |

---

## Epics — backlog priorisé

| Epic | Description | Effort | Statut |
|------|-------------|--------|--------|
| E0 | Stabilisation P0/P1 + config | S | ✅ |
| E1 | **Hub Pass** — XP, daily, rank, défis, podium, footers | L | ✅ |
| E2 | **Web Hub v1** — OAuth, `/app`, LB, vault claim, admin Express | L | ✅ |
| E3 | Launch Ready — FAQ/welcome/UTM/Zealy/claims SLA | M | 🔄 |
| E4 | GW Check-in + streaks | M | ⬜ |
| E5 | `/link` Discord ↔ Peaxel (JSON puis API) | M | ⬜ |
| E6 | Engagement++ — drops, lineups, duels, rôles | L | ⬜ |
| E7 | Zealy API sync | M | ⬜ |
| E8 | Web/admin v2 + migration DB | XL | ⬜ |
| E9 | API Peaxel — OAuth, grants, recaps | XL | ⬜ |
| E10 | Scale — Sentry, CI tests, i18n full | M | ⬜ |

---

## KPIs produit (Hub + bot)

| KPI | Baseline | Cible | Mesure |
|-----|----------|-------|--------|
| Claims `/daily` / jour actifs | — | ≥ 40 % membres actifs | `hub_profiles` |
| Complétion quête hebdo | — | ≥ 25 % participants | défis |
| Participants quiz / lancement | — | +60 % | bot |
| Taux check-in GW (quand dispo) | N/A | ≥ 30 % verified | Phase 2 |
| Comptes Discord↔Peaxel liés | 0 | ≥ 50 % actifs Hub | `/link` |
| Temps moyen claim vault | — | < 48 h → < 24 h | staff |
| Claims auto (vs manuels) | 0 % | 90 % | API Phase 5 |
| Temps admin / semaine | — | −50 % | ops |

Alignement growth : **MAW** (lineups jeu) + **DAC** (`/daily`) — voir `GROWTH_STRATEGY.md`.

---

## Journal de progression

| Date | Tâche(s) | Action |
|------|----------|--------|
| 2026-08-28 | — | Création roadmap v2 |
| 2026-08-28 | 0.x | Phase 0 complète |
| 2026-09-15 | 1.1–1.30 | Hub Pass + Web Hub v1 livrés (sprints 1–3) |
| 2026-09-15 | — | **Roadmap v3** — phases réordonnées selon code réel ; Phase 1 marquée ✅ |

---

## Notes & décisions

| Date | Décision | Détail |
|------|----------|--------|
| 2026-08-28 | Config | `.env` > `config.json` |
| 2026-08-28 | Chat rewards | Cartes athlète (plus XP Zealy manuel) |
| 2026-08-28 | API Peaxel | Bloquant grants auto / check-in vérifié |
| 2026-09-15 | Hub Pass = Season Pass | L’ancien item « Season Pass Discord » est livré sous forme Hub Pass |
| 2026-09-15 | Stack web actuelle | Express + OAuth Discord + JSON FileStore — Next/Supabase reportés Phase 4 |
| 2026-09-15 | Priorité post-beta | Phase 2 (Launch + check-in + `/link`) avant Engagement++ |
| 2026-09-15 | Vault | Claim V1 manuel OK pour beta ; SLA staff obligatoire avant push com |
| 2026-09-15 | Sync slash commands | Uniquement `npm run register-commands` (jamais au boot) |

---

## Mapping ancienne roadmap v2 → v3

| Ancien | Nouveau |
|--------|---------|
| Phase 0 | Phase 0 ✅ (inchangé) |
| Phase 1 fondations (DB, `/link`…) | Éclaté : Hub livré en **Phase 1 v3** ; `/link`/DB → Phases 2 & 4 |
| Phase 2 Engagement++ | Phase 3 (Hub Pass retiré du backlog car livré) |
| Phase 3 Web complète | Phase 4 (OAuth/`/app` déjà en Phase 1) |
| Phase 4 API Peaxel | Phase 5 |
| Phase 5 Scale | Phase 6 (i18n partiel déjà ✅) |

---

*Mettre à jour ce fichier à chaque sprint. Détail XP : `HUB_XP_LEADERBOARD.md`. Priorités com : `GROWTH_STRATEGY.md`.*
