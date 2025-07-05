// api/index.js
const noblox = require('noblox.js');
const axios = require('axios');

// --- CONFIGURATION (loaded from Vercel Environment Variables) ---
const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE;
const GROUP_ID = parseInt(process.env.GROUP_ID);
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
// -----------------------------------------------------------

// Basic configuration check (runs on function start-up)
if (!ROBLOX_COOKIE) {
    console.error("ERROR: ROBLOX_COOKIE environment variable is not set!");
}
if (isNaN(GROUP_ID)) {
    console.error("ERROR: GROUP_ID is not set or is not a valid number in environment variables!");
}
if (!DISCORD_WEBHOOK_URL) {
    console.warn("Warning: DISCORD_WEBHOOK_URL is not set in environment variables. Discord notifications will not be sent.");
}

module.exports = async (req, res) => {
    // Check HTTP method
    if (req.method !== 'POST') {
        console.log(`Method Not Allowed: ${req.method}. Only POST requests are accepted.`);
        return res.status(405).json({ success: false, message: 'Method Not Allowed. Only POST requests are accepted.' });
    }

    // Vercel automatically parses JSON if Content-Type is application/json
    if (!req.body) {
        console.log('Missing request body.');
        return res.status(400).json({ success: false, message: 'Missing request body.' });
    }

    const { targetUserID, desiredRankId, initiatorUserID, initiatorUsername } = req.body;

    // Input validation
    if (typeof targetUserID !== 'number' || typeof desiredRankId !== 'number' ||
        typeof initiatorUserID !== 'number' || typeof initiatorUsername !== 'string') {
        console.log(`Invalid input: Check types -> targetUserID: ${typeof targetUserID}, desiredRankId: ${typeof desiredRankId}, initiatorUserID: ${typeof initiatorUserID}, initiatorUsername: ${typeof initiatorUsername}.`);
        return res.status(400).json({ success: false, message: 'Invalid input: All user IDs and rank ID must be numbers, initiator username a string.' });
    }

    // Check for critical environment variables before proceeding
    if (!ROBLOX_COOKIE || isNaN(GROUP_ID)) {
         console.error("Server configuration error: ROBLOX_COOKIE or GROUP_ID missing/invalid.");
         return res.status(500).json({ success: false, message: 'Server configuration error.' });
    }

    console.log(`Received request from ${initiatorUsername} (${initiatorUserID}) to set rank for target UserID: ${targetUserID} to RoleID: ${desiredRankId} in GroupID: ${GROUP_ID}`);

    try {
        // IMPORTANT: On Vercel (stateless), we must set the cookie on EVERY CALL.
        await noblox.setCookie(ROBLOX_COOKIE);

        // Change the rank
        await noblox.setRank(GROUP_ID, targetUserID, desiredRankId);

        console.log(`Successfully changed rank for target UserID ${targetUserID} to RankID ${desiredRankId}.`);

        // Send Discord webhook notification
        if (DISCORD_WEBHOOK_URL) {
            try {
                const embed = {
                    title: "Roblox Rank Changed!",
                    description: `Player **${initiatorUsername}** (ID: ${initiatorUserID}) changed rank for user **${targetUserID}** to Role ID: **${desiredRankId}** in group **${GROUP_ID}**.`,
                    color: 65280, // Green color (RGB)
                    fields: [
                        { name: "Target UserID", value: targetUserID.toString(), inline: true },
                        { name: "New Rank ID", value: desiredRankId.toString(), inline: true },
                        { name: "Initiator (UserID)", value: initiatorUserID.toString(), inline: true },
                        { name: "Initiator (Username)", value: initiatorUsername || "Unknown", inline: true }
                    ],
                    timestamp: new Date().toISOString(),
                    footer: { text: "Roblox Ranking Bot by Premeek" }
                };

                const webhookPayload = {
                    username: "Roblox Rank Bot",
                    avatar_url: "https://www.roblox.com/favicon.ico",
                    embeds: [embed]
                };

                await axios.post(DISCORD_WEBHOOK_URL, webhookPayload, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                console.log('Discord webhook notification sent.');

            } catch (discordError) {
                console.error('Error while sending Discord webhook notification:', discordError.message);
                // This error should not prevent sending a successful Roblox response
            }
        }

        // FINAL SUCCESS RESPONSE TO ROBLOX
        return res.status(200).json({ success: true, message: 'Rank updated successfully.' });

    } catch (error) {
        console.error(`Error while changing rank for target UserID ${targetUserID} (catch block):`, error.message);

        // Handle errors from noblox.js/Roblox API
        if (error.message.includes("Invalid security cookie")) {
            return res.status(401).json({ success: false, message: "Authentication failed: Invalid Roblox cookie.", error: error.message });
        } else if (error.message.includes("Roblox responded with status code 403")) {
            return res.status(403).json({ success: false, message: "Roblox API Forbidden: Check group permissions or user status.", error: error.message });
        } else if (error.message.includes("Rate Limit")) {
            return res.status(429).json({ success: false, message: "Roblox API Rate Limited. Try again later.", error: error.message });
        } else {
            return res.status(500).json({ success: false, message: `Server-side error during ranking: ${error.message}`, error: error.message });
        }
    }
};
