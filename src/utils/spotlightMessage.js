import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { gameUrl, withGameRef, DISCORD_REFS } from './peaxelLinks.js';

/**
 * Builds the weekly Athlete Spotlight payload (content + embed + buttons).
 */
export function buildSpotlightPayload(athlete, generalChannelId) {
  const athleteName = (athlete.name || 'Athlete').toUpperCase();
  const displayName = athlete.name || 'this athlete';
  const athleteUrl = withGameRef(athlete.peaxelLink || gameUrl(DISCORD_REFS.spotlight), DISCORD_REFS.spotlight);
  const playUrl = gameUrl(DISCORD_REFS.spotlight);

  let prizesText = '';
  for (let i = 1; i <= 5; i++) {
    if (athlete[`prize${i}`]) prizesText += `• ${athlete[`prize${i}`]}\n`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🌟 Athlete Spotlight · ${athleteName}`)
    .setURL(athleteUrl)
    .setColor('#a855f7')
    .setThumbnail(athlete.talent_profile_image_url || null)
    .addFields(
      { name: '🌍 Nationality', value: athlete.main_nationality || 'N/A', inline: true },
      { name: '🗂️ Category', value: athlete.main_category || 'N/A', inline: true },
      { name: '🏆 Sport', value: athlete.occupation || 'N/A', inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '📝 Bio', value: athlete.description || 'No description available.' },
    );

  if (athlete.birthdate) {
    embed.addFields({ name: '🎂 Birthdate', value: athlete.birthdate, inline: true });
  }

  const locationValue = `${athlete.city || ''} ${athlete.club || ''}`.trim();
  if (locationValue && locationValue.toUpperCase() !== 'N/A') {
    embed.addFields({ name: '📍 Location & Club', value: locationValue, inline: true });
  }

  if (athlete.goal && athlete.goal.toUpperCase() !== 'N/A') {
    embed.addFields(
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '🎯 Goal', value: athlete.goal },
    );
  }

  if (prizesText) {
    embed.addFields(
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '⭐ Achievements', value: prizesText },
    );
  }

  embed.addFields(
    { name: '\u200B', value: '\u200B', inline: false },
    {
      name: '📣 Your move',
      value:
        `Is **${displayName}** in your GW strategy?\n`
        + `• React below to progress the Hub spotlight mission\n`
        + (generalChannelId
          ? `• Got the card? Drop a screenshot in <#${generalChannelId}>\n`
          : '')
        + `• Check their profile & play on Peaxel`,
    },
  );

  embed
    .setImage(athlete.talent_card_image_url || null)
    .setFooter({
      text: 'Peaxel · Discover real athletes · Collect · Compete',
      iconURL: 'https://media.peaxel.me/logo.png',
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('View athlete')
      .setStyle(ButtonStyle.Link)
      .setURL(athleteUrl),
    new ButtonBuilder()
      .setLabel('Play on Peaxel')
      .setStyle(ButtonStyle.Link)
      .setURL(playUrl),
  );

  const socialMedia = [
    { key: 'instagram_talent', label: 'Instagram' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'x_twitter', label: 'X' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'linkedin', label: 'LinkedIn' },
  ];

  for (const social of socialMedia) {
    const url = athlete[social.key];
    if (url && typeof url === 'string' && url.startsWith('http') && row.components.length < 5) {
      row.addComponents(
        new ButtonBuilder().setLabel(social.label).setStyle(ButtonStyle.Link).setURL(url),
      );
    }
  }

  const content =
    `@everyone\n\n`
    + `**Athlete Spotlight** — meet a real talent from the Peaxel roster.\n`
    + `Learn their story, check if they fit your lineup, and react to stay in the Hub challenges. 👇`;

  return { content, embed, components: [row], athleteName };
}
