// api/index.js - PŘÍMÝ VERCEL HANDLER
const axios = require('axios');

// Konfigurace (načteno z Vercel Environment Variables)
const ROBLOX_OPEN_CLOUD_API_KEY = process.env.ROBLOX_OPEN_CLOUD_API_KEY;
const GROUP_ID = process.env.GROUP_ID;

// Hlavní handler pro serverless funkci
module.exports = async (req, res) => {
    // Kontrola HTTP metody
    if (req.method !== 'POST') {
        console.log(`Method Not Allowed: ${req.method}. Only POST requests are accepted.`);
        return res.status(405).json({ success: false, message: 'Method Not Allowed. Only POST requests are accepted.' });
    }

    // Kontrola těla požadavku
    if (!req.body) {
        console.log('Missing request body.');
        return res.status(400).json({ success: false, message: 'Missing request body.' });
    }

    // Získání dat z těla požadavku (Vercel automaticky parsuje JSON, pokud je Content-Type application/json)
    const { userId, desiredRankId } = req.body;

    // Validace vstupu
    if (typeof userId !== 'number' || typeof desiredRankId !== 'number') {
        console.log(`Invalid input: userId (${userId}) or desiredRankId (${desiredRankId}) must be numbers.`);
        return res.status(400).json({ success: false, message: 'Invalid input: userId and desiredRankId must be numbers.' });
    }
    if (!ROBLOX_OPEN_CLOUD_API_KEY || !GROUP_ID) {
        console.error('Server configuration error: API Key or Group ID missing.');
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

        if (response.status === 200) {
            console.log(`Successfully updated rank for UserID: ${userId}. Roblox API Response Data:`, response.data);
            return res.status(200).json({ success: true, message: 'Rank updated successfully', data: response.data });
        } else {
            console.warn(`Roblox API returned status ${response.status} for UserID: ${userId}. Response data:`, response.data);
            return res.status(response.status).json({ success: false, message: 'Failed to update rank', error: response.data });
        }

    } catch (error) {
        console.error('Error updating rank (catch block):', error.message);
        if (error.response) {
            // Chyba z Axiosu (HTTP chyba z Roblox API)
            console.error('Roblox API Error Response Data:', error.response.data);
            return res.status(error.response.status || 500).json({ success: false, message: 'Roblox API error', error: error.response.data });
        } else if (error.request) {
            // Požadavek byl odeslán, ale nepřišla žádná odpověď (např. síťová chyba)
            console.error('No response received from Roblox API:', error.message);
            return res.status(500).json({ success: false, message: 'No response from Roblox API.', error: error.message });
        } else {
            // Něco jiného se pokazilo před odesláním požadavku
            console.error('Server-side error before request:', error.message);
            return res.status(500).json({ success: false, message: 'Server-side error', error: error.message });
        }
    }
};
