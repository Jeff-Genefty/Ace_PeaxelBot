import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { generateLinkCode } from '../web/services/linkService.js';

export const data = new SlashCommandBuilder()
    .setName('link')
    .setDescription('Generate a code to link your Discord account to Peaxel Hub');

export async function execute(interaction) {
    const { code, expiresInMinutes } = generateLinkCode(interaction.user.id, interaction.user.tag);

    await interaction.reply({
        content: [
            '🔗 **Peaxel Hub — Account linking**',
            '',
            `Your verification code: \`${code}\``,
            `Valid for **${expiresInMinutes} minutes**.`,
            '',
            '1. Sign in at the Peaxel Hub with Discord',
            '2. Open **/link** and enter this code',
            '',
            '_Do not share this code with anyone._',
        ].join('\n'),
        flags: [MessageFlags.Ephemeral],
    });
}
