/**
 * /stats command - View ranking statistics
 */

const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/rankbot');
const embeds = require('../utils/embeds');
const { applyCooldown } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View ranking statistics'),

    async execute(interaction) {
        // Cooldown check
        if (!await applyCooldown(interaction)) return;

        await interaction.deferReply();

        try {
            const result = await api.stats();

            if (result.success) {
                await interaction.editReply({
                    embeds: [embeds.stats(result)]
                });
                logger.command(interaction, 'viewed stats');
            } else {
                await interaction.editReply({
                    embeds: [embeds.error('Failed to Get Stats', result.message || 'Unknown error')]
                });
            }

        } catch (error) {
            logger.error('Stats command error:', error.message);
            await interaction.editReply({
                embeds: [embeds.error('Failed to Get Stats', error.message)]
            });
        }
    }
};
