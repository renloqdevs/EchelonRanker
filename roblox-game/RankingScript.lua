--[[
    ╔═══════════════════════════════════════════════════════════╗
    ║           ROBLOX GROUP RANKING BOT - GAME SCRIPT          ║
    ╠═══════════════════════════════════════════════════════════╣
    ║  This script connects your Roblox game to your ranking    ║
    ║  bot API. Place this in ServerScriptService.              ║
    ╚═══════════════════════════════════════════════════════════╝
    
    SETUP INSTRUCTIONS:
    1. Change API_URL to your Railway deployment URL
    2. Change API_KEY to match your .env API_KEY
    3. Put this script in ServerScriptService
    4. Use the RankingAPI module from other scripts
    
    SECURITY WARNING:
    - NEVER put this script in a LocalScript or anywhere clients can see
    - Keep your API_KEY secret
    - This script should only be in ServerScriptService
--]]

-- ============================================
-- CONFIGURATION - CHANGE THESE VALUES
-- ============================================

local CONFIG = {
    -- Your ranking bot API URL (from Railway)
    -- Example: "https://your-app-name.up.railway.app"
    API_URL = "https://YOUR-APP-NAME.up.railway.app",
    
    -- Your API key (must match the API_KEY in your .env file)
    API_KEY = "your-api-key-here",
    
    -- Request timeout in seconds
    TIMEOUT = 30,
    
    -- Enable debug prints
    DEBUG = true,
    
    -- Retry settings
    MAX_RETRIES = 3,
    RETRY_DELAY = 2, -- seconds between retries
    
    -- Rate limiting (requests per minute)
    RATE_LIMIT = 30,
    
    -- Queue settings
    ENABLE_QUEUE = true,
    MAX_QUEUE_SIZE = 50
}

-- ============================================
-- DO NOT EDIT BELOW THIS LINE
-- ============================================

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

-- Module table
local RankingAPI = {}

-- Internal state
local requestQueue = {}
local isProcessingQueue = false
local requestCount = 0
local lastResetTime = tick()

-- Debug print function
local function debugPrint(...)
    if CONFIG.DEBUG then
        print("[RankingAPI]", ...)
    end
end

-- Rate limiting check
local function checkRateLimit()
    local now = tick()
    
    -- Reset counter every minute
    if now - lastResetTime >= 60 then
        requestCount = 0
        lastResetTime = now
    end
    
    if requestCount >= CONFIG.RATE_LIMIT then
        local waitTime = 60 - (now - lastResetTime)
        debugPrint("Rate limited, waiting", math.ceil(waitTime), "seconds")
        return false, waitTime
    end
    
    return true, 0
end

-- Make HTTP request with retry logic
local function makeRequestWithRetry(endpoint, method, body, retryCount)
    retryCount = retryCount or 0
    
    local url = CONFIG.API_URL .. endpoint
    
    local headers = {
        ["Content-Type"] = "application/json",
        ["x-api-key"] = CONFIG.API_KEY
    }
    
    local requestOptions = {
        Url = url,
        Method = method,
        Headers = headers
    }
    
    if body then
        requestOptions.Body = HttpService:JSONEncode(body)
    end
    
    debugPrint("Request:", method, endpoint, retryCount > 0 and ("(retry " .. retryCount .. ")") or "")
    
    -- Check rate limit
    local canRequest, waitTime = checkRateLimit()
    if not canRequest then
        task.wait(waitTime)
    end
    
    requestCount = requestCount + 1
    
    local success, response = pcall(function()
        return HttpService:RequestAsync(requestOptions)
    end)
    
    if not success then
        debugPrint("HTTP Error:", response)
        
        -- Retry on network errors
        if retryCount < CONFIG.MAX_RETRIES then
            debugPrint("Retrying in", CONFIG.RETRY_DELAY, "seconds...")
            task.wait(CONFIG.RETRY_DELAY * (retryCount + 1)) -- Exponential backoff
            return makeRequestWithRetry(endpoint, method, body, retryCount + 1)
        end
        
        return {
            success = false,
            error = "HTTP request failed",
            message = tostring(response),
            retries = retryCount
        }
    end
    
    debugPrint("Response Status:", response.StatusCode)
    
    -- Retry on server errors (5xx)
    if response.StatusCode >= 500 and retryCount < CONFIG.MAX_RETRIES then
        debugPrint("Server error, retrying in", CONFIG.RETRY_DELAY, "seconds...")
        task.wait(CONFIG.RETRY_DELAY * (retryCount + 1))
        return makeRequestWithRetry(endpoint, method, body, retryCount + 1)
    end
    
    local responseData
    local decodeSuccess, decodeResult = pcall(function()
        return HttpService:JSONDecode(response.Body)
    end)
    
    if decodeSuccess then
        responseData = decodeResult
    else
        debugPrint("JSON Decode Error:", decodeResult)
        return {
            success = false,
            error = "Failed to parse response",
            message = response.Body
        }
    end
    
    return responseData
end

-- Legacy wrapper for compatibility
local function makeRequest(endpoint, method, body)
    return makeRequestWithRetry(endpoint, method, body, 0)
end

-- ============================================
-- QUEUE SYSTEM
-- ============================================

-- Add request to queue
local function queueRequest(endpoint, method, body, callback)
    if #requestQueue >= CONFIG.MAX_QUEUE_SIZE then
        debugPrint("Queue full, dropping oldest request")
        table.remove(requestQueue, 1)
    end
    
    table.insert(requestQueue, {
        endpoint = endpoint,
        method = method,
        body = body,
        callback = callback,
        timestamp = tick()
    })
    
    debugPrint("Request queued, queue size:", #requestQueue)
end

-- Process queue
local function processQueue()
    if isProcessingQueue or #requestQueue == 0 then return end
    
    isProcessingQueue = true
    
    while #requestQueue > 0 do
        local request = table.remove(requestQueue, 1)
        
        local result = makeRequest(request.endpoint, request.method, request.body)
        
        if request.callback then
            task.spawn(request.callback, result)
        end
        
        -- Small delay between requests
        task.wait(0.1)
    end
    
    isProcessingQueue = false
end

-- Start queue processor
if CONFIG.ENABLE_QUEUE then
    task.spawn(function()
        while true do
            processQueue()
            task.wait(1)
        end
    end)
end

-- ============================================
-- PUBLIC API FUNCTIONS
-- ============================================

--[[
    Set a player's rank by their UserId
    @param userId (number) - The player's Roblox UserId
    @param rank (number) - The rank number to set
    @return (table) - Response from the API
    
    Example:
        local result = RankingAPI:SetRank(12345678, 5)
        if result.success then
            print("Ranked player to", result.newRankName)
        end
--]]
function RankingAPI:SetRank(userId, rank)
    return makeRequest("/api/rank", "POST", {
        userId = userId,
        rank = rank
    })
end

--[[
    Set a player's rank by role name
    @param userId (number) - The player's Roblox UserId
    @param rankName (string) - The name of the role to set
    @return (table) - Response from the API
    
    Example:
        local result = RankingAPI:SetRankByName(12345678, "Member")
        if result.success then
            print("Ranked player to", result.newRankName)
        end
--]]
function RankingAPI:SetRankByName(userId, rankName)
    return makeRequest("/api/rank", "POST", {
        userId = userId,
        rankName = rankName
    })
end

--[[
    Promote a player by one rank
    @param userId (number) - The player's Roblox UserId
    @return (table) - Response from the API
    
    Example:
        local result = RankingAPI:Promote(12345678)
        if result.success then
            print("Promoted player from", result.oldRankName, "to", result.newRankName)
        end
--]]
function RankingAPI:Promote(userId)
    return makeRequest("/api/promote", "POST", {
        userId = userId
    })
end

--[[
    Demote a player by one rank
    @param userId (number) - The player's Roblox UserId
    @return (table) - Response from the API
    
    Example:
        local result = RankingAPI:Demote(12345678)
        if result.success then
            print("Demoted player from", result.oldRankName, "to", result.newRankName)
        end
--]]
function RankingAPI:Demote(userId)
    return makeRequest("/api/demote", "POST", {
        userId = userId
    })
end

--[[
    Get a player's current rank
    @param userId (number) - The player's Roblox UserId
    @return (table) - Response from the API
    
    Example:
        local result = RankingAPI:GetRank(12345678)
        if result.success then
            print("Player rank:", result.rankName, "(", result.rank, ")")
        end
--]]
function RankingAPI:GetRank(userId)
    return makeRequest("/api/rank/" .. tostring(userId), "GET", nil)
end

--[[
    Get all roles in the group
    @return (table) - Response from the API with roles array
    
    Example:
        local result = RankingAPI:GetRoles()
        if result.success then
            for _, role in ipairs(result.roles) do
                print(role.rank, role.name, role.canAssign and "(can assign)" or "")
            end
        end
--]]
function RankingAPI:GetRoles()
    return makeRequest("/api/roles", "GET", nil)
end

--[[
    Check if the API is online
    @return (boolean) - True if API is responding
    
    Example:
        if RankingAPI:IsOnline() then
            print("Ranking API is online!")
        end
--]]
function RankingAPI:IsOnline()
    local response = makeRequest("/health", "GET", nil)
    return response and response.status == "ok"
end

--[[
    Get detailed API health information
    @return (table) - Response from the API with health details
    
    Example:
        local health = RankingAPI:GetHealth()
        if health.status == "ok" then
            print("Uptime:", health.uptime, "seconds")
        end
--]]
function RankingAPI:GetHealth()
    return makeRequest("/health", "GET", nil)
end

-- ============================================
-- QUEUED OPERATIONS (NON-BLOCKING)
-- ============================================

--[[
    Queue a rank change (non-blocking)
    @param userId (number) - The player's Roblox UserId
    @param rank (number) - The rank number to set
    @param callback (function) - Optional callback when complete
    
    Example:
        RankingAPI:QueueSetRank(12345678, 5, function(result)
            if result.success then
                print("Rank changed!")
            end
        end)
--]]
function RankingAPI:QueueSetRank(userId, rank, callback)
    if not CONFIG.ENABLE_QUEUE then
        local result = self:SetRank(userId, rank)
        if callback then callback(result) end
        return
    end
    
    queueRequest("/api/rank", "POST", {
        userId = userId,
        rank = rank
    }, callback)
end

--[[
    Queue a promotion (non-blocking)
    @param userId (number) - The player's Roblox UserId
    @param callback (function) - Optional callback when complete
--]]
function RankingAPI:QueuePromote(userId, callback)
    if not CONFIG.ENABLE_QUEUE then
        local result = self:Promote(userId)
        if callback then callback(result) end
        return
    end
    
    queueRequest("/api/promote", "POST", {
        userId = userId
    }, callback)
end

--[[
    Queue a demotion (non-blocking)
    @param userId (number) - The player's Roblox UserId
    @param callback (function) - Optional callback when complete
--]]
function RankingAPI:QueueDemote(userId, callback)
    if not CONFIG.ENABLE_QUEUE then
        local result = self:Demote(userId)
        if callback then callback(result) end
        return
    end
    
    queueRequest("/api/demote", "POST", {
        userId = userId
    }, callback)
end

--[[
    Get the current queue size
    @return (number) - Number of pending requests
--]]
function RankingAPI:GetQueueSize()
    return #requestQueue
end

--[[
    Clear the request queue
--]]
function RankingAPI:ClearQueue()
    requestQueue = {}
    debugPrint("Queue cleared")
end

-- ============================================
-- CONVENIENCE FUNCTIONS FOR PLAYER OBJECTS
-- ============================================

--[[
    Set a Player's rank (accepts Player instance)
    @param player (Player) - The player object
    @param rank (number) - The rank number to set
    @return (table) - Response from the API
--]]
function RankingAPI:SetPlayerRank(player, rank)
    if not player or not player:IsA("Player") then
        return { success = false, error = "Invalid player" }
    end
    return self:SetRank(player.UserId, rank)
end

--[[
    Set a Player's rank by name (accepts Player instance)
    @param player (Player) - The player object
    @param rankName (string) - The name of the role to set
    @return (table) - Response from the API
--]]
function RankingAPI:SetPlayerRankByName(player, rankName)
    if not player or not player:IsA("Player") then
        return { success = false, error = "Invalid player" }
    end
    return self:SetRankByName(player.UserId, rankName)
end

--[[
    Promote a Player (accepts Player instance)
    @param player (Player) - The player object
    @return (table) - Response from the API
--]]
function RankingAPI:PromotePlayer(player)
    if not player or not player:IsA("Player") then
        return { success = false, error = "Invalid player" }
    end
    return self:Promote(player.UserId)
end

--[[
    Demote a Player (accepts Player instance)
    @param player (Player) - The player object
    @return (table) - Response from the API
--]]
function RankingAPI:DemotePlayer(player)
    if not player or not player:IsA("Player") then
        return { success = false, error = "Invalid player" }
    end
    return self:Demote(player.UserId)
end

--[[
    Get a Player's rank (accepts Player instance)
    @param player (Player) - The player object
    @return (table) - Response from the API
--]]
function RankingAPI:GetPlayerRank(player)
    if not player or not player:IsA("Player") then
        return { success = false, error = "Invalid player" }
    end
    return self:GetRank(player.UserId)
end

-- ============================================
-- INITIALIZATION
-- ============================================

-- Validate configuration on load
if CONFIG.API_URL == "https://YOUR-APP-NAME.up.railway.app" then
    warn("[RankingAPI] WARNING: You need to set your API_URL in the CONFIG!")
end

if CONFIG.API_KEY == "your-api-key-here" then
    warn("[RankingAPI] WARNING: You need to set your API_KEY in the CONFIG!")
end

-- Check if HttpService is enabled
local httpEnabled = pcall(function()
    HttpService:GetAsync("https://httpbin.org/get")
end)

if not httpEnabled then
    warn("[RankingAPI] WARNING: HTTP Requests are not enabled!")
    warn("[RankingAPI] Go to Game Settings > Security > Allow HTTP Requests")
end

debugPrint("Module loaded successfully")

return RankingAPI


--[[
    ╔═══════════════════════════════════════════════════════════╗
    ║                    EXAMPLE USAGE                          ║
    ╚═══════════════════════════════════════════════════════════╝
    
    -- In another ServerScript:
    
    local RankingAPI = require(game.ServerScriptService.RankingScript)
    
    -- Example 1: Rank a player when they touch a part
    local rankPart = workspace.RankPart -- A part in the workspace
    
    rankPart.Touched:Connect(function(hit)
        local player = game.Players:GetPlayerFromCharacter(hit.Parent)
        if player then
            local result = RankingAPI:SetPlayerRankByName(player, "Member")
            if result.success then
                print("Ranked", player.Name, "to Member!")
            else
                warn("Failed to rank:", result.message)
            end
        end
    end)
    
    -- Example 2: Promote command (for admin scripts)
    local function promotePlayer(adminPlayer, targetPlayer)
        -- Check if admin has permission (implement your own check)
        local result = RankingAPI:PromotePlayer(targetPlayer)
        if result.success then
            print(targetPlayer.Name, "was promoted to", result.newRankName)
        end
    end
    
    -- Example 3: Check rank on join
    game.Players.PlayerAdded:Connect(function(player)
        local rankInfo = RankingAPI:GetPlayerRank(player)
        if rankInfo.success then
            print(player.Name, "joined with rank:", rankInfo.rankName)
        end
    end)
--]]
