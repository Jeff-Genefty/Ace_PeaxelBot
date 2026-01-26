import express from 'express';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const router = express.Router();
const FEEDBACKS_FILE = resolve('./data/feedbacks.json');

const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

// English comment: Route to trigger CSV download
router.get('/export', isAuthenticated, (req, res) => {
    if (!existsSync(FEEDBACKS_FILE)) return res.status(404).send('Fichier introuvable');
    
    const data = JSON.parse(readFileSync(FEEDBACKS_FILE, 'utf-8'));
    const header = 'Date,Manager,Rating,Liked,Improve,Comments\n';
    const csv = data.map(f => {
        // English comment: Clean data for CSV (remove line breaks and quotes)
        const clean = (txt) => `"${(txt || '').toString().replace(/"/g, '""')}"`;
        return `${f.date},${clean(f.userTag)},${f.rating},${clean(f.liked)},${clean(f.improve)},${clean(f.comments)}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=feedbacks_peaxel.csv');
    res.status(200).send(header + csv);
});

router.get('/', isAuthenticated, (req, res) => {
    let feedbacks = [];
    if (existsSync(FEEDBACKS_FILE)) {
        try { feedbacks = JSON.parse(readFileSync(FEEDBACKS_FILE, 'utf-8')); } catch (e) {}
    }

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Peaxel | Feedback Vault</title>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
            <style>
                :root { --bg: #030305; --card: #0a0a0f; --primary: #a855f7; --neon: #2dd4bf; --text: #f8fafc; }
                body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); padding: 40px; margin: 0; }
                
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                .btn-export { background: var(--neon); color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 0.85em; transition: 0.3s; border: none; cursor: pointer; }
                .btn-export:hover { filter: brightness(1.2); transform: translateY(-2px); }

                .vault-table { width: 100%; border-collapse: collapse; background: var(--card); border-radius: 16px; overflow: hidden; border: 1px solid #1e1e2e; }
                .vault-table th { background: #0f0f18; padding: 20px; text-align: left; color: #64748b; font-size: 0.7em; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #1e1e2e; }
                .vault-table td { padding: 20px; border-bottom: 1px solid #1e1e2e; font-size: 0.85em; vertical-align: top; }
                
                /* English comment: Layout adjustment for 5 columns */
                .col-manager { width: 15%; }
                .col-rating { width: 8%; }
                .col-text { width: 22%; }
                .col-comments { width: 23%; color: #64748b; font-style: italic; }

                .back-link { color: #64748b; text-decoration: none; display: inline-block; margin-bottom: 20px; font-weight: 600; }
                .manager-tag { color: var(--primary); font-weight: 800; display: block; }
                .star-badge { background: rgba(251, 191, 36, 0.1); color: #fbbf24; padding: 4px 8px; border-radius: 6px; font-weight: 800; }
            </style>
        </head>
        <body>
            <a href="/dashboard" class="back-link">← Retour Dashboard</a>
            
            <div class="header">
                <div>
                    <h1 style="margin:0; font-weight: 800;">💬 Feedback Vault</h1>
                    <p style="color: #475569; margin: 5px 0 0 0;">Analyse directe des retours managers</p>
                </div>
                <a href="/feedbacks/export" class="btn-export">📥 EXPORTER EN CSV</a>
            </div>

            <table class="vault-table">
                <thead>
                    <tr>
                        <th class="col-manager">Manager</th>
                        <th class="col-rating">Score</th>
                        <th class="col-text">💚 Points Positifs</th>
                        <th class="col-text">💡 Améliorations</th>
                        <th class="col-comments">💬 Commentaires</th>
                    </tr>
                </thead>
                <tbody>
                    ${feedbacks.length > 0 ? feedbacks.reverse().map(f => `
                        <tr>
                            <td class="col-manager">
                                <span class="manager-tag">${f.userTag}</span>
                                <small style="color:#475569">${new Date(f.date).toLocaleDateString()}</small>
                            </td>
                            <td class="col-rating"><span class="star-badge">${f.rating}/5</span></td>
                            <td class="col-text" style="color:#f8fafc">${f.liked}</td>
                            <td class="col-text" style="color:#94a3b8">${f.improve}</td>
                            <td class="col-comments">${f.comments || '-'}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="5" style="text-align:center; padding:50px;">Aucune donnée.</td></tr>'}
                </tbody>
            </table>
        </body>
        </html>
    `);
});

export default router;