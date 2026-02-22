const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const fs = require('fs');
const pino = require('pino');
const express = require('express');
const router = express.Router();
const alexBrain = require('./alexBrain');

// Session Management
const activeSessions = new Map();
const clientConfigs = new Map();
const sessionsDir = './sessions';

if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

// --- HANDLER: QR MODE (Baileys) ---
async function handleQRMessage(sock, msg, instanceId) {
    if (!msg.message || msg.key.remoteJid === 'status@broadcast' || msg.key.fromMe) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text) return;

    const config = clientConfigs.get(instanceId) || { companyName: 'ALEX IO' };
    const remoteJid = msg.key.remoteJid;

    try {
        await sock.readMessages([msg.key]);
        await sock.sendPresenceUpdate('composing', remoteJid);

        // Generate AI Response
        const result = await alexBrain.generateResponse({
            message: text,
            history: [],
            botConfig: {
                bot_name: config.companyName,
                system_prompt: config.customPrompt || 'Eres ALEX IO, asistente virtual inteligente.'
            }
        });

        if (result.text) {
            await sock.sendMessage(remoteJid, { text: result.text });
            console.log(`📤 [${config.companyName}] Respondido con ${result.trace.model}`);
        }
    } catch (err) {
        console.error('❌ Error handling message:', err.message);
    }
}

// --- CONNECT FUNCTION ---
async function connectToWhatsApp(instanceId, config, res = null) {
    const sessionPath = `${sessionsDir}/${instanceId}`;
    clientConfigs.set(instanceId, config);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'fatal' }),
        browser: ['ALEX IO', 'Chrome', '120.0.04'],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000
    });

    activeSessions.set(instanceId, sock);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && res && !res.headersSent) {
            QRCode.toDataURL(qr, (err, url) => {
                if (!err) res.json({ success: true, qr_code: url, instance_id: instanceId });
            });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) setTimeout(() => connectToWhatsApp(instanceId, config, null), 5000);
        } else if (connection === 'open') {
            console.log(`✅ ${config.companyName} ONLINE!`);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) await handleQRMessage(sock, msg, instanceId);
    });

    return sock;
}

// --- ENDPOINTS ---

// Connect WhatsApp (QR)
router.post('/connect', async (req, res) => {
    const { companyName, customPrompt } = req.body;
    const instanceId = `alex_${Date.now()}`;
    
    try {
        await connectToWhatsApp(instanceId, { companyName, customPrompt }, res);
        setTimeout(() => { if (!res.headersSent) res.status(408).json({ error: 'Timeout waiting for QR.' }); }, 20000);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Disconnect
router.post('/disconnect', (req, res) => {
    const { instanceId } = req.body;
    if (activeSessions.has(instanceId)) {
        activeSessions.get(instanceId).logout();
        activeSessions.delete(instanceId);
        clientConfigs.delete(instanceId);
        try { fs.rmSync(`./sessions/${instanceId}`, { recursive: true, force: true }); } catch(e){}
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Instance not found' });
    }
});

// Webhook for Cloud API (360Dialog / Meta)
router.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

router.post('/webhook', async (req, res) => {
    const body = req.body;
    if (body.object) {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const messages = changes?.value?.messages;

        if (messages && messages[0]) {
            const msg = messages[0];
            const from = msg.from;
            const text = msg.text?.body;
            
            if (text) {
                const result = await alexBrain.generateResponse({
                    message: text,
                    botConfig: { bot_name: 'ALEX IO SaaS', system_prompt: 'Eres ALEX IO.' }
                });

                // Here you would send the message back via 360Dialog/Meta API
                console.log(`📩 [Cloud] ${from}: ${text} -> ${result.text.substring(0, 30)}...`);
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// Status
router.get('/status', (req, res) => {
    res.json({ 
        active_sessions: activeSessions.size,
        uptime: process.uptime(),
        cache_stats: global.responseCache?.getStats()
    });
});

module.exports = router;
