/**
 * /logs command - View recent activity logs
 */

const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/rankbot');
const embeds = require('../utils/embeds');
const { requirePermission, applyCooldown } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('View recent ranking activity logs')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of logs to show (default: 10)')
                .setMinValue(1)
                .setMaxValue(25)
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Filter by action type')
                .setRequired(false)
                .addChoices(
                    { name: 'All', value: '' },
                    { name: 'Set Rank', value: 'setRank' },
                    { name: 'Promote', value: 'promote' },
                    { name: 'Demote', value: 'demote' }
                )
        ),

    async execute(interaction) {
        // Permission check - only admins can view logs
        if (!await requirePermission('admin')(interaction)) return;
        
        // Cooldown check
        if (!await applyCooldown(interaction)) return;

        const limit = interaction.options.getInteger('limit') || 10;
        const action = interaction.options.getString('action') || '';

        await interaction.deferReply();

        try {
            const result = await api.getLogs({ limit, action: action || undefined });

            if (result.success) {
                await interaction.editReply({
                    embeds: [embeds.logs(result)]
                });
                logger.command(interaction, 'viewed logs');
            } else {
                await interaction.editReply({
                    embeds: [embeds.error('Failed to Get Logs', result.message || 'Unknown error')]
                });
            }

        } catch (error) {
            logger.error('Logs command error:', error.message);
            await interaction.editReply({
                embeds: [embeds.error('Failed to Get Logs', error.message)]
            });
        }
    }
};
