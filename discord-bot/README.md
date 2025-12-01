# Echelon Discord Bot

A Discord bot for managing Roblox group ranks through the Echelon API.

## Features

- **Slash Commands** - Modern Discord slash command interface
- **Rank Management** - Set rank, promote, demote users
- **User Lookup** - Look up user ranks by username or ID
- **Batch Operations** - Rank or lookup multiple users at once
- **Undo Support** - Revert the last ranking action
- **Permission System** - Role-based command permissions
- **Audit Logging** - Log all ranking actions to a channel
- **Beautiful Embeds** - Rich formatted responses with Roblox avatars

## Commands

### Ranking Commands
| Command | Description |
|---------|-------------|
| `/rank <user> <rank>` | Set a user to a specific rank |
| `/promote <user>` | Promote a user by one rank |
| `/demote <user>` | Demote a user by one rank |
| `/undo` | Undo the last ranking action |
| `/batch rank <users> <rank>` | Rank multiple users at once |

### Lookup Commands
| Command | Description |
|---------|-------------|
| `/lookup <user>` | Look up a user's current rank |
| `/roles` | View all group roles |
| `/permissions` | View bot's ranking permissions |
| `/batch lookup <users>` | Look up multiple users at once |

### Info Commands
| Command | Description |
|---------|-------------|
| `/stats` | View ranking statistics |
| `/health` | Check API connection status |
| `/logs` | View recent activity logs (admin) |
| `/help` | Show help information |

## Setup

### Prerequisites

1. **Echelon API** - The ranking API must be running
2. **Discord Bot** - Create a bot at [Discord Developer Portal](https://discord.com/developers/applications)
3. **Node.js 18+** - Required runtime

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" tab and create a bot
4. Copy the bot token
5. Go to "OAuth2" > "URL Generator"
6. Select scopes: `bot`, `applications.commands`
7. Select permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
8. Use the generated URL to invite the bot to your server

### Installation

```bash
# Navigate to the discord-bot directory
cd discord-bot

# Install dependencies
npm install

# Copy example env and configure
cp .env.example .env

# Edit .env with your settings
# See Configuration section below

# Deploy slash commands to your guild (instant)
npm run deploy:guild

# Or deploy globally (takes up to 1 hour)
npm run deploy:global

# Start the bot
npm start
```

### Configuration

Edit `.env` with your settings:

```env
# Required - Discord
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id

# Required - Echelon API
API_URL=http://localhost:3000
API_KEY=your_api_key

# Optional - Permissions
ALLOWED_ROLE_IDS=123,456,789
ADMIN_ROLE_IDS=123

# Optional - Features
LOG_CHANNEL_ID=channel_id_for_logs
COMMAND_COOLDOWN=3
EMBED_COLOR=5865F2
LOG_LEVEL=info
```

#### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Your Discord bot token |
| `CLIENT_ID` | Yes | Your Discord application ID |
| `GUILD_ID` | No | Guild ID for command deployment |
| `API_URL` | Yes | URL of your Echelon API |
| `API_KEY` | Yes | API key for authentication |
| `ALLOWED_ROLE_IDS` | No | Role IDs that can use ranking commands |
| `ADMIN_ROLE_IDS` | No | Role IDs that can use admin commands |
| `LOG_CHANNEL_ID` | No | Channel to log ranking actions |
| `COMMAND_COOLDOWN` | No | Cooldown between commands (seconds) |
| `EMBED_COLOR` | No | Default embed color (hex without #) |
| `LOG_LEVEL` | No | Logging level (error/warn/info/debug) |

## Docker Deployment

```bash
# Build and run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Project Structure

```
discord-bot/
├── src/
│   ├── index.js           # Entry point
│   ├── config.js          # Configuration loader
│   ├── api/
│   │   └── rankbot.js     # API client
│   ├── commands/          # Slash commands
│   │   ├── rank.js
│   │   ├── promote.js
│   │   ├── demote.js
│   │   ├── lookup.js
│   │   ├── undo.js
│   │   ├── roles.js
│   │   ├── stats.js
│   │   ├── health.js
│   │   ├── permissions.js
│   │   ├── logs.js
│   │   ├── batch.js
│   │   └── help.js
│   ├── events/            # Event handlers
│   │   ├── ready.js
│   │   └── interactionCreate.js
│   ├── handlers/          # Loaders
│   │   ├── commands.js
│   │   └── events.js
│   └── utils/             # Utilities
│       ├── embeds.js
│       ├── logger.js
│       └── permissions.js
├── deploy-commands.js     # Command registration
├── package.json
├── .env.example
├── Dockerfile
└── docker-compose.yml
```

## Permission System

### Default Behavior

By default, users need Discord's `Manage Roles` permission to use ranking commands.

### Role-Based Permissions

Set `ALLOWED_ROLE_IDS` to restrict ranking commands to specific roles:

```env
ALLOWED_ROLE_IDS=123456789,987654321
```

### Admin Commands

Some commands (like `/logs`) require admin permissions. Set `ADMIN_ROLE_IDS` or have Discord Administrator permission.

## Troubleshooting

### Commands not showing up

1. Make sure you ran `npm run deploy:guild` or `npm run deploy:global`
2. Guild commands appear instantly, global commands take up to 1 hour
3. Check that the bot has the `applications.commands` scope

### "Failed to connect to Echelon API"

1. Make sure the Echelon API is running
2. Check that `API_URL` in .env is correct
3. Verify the `API_KEY` matches the API's configuration

### "Permission Denied" errors

1. Check `ALLOWED_ROLE_IDS` in .env
2. Make sure the user has the required Discord roles
3. Or ensure they have `Manage Roles` permission

### Cooldown issues

Adjust `COMMAND_COOLDOWN` in .env (default: 3 seconds). Set to 0 to disable.

## License

MIT
