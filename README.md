# 🎮 Peaxel Discord Bot

The official Discord assistant for the **Peaxel** project.  
This bot automates community engagement through scheduled announcements, athlete spotlights, interactive games, and weekend events.

> Built with care by **Genefty**, specialists in community automation & engagement.

---

## ✨ Core Features

### 📅 Weekly Cycle Automation
- **Mondays (00:00 – Paris)**: Lineup opening with dynamic countdowns.
- **Tuesdays (19:00 – Paris)**: **Scout Quiz** — Automated "Guess the Athlete" game.
- **Wednesdays (16:00 – Paris)**: **Athlete Spotlight** — Featured talent showcase from the ecosystem.
- **Thursdays (18:59 – Paris)**: Closing reminder — 5 hours before the **23:59** lineup deadline.
- **Weekends (Sat 10:00 – Sun 20:00)**: **Automated Giveaway** — Saturday launch and Sunday draw.
- **Hourly**: Coach Ace motivation messages (10% chance per hour).

### 🤖 Smart Interactions
- **Help Center (`/help`)**: Interactive FAQ redirecting to official docs and Ace AI support.
- **How to Play (`/how-to-play`)**: Game guide embed.
- **Interactive Buttons**: Quick access to **Play Now**, **Leaderboard**, and **Join Giveaway**.
- **Feedback System**: Integrated modal forms to collect player ratings and suggestions.
- **Chat Rewards**: Active managers in `#general` can win **Free Athlete Cards** from Coach Ace.

---

## 🚀 Command List

| Command | Description | Permission |
| :--- | :--- | :--- |
| `/help` | Interactive FAQ & redirection to documentation. | Everyone |
| `/how-to-play` | Guide embed explaining how to play Peaxel. | Everyone |
| `/feedback` | Open the feedback modal form. | Everyone |
| `/status` | Real-time health, Gameweek stats & unposted athletes. | Admin |
| `/setup` | Configure Announcement and Log channels. | Admin |
| `/send-weekly-now` | Manually trigger opening or closing announcement. | Admin |
| `/set-weekly-message` | Edit opening/closing message content and buttons. | Admin |
| `/reactions` | Manage auto-reactions on weekly announcements. | Admin |
| `/scout-quiz` | Manually trigger a "Guess the Athlete" quiz. | Admin |
| `/spotlight-test` | Preview an athlete showcase (without consuming queue). | Admin |
| `/giveaway-start` | Manually launch a giveaway event. | Admin |
| `/giveaway-end` | Manually draw giveaway winners. | Admin |
| `/admin-export` | Export feedbacks as CSV via Discord. | Admin |

> **Note:** Slash commands must be registered separately after adding or modifying commands:
> ```bash
> npm run register-commands
> ```

---

## 🛠️ Technical Setup

### Prerequisites
- Node.js 18+
- Discord Bot Token & Client ID
- Discord Guild ID (recommended for instant command updates)
- Data directory `./data/` (created automatically at startup)

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
| `DISCORD_GUILD_ID` | Recommended | Guild ID for command registration |
| `ANNOUNCE_CHANNEL_ID` | Yes* | Fallback announce channel |
| `SESSION_SECRET` | Prod | Dashboard session secret |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Optional | Initial dashboard admin account |
| `ACTIVITY_TRACK_ROLE_ID` | Optional | Role tracked for daily activity KPIs |

\* Or configure via `/setup` and `src/config/config.json`.

### Deployment
Deployed via GitHub Actions to FTP (o2switch). Ensure `./data/` and `./assets/` persist between restarts.

After deploying command changes, run `npm run register-commands` once.

---

## 📋 Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full v2 plan and progress tracking.
