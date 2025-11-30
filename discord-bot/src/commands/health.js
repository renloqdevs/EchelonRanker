/**
 * /health command - Check API connection status
 */

const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/rankbot');
const embeds = require('../utils/embeds');
const { applyCooldown } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('health')
        .setDescription('Check RankBot API connection status')
        .addBooleanOption(option =>
            option.setName('detailed')
                .setDescription('Show detailed system information')
                .setRequired(false)
        ),

    async execute(interaction) {
        // Cooldown check
        if (!await applyCooldown(interaction)) return;

        const detailed = interaction.options.getBoolean('detailed') || false;

        await interaction.deferReply();

        try {
            let result;
            
            if (detailed) {
                result = await api.healthDetailed();
            } else {
                result = await api.health();
            }

            await interaction.editReply({
                embeds: [embeds.health(result, detailed)]
            });
            logger.command(interaction, 'checked health');

        } catch (error) {
            logger.error('Health command error:', error.message);
            await interaction.editReply({
                embeds: [embeds.health({ 
                    status: 'error', 
                    botConnected: false,
                    error: error.message 
                })]
            });
        }
    }
};
