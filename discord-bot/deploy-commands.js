/**
 * Deploy Slash Commands
 * 
 * Usage:
 *   npm run deploy           - Deploy to guild (fast, for testing)
 *   npm run deploy:guild     - Deploy to guild (fast, for testing)
 *   npm run deploy:global    - Deploy globally (takes up to 1 hour)
 * 
 * Or directly:
 *   node deploy-commands.js --guild    - Deploy to GUILD_ID
 *   node deploy-commands.js --global   - Deploy globally
 */

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { getCommandData } = require('./src/handlers/commands');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
    console.error('Error: DISCORD_TOKEN and CLIENT_ID are required');
    console.error('Please check your .env file');
    process.exit(1);
}

const args = process.argv.slice(2);
const isGlobal = args.includes('--global');
const isGuild = args.includes('--guild') || !isGlobal;

if (isGuild && !guildId) {
    console.error('Error: GUILD_ID is required for guild deployment');
    console.error('Set GUILD_ID in your .env file or use --global');
    process.exit(1);
}

const commands = getCommandData();

console.log(`Found ${commands.length} commands to deploy`);
commands.forEach(cmd => console.log(`  - /${cmd.name}`));

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log('\nDeploying commands...');

        if (isGlobal) {
            console.log('Target: Global (all servers)');
            console.log('Note: Global commands can take up to 1 hour to propagate\n');
            
            await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
        } else {
            console.log(`Target: Guild ${guildId}`);
            console.log('Note: Guild commands update instantly\n');
            
            await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );
        }

        console.log(`Successfully deployed ${commands.length} commands!`);

    } catch (error) {
        console.error('Failed to deploy commands:', error.message);
        process.exit(1);
    }
})();
