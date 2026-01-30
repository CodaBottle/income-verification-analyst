import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import "dotenv/config";
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { GoogleGenAI, Type } from "@google/genai";
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
// CORS - restrict to same origin in production
app.use(cors({
    origin: process.env.CORS_ORIGIN || true, // Set CORS_ORIGIN env var to restrict
    credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
// Require password to be set in environment
const INCOME_VERIFIER_PASSWORD = process.env.INCOME_VERIFIER_PASSWORD;
if (!INCOME_VERIFIER_PASSWORD) {
    console.error("FATAL: INCOME_VERIFIER_PASSWORD environment variable is required");
    process.exit(1);
}
// ===== RATE LIMITING =====
// Rate limit stores
const authAttempts = new Map();
const analyzeAttempts = new Map();
const globalApiAttempts = new Map();
// Rate limit configurations
const AUTH_RATE_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 }; // 5 attempts per 15 min
const ANALYZE_RATE_LIMIT = { maxAttempts: 10, windowMs: 60 * 60 * 1000 }; // 10 per hour (expensive Gemini calls)
const GLOBAL_API_RATE_LIMIT = { maxAttempts: 100, windowMs: 60 * 1000 }; // 100 per minute
// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of authAttempts) {
        if (now > entry.resetAt)
            authAttempts.delete(key);
    }
    for (const [key, entry] of analyzeAttempts) {
        if (now > entry.resetAt)
            analyzeAttempts.delete(key);
    }
    for (const [key, entry] of globalApiAttempts) {
        if (now > entry.resetAt)
            globalApiAttempts.delete(key);
    }
}, 5 * 60 * 1000);
// Generic rate limit checker
function checkRateLimit(store, key, config) {
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + config.windowMs });
        return { allowed: true, remaining: config.maxAttempts - 1 };
    }
    if (entry.count >= config.maxAttempts) {
        return {
            allowed: false,
            remaining: 0,
            retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        };
    }
    entry.count++;
    return { allowed: true, remaining: config.maxAttempts - entry.count };
}
// ===== END RATE LIMITING =====
// Session store (in-memory, tokens expire after 24 hours)
const sessions = new Map();
const SESSION_TTL = 24 * 60 * 60 * 1000;
// Clean expired sessions every hour
setInterval(() => {
    const now = Date.now();
    for (const [token, expiry] of sessions) {
        if (now > expiry)
            sessions.delete(token);
    }
}, 60 * 60 * 1000);
// Auth middleware
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.slice(7);
    const expiry = sessions.get(token);
    if (!expiry || Date.now() > expiry) {
        sessions.delete(token);
        return res.status(401).json({ error: 'Session expired' });
    }
    next();
};
// Get client IP for rate limiting
function getClientIp(req) {
    const cfIp = req.headers['cf-connecting-ip'];
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof cfIp === 'string')
        return cfIp;
    if (typeof forwardedFor === 'string')
        return forwardedFor.split(',')[0].trim();
    return req.ip || 'unknown';
}
// Global rate limiting middleware for all API routes
app.use('/api', (req, res, next) => {
    const clientIp = getClientIp(req);
    const result = checkRateLimit(globalApiAttempts, clientIp, GLOBAL_API_RATE_LIMIT);
    // Set rate limit headers
    res.set('X-RateLimit-Limit', String(GLOBAL_API_RATE_LIMIT.maxAttempts));
    res.set('X-RateLimit-Remaining', String(result.remaining));
    if (!result.allowed) {
        res.set('Retry-After', String(result.retryAfter || 60));
        return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    next();
});
// Auth endpoint with rate limiting
app.post('/api/auth', (req, res) => {
    const clientIp = getClientIp(req);
    const now = Date.now();
    // Check rate limit
    const attempt = authAttempts.get(clientIp);
    if (attempt) {
        if (now < attempt.resetAt) {
            if (attempt.count >= AUTH_RATE_LIMIT.maxAttempts) {
                const retryAfter = Math.ceil((attempt.resetAt - now) / 1000);
                res.set('Retry-After', String(retryAfter));
                return res.status(429).json({ error: 'Too many attempts. Try again later.' });
            }
            attempt.count++;
        }
        else {
            attempt.count = 1;
            attempt.resetAt = now + AUTH_RATE_LIMIT.windowMs;
        }
    }
    else {
        authAttempts.set(clientIp, { count: 1, resetAt: now + AUTH_RATE_LIMIT.windowMs });
    }
    const { password } = req.body;
    if (password === INCOME_VERIFIER_PASSWORD) {
        // Reset rate limit on successful login
        authAttempts.delete(clientIp);
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, Date.now() + SESSION_TTL);
        res.json({ success: true, token });
    }
    else {
        res.status(401).json({ success: false, error: 'Invalid password' });
    }
});
// 2024 Federal Poverty Level guidelines (48 contiguous states + DC)
const FEDERAL_POVERTY_LEVELS = {
    1: 15060, 2: 20440, 3: 25820, 4: 31200,
    5: 36580, 6: 41960, 7: 47340, 8: 52720,
};
const FPL_ADDITIONAL_PERSON_AMOUNT = 5380;
// API endpoint (now protected with rate limiting)
app.post('/api/analyze', requireAuth, async (req, res) => {
    try {
        // Strict rate limiting for expensive Gemini API calls (10 per hour)
        const clientIp = getClientIp(req);
        const analyzeLimit = checkRateLimit(analyzeAttempts, clientIp, ANALYZE_RATE_LIMIT);
        if (!analyzeLimit.allowed) {
            res.set('Retry-After', String(analyzeLimit.retryAfter || 3600));
            res.set('X-RateLimit-Limit', String(ANALYZE_RATE_LIMIT.maxAttempts));
            res.set('X-RateLimit-Remaining', '0');
            return res.status(429).json({
                error: 'Analysis rate limit exceeded. Maximum 10 analyses per hour.',
                retryAfter: analyzeLimit.retryAfter,
            });
        }
        const { files, householdSize } = req.body;
        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ message: 'No files provided.' });
        }
        if (!householdSize || typeof householdSize !== 'number' || householdSize < 1) {
            return res.status(400).json({ message: 'Valid household size is required.' });
        }
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ message: 'API key not configured' });
        }
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        let povertyLevel = householdSize <= 8
            ? FEDERAL_POVERTY_LEVELS[householdSize]
            : FEDERAL_POVERTY_LEVELS[8] + (FPL_ADDITIONAL_PERSON_AMOUNT * (householdSize - 8));
        const povertyThreshold = povertyLevel * 2;
        const prompt = `
      You are an expert financial analyst specializing in verifying income for government assistance programs. Your task is to determine if an applicant's household income is at or below 200% of the Federal Poverty Level (FPL).

      The applicant has indicated their household size is: ${householdSize} person(s).

      Based on the 2024 FPL guidelines for the 48 contiguous states and D.C., the 100% FPL for this household size is: $${povertyLevel.toLocaleString()}
      The 200% FPL threshold for this household is: $${povertyThreshold.toLocaleString()}

      Analyze the provided document(s) and perform the following steps:
      1. Identify the type of document(s) provided.
      2. Cross-verify numbers if multiple documents are present. Prioritize official documents over self-reported numbers.
      3. Extract the applicant's final, verified annual gross income. Only include base pay or regular wages. Exclude overtime, bonus, commission, or other non-recurring payments.
      4. Compare the applicant's annual income to the 200% FPL threshold.
      5. If the document confirms participation in SNAP, TANF, WIC, or Medicaid, the applicant is automatically eligible.

      Return your analysis ONLY in the specified JSON format.
    `;
        const fileParts = files.map((file) => ({
            inlineData: { mimeType: file.mimeType, data: file.data },
        }));
        const geminiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [{ text: prompt }, ...fileParts] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isEligible: { type: Type.BOOLEAN },
                        annualIncome: { type: Type.NUMBER },
                        reasoning: { type: Type.STRING },
                        documentType: { type: Type.STRING },
                    },
                    required: ["isEligible", "annualIncome", "reasoning", "documentType"]
                },
            },
        });
        const result = JSON.parse(geminiResponse.text.trim());
        res.json({ ...result, householdSize, povertyLevel, povertyThreshold });
    }
    catch (error) {
        console.error("API error:", error);
        // Don't expose internal error details to client
        res.status(500).json({ message: 'Failed to analyze documents. Please try again.' });
    }
});
// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
