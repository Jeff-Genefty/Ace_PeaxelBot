/**
 * Sync CSV talents → src/config/athletes.json
 * Usage: node sync_peaxel.js
 * Requires: csv-parse (npm i csv-parse) + fichier CSV à la racine.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let parse;
try {
    ({ parse } = require('csv-parse/sync'));
} catch {
    console.error('❌ Dépendance manquante : npm i csv-parse');
    process.exit(1);
}

const CSV_FILE = './List_active_talents - Data.csv';
const JSON_OUTPUT = path.resolve('./src/config/athletes.json');

const targetColumns = [
    'name', 'description', 'occupation', 'main_category',
    'instagram_talent', 'youtube_talent', 'goal', 'facebook', 'tiktok',
    'x_twitter', 'linkedin', 'talent_card_image_url', 'talent_profile_image_url',
    'club', 'city', 'prize1', 'prize2', 'prize3', 'prize4', 'prize5',
    'main_nationality', 'birthdate', 'card_video', 'manager_name',
];

try {
    if (!fs.existsSync(CSV_FILE)) {
        console.error(`❌ Erreur : Le fichier "${CSV_FILE}" est introuvable.`);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(CSV_FILE, 'utf-8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
    });

    const athletes = records.map((row) => {
        const entry = {};
        const athleteName = row.name || '';
        entry.name = athleteName;

        if (athleteName) {
            entry.peaxelLink = `https://game.peaxel.me/?talent=${encodeURIComponent(athleteName)}`;
        }

        for (const col of targetColumns) {
            if (col === 'name') continue;
            let value = row[col] ? String(row[col]).trim() : '';
            if (value === '' || value === '0') continue;

            if (col === 'instagram_talent') value = `https://www.instagram.com/${value.replace(/^@/, '')}`;
            else if (col === 'tiktok') value = `https://www.tiktok.com/@${value.replace(/^@/, '')}`;
            else if (col === 'x_twitter') value = `https://x.com/${value.replace(/^@/, '')}`;
            else if (col === 'facebook' && !value.includes('facebook.com')) value = `https://www.facebook.com/${value}`;
            else if (col === 'youtube_talent' && !value.includes('youtube.com')) {
                value = `https://www.youtube.com/@${value.replace(/^@/, '')}`;
            }

            entry[col] = value;
        }

        entry.posted = false;
        return entry;
    });

    const outDir = path.dirname(JSON_OUTPUT);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(JSON_OUTPUT, JSON.stringify(athletes, null, 2), 'utf-8');

    console.log(`\n🚀 Sync OK`);
    console.log(`✅ ${athletes.length} athlètes → ${JSON_OUTPUT}`);
    console.log(`🔗 peaxelLink généré pour chaque talent.`);
} catch (err) {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
}
