# Peaxel Hub — XP, niveaux & leaderboard

> **Statut :** Sprint 1–3 — Hub Pass + engagement (streaks, `/rank`, podium #1)  
> **Dernière mise à jour :** 2026-09-15

---

## Livré

| Élément | Statut |
|---------|--------|
| Courbe XP exponentielle + anti-farm 60 s | ✅ |
| `/daily` + message 09:00 | ✅ |
| XP défis + barre `/app` + coffre claim V1 | ✅ |
| Leaderboard hebdo top 10 | ✅ |
| `/rank` (profil XP Discord) | ✅ |
| Streak daily 7 / 14 / 30 → XP + carte common | ✅ |
| Podium **#1 dimanche 20:05** → +150 XP + carte common | ✅ |
| Footers graphiques Peaxel (daily / rank / podium / pass) | ✅ |
| i18n Discord FR/EN sur `/daily`, `/rank`, `/help`, `/how-to-play` | ✅ |

---

## Économie XP

| Action | XP |
|--------|-----|
| Message | 15–25 (1 / 60 s) |
| `/daily` | +40 |
| Streak 7j | +100 + carte **common** |
| Streak 14j | +200 + carte **common** |
| Streak 30j | +500 + carte **common** |
| Tâche défi | +25 |
| Quête complète | +100 + carte |
| Feedback / quiz join / quiz win / giveaway | +30 / +15 / +50+carte / +10 |
| Podium **#1** (dimanche soir) | +150 + carte **common** |

**Pas de carte au level-up.** Les cartes viennent des quêtes, streaks, quiz wins et du #1 hebdo.

Courbe niveau : `XP(L→L+1) = 5L² + 50L + 100`

---

## Boucle engagement

```
Quotidien     → /daily + messages (anti-farm)
Hebdo         → défis auto + quiz + giveaway
Compétition   → leaderboard GW + podium #1 dimanche
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
3. Rôles dynamiques top XP
4. File admin claims + API Peaxel

---

## Commandes Discord

| Commande | Rôle |
|----------|------|
| `/daily` | Claim XP jour + streak |
| `/rank` `[user]` | Niveau, barre, rang GW, streak |
| `/help` | Centre d’aide Hub (FR/EN selon locale Discord) |

Après modification des slash commands : `npm run register-commands` (plus de sync automatique au boot).
