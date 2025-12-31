// Smoke test for Gemini provider wiring.
// Usage (PowerShell):
//   $env:LLM_PROVIDER='gemini'; $env:GEMINI_API_KEY='...'; node .\scripts\dev_gemini_smoke.js
// Optional:
//   $env:GEMINI_MODEL='gemini-1.5-flash'

(async () => {
  try {
    // Load server/.env if present (Node scripts don't load it automatically).
    try {
      const path = require('path');
      require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    } catch {
      // ignore
    }

    if (!process.env.LLM_PROVIDER) process.env.LLM_PROVIDER = 'gemini';

    const provider = String(process.env.LLM_PROVIDER || '').trim().toLowerCase();
    if (provider !== 'gemini') {
      console.error(`[dev_gemini_smoke] LLM_PROVIDER must be 'gemini' (got '${provider || 'empty'}')`);
      process.exitCode = 2;
      return;
    }

    const key = String(process.env.GEMINI_API_KEY || '').trim();
    if (!key) {
      console.error('[dev_gemini_smoke] GEMINI_API_KEY is not set.');
      console.error('Set it in server/.env or in your shell env vars, then re-run.');
      process.exitCode = 2;
      return;
    }

    const { generateLLMReply } = require('../aiClient');

    const reply = await generateLLMReply({
      message: "Reply with exactly: ok",
      memoryContext: '',
      systemPrompt: 'Return exactly the token ok. No punctuation. No extra words.',
      history: [],
    });

    if (!reply) {
      console.error('[dev_gemini_smoke] Gemini call returned null.');
      console.error('Likely causes: invalid key, blocked network, invalid model name, or API quota/permission.');
      process.exitCode = 1;
      return;
    }

    console.log('[dev_gemini_smoke] success reply:', reply);
    process.exitCode = 0;
  } catch (err) {
    console.error('[dev_gemini_smoke] failed:', err?.message || err);
    process.exitCode = 1;
  }
})();
