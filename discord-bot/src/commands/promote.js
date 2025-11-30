/**
 * /promote command - Promote a user by one rank
 */

const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/rankbot');
const embeds = require('../utils/embeds');
const { requirePermission, applyCooldown } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promote')
        .setDescription('Promote a user by one rank')
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
                result = await api.promote(parseInt(user));
            } else {
                result = await api.promoteByUsername(user);
            }

            if (result.success) {
                await interaction.editReply({
                    embeds: [embeds.rankChange(result, 'promote')]
                });
                logger.command(interaction, `promoted ${result.username} to ${result.newRankName}`);
            } else {
                await interaction.editReply({
                    embeds: [embeds.error('Promotion Failed', result.message || 'Unknown error')]
                });
            }

        } catch (error) {
            logger.error('Promote command error:', error.message);
            await interaction.editReply({
                embeds: [embeds.error('Promotion Failed', error.message)]
            });
        }
    }
};
