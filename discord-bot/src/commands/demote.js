/**
 * /demote command - Demote a user by one rank
 * Features:
 * - Input validation
 * - Confirmation for demotions
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
        .setName('demote')
        .setDescription('Demote a user by one rank')
        .addStringOption(option =>
            option.setName('user')
                .setDescription('Roblox username or user ID')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('confirm')
                .setDescription('Skip confirmation prompt')
                .setRequired(false)
        ),

    async execute(interaction) {
        // Permission check
        if (!await requirePermission('ranking')(interaction)) return;
        
        // Cooldown check
        if (!await applyCooldown(interaction)) return;

        const userInput = interaction.options.getString('user');
        const skipConfirm = interaction.options.getBoolean('confirm') || false;

        // Validate input
        const validation = validateUserIdentifier(userInput);
        if (!validation.valid) {
            await interaction.reply({
                embeds: [embeds.error('Invalid User', validation.error)],
                ephemeral: true
            });
            return;
        }

        // If not skipping confirmation, show confirm dialog
        if (!skipConfirm) {
            await this.showConfirmation(interaction, validation.sanitized);
            return;
        }

        await interaction.deferReply();
        await this.executeDemotion(interaction, validation.sanitized);
    },

    /**
     * Show confirmation dialog before demoting
     */
    async showConfirmation(interaction, userInfo) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_demote')
                    .setLabel('Confirm Demotion')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⬇️'),
                new ButtonBuilder()
                    .setCustomId('cancel_demote')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        const confirmEmbed = embeds.warning(
            'Confirm Demotion',
            `Are you sure you want to demote **${userInfo.value}**?\n\nThis will decrease their rank by one level.`
        );

        const response = await interaction.reply({
            embeds: [confirmEmbed],
            components: [row],
            fetchReply: true
        });

        try {
            const buttonInteraction = await response.awaitMessageComponent({
                filter: i => ['confirm_demote', 'cancel_demote'].includes(i.customId) && i.user.id === interaction.user.id,
                time: 30000
            });

            if (buttonInteraction.customId === 'confirm_demote') {
                await buttonInteraction.deferUpdate();
                await this.executeDemotion(interaction, userInfo, true);
            } else {
                await buttonInteraction.update({
                    embeds: [embeds.info('Cancelled', 'Demotion cancelled.')],
                    components: []
                });
            }

        } catch (err) {
            await interaction.editReply({
                embeds: [embeds.info('Timed Out', 'Confirmation timed out. Demotion cancelled.')],
                components: []
            }).catch(() => {});
        }
    },

    /**
     * Execute the demotion
     */
    async executeDemotion(interaction, userInfo, isUpdate = false) {
        try {
            // Prepare metadata
            const metadata = {
                discordUserId: interaction.user.id,
                discordUsername: interaction.user.tag,
                guildId: interaction.guild?.id
            };

            // Execute demotion
            const { type, value } = userInfo;
            let result;
            
            if (type === 'id') {
                result = await api.demote(value, metadata);
            } else {
                result = await api.demoteByUsername(value, metadata);
            }

            if (result.success) {
                const embed = embeds.rankChange(result, 'demote');
                
                // Add undo button if change was made
                if (result.changed) {
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('undo_demote')
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
                    await interaction.editReply({ embeds: [embed], components: [] });
                }

                logger.command(interaction, `demoted ${result.username} to ${result.newRankName}`);

            } else {
                await interaction.editReply({
                    embeds: [embeds.error('Demotion Failed', result.message || 'Unknown error')],
                    components: []
                });
            }

        } catch (error) {
            logger.error('Demote command error:', error.message);
            
            let errorMessage = error.message;
            if (error.isConnectionError?.()) {
                errorMessage = 'Could not connect to the ranking API. Please try again later.';
            }

            await interaction.editReply({
                embeds: [embeds.error('Demotion Failed', errorMessage)],
                components: []
            });
        }
    },

    /**
     * Handle undo button click
     */
    async handleUndoButton(interaction, response) {
        try {
            const buttonInteraction = await response.awaitMessageComponent({
                filter: i => i.customId === 'undo_demote' && i.user.id === interaction.user.id,
                time: 60000
            });

            await buttonInteraction.deferUpdate();
            
            const undoResult = await api.undo();
            
            if (undoResult.success) {
                await interaction.editReply({
                    embeds: [embeds.undo(undoResult)],
                    components: []
                });
                logger.command(interaction, 'undid demotion');
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
