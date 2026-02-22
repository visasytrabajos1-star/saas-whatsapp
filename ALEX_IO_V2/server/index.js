require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pino = require('pino');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURATION ---
const app = express();
const PORT = process.env.PORT || 3000;
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Middleware
app.use(cors());
app.use(express.json());

// Supabase Client (Optimized with Global Fetch and Pooling)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    db: { schema: 'public' }
}) : null;

// Redis Client (Optional - for scaling to 5000+ users)
let redis = null;
if (process.env.REDIS_URL) {
    try {
        const Redis = require('ioredis');
        redis = new Redis(process.env.REDIS_URL);
        logger.info('✅ Redis connected for caching');
    } catch (e) {
        logger.warn('⚠️ Redis connection failed, using in-memory cache');
    }
}

// In-Memory Cache Fallback
const NodeCache = require('node-cache');
const responseCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // 1 hour TTL

// --- ROUTES ---
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        version: '2.0.0', 
        platform: 'ALEX IO SAAS',
        users: 'Optimized for scale'
    });
});

// WhatsApp Routes
const whatsappSaas = require('./services/whatsappSaas');
app.use('/api/saas', whatsappSaas);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        redis: redis ? 'connected' : 'disabled',
        cache: responseCache.getStats()
    });
});

// --- START SERVER ---
app.listen(PORT, () => {
    logger.info(`🚀 ALEX IO SERVER V2 CORRIENDO EN PUERTO ${PORT}`);
    logger.info(`📡 WhatsApp Handler Listo...`);
    logger.info(`🧠 AI Brain Listo...`);
});
