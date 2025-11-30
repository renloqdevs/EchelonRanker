/**
 * /help command - Show help information
 */

const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help information and available commands'),

    async execute(interaction) {
        await interaction.reply({
            embeds: [embeds.help()]
        });
        logger.command(interaction, 'viewed help');
    }
};
