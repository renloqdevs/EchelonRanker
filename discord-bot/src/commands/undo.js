/**
 * /undo command - Undo the last ranking action
 */

const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/rankbot');
const embeds = require('../utils/embeds');
const { requirePermission, applyCooldown } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('undo')
        .setDescription('Undo your last ranking action'),

    async execute(interaction) {
        // Permission check
        if (!await requirePermission('ranking')(interaction)) return;
        
        // Cooldown check
        if (!await applyCooldown(interaction)) return;

        // Check if there's an action to undo
        const lastAction = api.getLastAction();
        
        if (!lastAction) {
            await interaction.reply({
                embeds: [embeds.warning('No Action to Undo', 'There is no recent action to undo. Actions expire after 5 minutes.')],
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply();

        try {
            const result = await api.undo();

            if (result.success) {
                await interaction.editReply({
                    embeds: [embeds.undo(result)]
                });
                logger.command(interaction, `undid ${result.undoneAction} for ${result.username}`);
            } else {
                await interaction.editReply({
                    embeds: [embeds.error('Undo Failed', result.message || 'Unknown error')]
                });
            }

        } catch (error) {
            logger.error('Undo command error:', error.message);
            await interaction.editReply({
                embeds: [embeds.error('Undo Failed', error.message)]
            });
        }
    }
};
