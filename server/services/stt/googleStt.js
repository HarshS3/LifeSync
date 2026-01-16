const DEFAULT_LANGUAGE = String(process.env.GOOGLE_STT_LANGUAGE_CODE || 'en-US').trim() || 'en-US';

function inferGoogleEncoding(mimeType) {
  const m = String(mimeType || '').toLowerCase();
  if (m.includes('webm')) return 'WEBM_OPUS';
  if (m.includes('ogg')) return 'OGG_OPUS';
  if (m.includes('wav')) return 'LINEAR16';
  return 'ENCODING_UNSPECIFIED';
}

function joinTranscript(sttJson) {
  const results = Array.isArray(sttJson?.results) ? sttJson.results : [];
  const parts = [];
  for (const r of results) {
    const alt = Array.isArray(r?.alternatives) ? r.alternatives[0] : null;
    const t = alt?.transcript ? String(alt.transcript) : '';
    if (t.trim()) parts.push(t.trim());
  }
  return parts.join(' ').trim();
}

async function googleRecognize({ buffer, mimeType, languageCode = DEFAULT_LANGUAGE }) {
  const apiKey = String(process.env.GOOGLE_STT_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('GOOGLE_STT_API_KEY is not set');
    err.code = 'MISSING_STT_KEY';
    throw err;
  }

  if (typeof fetch !== 'function') {
    const err = new Error('Global fetch() is not available. Use Node 18+ or polyfill fetch.');
    err.code = 'FETCH_UNAVAILABLE';
    throw err;
  }

  const audioContent = Buffer.from(buffer).toString('base64');
  const encoding = inferGoogleEncoding(mimeType);

  const url = `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(apiKey)}`;
  const body = {
    config: {
      languageCode,
      enableAutomaticPunctuation: true,
      model: 'latest_short',
      useEnhanced: true,
      encoding: encoding === 'ENCODING_UNSPECIFIED' ? undefined : encoding,
    },
    audio: {
      content: audioContent,
    },
  };

  // Remove undefineds for cleaner payload
  if (!body.config.encoding) delete body.config.encoding;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.error?.message || `STT request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.details = json;
    throw err;
  }

  return {
    transcript: joinTranscript(json),
    raw: json,
    provider: 'google',
  };
}

module.exports = {
  googleRecognize,
};
