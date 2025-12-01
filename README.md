# Echelon

> *Manage your hierarchy with precision.*

A powerful self-hosted API for automating Roblox group ranking operations. Deploy for free on Railway and integrate with your games, Discord bots, or custom applications. Includes a desktop console UI for easy management.

## Why Echelon?

Most Roblox ranking bots are barebones scripts with minimal features. Echelon is different:

- **Complete API** - 15+ endpoints covering every ranking operation, including bulk actions and session monitoring
- **Security-first** - Helmet.js, brute-force protection, IP allowlisting, request deduplication, rate limiting, and audit logging
- **Desktop Console** - Full terminal UI with password protection, themes, favorites, and activity tracking
- **Production-ready** - Response compression, webhook notifications, session health monitoring, PM2 support, and graceful error handling
- **Actually maintained** - Active development with proper documentation

## Quick Start

### 1. Create a Bot Account

1. Create a new Roblox account dedicated to ranking operations
2. Add this account to your group
3. Assign it a role with **"Manage lower-ranked member ranks"** permission
4. Position this role above all roles the bot should be able to assign

**Note:** The bot can only rank users to roles below its own rank.

### 2. Get Your Roblox Cookie

1. Log into the bot account on Roblox
2. Open Developer Tools (F12)
3. Navigate to **Application** > **Cookies** > `https://www.roblox.com`
4. Copy the `.ROBLOSECURITY` cookie value

### 3. Deploy to Railway

1. Fork this repository
2. Create an account at [railway.app](https://railway.app)
3. Create a new project from your forked repository
4. Add the following environment variables:

| Variable | Description |
|----------|-------------|
| `ROBLOX_COOKIE` | Your bot account's .ROBLOSECURITY cookie |
| `GROUP_ID` | Your Roblox group ID (from the group URL) |
| `API_KEY` | A secure random string for API authentication |

5. Generate a domain under **Settings** > **Domains**

### 4. Verify Deployment

Visit `https://your-app.up.railway.app/health` to confirm Echelon is running.

## Console UI

A desktop terminal application for managing Echelon without writing code.

### Launch

**Windows:**
```batch
launch.bat
```

**macOS/Linux:**
```bash
chmod +x launch.sh
./launch.sh
```

### Features

- Interactive dashboard with live status
- Rank, promote, and demote users
- Search members by username or ID
- View all group roles
- Activity logs with export to CSV
- Multiple color themes
- First-run setup wizard



## API Overview

All endpoints except `/health`, `/live`, `/ready`, and `/session` require the `x-api-key` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server status |
| GET | `/live` | Liveness probe |
| GET | `/ready` | Readiness probe |
| GET | `/session` | Session health status |
| GET | `/api/rank/:userId` | Get user's rank |
| GET | `/api/user/:username` | Get user by username |
| GET | `/api/roles` | List all group roles |
| GET | `/api/group` | Get group info |
| GET | `/api/logs` | Get audit logs |
| GET | `/api/stats` | Get statistics |
| GET | `/api/metrics` | Get API metrics |
| POST | `/api/rank` | Set user's rank |
| POST | `/api/rank/username` | Set rank by username |
| POST | `/api/rank/bulk` | Bulk rank operation |
| POST | `/api/promote` | Promote user |
| POST | `/api/promote/username` | Promote by username |
| POST | `/api/demote` | Demote user |
| POST | `/api/demote/username` | Demote by username |
| POST | `/api/session/check` | Force session health check |

See [API.md](API.md) for complete endpoint documentation and examples.

## In-Game Integration

1. Enable HTTP Requests in Game Settings > Security
2. Add the script from `roblox-game/RankingScript.lua` to ServerScriptService
3. Configure the `API_URL` and `API_KEY` in the script

```lua
local RankingAPI = require(game.ServerScriptService.RankingAPI)

local result = RankingAPI:SetPlayerRankByName(player, "Member")
if result.success then
    print("Ranked successfully")
end
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ROBLOX_COOKIE` | Yes | - | Bot account's .ROBLOSECURITY cookie |
| `GROUP_ID` | Yes | - | Target Roblox group ID |
| `API_KEY` | Yes | - | API authentication key |
| `PORT` | No | 3000 | Server port |
| `RATE_LIMIT_MAX` | No | 30 | Max requests per 15 minutes |
| `MIN_RANK` | No | 1 | Minimum assignable rank |
| `MAX_RANK` | No | 255 | Maximum assignable rank |
| `WEBHOOK_URL` | No | - | Discord webhook for notifications |
| `SESSION_HEALTH_INTERVAL` | No | 60000 | Session check interval (ms) |
| `LOG_LEVEL` | No | info | Log level (error/warn/info/debug) |

## Production Deployment

### PM2 (Recommended)

```bash
# Install dependencies
npm install

# Start with PM2
npm run pm2:start

# Other commands
npm run pm2:stop      # Stop server
npm run pm2:restart   # Restart server
npm run pm2:logs      # View logs
npm run pm2:monit     # Real-time monitoring
```

### Docker

```bash
docker-compose up -d
```

## Webhook Notifications

Set the `WEBHOOK_URL` environment variable to receive Discord notifications for:
- Rank changes
- Promotions
- Demotions
- Session health alerts (cookie expiration)
- Server startup/shutdown

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Authentication failed | Cookie expired. Get a new one and update the environment variable. |
| User not in group | The target user must be a group member before ranking. |
| Cannot set rank | Ensure the target rank is below the bot's rank. |
| Rate limit exceeded | Wait 15 minutes or increase `RATE_LIMIT_MAX`. |
| HTTP Requests disabled | Enable in Roblox Studio: Game Settings > Security. |
| Session unhealthy | Cookie may have expired. Check `/session` endpoint and restart with fresh cookie. |

## Security

- Use a dedicated Roblox account for the bot
- Never commit credentials to version control
- Store sensitive values in environment variables
- Regularly rotate your API key
- Monitor logs for unusual activity
- Enable `IP_ALLOWLIST` in production

## License

MIT
