/**
 * /demote command - Demote a user by one rank
 */

const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/rankbot');
const embeds = require('../utils/embeds');
const { requirePermission, applyCooldown } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('demote')
        .setDescription('Demote a user by one rank')
        .addStringOption(option =>
            option.setName('user')
                .setDescription('Roblox username or user ID')
                .setRequired(true)
        ),

    async execute(interaction) {
        // Permission check
        if (!await requirePermission('ranking')(interaction)) return;
        
        // Cooldown check
        if (!await applyCooldown(interaction)) return;

        const user = interaction.options.getString('user');

        await interaction.deferReply();

        try {
            // Determine if using ID or username
            const isNumericId = /^\d+$/.test(user);
            
            let result;
            if (isNumericId) {
                result = await api.demote(parseInt(user));
            } else {
                result = await api.demoteByUsername(user);
            }

            if (result.success) {
                await interaction.editReply({
                    embeds: [embeds.rankChange(result, 'demote')]
                });
                logger.command(interaction, `demoted ${result.username} to ${result.newRankName}`);
            } else {
                await interaction.editReply({
                    embeds: [embeds.error('Demotion Failed', result.message || 'Unknown error')]
                });
            }

        } catch (error) {
            logger.error('Demote command error:', error.message);
            await interaction.editReply({
                embeds: [embeds.error('Demotion Failed', error.message)]
            });
        }
    }
};
