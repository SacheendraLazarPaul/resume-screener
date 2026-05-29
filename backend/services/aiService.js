import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

// ── Provider state ────────────────────────────────────────────
export let lastUsedProvider = 'none';
let autoDetectedProvider = null;   // set once on first successful health-check
let providerHealth = {};           // { groq: true, gemini: false, ... }

// ── Helper: is a key real (not placeholder)? ─────────────────
function hasKey(key) {
  return key && key.length > 10 && !key.includes('YOUR') && !key.includes('...');
}

// ── Individual callers ────────────────────────────────────────

async function callGemini(systemPrompt, userPrompt) {
  if (!hasKey(process.env.GEMINI_API_KEY)) throw new Error('Gemini key missing');
  // Gemini keys always start with "AIza" — reject wrong format early
  if (!process.env.GEMINI_API_KEY.startsWith('AIza')) {
    throw new Error('Gemini key invalid (must start with AIza) — get one at https://aistudio.google.com/app/apikey');
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1500,
      responseMimeType: 'application/json',
    },
  });
  const result = await model.generateContent(userPrompt);
  return result.response.text()
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .trim();
}

async function callGroq(systemPrompt, userPrompt) {
  if (!hasKey(process.env.GROQ_API_KEY)) throw new Error('Groq key missing');
  const res = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.1,
    },
    { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
  );
  return res.data.choices[0].message.content;
}

async function callOpenRouter(systemPrompt, userPrompt) {
  if (!hasKey(process.env.OPENROUTER_API_KEY)) throw new Error('OpenRouter key missing');
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.1,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
        'X-Title': 'Resume Screener',
      },
    }
  );
  return res.data.choices[0].message.content;
}

async function callOllama(systemPrompt, userPrompt) {
  const base  = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL    || 'llama3';
  const res = await axios.post(`${base}/api/chat`, {
    model,
    stream: false,
    format: 'json',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
  });
  return res.data.message.content;
}

// ── Call one provider by name ─────────────────────────────────
async function callProvider(name, systemPrompt, userPrompt) {
  switch (name) {
    case 'gemini':     return callGemini(systemPrompt, userPrompt);
    case 'groq':       return callGroq(systemPrompt, userPrompt);
    case 'openrouter': return callOpenRouter(systemPrompt, userPrompt);
    case 'ollama':     return callOllama(systemPrompt, userPrompt);
    default: throw new Error(`Unknown provider: ${name}`);
  }
}

// ── Auto-detect: test all providers, pick first that works ───
// Called once at startup. Result cached in autoDetectedProvider.
export async function detectBestProvider() {
  const testPrompt = 'Reply with exactly this JSON: {"ok":true}';
  const candidates = ['groq', 'gemini', 'openrouter', 'ollama'];

  console.log('\n[AI] 🔍 Auto-detecting best available provider...');
  providerHealth = {};

  for (const name of candidates) {
    try {
      await callProvider(name, 'You are a test assistant.', testPrompt);
      providerHealth[name] = true;
      console.log(`[AI] ✅ ${name} — OK`);
      if (!autoDetectedProvider) {
        autoDetectedProvider = name;
        lastUsedProvider = name;
      }
    } catch (err) {
      providerHealth[name] = false;
      console.log(`[AI] ❌ ${name} — ${err.message}`);
    }
  }

  if (autoDetectedProvider) {
    console.log(`[AI] 🎯 Best provider: ${autoDetectedProvider}\n`);
  } else {
    console.warn('[AI] ⚠️  No providers available! Check your API keys in backend/.env\n');
  }

  return autoDetectedProvider;
}

// ── Main dispatcher — auto-selects + falls back ───────────────
export async function callAI(systemPrompt, userPrompt) {
  // Priority: env-specified > auto-detected > any working
  const preferred = (process.env.AI_PROVIDER || '').toLowerCase();
  const candidates = ['groq', 'gemini', 'openrouter', 'ollama'];

  const tryOrder = [
    preferred,
    autoDetectedProvider,
    ...candidates,
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i); // dedupe

  const errors = [];
  for (const provider of tryOrder) {
    // Skip providers already known to be down (from startup check)
    if (providerHealth[provider] === false) {
      errors.push(`${provider}: skipped (failed health check)`);
      continue;
    }
    try {
      console.log(`[AI] Trying: ${provider}`);
      const result = await callProvider(provider, systemPrompt, userPrompt);
      lastUsedProvider = provider;
      providerHealth[provider] = true;
      console.log(`[AI] ✅ Used: ${provider}`);
      return result;
    } catch (err) {
      providerHealth[provider] = false;
      console.warn(`[AI] ❌ ${provider}: ${err.message}`);
      errors.push(`${provider}: ${err.message}`);
    }
  }

  throw new Error(`All AI providers failed:\n${errors.join('\n')}`);
}

// ── Status info for API + frontend ───────────────────────────
export function getProviderInfo() {
  const models = {
    gemini:     process.env.GEMINI_MODEL      || 'gemini-2.0-flash',
    groq:       process.env.GROQ_MODEL        || 'llama-3.3-70b-versatile',
    openrouter: process.env.OPENROUTER_MODEL  || 'meta-llama/llama-3.1-8b-instruct:free',
    ollama:     process.env.OLLAMA_MODEL      || 'llama3',
  };
  const active = lastUsedProvider !== 'none' ? lastUsedProvider : autoDetectedProvider || 'none';
  return {
    provider: active,
    model: models[active] || 'unknown',
    free: true,
    health: providerHealth,
    autoDetected: autoDetectedProvider,
  };
}

// ── Full health status for /api/providers endpoint ───────────
export function getAllProvidersStatus() {
  const configs = {
    groq: {
      name: 'Groq',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      hasKey: hasKey(process.env.GROQ_API_KEY),
      healthy: providerHealth['groq'] ?? null,
      getKeyUrl: 'https://console.groq.com',
      free: true,
    },
    gemini: {
      name: 'Google Gemini',
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      hasKey: hasKey(process.env.GEMINI_API_KEY) && process.env.GEMINI_API_KEY?.startsWith('AIza'),
      healthy: providerHealth['gemini'] ?? null,
      getKeyUrl: 'https://aistudio.google.com/app/apikey',
      free: true,
    },
    openrouter: {
      name: 'OpenRouter',
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
      hasKey: hasKey(process.env.OPENROUTER_API_KEY),
      healthy: providerHealth['openrouter'] ?? null,
      getKeyUrl: 'https://openrouter.ai',
      free: true,
    },
    ollama: {
      name: 'Ollama (Local)',
      model: process.env.OLLAMA_MODEL || 'llama3',
      hasKey: true, // no key needed
      healthy: providerHealth['ollama'] ?? null,
      getKeyUrl: 'https://ollama.com/download',
      free: true,
    },
  };
  return configs;
}
