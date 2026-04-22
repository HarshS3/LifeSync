export class VoiceNutritionLogger {
  constructor(apiBase, token) {
    this.apiBase = apiBase;
    this.token = token;
    this.sessionId = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  // Uses the browser's MediaRecorder to capture audio
  async startRecording(onChunk = null) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        if (onChunk) onChunk(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  async stopRecordingAndTranscribe() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) return resolve({ transcript: '', confidence: 0 });

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

        try {
          // Attempt browser native STT if possible before fallback
          // But for now, we just push to the robust server fallback:
          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice.webm');

          const response = await fetch(`${this.apiBase}/api/stt`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.token}`,
            },
            body: formData,
          });

          if (!response.ok) {
             const err = await response.json();
             throw new Error(err.error || 'Server transcription failed');
          }

          const { transcript, provider } = await response.json();
          resolve({ transcript, confidence: 1.0, provider }); // Google STT
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
      // Stop all tracks to unlock the mic
      this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
    });
  }

  // Posts the transcript to our new ReAct Node backend
  async sendToAgent(transcript) {
    const response = await fetch(`${this.apiBase}/api/ai/nutrition-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.token}`
      },
      body: JSON.stringify({ 
         message: transcript,
         sessionId: this.sessionId
      })
    });

    if (!response.ok) {
       throw new Error("Chat Agent Request Failed");
    }

    const result = await response.json();
    
    // Save session id if the backend generated it to keep loop going
    if (result.sessionId) {
      this.sessionId = result.sessionId;
    }
    
    if (result.isComplete) {
       this.sessionId = null; // reset for next meal block
    }

    return result; 
  }

  speak(text) {
     return new Promise((resolve) => {
         const ut = new SpeechSynthesisUtterance(text);
         ut.rate = 1.0;
         ut.onend = resolve;
         window.speechSynthesis.speak(ut);
     });
  }
}