// api/index.js
const noblox = require('noblox.js');
const axios = require('axios');
const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE;
const GROUP_ID = parseInt(process.env.GROUP_ID);
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
if (!ROBLOX_COOKIE) {
    console.error("CHYBA: ROBLOX_COOKIE není nastaven v proměnných prostředí!");
}
if (isNaN(GROUP_ID)) {
    console.error("CHYBA: GROUP_ID není nastaven nebo není platné číslo v proměnných prostředí!");
}
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        console.log(`Method Not Allowed: ${req.method}. Only POST requests are accepted.`);
        return res.status(405).json({ success: false, message: 'Method Not Allowed. Only POST requests are accepted.' });
    }
    if (!req.body) {
        console.log('Missing request body.');
        return res.status(400).json({ success: false, message: 'Missing request body.' });
    }
    const { userId, desiredRankId } = req.body;
    if (typeof userId !== 'number' || typeof desiredRankId !== 'number') {
        console.log(`Invalid input: userId (${userId}) or desiredRankId (${desiredRankId}) must be numbers.`);
        return res.status(400).json({ success: false, message: 'Invalid input: userId and desiredRankId must be numbers.' });
    }
    if (!ROBLOX_COOKIE || isNaN(GROUP_ID)) {
         console.error("Server configuration error: ROBLOX_COOKIE or GROUP_ID missing/invalid.");
         return res.status(500).json({ success: false, message: 'Server configuration error.' });
    }
 console.log(`Received request to set rank for UserID: ${userId} to RoleID: ${desiredRankId} in GroupID: ${GROUP_ID}`);
  try {
       await noblox.setCookie(ROBLOX_COOKIE);
       await noblox.setRank(GROUP_ID, userId, desiredRankId);
if (DISCORD_WEBHOOK_URL) {
    try {
        const embed = {
            title: "User Rank Changed",
            description: `**Player** *${userId}* *(UserID: ${userId})* **was ranked to rank:** *${desiredRankId}*.`,
            color: 65280,
            fields: [
                { name: "UserID", value: userId.toString(), inline: true },
                { name: "New Rank ID", value: desiredRankId.toString(), inline: true }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: "*made by premeek*" }
        };
        const webhookPayload = {
            username: "aldertRanking",
            embeds: [embed]
        };
        await axios.post(DISCORD_WEBHOOK_URL, webhookPayload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('Discord webhook notification sent.');
    } catch (discordError) {
        console.error('Error while sending Discord notification: ', discordError.message);
    }
}
        console.log(`Successfully changed users: ${userId} rank to: ${desiredRankId}`);
        return res.status(200).json({ success: true, message: 'Rank updated successfully.' });
    } catch (error) {
        console.error(`Error while changing user's: ${userId} rank:`, error.message);
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
