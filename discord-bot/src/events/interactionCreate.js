/**
 * Interaction Create Event
 * Handles all interactions (slash commands, autocomplete, buttons, etc.)
 */

const logger = require('../utils/logger');
const embeds = require('../utils/embeds');
const config = require('../config');

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(interaction) {
        // Handle autocomplete interactions
        if (interaction.isAutocomplete()) {
            await handleAutocomplete(interaction);
            return;
        }

        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            await handleCommand(interaction);
            return;
        }

        // Other interaction types (buttons, selects) are handled by their respective commands
    }
};

/**
 * Handle autocomplete interactions
 */
async function handleAutocomplete(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command || !command.autocomplete) {
        logger.debug(`No autocomplete handler for ${interaction.commandName}`);
        return interaction.respond([]);
    }

    try {
        await command.autocomplete(interaction);
    } catch (error) {
        logger.error(`Autocomplete error for ${interaction.commandName}:`, error.message);
        await interaction.respond([]).catch(() => {});
    }
}

/**
 * Handle slash command interactions
 */
async function handleCommand(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        logger.warn(`Unknown command: ${interaction.commandName}`);
        await interaction.reply({
            embeds: [embeds.error('Unknown Command', 'This command does not exist.')],
            ephemeral: true
        });
        return;
    }

    try {
        await command.execute(interaction);

        // Log to channel if configured
        await logToChannel(interaction);

    } catch (error) {
        logger.error(`Error executing ${interaction.commandName}:`, error);

        const errorEmbed = embeds.error(
            'Command Error',
            'An unexpected error occurred while executing this command.'
        );

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (replyError) {
            logger.error('Failed to send error reply:', replyError.message);
        }
    }
}

/**
 * Log command usage to a designated channel
 */
async function logToChannel(interaction) {
    if (!config.options.logChannelId) return;

    try {
        const channel = await interaction.client.channels.fetch(config.options.logChannelId);
        if (!channel) return;

        // Only log ranking commands
        const rankingCommands = ['rank', 'promote', 'demote', 'undo', 'batch'];
        if (!rankingCommands.includes(interaction.commandName)) return;

        const { EmbedBuilder } = require('discord.js');
        
        const logEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📝 Command Used')
            .addFields(
                { name: 'Command', value: `/${interaction.commandName}`, inline: true },
                { name: 'User', value: `${interaction.user.tag}\n<@${interaction.user.id}>`, inline: true },
                { name: 'Channel', value: `<#${interaction.channelId}>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `User ID: ${interaction.user.id}` });

        // Add options if present
        const options = interaction.options.data;
        if (options.length > 0) {
            const optionList = options.map(opt => {
                if (opt.options) {
                    // Subcommand
                    const subOptions = opt.options.map(sub => `${sub.name}: ${sub.value}`).join(', ');
                    return `${opt.name} (${subOptions})`;
                }
                return `${opt.name}: ${opt.value}`;
            }).join('\n');
            
            logEmbed.addFields({ name: 'Options', value: `\`\`\`${optionList}\`\`\``, inline: false });
        }

        await channel.send({ embeds: [logEmbed] });

    } catch (error) {
        logger.debug('Failed to log to channel:', error.message);
    }
}
