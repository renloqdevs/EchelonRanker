/**
 * /rank command - Set a user's rank
 * Features:
 * - Role name autocomplete
 * - Input validation
 * - Undo button
 * - Discord user tracking
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const api = require('../api/rankbot');
const embeds = require('../utils/embeds');
const { requirePermission, applyCooldown } = require('../utils/permissions');
const { validateUserIdentifier, validateRank } = require('../utils/validation');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Set a user\'s rank in the group')
        .addStringOption(option =>
            option.setName('user')
                .setDescription('Roblox username or user ID')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('Rank number or rank name')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    /**
     * Handle autocomplete for rank names
     */
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        
        try {
            // Get cached roles (fast)
            const result = await api.getAssignableRoles();
            
            if (!result.success || !result.roles) {
                return interaction.respond([]);
            }

            // Filter and sort roles
            const filtered = result.roles
                .filter(role => 
                    role.name.toLowerCase().includes(focusedValue) ||
                    role.rank.toString().includes(focusedValue)
                )
                .sort((a, b) => b.rank - a.rank)
                .slice(0, 25) // Discord limit
                .map(role => ({
                    name: `${role.name} (${role.rank})`,
                    value: role.rank.toString()
                }));

            await interaction.respond(filtered);

        } catch (error) {
            logger.debug('Autocomplete error:', error.message);
            await interaction.respond([]);
        }
    },

    /**
     * Execute the command
     */
    async execute(interaction) {
        // Permission check
        if (!await requirePermission('ranking')(interaction)) return;
        
        // Cooldown check
        if (!await applyCooldown(interaction)) return;

        const userInput = interaction.options.getString('user');
        const rankInput = interaction.options.getString('rank');

        // Validate inputs
        const userValidation = validateUserIdentifier(userInput);
        if (!userValidation.valid) {
            await interaction.reply({
                embeds: [embeds.error('Invalid User', userValidation.error)],
                ephemeral: true
            });
            return;
        }

        const rankValidation = validateRank(rankInput);
        if (!rankValidation.valid) {
            await interaction.reply({
                embeds: [embeds.error('Invalid Rank', rankValidation.error)],
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply();

        try {
            // Prepare metadata for tracking
            const metadata = {
                discordUserId: interaction.user.id,
                discordUsername: interaction.user.tag,
                guildId: interaction.guild?.id
            };

            // Execute rank change
            let result;
            const { type, value } = userValidation.sanitized;
            const rankValue = rankValidation.sanitized.type === 'number' 
                ? rankValidation.sanitized.value 
                : rankInput;

            if (type === 'id') {
                result = await api.setRank(value, rankValue, metadata);
            } else {
                result = await api.setRankByUsername(value, rankValue, metadata);
            }

            if (result.success) {
                const embed = embeds.rankChange(result, 'rank');
                
                // Add undo button if change was made
                if (result.changed) {
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('undo_rank')
                                .setLabel('Undo')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('↩️')
                        );
                    
                    const response = await interaction.editReply({
                        embeds: [embed],
                        components: [row]
                    });

                    // Handle undo button (non-blocking)
                    this.handleUndoButton(interaction, response);

                } else {
                    await interaction.editReply({ embeds: [embed] });
                }

                logger.command(interaction, `ranked ${result.username} to ${result.newRankName}`);

            } else {
                await interaction.editReply({
                    embeds: [embeds.error('Rank Failed', result.message || 'Unknown error')]
                });
            }

        } catch (error) {
            logger.error('Rank command error:', error.message);
            
            // Provide helpful error messages
            let errorMessage = error.message;
            if (error.isConnectionError?.()) {
                errorMessage = 'Could not connect to the ranking API. Please try again later.';
            } else if (error.isRateLimited?.()) {
                errorMessage = 'Too many requests. Please wait a moment and try again.';
            }

            await interaction.editReply({
                embeds: [embeds.error('Rank Failed', errorMessage)]
            });
        }
    },

    /**
     * Handle undo button click
     */
    async handleUndoButton(interaction, response) {
        try {
            const buttonInteraction = await response.awaitMessageComponent({
                filter: i => i.customId === 'undo_rank' && i.user.id === interaction.user.id,
                time: 60000 // 1 minute
            });

            await buttonInteraction.deferUpdate();
            
            const undoResult = await api.undo();
            
            if (undoResult.success) {
                await interaction.editReply({
                    embeds: [embeds.undo(undoResult)],
                    components: []
                });
                logger.command(interaction, `undid rank change`);
            } else {
                await interaction.editReply({
                    embeds: [embeds.error('Undo Failed', undoResult.message)],
                    components: []
                });
            }

        } catch (err) {
            // Button timed out or error - remove the button silently
            await interaction.editReply({ components: [] }).catch(() => {});
        }
    }
};
