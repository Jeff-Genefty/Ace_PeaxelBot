import {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    Table, TableRow, TableCell, WidthType, ShadingType,
} from 'docx';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const heading = (text, level = HeadingLevel.HEADING_1) =>
    new Paragraph({
        heading: level,
        spacing: { before: 280, after: 120 },
        children: [new TextRun({ text, bold: true })],
    });

const para = (text, opts = {}) =>
    new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text, ...opts })],
    });

const bullet = (text) =>
    new Paragraph({
        spacing: { after: 60 },
        bullet: { level: 0 },
        children: [new TextRun(text)],
    });

const tableHeader = (cells) =>
    new TableRow({
        tableHeader: true,
        children: cells.map((text) =>
            new TableCell({
                shading: { fill: 'E8E0F7', type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
            }),
        ),
    });

const tableRow = (cells) =>
    new TableRow({
        children: cells.map((text) =>
            new TableCell({ children: [new Paragraph(String(text))] }),
        ),
    });

const doc = new Document({
    creator: 'Peaxel Team',
    title: 'Documentation Bot Peaxel v2 — Fonctionnalités et Panel Admin',
    description: 'État des fonctionnalités actives Hub Pass / XP et statistiques admin — présentation mercredi',
    sections: [{
        properties: {},
        children: [
            heading('Documentation Bot Peaxel Community Hub — v2'),
            para('Document de présentation — état des fonctionnalités actives'),
            para('Dernière mise à jour : 11 septembre 2026', { italics: true }),
            para(
                'Ce document décrit l’outil Peaxel Community Hub tel qu’il fonctionne aujourd’hui : bot Discord, espace manager web, Hub Pass (XP / niveaux / défis / classement), et console admin. '
                + 'Il est conçu pour une présentation de la v2 (ce qui est livré et utilisable, vs ce qui reste en roadmap).',
            ),

            heading('0. Résumé exécutif — Ce qui change en v2'),
            para('La v1 automatisait le calendrier Gameweek (opening, quiz, spotlight, closing, giveaway) et le panel admin analytics.'),
            para('La v2 ajoute une couche d’engagement permanente : le Hub Pass.'),
            bullet('Économie XP + niveaux + titres (Rookie → Hall of Fame)'),
            bullet('Daily Connect (/daily) + streaks 7 / 14 / 30 jours'),
            bullet('Défis hebdo auto-validés (3 missions / GW)'),
            bullet('Leaderboard XP de la gameweek + podium #1 dimanche soir'),
            bullet('Coffre de cartes claimable sur /app (remise via ticket Discord)'),
            bullet('Espace /app enrichi : barre XP, défis, classement, coffre, rappel deadline GW'),
            bullet('Identité visuelle Discord unifiée (footers Hub)'),

            heading('1. Présentation générale'),
            para(
                'Le Bot Peaxel est l’assistant officiel de la communauté Discord Peaxel. '
                + 'Il automatise l’engagement autour du fantasy game Peaxel (game.peaxel.me) et alimente un hub web connecté via Discord OAuth2.',
            ),
            bullet('Bot Discord (Node.js, discord.js v14) — cycle GW, Hub Pass, rewards, feedback'),
            bullet('Interface web Peaxel Community Hub — landing + espace manager /app + console staff'),
            bullet('Stockage JSON persistant (./data/) — analytics, hub_profiles, défis, feedbacks, giveaways'),
            bullet('Déploiement GitHub Actions → FTP (o2switch)'),

            heading('2. Cycle hebdomadaire automatisé'),
            para('Toutes les heures sont en fuseau Europe/Paris.'),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    tableHeader(['Événement', 'Planning', 'Description']),
                    tableRow(['Opening Gameweek', 'Lundi 00:00', 'Annonce ouverture GW, ping rôle vérifié, boutons Play / Leaderboard. Anti-doublon lastSentOpenWeek.']),
                    tableRow(['Défis hebdo', 'Lundi 00:05', 'Génération des 3 missions de la nouvelle semaine.']),
                    tableRow(['Podium #1', 'Dimanche 20:05', 'Récompense #1 XP de la GW précédente (+150 XP + carte common) + annonce Discord.']),
                    tableRow(['Daily Connect', 'Tous les jours 09:00', 'Rappel embed /daily dans #general (+ lien Hub).']),
                    tableRow(['Scout Quiz', 'Mardi 19:00', 'Devine l’athlète (2 h). 1er correct = carte. XP join / win.']),
                    tableRow(['Athlete Spotlight', 'Mercredi 16:00', 'Mise en avant athlète + challenge Coach Ace.']),
                    tableRow(['Closing Gameweek', 'Jeudi 18:59', 'Rappel 5 h avant deadline 23:59.']),
                    tableRow(['Rappels deadline GW', 'Jeudi 21:59', 'DM Discord (opt-in Hub) 2 h avant clôture lineups.']),
                    tableRow(['Coach Ace motivation', 'Toutes les heures', '10 % de chance d’un message motivationnel dans #general.']),
                    tableRow(['Giveaway launch', 'Samedi 10:00', 'Reset participants + bouton Join Giveaway.']),
                    tableRow(['Giveaway draw', 'Dimanche 20:00', 'Tirage aléatoire + claim via tickets.']),
                ],
            }),

            heading('3. Hub Pass — XP, niveaux & progression (cœur v2)'),

            heading('3.1 Économie XP', HeadingLevel.HEADING_2),
            para('Courbe de niveau : XP(L → L+1) = 5L² + 50L + 100. Titres : Rookie, Prospect, Scout, Analyst, Strategist, Elite, Captain, Champion, Legend, Hall of Fame.'),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    tableHeader(['Action', 'XP / récompense']),
                    tableRow(['Message Discord', '15–25 XP (max 1 message / 60 s — anti-farm)']),
                    tableRow(['/daily', '+40 XP (1× / jour, timezone Paris)']),
                    tableRow(['Streak 7 jours', '+100 XP + carte common']),
                    tableRow(['Streak 14 jours', '+200 XP + carte common']),
                    tableRow(['Streak 30 jours', '+500 XP + carte common']),
                    tableRow(['Tâche défi validée', '+25 XP']),
                    tableRow(['Quête hebdo complète (3/3)', '+100 XP + carte']),
                    tableRow(['Feedback soumis', '+30 XP']),
                    tableRow(['Participation quiz', '+15 XP']),
                    tableRow(['Victoire quiz', '+50 XP + carte']),
                    tableRow(['Inscription giveaway', '+10 XP']),
                    tableRow(['Podium #1 (dimanche 20:05)', '+150 XP + carte common']),
                    tableRow(['Level-up', 'Pas de carte (progression niveau uniquement)']),
                ],
            }),

            heading('3.2 Commandes Discord Hub', HeadingLevel.HEADING_2),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    tableHeader(['Commande', 'Rôle']),
                    tableRow(['/daily', 'Claim XP du jour + streak. Compte pour la mission « daily » (3 check-ins / GW).']),
                    tableRow(['/rank [user]', 'Niveau, barre XP, XP / rang GW, streak, cartes pending, preview top 3.']),
                ],
            }),

            heading('3.3 Défis hebdomadaires', HeadingLevel.HEADING_2),
            para('Chaque lundi : 3 missions tirées automatiquement dans un pool. Validation 100 % automatique sur Discord — pas de checkbox manuelle.'),
            bullet('messages — ≥ 2 messages'),
            bullet('daily — /daily au moins 3 jours distincts dans la GW'),
            bullet('react — réagir à une annonce'),
            bullet('gw_react — réagir à opening / closing GW'),
            bullet('giveaway — s’inscrire au giveaway'),
            bullet('feedback — laisser un feedback'),
            bullet('quiz — participer au Scout Quiz'),
            bullet('welcome — mentionner / accueillir un nouveau membre'),
            bullet('spotlight — réagir au spotlight'),
            bullet('share — poster une image (carte) dans #general'),
            para('Progression visible sur /app. Quête 3/3 → tampon PEAXEL HUB (GW + pseudo) pour claim ticket.'),

            heading('3.4 Leaderboard & podium', HeadingLevel.HEADING_2),
            bullet('Classement top 10 XP de la gameweek sur /app (reset lundi)'),
            bullet('Dimanche 20:05 : settle podium #1 de la GW précédente + annonce Discord branded'),
            bullet('Anti-doublon podium par utilisateur / semaine'),
            bullet('/rank affiche un aperçu top 3 (lecture seule) — seule la place #1 est récompensée'),

            heading('3.5 Coffre de cartes (claim V1)', HeadingLevel.HEADING_2),
            bullet('Cartes pending : quête, streak, podium #1, quiz win (pas de carte au level-up)'),
            bullet('Bouton « Réclamer » sur /app → alerte mods + ticket Discord pour remise'),
            bullet('Pas encore d’attribution auto via API Peaxel (Phase 4)'),

            heading('4. Fonctionnalités Discord — Joueurs (hors Hub Pass)'),

            heading('4.1 Message de bienvenue', HeadingLevel.HEADING_2),
            para('À chaque arrivée : embed Coach Ace (inscription, cartes gratuites, Zealy, Trustpilot) + boutons. Compté dans « Arrivées jour ».'),

            heading('4.2 Récompenses chat Coach Ace', HeadingLevel.HEADING_2),
            bullet('25 % de chance de réaction emoji sur message #general'),
            bullet('Seuil aléatoire 60–120 messages → 75 % chance d’une Free Athlete Card'),
            bullet('Cooldown 24 h / user ; rôles staff exclus'),
            bullet('Claim via ticket (mécanique historique, parallèle au coffre Hub)'),

            heading('4.3 Feedback', HeadingLevel.HEADING_2),
            bullet('Modal note 1–5 + points positifs / améliorations / commentaires'),
            bullet('1 feedback à vie par utilisateur'),
            bullet('+30 XP Hub + validation défi « feedback » si présent'),
            bullet('Salon stats renommé : Feedback: X | Y ⭐'),

            heading('4.4 Giveaway week-end', HeadingLevel.HEADING_2),
            bullet('Bouton Join — inscription unique ; +10 XP Hub'),
            bullet('Liste visible panel admin ; tirage dimanche 20:00'),

            heading('4.5 Commandes slash (complet)', HeadingLevel.HEADING_2),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    tableHeader(['Commande', 'Accès', 'Description']),
                    tableRow(['/daily', 'Tous', 'Claim XP quotidien + streak']),
                    tableRow(['/rank', 'Tous', 'Profil Hub XP / rang GW']),
                    tableRow(['/help', 'Tous', 'FAQ + liens docs / Ace AI']),
                    tableRow(['/how-to-play', 'Tous', 'Guide jouer Peaxel']),
                    tableRow(['/feedback', 'Tous', 'Formulaire feedback']),
                    tableRow(['/status', 'Admin', 'Santé bot, GW, athlètes spotlight']),
                    tableRow(['/setup', 'Admin', 'Config salons annonces / logs']),
                    tableRow(['/send-weekly-now', 'Admin', 'Trigger opening / closing']),
                    tableRow(['/set-weekly-message', 'Admin', 'Édite messages hebdo']),
                    tableRow(['/reactions', 'Admin', 'Auto-réactions annonces']),
                    tableRow(['/scout-quiz', 'Admin', 'Lance un quiz']),
                    tableRow(['/spotlight-test', 'Admin', 'Preview spotlight']),
                    tableRow(['/giveaway-start', 'Admin', 'Lance giveaway']),
                    tableRow(['/giveaway-end', 'Admin', 'Tirage manuel']),
                    tableRow(['/admin-export', 'Admin', 'Export feedbacks CSV']),
                ],
            }),
            para('Après déploiement de nouvelles commandes : npm run register-commands', { italics: true }),

            heading('5. Interface web — Espace public & manager'),

            heading('5.1 Landing (/)', HeadingLevel.HEADING_2),
            bullet('Community Hub v2 — connexion Discord OAuth2'),
            bullet('Bilingue FR / EN'),
            bullet('Liens jeu + mise en avant Gameweek live'),

            heading('5.2 Espace manager (/app) — livré', HeadingLevel.HEADING_2),
            bullet('Profil Discord + rôles serveur + barre XP Hub (niveau, titre, rang GW, streak)'),
            bullet('Carte Gameweek (phase open / closing / matchday / locked + countdown)'),
            bullet('Giveaway week-end (statut inscription, participants, CTA Discord)'),
            bullet('Activité du jour (managers actifs rôle tracké + messages)'),
            bullet('Prochain événement planifié'),
            bullet('Feedback (statut soumis / CTA salon)'),
            bullet('Défis de la semaine (barre + validation auto + tampon proof)'),
            bullet('Coffre de cartes (claim CSRF → alerte mods)'),
            bullet('Classement GW top 10 XP'),
            bullet('Opt-in rappel deadline GW (DM jeudi 21:59)'),

            heading('6. Console Admin (Peaxel Console)'),
            para('Accès via URL obfusquée (ADMIN_PATH), auth email/password. CSRF, rate limit login (5 / 15 min), SESSION_SECRET obligatoire en prod.'),

            heading('6.1 Overview — Command Center', HeadingLevel.HEADING_2),
            para('KPIs, live logs, graphiques 7j, outils : config salons, modération (timeout / kick / ban), broadcast (+ image), giveaway participants.'),

            heading('6.2 Analytics — Intelligence Center', HeadingLevel.HEADING_2),
            para('KPIs cumulés + graphiques membres / activité rôle / arrivées + tableau historique 7 jours.'),

            heading('6.3 Feedbacks — Feedback Vault', HeadingLevel.HEADING_2),
            bullet('Tableau notes / commentaires + moyenne'),
            bullet('Export CSV'),

            heading('7. Statistiques panel admin — détail'),
            para('Source principale : ./data/analytics.json (+ hub_profiles.json pour XP, live_logs.json pour la console).'),

            heading('7.1 KPIs Overview', HeadingLevel.HEADING_2),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    tableHeader(['KPI', 'Signification', 'Calcul']),
                    tableRow(['Activité rôle', '% du rôle tracké ayant posté ≥1 message aujourd’hui', '(actifs uniques / membres rôle) × 100 — reset minuit']),
                    tableRow(['Arrivées jour', 'Nouveaux membres du jour', 'GuildMemberAdd — reset minuit']),
                    tableRow(['Croissance 7j', 'Évolution effectif serveur', '((J0 − J-7) / J-7) × 100 via history']),
                    tableRow(['Messages', 'Messages non-bot cumulés', 'messagesSent']),
                    tableRow(['Commandes', 'Slash commands exécutées', 'commandsExecuted']),
                    tableRow(['NPS (X)', 'Note moyenne feedbacks (libellé NPS = moyenne /5)', 'Moyenne ratings feedbacks.json']),
                    tableRow(['Bans', 'Bans via panel', 'totalBans']),
                    tableRow(['Posts hebdo', 'Annonces opening/closing envoyées', 'activity.totalPostsSent']),
                ],
            }),

            heading('7.2 Pills de statut', HeadingLevel.HEADING_2),
            bullet('EN LIGNE / CRITIQUE — bot prêt et ping < 250 ms'),
            bullet('X membres — guild.memberCount'),
            bullet('Xms — latence WebSocket Discord'),
            bullet('Prochain: Label, Xh — Opening / Spotlight / Closing'),
            bullet('Sous-titre — Gameweek, jour, uptime bot'),

            heading('7.3 Graphiques & Analytics', HeadingLevel.HEADING_2),
            bullet('Overview : trafic messages 7j (dailyHistory) + croissance membres 7j (history)'),
            bullet('Intelligence Center : évolution membres, activité rôle %, arrivants quotidiens, tableau Date / Membres / Flux / Activité'),

            heading('7.4 Snapshot minuit', HeadingLevel.HEADING_2),
            para('Enregistre totalMembers, arrivals, roleActivity% puis reset compteurs journaliers.'),

            heading('7.5 Live Logs (types actifs)', HeadingLevel.HEADING_2),
            bullet('SYSTEM — démarrage, Daily Connect posté, podium, défis générés, rappels GW'),
            bullet('COMMAND — slash command'),
            bullet('XP — gains XP, level-up, daily, claim carte, podium'),
            bullet('CHALLENGE — tâche validée, quête terminée'),
            bullet('GIVEAWAY / FEEDBACK / MOD / CONFIG / BROADCAST / ERROR'),

            heading('7.6 Feedback Vault & Giveaway', HeadingLevel.HEADING_2),
            bullet('Vault : Total, Moyenne, Manager, Score, Points positifs, Améliorations, Commentaires'),
            bullet('Panneau giveaway : compteur + liste des tags inscrits'),

            heading('8. Monitoring & sécurité'),
            bullet('GET /health — discord ready, ping, uptime (503 si non prêt)'),
            bullet('CSRF formulaires admin + claim /app'),
            bullet('Rate limit login + SESSION_SECRET prod'),
            bullet('Écriture JSON atomique (jsonStore)'),
            bullet('États scheduler / rewards / hub profiles persistés sur disque'),

            heading('9. Configuration clé (.env)'),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    tableHeader(['Variable', 'Rôle']),
                    tableRow(['DISCORD_TOKEN / CLIENT_ID / GUILD_ID', 'Bot + serveur']),
                    tableRow(['Salons (ANNOUNCE, WELCOME, …)', 'Priorité .env > config.json']),
                    tableRow(['VERIFIED_ROLE_ID', 'Ping annonces GW']),
                    tableRow(['ACTIVITY_TRACK_ROLE_ID', 'KPI activité rôle + managers actifs /app']),
                    tableRow(['STAFF_EXCLUDED_ROLE_IDS', 'Exclus rewards Coach Ace']),
                    tableRow(['SESSION_SECRET', 'Sessions web (obligatoire prod)']),
                    tableRow(['ADMIN_EMAIL / PASSWORD / ADMIN_PATH', 'Console staff']),
                    tableRow(['DISCORD_CLIENT_SECRET', 'OAuth2 /app']),
                    tableRow(['FEEDBACK_STATS_CHANNEL_ID', 'Salon renommé stats feedback']),
                    tableRow(['CHALLENGE_LOG_CHANNEL_ID', 'Salon alertes quêtes / claims cartes']),
                    tableRow(['WEB_BASE_URL', 'Liens Hub dans embeds Discord']),
                ],
            }),

            heading('10. Boucle d’engagement (pitch présentation)'),
            para('Quotidien → /daily + messages (anti-farm)'),
            para('Hebdo → défis auto + quiz + giveaway + spotlight'),
            para('Compétition → leaderboard GW + podium #1 dimanche'),
            para('Progression → niveaux + coffre cartes'),
            para('Social → /rank + annonces podium branded'),

            heading('11. Pas encore livré (roadmap — à mentionner en « next »)'),
            bullet('Liaison Discord ↔ compte Peaxel (/link)'),
            bullet('GW Check-in lineup (bouton opening + XP)'),
            bullet('Lineup Show & Tell · Prediction Challenge Discord'),
            bullet('Rôles dynamiques top XP'),
            bullet('Attribution cartes auto via API game.peaxel.me'),
            bullet('File admin claims avancée / config no-code'),

            para(''),
            para('— Fin du document — prêt présentation v2 —', { italics: true, color: '666666' }),
        ],
    }],
});

const outputPath = resolve('./DOCUMENTATION_FONCTIONNALITES_PEAXEL.docx');
const buffer = await Packer.toBuffer(doc);
writeFileSync(outputPath, buffer);
console.log(`Document généré : ${outputPath}`);
