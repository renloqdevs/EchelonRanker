/**
 * /lookup command - Look up a user's current rank
 */

const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/rankbot');
const embeds = require('../utils/embeds');
const { applyCooldown } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lookup')
        .setDescription('Look up a user\'s current rank in the group')
        .addStringOption(option =>
            option.setName('user')
                .setDescription('Roblox username or user ID')
                .setRequired(true)
        ),

    async execute(interaction) {
        // Cooldown check (no permission needed for lookup)
        if (!await applyCooldown(interaction)) return;

        const user = interaction.options.getString('user');

        await interaction.deferReply();

        try {
            const result = await api.lookup(user);

            if (result.success) {
                await interaction.editReply({
                    embeds: [embeds.userCard(result)]
                });
                logger.command(interaction, `looked up ${result.username}`);
            } else {
                await interaction.editReply({
                    embeds: [embeds.error('Lookup Failed', result.message || 'User not found')]
                });
            }

        } catch (error) {
            logger.error('Lookup command error:', error.message);
            await interaction.editReply({
                embeds: [embeds.error('Lookup Failed', error.message)]
            });
        }
    }
};
