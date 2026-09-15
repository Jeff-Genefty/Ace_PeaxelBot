# 🎮 Peaxel Discord Bot

The official Discord assistant for the **Peaxel** project.  
Bot Discord + **Community Hub** web : cycle Gameweek, Hub Pass (XP / défis / coffre), OAuth Discord, console staff.

> Built with care by **Genefty**, specialists in community automation & engagement.

---

## ✨ Core Features

### 📅 Weekly Cycle Automation
- **Mondays (00:00 – Paris)**: Lineup opening with dynamic countdowns.
- **Mondays (00:05)**: Weekly challenge generation.
- **Tuesdays (19:00 – Paris)**: **Scout Quiz** — Automated "Guess the Athlete" game.
- **Wednesdays (16:00 – Paris)**: **Athlete Spotlight** — Featured talent showcase from the ecosystem.
- **Thursdays (18:59 – Paris)**: Closing reminder — 5 hours before the **23:59** lineup deadline.
- **Weekends (Sat 10:00 – Sun 20:00)**: **Automated Giveaway** — Saturday launch and Sunday draw.
- **Sundays (20:05)**: Weekly XP **#1 podium** (+150 XP + Athlete Card).
- **Daily (09:00 – Paris)**: **Daily Connect** reminder — claim Hub XP with `/daily`.

### 🤖 Smart Interactions
- **Help Center (`/help`)**: Interactive FAQ (FR/EN selon locale Discord).
- **How to Play (`/how-to-play`)**: Game guide embed (FR/EN).
- **Hub Pass**: `/daily`, `/rank` — XP, streaks, classement GW.
- **Interactive Buttons**: Quick access to **Play Now**, **Leaderboard**, and **Join Giveaway**.
- **Feedback System**: Integrated modal forms to collect player ratings and suggestions.
- **Chat Rewards**: Active managers in `#general` can win **Free Athlete Cards** from Coach Ace.

### 🌐 Community Hub (web)
- Landing publique + FAQ bilingue
- **`/app`** — espace manager (défis, coffre, leaderboard, rappel GW) via **OAuth Discord** (membres guild Peaxel uniquement)
- Console staff (chemin secret `ADMIN_PANEL_PATH`) — analytics, modération, broadcast whitelist, vault, leaderboard XP

---

## 🚀 Command List

| Command | Description | Permission |
| :--- | :--- | :--- |
| `/daily` | Claim XP Hub du jour + streak (message serveur requis) | Everyone |
| `/rank` `[user]` | Niveau, XP / rang GW, streak, cartes pending | Everyone |
| `/help` | Centre d’aide Hub Pass + liens docs / Ace | Everyone |
| `/how-to-play` | Guide embed expliquant comment jouer à Peaxel | Everyone |
| `/feedback` | Open the feedback modal form | Everyone |
| `/status` | Real-time health, Gameweek stats & unposted athletes | Admin |
| `/setup` | Configure Announcement and Log channels | Admin |
| `/send-weekly-now` | Manually trigger opening or closing announcement | Admin |
| `/set-weekly-message` | Edit opening/closing message content and buttons | Admin |
| `/reactions` | Manage auto-reactions on weekly announcements | Admin |
| `/scout-quiz` | Manually trigger a "Guess the Athlete" quiz | Admin |
| `/spotlight-test` | Preview an athlete showcase (without consuming queue) | Admin |
| `/giveaway-start` | Manually launch a giveaway event | Admin |
| `/giveaway-end` | Manually draw giveaway winners | Admin |
| `/admin-export` | Export feedbacks as CSV via Discord | Admin |

> **Slash commands :** sync **uniquement** via CLI (plus de sync au boot) :
> ```bash
> npm run register-commands
> ```

---

## 🛠️ Technical Setup

### Prerequisites
- Node.js 18+
- Discord Bot Token & Client ID
- Discord Guild ID (recommandé) + OAuth Client Secret pour le Hub web
- Data directory `./data/` (créé au démarrage ; sessions FileStore dans `data/sessions`)

### Installation
1. Clone the repository.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and configure your variables.
4. Register slash commands: `npm run register-commands`
5. Launch with `npm start`.

### Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DISCORD_TOKEN` | Yes | Bot token |
| `DISCORD_CLIENT_ID` | Yes | Application client ID |
| `DISCORD_CLIENT_SECRET` | Hub web | OAuth Discord pour `/app` |
| `DISCORD_GUILD_ID` | Recommended | Guild ID (commands + check membre OAuth) |
| `WEB_BASE_URL` | Hub web | URL publique du Hub |
| `ANNOUNCE_CHANNEL_ID` | Yes* | Announce channel |
| `WELCOME_CHANNEL_ID` | Optional | General chat (rewards, quiz) |
| `TICKET_CHANNEL_ID` | Optional | Reward claim tickets |
| `VERIFIED_ROLE_ID` | Optional | Role pinged in weekly posts |
| `SESSION_SECRET` | **Prod (required)** | Session secret — bot refuse de démarrer sans en production |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Optional | Compte admin console initial |
| `ADMIN_PANEL_PATH` | Optional | Chemin secret console staff (défaut `staff-console`) |
| `ACTIVITY_TRACK_ROLE_ID` | Optional | Role tracked for daily activity KPIs |
| `STAFF_EXCLUDED_ROLE_IDS` | Optional | Comma-separated role IDs excluded from chat rewards |

\* Channels/roles : définir via `.env` (recommandé). `src/config/config.json` = placeholders `null` dans le repo.

### Monitoring

- `GET /health` — JSON status (Discord connection, ping, uptime). Returns `503` if bot is not ready.

### Deployment
Deployed via GitHub Actions to FTP. Secrets : `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`.  
Ensure `./data/` (incl. sessions) and `./assets/` persist between restarts.

Après changement de slash commands : `npm run register-commands` une fois (pas au restart).

---

## 📋 Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full v2 plan and progress tracking.  
Hub XP details : [HUB_XP_LEADERBOARD.md](./HUB_XP_LEADERBOARD.md).
