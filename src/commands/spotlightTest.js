export async function execute(interaction) {
    const athlete = getPreviewAthlete();
    if (!athlete) return interaction.reply({ content: "❌ No athlete found.", ephemeral: true });

    const generalChannelId = '1369976259613954059';
    const athleteName = (athlete.name || "Athlete").toUpperCase();

    // Preparation of achievements list
    let prizesText = "";
    for (let i = 1; i <= 5; i++) {
        if (athlete[`prize${i}`]) prizesText += `• ${athlete[`prize${i}`]}\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle(`🌟 SPOTLIGHT OF THE WEEK: ${athleteName}`)
        .setURL(athlete.peaxelLink || "https://game.peaxel.me")
        .setColor("#FACC15")
        .setThumbnail(athlete.talent_profile_image_url || null)
        .addFields(
            // Section 1: Stats
            { name: "🌍 Nationality", value: athlete.main_nationality || "N/A", inline: true },
            { name: "🗂️ Category", value: athlete.main_category || "N/A", inline: true },
            { name: "🏆 Sport", value: athlete.occupation || "N/A", inline: true },
            { name: '\u200B', value: '\u200B' }, // Space

            // Section 2: Description
            { name: "📝 Description", value: athlete.description || "No description available." },
            { name: '\u200B', value: '\u200B' }, // Space

            // Section 3: Birthdate & Location
            { name: "🎂 Birthdate", value: athlete.birthdate || "N/A", inline: true },
            { name: "📍 Location & Club", value: `${athlete.city || ''} ${athlete.club || ''}`.trim() || "N/A", inline: true },
            { name: '\u200B', value: '\u200B' }, // Space

            // Section 4: Personal Goal
            { name: "🎯 Personal Goal", value: athlete.goal || "N/A" },
            { name: '\u200B', value: '\u200B' }, // Space

            // Section 5: Achievements
            { name: "⭐ Achievements", value: prizesText || "N/A" },
            { name: '\u200B', value: '\u200B' }, // Space

            // Section 6: Challenge
            { 
                name: "📣 COACH ACE CHALLENGE", 
                value: `Is **${athleteName}** part of your strategy? 🔥\n` +
                       `Drop a screenshot in <#${generalChannelId}> if you have this athlete! 🏟️` 
            }
        )
        .setImage(athlete.talent_card_image_url || null)
        .setFooter({ text: "Peaxel • Athlete Spotlight Series", iconURL: 'https://media.peaxel.me/logo.png' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('View Profile 🃏').setStyle(ButtonStyle.Link).setURL(athlete.peaxelLink || "https://game.peaxel.me"),
        new ButtonBuilder().setLabel('Play on Peaxel 🎮').setStyle(ButtonStyle.Link).setURL("https://game.peaxel.me")
    );

    if (athlete.instagram_talent) {
        row.addComponents(new ButtonBuilder().setLabel('Instagram').setStyle(ButtonStyle.Link).setURL(athlete.instagram_talent));
    }

    const introText = `@everyone\n\nIt's time for our **Weekly Athlete Spotlight**! 🚀\n` +
                      `Every week, we focus on a new rising talent from the Peaxel ecosystem. Discover their journey, achievements, and goals below! 👇`;

    await interaction.reply({ 
        content: introText, 
        embeds: [embed], 
        components: [row] 
    });
}