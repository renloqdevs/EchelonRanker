/**
 * /batch command - Batch operations for multiple users
 * Features:
 * - Progress tracking with message updates
 * - Input validation
 * - Autocomplete for rank selection
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../api/rankbot');
const embeds = require('../utils/embeds');
const { requirePermission, applyCooldown } = require('../utils/permissions');
const { validateUserList, validateRank } = require('../utils/validation');
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
                        .setAutocomplete(true)
                )
        ),

    /**
     * Handle autocomplete for rank names
     */
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        
        try {
            const result = await api.getAssignableRoles();
            
            if (!result.success || !result.roles) {
                return interaction.respond([]);
            }

            const filtered = result.roles
                .filter(role => 
                    role.name.toLowerCase().includes(focusedValue) ||
                    role.rank.toString().includes(focusedValue)
                )
                .sort((a, b) => b.rank - a.rank)
                .slice(0, 25)
                .map(role => ({
                    name: `${role.name} (${role.rank})`,
                    value: role.rank.toString()
                }));

            await interaction.respond(filtered);

        } catch (error) {
            logger.debug('Batch autocomplete error:', error.message);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        // Permission check for ranking operations
        if (subcommand === 'rank') {
            if (!await requirePermission('ranking')(interaction)) return;
        }
        
        // Cooldown check
        if (!await applyCooldown(interaction)) return;

        const usersInput = interaction.options.getString('users');
        
        // Validate user list
        const validation = validateUserList(usersInput, 10);
        if (!validation.valid) {
            await interaction.reply({
                embeds: [embeds.error('Invalid Input', validation.error)],
                ephemeral: true
            });
            return;
        }

        const users = validation.sanitized;

        await interaction.deferReply();

        try {
            if (subcommand === 'lookup') {
                await this.handleLookup(interaction, users);
            } else if (subcommand === 'rank') {
                const rankInput = interaction.options.getString('rank');
                
                // Validate rank
                const rankValidation = validateRank(rankInput);
                if (!rankValidation.valid) {
                    await interaction.editReply({
                        embeds: [embeds.error('Invalid Rank', rankValidation.error)]
                    });
                    return;
                }

                await this.handleRank(interaction, users, rankInput);
            }

        } catch (error) {
            logger.error('Batch command error:', error.message);
            await interaction.editReply({
                embeds: [embeds.error('Batch Operation Failed', error.message)]
            });
        }
    },

    /**
     * Handle batch lookup with progress
     */
    async handleLookup(interaction, users) {
        // Show progress
        const progressEmbed = this.createProgressEmbed('lookup', 0, users.length);
        await interaction.editReply({ embeds: [progressEmbed] });

        // Determine if IDs or usernames
        const areNumeric = users.every(u => u.type === 'id');
        
        let result;
        if (areNumeric) {
            result = await api.batchLookupByIds(users.map(u => u.value));
        } else {
            result = await api.batchLookupByUsernames(users.map(u => u.value));
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
    },

    /**
     * Handle batch rank with progress
     */
    async handleRank(interaction, users, rank) {
        const isRankNumeric = /^\d+$/.test(rank);
        
        // Show progress
        const progressEmbed = this.createProgressEmbed('rank', 0, users.length);
        await interaction.editReply({ embeds: [progressEmbed] });

        // Build bulk request
        const bulkUsers = users.map(user => {
            const entry = user.type === 'id'
                ? { userId: user.value }
                : { username: user.value };
            
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
    },

    /**
     * Create a progress embed
     */
    createProgressEmbed(action, current, total) {
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        const progressBar = this.createProgressBar(percentage);
        
        return new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`⏳ Batch ${action.charAt(0).toUpperCase() + action.slice(1)} in Progress`)
            .setDescription(`Processing ${total} users...\n\n${progressBar} ${percentage}%`)
            .setTimestamp();
    },

    /**
     * Create a text progress bar
     */
    createProgressBar(percentage, length = 20) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return '▓'.repeat(filled) + '░'.repeat(empty);
    }
};
