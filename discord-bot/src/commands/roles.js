/**
 * /roles command - View all group roles
 */

const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/rankbot');
const embeds = require('../utils/embeds');
const { applyCooldown } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDescription('View all roles in the group'),

    async execute(interaction) {
        // Cooldown check
        if (!await applyCooldown(interaction)) return;

        await interaction.deferReply();

        try {
            // Get roles and group info
            const [rolesResult, groupResult] = await Promise.all([
                api.getRoles(),
                api.getGroup().catch(() => null)
            ]);

            if (rolesResult.success) {
                const groupName = groupResult?.group?.name || 'Group';
                await interaction.editReply({
                    embeds: [embeds.rolesList(rolesResult.roles, groupName)]
                });
                logger.command(interaction, 'viewed roles');
            } else {
                await interaction.editReply({
                    embeds: [embeds.error('Failed to Get Roles', rolesResult.message || 'Unknown error')]
                });
            }

        } catch (error) {
            logger.error('Roles command error:', error.message);
            await interaction.editReply({
                embeds: [embeds.error('Failed to Get Roles', error.message)]
            });
        }
    }
};
