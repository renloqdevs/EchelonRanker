# API Reference

All endpoints except `/health` require authentication via the `x-api-key` header.

Base URL: `https://your-app.up.railway.app`

## Authentication

Include your API key in every request:

```
x-api-key: your-api-key
```

---

## Endpoints

### Health Check

```
GET /health
```

Returns server status. No authentication required.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "bot": {
    "username": "BotName",
    "userId": 12345678
  }
}
```

---

### Get User Rank

```
GET /api/rank/:userId
```

**Response:**
```json
{
  "success": true,
  "userId": 12345678,
  "username": "PlayerName",
  "rank": 10,
  "rankName": "Member",
  "inGroup": true
}
```

---

### Get User by Username

```
GET /api/user/:username
```

**Response:**
```json
{
  "success": true,
  "userId": 12345678,
  "username": "PlayerName",
  "rank": 10,
  "rankName": "Member",
  "inGroup": true
}
```

---

### Get All Roles

```
GET /api/roles
```

**Response:**
```json
{
  "success": true,
  "roles": [
    {
      "rank": 255,
      "name": "Owner",
      "memberCount": 1,
      "canAssign": false
    },
    {
      "rank": 10,
      "name": "Member",
      "memberCount": 50,
      "canAssign": true
    }
  ],
  "count": 5
}
```

---

### Set Rank

```
POST /api/rank
```

**Request Body (by rank number):**
```json
{
  "userId": 12345678,
  "rank": 10
}
```

**Request Body (by role name):**
```json
{
  "userId": 12345678,
  "rankName": "Member"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully changed rank",
  "userId": 12345678,
  "oldRank": 1,
  "oldRankName": "Guest",
  "newRank": 10,
  "newRankName": "Member",
  "changed": true
}
```

---

### Set Rank by Username

```
POST /api/rank/username
```

**Request Body:**
```json
{
  "username": "PlayerName",
  "rankName": "Member"
}
```

**Response:** Same as Set Rank, with `username` field included.

---

### Promote User

```
POST /api/promote
```

**Request Body:**
```json
{
  "userId": 12345678
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully promoted user",
  "userId": 12345678,
  "oldRank": 10,
  "oldRankName": "Member",
  "newRank": 50,
  "newRankName": "Moderator",
  "changed": true
}
```

---

### Promote by Username

```
POST /api/promote/username
```

**Request Body:**
```json
{
  "username": "PlayerName"
}
```

**Response:** Same as Promote User, with `username` field included.

---

### Demote User

```
POST /api/demote
```

**Request Body:**
```json
{
  "userId": 12345678
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully demoted user",
  "userId": 12345678,
  "oldRank": 50,
  "oldRankName": "Moderator",
  "newRank": 10,
  "newRankName": "Member",
  "changed": true
}
```

---

### Demote by Username

```
POST /api/demote/username
```

**Request Body:**
```json
{
  "username": "PlayerName"
}
```

**Response:** Same as Demote User, with `username` field included.

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common error codes:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid request | Missing or invalid parameters |
| 401 | Authentication required | No API key provided |
| 403 | Invalid API key | API key is incorrect |
| 429 | Rate limit exceeded | Too many requests |
| 500 | Internal error | Server-side error |

---

## Integration Examples

### cURL

```bash
# Get user rank
curl -X GET "https://your-app.up.railway.app/api/rank/12345678" \
  -H "x-api-key: your-api-key"

# Set rank by username
curl -X POST "https://your-app.up.railway.app/api/rank/username" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"username": "PlayerName", "rankName": "Member"}'

# Promote user
curl -X POST "https://your-app.up.railway.app/api/promote" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"userId": 12345678}'

# Demote by username
curl -X POST "https://your-app.up.railway.app/api/demote/username" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"username": "PlayerName"}'

# Get all roles
curl -X GET "https://your-app.up.railway.app/api/roles" \
  -H "x-api-key: your-api-key"
```

### JavaScript (Node.js)

```javascript
const API_URL = 'https://your-app.up.railway.app';
const API_KEY = 'your-api-key';

async function rankUser(username, rankName) {
    const response = await fetch(`${API_URL}/api/rank/username`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
        },
        body: JSON.stringify({ username, rankName })
    });
    return response.json();
}

async function promoteUser(userId) {
    const response = await fetch(`${API_URL}/api/promote`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
        },
        body: JSON.stringify({ userId })
    });
    return response.json();
}

async function getUserRank(userId) {
    const response = await fetch(`${API_URL}/api/rank/${userId}`, {
        headers: { 'x-api-key': API_KEY }
    });
    return response.json();
}
```

### Python

```python
import requests

API_URL = "https://your-app.up.railway.app"
API_KEY = "your-api-key"

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

def rank_user(username, rank_name):
    response = requests.post(
        f"{API_URL}/api/rank/username",
        headers=headers,
        json={"username": username, "rankName": rank_name}
    )
    return response.json()

def promote_user(user_id):
    response = requests.post(
        f"{API_URL}/api/promote",
        headers=headers,
        json={"userId": user_id}
    )
    return response.json()

def demote_user(user_id):
    response = requests.post(
        f"{API_URL}/api/demote",
        headers=headers,
        json={"userId": user_id}
    )
    return response.json()

def get_user_rank(user_id):
    response = requests.get(
        f"{API_URL}/api/rank/{user_id}",
        headers={"x-api-key": API_KEY}
    )
    return response.json()

def get_roles():
    response = requests.get(
        f"{API_URL}/api/roles",
        headers={"x-api-key": API_KEY}
    )
    return response.json()
```

### Discord.js v14

```javascript
const { SlashCommandBuilder } = require('discord.js');

const API_URL = process.env.RANKING_API_URL;
const API_KEY = process.env.RANKING_API_KEY;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Set a user\'s rank in the Roblox group')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Roblox username')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('role')
                .setDescription('Role name')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        const username = interaction.options.getString('username');
        const role = interaction.options.getString('role');

        try {
            const response = await fetch(`${API_URL}/api/rank/username`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY
                },
                body: JSON.stringify({
                    username: username,
                    rankName: role
                })
            });

            const result = await response.json();

            if (result.success) {
                await interaction.editReply(
                    `Successfully ranked **${username}** to **${result.newRankName}**`
                );
            } else {
                await interaction.editReply(`Failed: ${result.message}`);
            }
        } catch (error) {
            await interaction.editReply('An error occurred while processing the request.');
        }
    }
};
```

### Roblox Luau

```lua
local RankingAPI = require(game.ServerScriptService.RankingAPI)

-- Set rank by player object
local result = RankingAPI:SetPlayerRankByName(player, "Member")

-- Set rank by user ID
local result = RankingAPI:SetRank(12345678, 10)

-- Promote player
local result = RankingAPI:PromotePlayer(player)

-- Demote by user ID
local result = RankingAPI:Demote(12345678)

-- Get player's rank
local info = RankingAPI:GetPlayerRank(player)
print(info.rankName, info.rank)

-- Get all roles
local roles = RankingAPI:GetRoles()
for _, role in ipairs(roles.roles) do
    print(role.name, role.rank)
end
```

---

## Rate Limiting

Default: 30 requests per 15 minutes per IP address.

When rate limited, you will receive:

```json
{
  "success": false,
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

Configure the limit with the `RATE_LIMIT_MAX` environment variable.
