import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import SendIcon from '@mui/icons-material/Send'
import MicIcon from '@mui/icons-material/Mic'
import StopIcon from '@mui/icons-material/Stop'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'

function ChatPanel() {
  const { token } = useAuth()
  const [messages, setMessages] = useState([
    {
      from: 'ai',
      text: 'Hi! I can help you understand your wellness patterns and make better decisions. What would you like to know?',
    },
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [pendingVoiceConfirm, setPendingVoiceConfirm] = useState(null)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const autoStopTimerRef = useRef(null)

  const speechRecognitionRef = useRef(null)
  const voiceActiveRef = useRef(false)
  const voiceTextRef = useRef('')
  const submitOnStopRef = useRef(false)

  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current)

      try {
        voiceActiveRef.current = false
        submitOnStopRef.current = false
        speechRecognitionRef.current?.stop?.()
      } catch {
        // ignore
      }

      try {
        mediaRecorderRef.current?.stop?.()
      } catch {
        // ignore
      }
      try {
        streamRef.current?.getTracks?.().forEach((t) => t.stop())
      } catch {
        // ignore
      }
    }
  }, [])

  const sendMessageText = async (text, { skipIngestion = false } = {}) => {
    const trimmed = String(text || '').trim()
    if (!trimmed || isSending) return

    setMessages((prev) => [...prev, { from: 'user', text: trimmed }])
    setInput('')
    setIsSending(true)

    try {
      const history = [...messages, { from: 'user', text: trimmed }]
        .filter((m) => m && (m.from === 'user' || m.from === 'ai') && typeof m.text === 'string')
        .slice(-12)
        .map((m) => ({
          role: m.from === 'user' ? 'user' : 'assistant',
          content: m.text,
        }))

      const headers = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      console.log('[ChatPanel] Sending with token:', token ? 'YES' : 'NO TOKEN')
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: trimmed, history, skipIngestion }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { from: 'ai', text: data.reply || 'Let me think about that...' }])
    } catch {
      setMessages((prev) => [...prev, { from: 'system', text: 'Could not connect. Please try again.' }])
    } finally {
      setIsSending(false)
    }
  }

  const sendMessage = async () => sendMessageText(input)

  const previewChatIngestion = async (text) => {
    if (!token) return null
    const trimmed = String(text || '').trim()
    if (!trimmed) return null

    try {
      const res = await fetch(`${API_BASE}/api/chat-ingestion/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) return null
      return json
    } catch {
      return null
    }
  }

  const commitChatIngestion = async (text) => {
    if (!token) return null
    const trimmed = String(text || '').trim()
    if (!trimmed) return null

    const res = await fetch(`${API_BASE}/api/chat-ingestion/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: trimmed }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(json?.error || `Commit failed (${res.status})`)
    }
    return json
  }

  const beginVoiceConfirmFlow = async (transcript) => {
    const t = String(transcript || '').trim()
    if (!t) return

    // If user is not signed in, we can still send the message, but can't auto-log.
    if (!token) {
      await sendMessageText(t)
      return
    }

    const preview = await previewChatIngestion(t)
    const updates = Array.isArray(preview?.updates) ? preview.updates : []
    if (!updates.length) {
      // Nothing to log; proceed as a normal chat message.
      await sendMessageText(t, { skipIngestion: true })
      return
    }

    // Hold for user confirmation.
    setPendingVoiceConfirm({ transcript: t, preview })
  }

  const stopRecording = ({ submit = true } = {}) => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }

    // For browser STT: short pauses can end recognition; we only want to submit when user explicitly stops.
    voiceActiveRef.current = false
    submitOnStopRef.current = Boolean(submit)

    try {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop()
      }
    } catch {
      // ignore
    }

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    } catch {
      // ignore
    }
  }

  const getSpeechRecognitionCtor = () => {
    return (
      window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      null
    )
  }

  const startBrowserStt = async () => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return false
    if (isListening || isRecording || isTranscribing || isSending) return true

    if (!token) {
      setMessages((prev) => [
        ...prev,
        { from: 'system', text: 'Voice works, but sign in if you want it to auto-log across the app.' },
      ])
    }

    try {
      const rec = new Ctor()
      speechRecognitionRef.current = rec
      rec.lang = navigator?.language || 'en-US'
      rec.interimResults = true
      // Some browsers still stop on short pauses; we'll auto-restart in onend when voiceActiveRef is true.
      rec.continuous = true

      // Start fresh dictation but preserve any existing text in the box.
      voiceActiveRef.current = true
      const prefix = String(input || '').trim()
      voiceTextRef.current = prefix ? `${prefix} ` : ''

      rec.onstart = () => {
        setIsListening(true)
      }

      rec.onresult = (event) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const r = event.results[i]
          const t = r?.[0]?.transcript ? String(r[0].transcript) : ''
          if (r.isFinal) voiceTextRef.current += t
          else interim += t
        }
        // Show live transcription in the input box so user sees what's happening.
        const combined = `${voiceTextRef.current} ${interim}`.trim()
        if (combined) setInput(combined)
      }

      rec.onerror = () => {
        setIsListening(false)
        speechRecognitionRef.current = null
        setMessages((prev) => [...prev, { from: 'system', text: 'Voice recognition failed in this browser. Falling back to audio upload.' }])
      }

      rec.onend = async () => {
        setIsListening(false)
        speechRecognitionRef.current = null

        const transcript = String(voiceTextRef.current || '').trim() || String(input || '').trim()
        if (transcript) setInput(transcript)

        // Only submit when the user explicitly presses Stop.
        if (submitOnStopRef.current && transcript) {
          submitOnStopRef.current = false
          voiceTextRef.current = ''
          setInput('')
          await beginVoiceConfirmFlow(transcript)
          return
        }

        // If still in dictation mode, auto-restart so short pauses don't end the session.
        if (voiceActiveRef.current) {
          setTimeout(() => {
            if (!voiceActiveRef.current) return
            // Restart a new recognition session and keep appending into the same input.
            startBrowserStt().catch(() => {
              // ignore
            })
          }, 250)
        }
      }

      rec.start()
      return true
    } catch {
      setIsListening(false)
      speechRecognitionRef.current = null
      return false
    }
  }

  const startRecording = async () => {
    // Prefer browser STT for free + fast.
    const startedBrowser = await startBrowserStt()
    if (startedBrowser) return

    // Fallback: record audio and upload to server STT.
    if (!token) {
      setMessages((prev) => [...prev, { from: 'system', text: 'Please sign in to use voice transcription.' }])
      return
    }
    if (isRecording || isTranscribing || isSending) return
    if (!navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessages((prev) => [...prev, { from: 'system', text: 'Voice input is not supported in this browser.' }])
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const preferredMime = 'audio/webm;codecs=opus'
      const mr = MediaRecorder.isTypeSupported?.(preferredMime)
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e?.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      mr.onstop = async () => {
        setIsRecording(false)
        try {
          streamRef.current?.getTracks?.().forEach((t) => t.stop())
        } catch {
          // ignore
        }
        streamRef.current = null

        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        chunksRef.current = []
        if (blob.size < 256) return

        setIsTranscribing(true)
        try {
          const fd = new FormData()
          fd.append('audio', blob, 'voice.webm')

          const res = await fetch(`${API_BASE}/api/stt`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: fd,
          })

          const json = await res.json().catch(() => null)
          if (!res.ok) {
            throw new Error(json?.error || `Transcription failed (${res.status})`)
          }

          const transcript = String(json?.transcript || '').trim()
          if (!transcript) {
            setMessages((prev) => [...prev, { from: 'system', text: 'I couldn\'t hear anything clearly—try again a bit closer to the mic.' }])
            return
          }

          // Only submit on explicit stop; otherwise just fill the input.
          if (submitOnStopRef.current) {
            submitOnStopRef.current = false
            await beginVoiceConfirmFlow(transcript)
          } else {
            setInput((prev) => {
              const p = String(prev || '').trim()
              if (!p) return transcript
              return `${p} ${transcript}`.trim()
            })
          }
        } catch (e) {
          setMessages((prev) => [...prev, { from: 'system', text: e?.message || 'Voice transcription failed. Please try again.' }])
        } finally {
          setIsTranscribing(false)
        }
      }

      setIsRecording(true)
      mr.start()

      // Auto-stop after 25s to keep requests small.
      autoStopTimerRef.current = setTimeout(() => {
        autoStopTimerRef.current = null
        // Timeout is not an explicit user submit.
        stopRecording({ submit: false })
      }, 25_000)
    } catch {
      setIsRecording(false)
      try {
        streamRef.current?.getTracks?.().forEach((t) => t.stop())
      } catch {
        // ignore
      }
      streamRef.current = null
      setMessages((prev) => [...prev, { from: 'system', text: 'Microphone permission denied or unavailable.' }])
    }
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#fff',
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}
    >
      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {messages.map((m, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                gap: 2,
                flexDirection: m.from === 'user' ? 'row-reverse' : 'row',
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: m.from === 'user' ? '#171717' : '#f3f4f6',
                  color: m.from === 'user' ? '#fff' : '#6b7280',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {m.from === 'user' ? 'U' : 'L'}
              </Avatar>
              <Box sx={{ maxWidth: '70%' }}>
                <Typography
                  variant="body2"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: m.from === 'user' ? '#171717' : '#f9fafb',
                    color: m.from === 'user' ? '#fff' : '#374151',
                    lineHeight: 1.6,
                  }}
                >
                  {m.text}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Input */}
      <Box sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1,
            border: '1px solid #e5e7eb',
            borderRadius: 2,
            bgcolor: '#fff',
            '&:focus-within': {
              borderColor: '#171717',
            },
          }}
        >
          <TextField
            variant="standard"
            placeholder="Ask about your wellness, training, or goals..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !pendingVoiceConfirm && (e.preventDefault(), sendMessage())}
            fullWidth
            InputProps={{
              disableUnderline: true,
              sx: { px: 1, fontSize: '0.938rem' },
            }}
          />
          <IconButton
            onClick={isRecording || isListening ? () => stopRecording({ submit: true }) : startRecording}
            disabled={isTranscribing || isSending}
            sx={{
              bgcolor: isRecording || isListening ? '#fee2e2' : '#f3f4f6',
              color: isRecording || isListening ? '#b91c1c' : '#111827',
              width: 36,
              height: 36,
              '&:hover': { bgcolor: isRecording || isListening ? '#fecaca' : '#e5e7eb' },
              '&.Mui-disabled': { bgcolor: '#f3f4f6', color: '#9ca3af' },
            }}
            title={isRecording || isListening ? 'Stop voice' : 'Voice input'}
          >
            {isRecording || isListening ? <StopIcon sx={{ fontSize: 18 }} /> : <MicIcon sx={{ fontSize: 18 }} />}
          </IconButton>
          <IconButton
            onClick={sendMessage}
            disabled={isSending || !input.trim() || Boolean(pendingVoiceConfirm)}
            sx={{
              bgcolor: '#171717',
              color: '#fff',
              width: 36,
              height: 36,
              '&:hover': { bgcolor: '#262626' },
              '&.Mui-disabled': { bgcolor: '#e5e7eb', color: '#9ca3af' },
            }}
          >
            <SendIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {pendingVoiceConfirm && (
          <Box
            sx={{
              mt: 1.5,
              p: 1.5,
              borderRadius: 2,
              border: '1px solid #e5e7eb',
              bgcolor: '#fafafa',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              I picked up some loggable details from your voice note. Save them?
            </Typography>

            <Typography variant="body2" sx={{ color: '#111827' }}>
              {pendingVoiceConfirm.transcript}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                sx={{ bgcolor: '#171717', textTransform: 'none', '&:hover': { bgcolor: '#262626' } }}
                disabled={isSending || isTranscribing}
                onClick={async () => {
                  const t = pendingVoiceConfirm.transcript
                  try {
                    await commitChatIngestion(t)
                  } catch (e) {
                    setMessages((prev) => [...prev, { from: 'system', text: e?.message || 'Could not save those updates.' }])
                    setPendingVoiceConfirm(null)
                    return
                  }
                  setPendingVoiceConfirm(null)
                  await sendMessageText(t, { skipIngestion: true })
                }}
              >
                Save & Send
              </Button>

              <Button
                variant="outlined"
                size="small"
                sx={{ textTransform: 'none', borderColor: '#d1d5db', color: '#111827' }}
                disabled={isSending || isTranscribing}
                onClick={async () => {
                  const t = pendingVoiceConfirm.transcript
                  setPendingVoiceConfirm(null)
                  await sendMessageText(t, { skipIngestion: true })
                }}
              >
                Send only
              </Button>

              <Button
                variant="text"
                size="small"
                sx={{ textTransform: 'none', color: '#6b7280' }}
                disabled={isSending || isTranscribing}
                onClick={() => setPendingVoiceConfirm(null)}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default ChatPanel
