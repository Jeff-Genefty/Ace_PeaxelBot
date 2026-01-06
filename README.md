# 🎮 Peaxel Discord Bot

The official Discord assistant for the **Peaxel** project.  
This bot automates community engagement through scheduled announcements, athlete spotlights, interactive games, and weekend events.

> Built with care by **Genefty**, specialists in community automation & engagement.

---

## ✨ Core Features

### 📅 Weekly Cycle Automation
- **Mondays (00:00 – Paris)**: Lineup opening with dynamic countdowns.
- **Tuesdays (19:00 – Paris)**: **Scout Quiz** — Automated "Guess the Athlete" pseudo game.
- **Wednesdays (16:00 – Paris)**: **Athlete Spotlight** — Featured talent showcase from the ecosystem.
- **Thursdays (18:59 – Paris)**: Lineup closing reminders with real-time timestamps.
- **Weekends (Sat 10:00 - Sun 20:00)**: **Automated Giveaway** — Saturday launch and Sunday automated draw.

### 🤖 Smart Interactions
- **Help Center (`/help`)**: Interactive FAQ redirecting to official docs and Ace AI support.
- **Interactive Buttons**: Quick access to **Play Now**, **Leaderboard**, and **Join Giveaway**.
- **Feedback System**: Integrated modal forms to collect player ratings and suggestions.

---

## 🚀 Command List

| Command | Description | Permission |
| :--- | :--- | :--- |
| `/help` | Interactive FAQ & Redirection to documentation. | Everyone |
| `/ping` | Check bot latency and API health. | Everyone |
| `/status` | Real-time health, Gameweek stats & unposted athletes. | Admin |
| `/setup` | Configure Announcement and Log channels. | Admin |
| `/spotlight-test` | Manually trigger an athlete showcase for testing. | Admin |
| `/scout-quiz` | Manually trigger a "Guess the Athlete" quiz. | Admin |
| `/opening-manual` | Force the Monday opening announcement. | Admin |
| `/closing-manual` | Force the Thursday closing announcement. | Admin |
| `/giveaway-start` | Manually launch a giveaway event. | Admin |

---

## 🛠️ Technical Setup

### Prerequisites
- Node.js 18+
- Discord Bot Token & Client ID
- JSON Database files in `/data` (`config.json`, `athletes.json`, `giveaways.json`, `activity.json`)

### Installation
1. Clone the repository.
2. Run `npm install`.
3. Configure your `.env` file with `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`.
4. Launch with `npm start`.

### Deployment
Optimized for **Railway.app** or **Docker**. Ensures data persistence for all JSON storage files.