import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';

// Configuration
const CSV_FILE = './List_active_talents - Data.csv';
const DATA_DIR = './data';
const JSON_OUTPUT = path.join(DATA_DIR, 'athletes.json');

// Les colonnes à extraire du CSV
const targetColumns = [
    'name', 'description', 'occupation', 'main_category',
    'instagram_talent', 'youtube_talent', 'goal', 'facebook', 'tiktok',
    'x_twitter', 'linkedin', 'talent_card_image_url', 'talent_profile_image_url',
    'club', 'city', 'prize1', 'prize2', 'prize3', 'prize4', 'prize5',
    'main_nationality', 'birthdate', 'card_video', 'manager_name'
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
        bom: true
    });

    const athletes = records.map(row => {
        let entry = {};
        
        // 1. On définit le "name" (clé obligatoire)
        const athleteName = row['name'] || "";
        entry["name"] = athleteName;

        // 2. Ajout des liens Peaxel demandés (immédiatement après le nom)
        if (athleteName) {
            entry['peaxelLink'] = `https://game.peaxel.me/?talent=${athleteName}`;
        }

        // 3. On boucle sur les autres colonnes
        targetColumns.forEach(col => {
            if (col === 'nickname 100') return; // Déjà géré

            let value = row[col] ? row[col].trim() : "";
            
            if (value !== "" && value !== "0") {
                // Transformation des liens sociaux
                if (col === 'instagram_talent') value = `https://www.instagram.com/${value.replace(/^@/, '')}`;
                else if (col === 'tiktok') value = `https://www.tiktok.com/@${value.replace(/^@/, '')}`;
                else if (col === 'x_twitter') value = `https://x.com/${value.replace(/^@/, '')}`;
                else if (col === 'facebook' && !value.includes('facebook.com')) value = `https://www.facebook.com/${value}`;
                else if (col === 'youtube_talent' && !value.includes('youtube.com')) value = `https://www.youtube.com/@${value.replace(/^@/, '')}`;

                entry[col] = value;
            }
        });

        entry.posted = false; 
        return entry;
    });

    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(JSON_OUTPUT, JSON.stringify(athletes, null, 2), 'utf-8');

    console.log(`\n🚀 SPRINT RÉUSSI !`);
    console.log(`✅ ${athletes.length} athlètes synchronisés.`);
    console.log(`🔗 Liens "peaxelLink" et "gameLink" générés avec succès.`);

} catch (err) {
    console.error("❌ Erreur :", err.message);
}