import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logPrefix = '[Peaxel Register]';

/**
 * Register slash commands globally, and clear guild-scoped duplicates if DISCORD_GUILD_ID is set.
 * @returns {Promise<import('discord.js').ApplicationCommand[]>}
 */
export async function registerCommands() {
  const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

  if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
    throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID');
  }

  const commands = [];
  const commandsPath = join(__dirname, 'commands');
  const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const commandModule = await import(pathToFileURL(join(commandsPath, file)).href);
    const command = commandModule.default || commandModule;

    if (command?.data) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(`${logPrefix} ⚠️  The command at ${file} is missing a required "data" property.`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  // Remove guild-scoped commands first (they stack with global ones → duplicates)
  if (DISCORD_GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
      { body: [] },
    );
    console.log(`${logPrefix} 🧹 Cleared guild commands for ${DISCORD_GUILD_ID}`);
  }

  console.log(`${logPrefix} Synchronizing ${commands.length} global command(s) with Discord...`);

  const data = await rest.put(
    Routes.applicationCommands(DISCORD_CLIENT_ID),
    { body: commands },
  );
  console.log(`${logPrefix} ✅ Success: Registered Globally`);

  data.forEach((cmd) => console.log(`  > [Registered] /${cmd.name}`));
  return data;
}

const isDirectRun =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === resolve(__filename);

if (isDirectRun) {
  registerCommands().catch((error) => {
    console.error(`${logPrefix} ❌ Registration failed:`, error.message);
    process.exit(1);
  });
}
