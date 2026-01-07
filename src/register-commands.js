import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logPrefix = '[Peaxel Register]';

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error(`${logPrefix} ❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env`);
  process.exit(1);
}

async function registerCommands() {
  const commands = [];
  const commandsPath = join(__dirname, 'commands');
  
  try {
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const commandModule = await import(`file://${join(commandsPath, file)}`);
      
      // Handle both default and named exports
      const command = commandModule.default || commandModule;

      if (command && command.data) {
        commands.push(command.data.toJSON());
      } else {
        console.warn(`${logPrefix} ⚠️  The command at ${file} is missing a required "data" property.`);
      }
    }

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    console.log(`${logPrefix} Synchronizing ${commands.length} command(s) with Discord...`);

    let data;
    if (DISCORD_GUILD_ID) {
      // Instant update for your development server
      data = await rest.put(
        Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
        { body: commands }
      );
      console.log(`${logPrefix} ✅ Success: Registered for Guild ${DISCORD_GUILD_ID}`);
    } else {
      // Global update (can take 1h)
      data = await rest.put(
        Routes.applicationCommands(DISCORD_CLIENT_ID),
        { body: commands }
      );
      console.log(`${logPrefix} ✅ Success: Registered Globally`);
    }

    data.forEach(cmd => console.log(`  > [Registered] /${cmd.name}`));
    
  } catch (error) {
    console.error(`${logPrefix} ❌ Registration failed:`, error.message);
  }
}

registerCommands();