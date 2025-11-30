/**
 * /batch command - Batch operations for multiple users
 */

const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/rankbot');
const embeds = require('../utils/embeds');
const { requirePermission, applyCooldown } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('batch')
        .setDescription('Perform batch operations on multiple users')
        .addSubcommand(subcommand =>
            subcommand
                .setName('lookup')
                .setDescription('Look up multiple users at once')
                .addStringOption(option =>
                    option.setName('users')
                        .setDescription('Comma-separated usernames or user IDs (max 10)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('rank')
                .setDescription('Rank multiple users to the same rank')
                .addStringOption(option =>
                    option.setName('users')
                        .setDescription('Comma-separated usernames or user IDs (max 10)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('rank')
                        .setDescription('Rank number or rank name')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        // Permission check for ranking operations
        if (subcommand === 'rank') {
            if (!await requirePermission('ranking')(interaction)) return;
        }
        
        // Cooldown check
        if (!await applyCooldown(interaction)) return;

        const usersInput = interaction.options.getString('users');
        const users = usersInput.split(',').map(u => u.trim()).filter(Boolean);

        if (users.length === 0) {
            await interaction.reply({
                embeds: [embeds.error('Invalid Input', 'Please provide at least one username or user ID.')],
                ephemeral: true
            });
            return;
        }

        if (users.length > 10) {
            await interaction.reply({
                embeds: [embeds.error('Too Many Users', 'Maximum 10 users per batch operation.')],
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply();

        try {
            if (subcommand === 'lookup') {
                // Determine if IDs or usernames
                const areNumeric = users.every(u => /^\d+$/.test(u));
                
                let result;
                if (areNumeric) {
                    result = await api.batchLookupByIds(users.map(u => parseInt(u)));
                } else {
                    result = await api.batchLookupByUsernames(users);
                }

                if (result.success) {
                    await interaction.editReply({
                        embeds: [embeds.batchResults(result.users, 'lookup')]
                    });
                    logger.command(interaction, `batch looked up ${users.length} users`);
                } else {
                    await interaction.editReply({
                        embeds: [embeds.error('Batch Lookup Failed', result.message || 'Unknown error')]
                    });
                }

            } else if (subcommand === 'rank') {
                const rank = interaction.options.getString('rank');
                
                // Build bulk request
                const isRankNumeric = /^\d+$/.test(rank);
                const bulkUsers = users.map(user => {
                    const isNumericId = /^\d+$/.test(user);
                    const entry = isNumericId 
                        ? { userId: parseInt(user) }
                        : { username: user };
                    
                    if (isRankNumeric) {
                        entry.rank = parseInt(rank);
                    } else {
                        entry.rankName = rank;
                    }
                    
                    return entry;
                });

                const result = await api.bulkRank(bulkUsers);

                if (result.success) {
                    await interaction.editReply({
                        embeds: [embeds.batchResults(result.results, 'rank')]
                    });
                    logger.command(interaction, `batch ranked ${users.length} users to ${rank}`);
                } else {
                    await interaction.editReply({
                        embeds: [embeds.error('Batch Rank Failed', result.message || 'Unknown error')]
                    });
                }
            }

        } catch (error) {
            logger.error('Batch command error:', error.message);
            await interaction.editReply({
                embeds: [embeds.error('Batch Operation Failed', error.message)]
            });
        }
    }
};
