/**
 * /promote command - Promote a user by one rank
 * Features:
 * - Input validation
 * - Undo button
 * - Discord user tracking
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const api = require('../api/rankbot');
const embeds = require('../utils/embeds');
const { requirePermission, applyCooldown } = require('../utils/permissions');
const { validateUserIdentifier } = require('../utils/validation');
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

        const userInput = interaction.options.getString('user');

        // Validate input
        const validation = validateUserIdentifier(userInput);
        if (!validation.valid) {
            await interaction.reply({
                embeds: [embeds.error('Invalid User', validation.error)],
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply();

        try {
            // Prepare metadata
            const metadata = {
                discordUserId: interaction.user.id,
                discordUsername: interaction.user.tag,
                guildId: interaction.guild?.id
            };

            // Execute promotion
            const { type, value } = validation.sanitized;
            let result;
            
            if (type === 'id') {
                result = await api.promote(value, metadata);
            } else {
                result = await api.promoteByUsername(value, metadata);
            }

            if (result.success) {
                const embed = embeds.rankChange(result, 'promote');
                
                // Add undo button if change was made
                if (result.changed) {
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('undo_promote')
                                .setLabel('Undo')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('↩️')
                        );
                    
                    const response = await interaction.editReply({
                        embeds: [embed],
                        components: [row]
                    });

                    // Handle undo button
                    this.handleUndoButton(interaction, response);

                } else {
                    await interaction.editReply({ embeds: [embed] });
                }

                logger.command(interaction, `promoted ${result.username} to ${result.newRankName}`);

            } else {
                await interaction.editReply({
                    embeds: [embeds.error('Promotion Failed', result.message || 'Unknown error')]
                });
            }

        } catch (error) {
            logger.error('Promote command error:', error.message);
            
            let errorMessage = error.message;
            if (error.isConnectionError?.()) {
                errorMessage = 'Could not connect to the ranking API. Please try again later.';
            }

            await interaction.editReply({
                embeds: [embeds.error('Promotion Failed', errorMessage)]
            });
        }
    },

    /**
     * Handle undo button click
     */
    async handleUndoButton(interaction, response) {
        try {
            const buttonInteraction = await response.awaitMessageComponent({
                filter: i => i.customId === 'undo_promote' && i.user.id === interaction.user.id,
                time: 60000
            });

            await buttonInteraction.deferUpdate();
            
            const undoResult = await api.undo();
            
            if (undoResult.success) {
                await interaction.editReply({
                    embeds: [embeds.undo(undoResult)],
                    components: []
                });
                logger.command(interaction, 'undid promotion');
            } else {
                await interaction.editReply({
                    embeds: [embeds.error('Undo Failed', undoResult.message)],
                    components: []
                });
            }

        } catch (err) {
            await interaction.editReply({ components: [] }).catch(() => {});
        }
    }
};
