// api/setRank.js
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json()); // Umožňuje Expressu parsovat JSON těla požadavků

// Tato část je pouze pro LOKÁLNÍ TESTOVÁNÍ.
// Na Vercelu se proměnné prostředí načítají automaticky.
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// --- Konfigurace ---
// Tyto hodnoty se načítají z Vercel Environment Variables (nebo .env lokálně)
const ROBLOX_OPEN_CLOUD_API_KEY = process.env.ROBLOX_OPEN_CLOUD_API_KEY;
const GROUP_ID = process.env.GROUP_ID; // Zde bude ID vaší Roblox skupiny
// -------------------

// Základní kontrola, zda jsou klíče nastaveny
if (!ROBLOX_OPEN_CLOUD_API_KEY || !GROUP_ID) {
    console.error("CHYBA: ROBLOX_OPEN_CLOUD_API_KEY nebo GROUP_ID nejsou nastaveny v proměnných prostředí.");
    // V produkci na Vercelu toto způsobí chybu 500, pokud proměnné chybí
    // V lokálním vývoji byste toto měl/a nastavit v .env souboru.
}

// Endpoint pro změnu ranku uživatele
app.post('/setRank', async (req, res) => {
    const { userId, desiredRankId } = req.body;

    // Validace vstupu
    if (typeof userId !== 'number' || typeof desiredRankId !== 'number') {
        return res.status(400).json({ success: false, message: 'Invalid input: userId and desiredRankId must be numbers.' });
    }
    if (!ROBLOX_OPEN_CLOUD_API_KEY || !GROUP_ID) {
         return res.status(500).json({ success: false, message: 'Server configuration error: API Key or Group ID missing.' });
    }

    console.log(`Received request to set rank for UserID: ${userId} to RoleID: ${desiredRankId} in GroupID: ${GROUP_ID}`);

    try {
        const response = await axios.patch(
            `https://groups.roblox.com/v1/groups/${GROUP_ID}/users/${userId}`,
            { roleId: desiredRankId },
            {
                headers: {
                    'x-api-key': ROBLOX_OPEN_CLOUD_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Roblox API vrací 200 OK i pro některé chyby, proto kontrolujeme tělo odpovědi
        // Důležité: Open Cloud API vrací spíše chyby HTTP status kódem, ale je dobré kontrolovat i obsah
        if (response.status === 200) {
            console.log(`Successfully updated rank for UserID: ${userId}`);
            return res.json({ success: true, message: 'Rank updated successfully', data: response.data });
        } else {
            console.warn(`Roblox API returned status ${response.status} for UserID: ${userId}. Response data:`, response.data);
            return res.status(response.status).json({ success: false, message: 'Failed to update rank', error: response.data });
        }

    } catch (error) {
        console.error('Error updating rank:', error.message);
        if (error.response) {
            // Pokud je chyba z Axiosu (HTTP chyba z Roblox API)
            console.error('Roblox API Error Response:', error.response.data);
            if (error.response.status === 400) {
                return res.status(400).json({ success: false, message: 'Bad Request to Roblox API. Check Group ID or Role ID.', error: error.response.data });
            } else if (error.response.status === 401) {
                return res.status(401).json({ success: false, message: 'Unauthorized: Invalid Open Cloud API Key.', error: error.response.data });
            } else if (error.response.status === 403) {
                 return res.status(403).json({ success: false, message: 'Forbidden: API Key lacks necessary permissions or User is not in group.', error: error.response.data });
            } else if (error.response.status === 404) {
                return res.status(404).json({ success: false, message: 'Not Found: Group or User may not exist.', error: error.response.data });
            } else {
                return res.status(500).json({ success: false, message: 'Roblox API error', error: error.response.data });
            }
        } else if (error.request) {
            // Požadavek byl odeslán, ale nepřišla žádná odpověď
            return res.status(500).json({ success: false, message: 'No response from Roblox API.', error: error.message });
        } else {
            // Něco jiného se pokazilo
            return res.status(500).json({ success: false, message: 'Server-side error', error: error.message });
        }
    }
});

// Pro Vercel serverless functions je důležité exportovat `app` nebo handler.
// Vercel automaticky spustí exportovanou Express aplikaci.
module.exports = app;

// Pokud chcete lokálně testovat jako samostatný server (nepovinné)
// Pokud tento kód hostujete na Vercelu, tato část se nespustí.
if (require.main === module) {
    const LOCAL_PORT = process.env.PORT || 3000;
    app.listen(LOCAL_PORT, () => {
        console.log(`Local server listening at http://localhost:${LOCAL_PORT}`);
        console.log("NOTE: This local server setup is for testing only. On Vercel, this is a serverless function.");
    });
}
