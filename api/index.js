// api/index.js
const noblox = require('noblox.js');
const axios = require('axios'); // <-- PŘIDEJTE TENTO ŘÁDEK

// --- KONFIGURACE (načteno z Vercel Environment Variables) ---
const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE;
const GROUP_ID = parseInt(process.env.GROUP_ID);
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL; // <-- PŘIDEJTE TENTO ŘÁDEK
// -----------------------------------------------------------

if (!ROBLOX_COOKIE) {
    console.error("CHYBA: ROBLOX_COOKIE není nastaven v proměnných prostředí!");
}
if (isNaN(GROUP_ID)) {
    console.error("CHYBA: GROUP_ID není nastaven nebo není platné číslo v proměnných prostředí!");
}
// -----------------------------------------------------------

module.exports = async (req, res) => {
    // Zde kontrolujeme HTTP metodu
    if (req.method !== 'POST') {
        console.log(`Method Not Allowed: ${req.method}. Only POST requests are accepted.`);
        return res.status(405).json({ success: false, message: 'Method Not Allowed. Only POST requests are accepted.' });
    }

    // Vercel automaticky parsuje JSON, pokud je Content-Type application/json
    if (!req.body) {
        console.log('Missing request body.');
        return res.status(400).json({ success: false, message: 'Missing request body.' });
    }

    const { userId, desiredRankId } = req.body;

    // Validace vstupu
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
        // DŮLEŽITÉ: Na Vercelu (stateless) musíme nastavit cookie PŘI KAŽDÉM VOLÁNÍ.
        await noblox.setCookie(ROBLOX_COOKIE);
        // Volitelně: Můžete si vypsat aktuálního uživatele pro kontrolu
        // let currentUser = await noblox.getCurrentUser();
        // console.log(`Přihlášen jako: ${currentUser.UserName}`);

        // Změna ranku
        await noblox.setRank(GROUP_ID, userId, desiredRankId);

        console.log(`Úspěšně změněn rank pro UserID ${userId} na RankID ${desiredRankId}`);
        return res.status(200).json({ success: true, message: 'Rank updated successfully.' });

    } catch (error) {
        console.error(`Chyba při změně ranku pro UserID ${userId}:`, error.message);
        // noblox.js chyby mohou být různé (např. invalid cookie, rate limit, user not in group)
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
