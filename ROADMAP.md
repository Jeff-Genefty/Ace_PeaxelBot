# Roadmap v2 — Bot Peaxel Community Hub

> **Objectif :** passer d'un bot d'annonces à une plateforme communautaire connectée à [Peaxel](https://peaxel.me) et [game.peaxel.me](https://game.peaxel.me).
>
> **Légende des statuts :** `⬜ À faire` · `🔄 En cours` · `✅ Terminé` · `⏸️ En pause` · `❌ Annulé`

**Dernière mise à jour :** 2026-08-28 (Phase 0 terminée ✅)

---

## Vue d'ensemble des phases

| Phase | Nom | Statut global | Cible |
|-------|-----|---------------|-------|
| 0 | Stabilisation & cleanup | ✅ Terminé | |
| 1 | Fondations | ⬜ À faire | 4–6 semaines |
| 2 | Engagement Discord++ | ⬜ À faire | 6–8 semaines |
| 3 | Interface web complète | ⬜ À faire | 8–12 semaines |
| 4 | Intégration app Peaxel | ⬜ À faire | Dépend API |
| 5 | Scale & polish | ⬜ À faire | Continu |

---

## Phase 0 — Stabilisation & cleanup (2–3 semaines)

### Bugs critiques (P0)

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 0.1 | Aligner horaire closing scheduler (18:59) et countdown embed (23:59) | ✅ Terminé | Annonce 18:59, deadline 23:59, message « 5h restantes » |
| 0.2 | Assigner et utiliser `lastSentCloseWeek` (anti-doublon closing) | ✅ Terminé | |
| 0.3 | Persister état scheduler sur disque (`lastSentOpenWeek`, `lastSentCloseWeek`) | ✅ Terminé | `data/scheduler_state.json` |
| 0.4 | Persister état rewards sur disque (`messageCounter`, `nextThreshold`) | ✅ Terminé | `data/reward_state.json` |
| 0.5 | Ajouter verrou écriture JSON (file lock) contre race conditions | ✅ Terminé | `src/utils/jsonStore.js` — écriture atomique |

### Bugs importants (P1)

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 0.6 | Incrémenter `totalBans` lors des bans dashboard | ✅ Terminé | |
| 0.7 | Ne plus enregistrer les slash commands à chaque boot (utiliser `register-commands.js` ou flag) | ✅ Terminé | Chargement local au boot, sync via `npm run register-commands` |
| 0.8 | Corriger commentaire Coach Ace (25 % vs 10 % réel) | ✅ Terminé | Commentaire aligné sur 10 % |
| 0.9 | Centraliser handlers `GuildMemberAdd` (index + welcomeListener) | ✅ Terminé | `memberJoinHandler.js` |

### Nettoyage code & dépendances

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 0.10 | Supprimer dépendances mortes : `axios`, `cheerio`, `csv-parse` | ✅ Terminé | |
| 0.11 | Supprimer `src/utils/analyticsManager.js` (jamais importé) | ✅ Terminé | |
| 0.12 | Supprimer exports morts dans `discordLogger.js` (`logFeedbackReceived`, `logCommandUsage`, `logError`) | ✅ Terminé | |
| 0.13 | Supprimer `recordError()` non utilisé dans `activityTracker.js` | ✅ Terminé | |
| 0.14 | Nettoyer `.gitignore` (`sync_peaxel.js`, `List_active_talents - Data.csv` absents) | ✅ Terminé | |
| 0.15 | Choisir une seule stratégie enregistrement commandes (auto boot vs script CLI) | ✅ Terminé | Script CLI uniquement |

### Configuration & documentation

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 0.16 | Centraliser toute la config (salons, rôles, IDs) — supprimer hardcoding | ✅ Terminé | `configManager.js` + `config.json` |
| 0.17 | Unifier sources config : `.env` + `config.json` + fallbacks en dur | ✅ Terminé | Priorité `.env` > `config.json` |
| 0.18 | Faire lire `SPOTLIGHT_CHANNEL_ID` et `LOG_CHANNEL_ID` depuis `.env` | ✅ Terminé | Tous les salons via env |
| 0.19 | Documenter `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PORT` dans `.env.example` | ✅ Terminé | `.env.example` complet |
| 0.20 | Exiger `SESSION_SECRET` fort en production (pas de défaut faible) | ✅ Terminé | `process.exit(1)` si absent en prod |
| 0.21 | Mettre à jour `README.md` (commandes réelles, setup, déploiement) | ✅ Terminé | + `/health`, config |
| 0.22 | Ajouter endpoint `/health` pour monitoring | ✅ Terminé | `GET /health` |

### Refactoring rapide

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 0.23 | Extraire logique Scout Quiz en module partagé (`scheduler.js` + `scoutQuiz.js`) | ✅ Terminé | `scoutQuizRunner.js` |
| 0.24 | Fusionner pages analytics dupliquées (`/dashboard/analytics` + `/analytics`) | ✅ Terminé | `/analytics` unifié, redirect legacy |
| 0.25 | Ajouter protection CSRF sur formulaires POST dashboard | ✅ Terminé | `src/utils/csrf.js` |
| 0.26 | Ajouter rate limit login dashboard | ✅ Terminé | 5 tentatives / 15 min par IP |

---

## Phase 1 — Fondations (4–6 semaines)

### Architecture & données

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 1.1 | Choisir stack DB v2 (Supabase/PostgreSQL recommandé) | ⬜ À faire | |
| 1.2 | Définir schéma DB (users, rewards, feedbacks, analytics, links…) | ⬜ À faire | |
| 1.3 | Migration progressive JSON → DB (script import) | ⬜ À faire | |
| 1.4 | Restructurer code : `bot/`, `api/`, `services/`, `db/` | ⬜ À faire | |

### Commandes & liaison comptes

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 1.5 | Commande `/link` — préparation liaison Discord ↔ Peaxel | ⬜ À faire | |
| 1.6 | Stockage mapping `discordId` ↔ `peaxelUserId` | ⬜ À faire | |
| 1.7 | Commande `/ping` (documentée README mais absente) | ⬜ À faire | |
| 1.8 | Commandes manuelles opening/closing unifiées (remplace README obsolète) | ⬜ À faire | |

### Feedback v2

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 1.9 | Feedback par saison/GW au lieu de 1 seule fois à vie | ⬜ À faire | |
| 1.10 | NPS tracké dans dashboard | ⬜ À faire | |

### Mécaniques engagement (Phase 1)

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 1.11 | **GW Check-in** — bouton « J'ai soumis ma lineup » dans annonce opening | ⬜ À faire | |
| 1.12 | Streak GW check-in (4 GW consécutives = récompense) | ⬜ À faire | |
| 1.13 | **Prediction Challenge Discord** — thread hebdo (aligné X) | ⬜ À faire | |
| 1.14 | Scout Quiz v2 — module partagé + indices progressifs | 🔄 En cours | Module partagé ✅, indices à faire |
| 1.15 | Scout Quiz — leaderboard saisonnier | ⬜ À faire | |

### Dashboard améliorations

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 1.16 | Échapper contenu utilisateur dans logs live (anti XSS) | ⬜ À faire | |
| 1.17 | Traçabilité modération (historique bans avec raison) | ⬜ À faire | |

---

## Phase 2 — Engagement Discord++ (6–8 semaines)

### Mécaniques existantes enrichies

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 2.1 | Scout Quiz — niveaux de difficulté (3 indices progressifs) | ⬜ À faire | |
| 2.2 | Scout Quiz — timer visible dans l'embed | ⬜ À faire | |
| 2.3 | Spotlight — vote communautaire « Athlète de la semaine » | ⬜ À faire | |
| 2.4 | Spotlight — lien direct fiche Peaxel | ⬜ À faire | |
| 2.5 | Giveaway — conditions éligibilité (rôle verified, GW soumise) | ⬜ À faire | |
| 2.6 | Giveaway — multi-gagnants / tirage pondéré | ⬜ À faire | |
| 2.7 | Coach Ace — messages contextuels selon jour (opening/closing/quiz) | ⬜ À faire | |
| 2.8 | Récompenses chat — barre progression / streak visible | ⬜ À faire | |

### Nouvelles mécaniques

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 2.9 | **Lineup Show & Tell** — salon `#lineups`, compteur partages | ⬜ À faire | |
| 2.10 | **Card Drop Events** — rareté visible, animation embed, lien game.peaxel.me | ⬜ À faire | |
| 2.11 | **Flash Drop** — annonce 15 min avant, pic d'activité | ⬜ À faire | |
| 2.12 | **Duel Manager** — 1v1 score GW, inscription bouton | ⬜ À faire | |
| 2.13 | **Season Pass Discord** — quêtes hebdo (quiz + feedback + lineup + activité) | ⬜ À faire | |
| 2.14 | Progression Season Pass visible sur profil web | ⬜ À faire | |
| 2.15 | Récompenses fin de saison (rôle exclusif, carte rare, early GW) | ⬜ À faire | |

### Rôles dynamiques

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 2.16 | Rôle `@Scout Pro` — top 10 quiz saison | ⬜ À faire | |
| 2.17 | Rôle `@GW Warrior` — 8 GW consécutives soumises | ⬜ À faire | |
| 2.18 | Rôle `@Community MVP` — top contributeurs qualitatifs | ⬜ À faire | |

### Intégration Zealy

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 2.19 | Intégration Zealy API (remplacer XP manuel + ping admin) | ⬜ À faire | |
| 2.20 | Quête : Scout Quiz gagné | ⬜ À faire | |
| 2.21 | Quête : Lineup soumise (check-in) | ⬜ À faire | |
| 2.22 | Quête : 7 jours actif Discord | ⬜ À faire | |
| 2.23 | Quête : Feedback saison soumis | ⬜ À faire | |
| 2.24 | Quête : Giveaway gagné | ⬜ À faire | |

### Leaderboards

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 2.25 | Leaderboard quiz (Discord + web) | ⬜ À faire | |
| 2.26 | Leaderboard streaks GW | ⬜ À faire | |
| 2.27 | Leaderboard predictions | ⬜ À faire | |
| 2.28 | Leaderboard activité communautaire | ⬜ À faire | |

---

## Phase 3 — Interface web complète (8–12 semaines)

### Stack & infrastructure

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 3.1 | Choisir et initialiser frontend (Next.js + Supabase recommandé) | ⬜ À faire | |
| 3.2 | Auth Discord OAuth2 pour joueurs | ⬜ À faire | |
| 3.3 | Auth email/password admin (migration depuis Express session) | ⬜ À faire | |
| 3.4 | API REST backend (remplace HTML inline Express) | ⬜ À faire | |

### Espace Admin

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 3.5 | Calendrier événements — CRUD quiz, spotlight, giveaways, drops | ⬜ À faire | |
| 3.6 | Modération — timeout/kick/ban + historique + raison | ⬜ À faire | |
| 3.7 | Broadcast — messages programmés, templates | ⬜ À faire | |
| 3.8 | Analytics avancés — funnel GW (opening → lineup → closing) | ⬜ À faire | |
| 3.9 | Analytics — rétention, heatmap horaire | ⬜ À faire | |
| 3.10 | Gestion récompenses — file claims, validation manuelle/auto | ⬜ À faire | |
| 3.11 | Config no-code — salons, rôles, messages, réactions | ⬜ À faire | |
| 3.12 | CRUD athlètes — sync pool spotlight | ⬜ À faire | |
| 3.13 | Export CSV feedbacks (migration depuis Discord command) | ⬜ À faire | |

### Espace Utilisateur (nouveau)

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 3.14 | Page profil — lien Discord ↔ Peaxel, badges, streaks | ⬜ À faire | |
| 3.15 | Page stats — quiz gagnés, drops, participations GW | ⬜ À faire | |
| 3.16 | Page leaderboards — quiz, activité, predictions | ⬜ À faire | |
| 3.17 | Page récompenses — historique + statut claim | ⬜ À faire | |
| 3.18 | Page lineup preview (si API Peaxel dispo) | ⬜ À faire | |
| 3.19 | Préférences notifications (opening, quiz, drop) | ⬜ À faire | |
| 3.20 | Calendrier communautaire public | ⬜ À faire | |

---

## Phase 4 — Intégration app Peaxel (dépend API)

### Spec & négociation

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 4.1 | Rédiger spec API bot ↔ game.peaxel.me | ⬜ À faire | |
| 4.2 | Valider spec avec équipe Peaxel | ⬜ À faire | |
| 4.3 | Configurer `PEAXEL_API_BASE_URL` + `PEAXEL_BOT_API_KEY` | ⬜ À faire | |

### Endpoints API à implémenter (côté Peaxel)

| # | Endpoint | Statut | Usage |
|---|----------|--------|-------|
| 4.4 | `GET /gameweek/current` | ⬜ À faire | Numéro GW, deadline, statut |
| 4.5 | `GET /users/{peaxelId}/lineup` | ⬜ À faire | Lineup GW joueur |
| 4.6 | `GET /users/{peaxelId}/cards` | ⬜ À faire | Collection cartes |
| 4.7 | `GET /leaderboard/gw/{n}` | ⬜ À faire | Top managers GW |
| 4.8 | `GET /athletes` | ⬜ À faire | Sync pool spotlight |
| 4.9 | `GET /athletes/{id}/stats` | ⬜ À faire | Stats live quiz/predictions |
| 4.10 | `POST /rewards/grant` | ⬜ À faire | Attribuer carte/XP auto |
| 4.11 | `POST /webhooks/subscribe` | ⬜ À faire | Events GW, results, cards |

### Intégration bot (une fois API dispo)

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 4.12 | OAuth link compte Discord ↔ Peaxel | ⬜ À faire | |
| 4.13 | Check-in lineup auto (vérification API, plus honor system) | ⬜ À faire | |
| 4.14 | Opening GW — embed top athlètes trending (data live) | ⬜ À faire | |
| 4.15 | Scout Quiz — indices basés sur vraies stats Peaxel | ⬜ À faire | |
| 4.16 | Post-GW recap Discord — « Ta GW : X pts, rank #Y » | ⬜ À faire | |
| 4.17 | Sync athlètes API (remplace `athletes.json` manuel) | ⬜ À faire | |
| 4.18 | Grant rewards auto via API (fin tickets manuels) | ⬜ À faire | |
| 4.19 | Webhooks — GW opened, results published, card earned | ⬜ À faire | |

### Alternatives sans API (interim)

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 4.20 | Deep links game.peaxel.me avec UTM `?ref=discord` | ⬜ À faire | |
| 4.21 | Vérification lineup par screenshot + modération manuelle | ⬜ À faire | |
| 4.22 | Sync athlètes via export CSV périodique Peaxel | ⬜ À faire | |

---

## Phase 5 — Scale & polish (continu)

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 5.1 | Tests automatisés — scheduler, rewards, feedback | ⬜ À faire | |
| 5.2 | Monitoring — Sentry ou équivalent | ⬜ À faire | |
| 5.3 | i18n FR/EN | ⬜ À faire | |
| 5.4 | Web mobile-friendly | ⬜ À faire | |
| 5.5 | A/B tests messages opening | ⬜ À faire | |
| 5.6 | CI/CD — tests avant deploy FTP | ⬜ À faire | |
| 5.7 | Documentation technique (architecture, API interne) | ⬜ À faire | |

---

## Epics — Backlog priorisé

| Epic | Description | Effort | Statut |
|------|-------------|--------|--------|
| E1 | Stabilisation — bugs P0/P1, cleanup | S | ✅ Terminé |
| E2 | Config centralisée — un seul source of truth | S | ✅ Terminé |
| E3 | Scout Quiz v2 — module partagé, leaderboard, indices | M | 🔄 En cours |
| E4 | GW Check-in — bouton, streak, rôle | M | ⬜ À faire |
| E5 | Feedback v2 — par saison, NPS | S | ⬜ À faire |
| E6 | Migration DB — JSON → Supabase | L | ⬜ À faire |
| E7 | Web admin v2 — Next.js, calendrier, config UI | L | ⬜ À faire |
| E8 | Web joueur — profil, stats, rewards | L | ⬜ À faire |
| E9 | Peaxel API — spec, OAuth, rewards auto | XL | ⬜ À faire |
| E10 | Zealy auto — quêtes synchronisées | M | ⬜ À faire |

---

## KPIs de succès v2

| KPI | Baseline v1 | Cible v2 | Statut mesure |
|-----|-------------|----------|---------------|
| Messages/jour `#general` | — | +40 % | ⬜ Non mesuré |
| Taux check-in GW | N/A | 30 % verified | ⬜ Non mesuré |
| Comptes Discord↔Peaxel liés | 0 | 50 % actifs | ⬜ Non mesuré |
| Participants quiz / lancement | — | +60 % | ⬜ Non mesuré |
| Claims auto (vs tickets manuels) | 0 % | 90 % | ⬜ Non mesuré |
| Temps admin / semaine | — | -50 % | ⬜ Non mesuré |

---

## Journal de progression

> Mettre à jour cette section à chaque tâche terminée.

| Date | Tâche(s) | Action |
|------|----------|--------|
| 2026-08-28 | — | Création roadmap v2 |
| 2026-08-28 | 0.9, 0.20, 0.25, 0.26 | Handler membre centralisé, SESSION_SECRET obligatoire en prod, CSRF + rate limit login — Phase 0 complète |

---

## Notes & décisions

| Date | Décision | Détail |
|------|----------|--------|
| 2026-08-28 | Stack web recommandée | Next.js + Supabase |
| 2026-08-28 | Rewards chat | XP Zealy manuel supprimé — cartes athlète uniquement |
| 2026-08-28 | Config | Priorité `.env` > `src/config/config.json`, helpers `getChannel()` / `getRole()` |
| 2026-08-28 | API Peaxel | Bloquant Phase 4 — spec à valider avec équipe game |
