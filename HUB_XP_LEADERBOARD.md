# Peaxel Hub — XP, niveaux & leaderboard

> **Statut :** Sprint 1–3 — Hub Pass + engagement (streaks, `/rank`, podium hebdo)  
> **Dernière mise à jour :** 2026-09-11

---

## Livré

| Élément | Statut |
|---------|--------|
| Courbe XP exponentielle + anti-farm 60 s | ✅ |
| `/daily` + message 09:00 | ✅ |
| XP défis + barre `/app` + coffre claim V1 | ✅ |
| Leaderboard hebdo top 10 | ✅ |
| `/rank` (profil XP Discord) | ✅ |
| Streak daily 7 / 14 / 30 → XP + carte | ✅ |
| Podium top 3 lundi → XP + cartes + annonce | ✅ |
| Footers graphiques Peaxel (daily / rank / podium / pass) | ✅ |

---

## Économie XP

| Action | XP |
|--------|-----|
| Message | 15–25 (1 / 60 s) |
| `/daily` | +40 |
| Streak 7j | +100 + carte common |
| Streak 14j | +200 + carte rare |
| Streak 30j | +500 + carte epic |
| Tâche défi | +25 |
| Quête complète | +100 + carte |
| Feedback / quiz join / quiz win / giveaway | +30 / +15 / +50+carte / +10 |
| Podium #1 / #2 / #3 | +150 epic / +100 rare / +50 common |

Courbe niveau : `XP(L→L+1) = 5L² + 50L + 100`

---

## Boucle engagement

```
Quotidien     → /daily + messages (anti-farm)
Hebdo         → défis auto + quiz + giveaway
Compétition   → leaderboard GW + podium lundi
Progression   → niveaux + coffre cartes
Social        → /rank · annonces podium
```

---

## Assets footer Discord

| Fichier | Usage |
|---------|-------|
| `assets/hub-footer-daily.png` | `/daily` + message Daily Connect |
| `assets/hub-footer-rank.png` | `/rank` |
| `assets/hub-footer-podium.png` | Annonce podium hebdo |
| `assets/hub-footer-pass.png` | Hub Pass générique |
| `assets/peaxel-brand-template.png` | Référence brand |

Helper : `src/utils/hubFooter.js` → `applyHubFooter(embed, kind)`

---

## Sprint 4 — prochaines pistes

1. **GW Check-in** — bouton lineup opening (+50 XP)
2. **Lineup Show & Tell**
3. **Prediction Challenge** Discord
4. Rôles dynamiques top XP
5. File admin claims + API Peaxel

---

## Commandes Discord

| Commande | Rôle |
|----------|------|
| `/daily` | Claim XP jour + streak |
| `/rank` `[user]` | Niveau, barre, rang GW, streak |

Après déploiement : `npm run register-commands`
