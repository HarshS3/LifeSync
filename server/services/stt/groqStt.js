const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data'); // I will assume they might need to install this or I'll use a trick

async function groqRecognize({ buffer, mimeType }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  // Ensure temp directory exists
  const tempDir = path.join(__dirname, '../../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const ext = mimeType.includes('webm') ? 'webm' : 
              mimeType.includes('ogg') ? 'ogg' : 
              mimeType.includes('m4a') || mimeType.includes('mp4') ? 'm4a' : 'wav';
  const tempPath = path.join(tempDir, `stt_${Date.now()}.${ext}`);
  fs.writeFileSync(tempPath, buffer);

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempPath));
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');

    const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders(),
      },
    });

    return {
      transcript: response.data.text || '',
      raw: response.data,
      provider: 'groq',
    };
  } catch (err) {
    console.error('[Groq STT] Error:', err.response?.data || err.message);
    throw new Error(err.response?.data?.error?.message || 'Groq STT transcription failed');
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (e) {}
    }
  }
}

module.exports = { groqRecognize };
