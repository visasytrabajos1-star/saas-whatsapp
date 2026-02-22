const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

// --- CONFIGURATION ---
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GENAI_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const CACHE_TTL = 3600; // 1 hour

// Load Constitution
const CONSTITUTION_PATH = path.resolve(__dirname, '../../CONSTITUCION_ALEXANDRA.md');
let BASE_CONSTITUTION = "";
try {
    BASE_CONSTITUTION = fs.readFileSync(CONSTITUTION_PATH, 'utf8');
} catch (e) {
    console.warn("⚠️ Constitution file not found. Using default.");
}

// Cache Key Generator
const getCacheKey = (message, botId) => 
    crypto.createHash('md5').update(`${botId}:${message}`).digest('hex');

class AlexBrain {
    constructor() {
        this.geminiKey = GEMINI_KEY;
        this.openaiKey = OPENAI_KEY;
        this.deepseekKey = DEEPSEEK_KEY;
    }

    async generateResponse(params) {
        const { message, history = [], botConfig = {}, conversationId } = params;
        
        // 1. CHECK CACHE (High Performance)
        const cacheKey = getCacheKey(message, botConfig.id || 'default');
        const cached = global.responseCache?.get(cacheKey);
        if (cached) {
            console.log('⚡ [CACHE HIT]');
            return { ...cached, fromCache: true };
        }

        const startTime = Date.now();
        let responseText = null;
        let usedModel = "none";
        let tier = "FREE";

        const fullPrompt = this._buildPrompt(botConfig);

        // 2. FALLBACK CHAIN
        try {
            // Primary: Gemini Flash
            responseText = await this._tryGemini(message, history, fullPrompt);
            if (responseText) usedModel = "gemini-1.5-flash";
        } catch (e) {
            console.warn("⚠️ Gemini failed, trying DeepSeek...");
        }

        // Fallback 1: DeepSeek
        if (!responseText && this.deepseekKey) {
            try {
                responseText = await this._tryDeepSeek(message, history, fullPrompt);
                if (responseText) { usedModel = "deepseek-chat"; tier = "LOW COST"; }
            } catch (e) {
                console.warn("⚠️ DeepSeek failed, trying OpenAI...");
            }
        }

        // Fallback 2: OpenAI Mini
        if (!responseText && this.openaiKey) {
            try {
                responseText = await this._tryOpenAI(message, history, fullPrompt);
                if (responseText) { usedModel = "gpt-4o-mini"; tier = "PAID"; }
            } catch (e) {
                console.error("❌ All AI providers failed!");
            }
        }

        // Final Safeguard
        if (!responseText) {
            responseText = "Alex IO está procesando tu solicitud, dame un momento.";
            usedModel = "safeguard";
        }

        const result = {
            text: responseText,
            trace: {
                model: usedModel,
                tier: tier,
                responseTime: Date.now() - startTime,
                fromCache: false
            }
        };

        // SAVE TO CACHE
        try {
            global.responseCache?.set(cacheKey, result, CACHE_TTL);
        } catch (e) { /* ignore cache errors */ }

        return result;
    }

    _buildPrompt(config) {
        let prompt = BASE_CONSTITUTION + "\n\n";
        if (config.constitution) prompt += `📜 LEYES ESPECÍFICAS:\n${config.constitution}\n\n`;
        if (config.system_prompt) prompt += `👤 PERSONA:\n${config.system_prompt}\n\n`;
        return prompt;
    }

    async _tryGemini(message, history, systemPrompt) {
        if (!this.geminiKey) return null;
        
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${this.geminiKey}`;
        
        const contents = history.slice(-6).map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content || h.text }]
        }));
        contents.push({ role: 'user', parts: [{ text: message }] });

        const res = await axios.post(url, {
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
        }, { timeout: 8000 });

        return res.data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    async _tryDeepSeek(message, history, systemPrompt) {
        if (!this.deepseekKey) return null;
        
        const res = await axios.post('https://api.deepseek.com/chat/completions', {
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                ...history.slice(-6),
                { role: "user", content: message }
            ]
        }, { headers: { 'Authorization': `Bearer ${this.deepseekKey}` }, timeout: 8000 });

        return res.data.choices[0].message.content;
    }

    async _tryOpenAI(message, history, systemPrompt) {
        if (!this.openaiKey) return null;
        
        const res = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...history.slice(-6),
                { role: "user", content: message }
            ]
        }, { headers: { 'Authorization': `Bearer ${this.openaiKey}` }, timeout: 10000 });

        return res.data.choices[0].message.content;
    }
}

// Initialize Global Cache
const NodeCache = require('node-cache');
global.responseCache = new NodeCache({ stdTTL: 1800, checkperiod: 300 });

module.exports = new AlexBrain();
