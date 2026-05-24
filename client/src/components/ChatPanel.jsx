import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import SendIcon from '@mui/icons-material/Send'
import MicIcon from '@mui/icons-material/Mic'
import StopIcon from '@mui/icons-material/Stop'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import UndoIcon from '@mui/icons-material/Undo'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import ScaleIcon from '@mui/icons-material/Scale'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import HistoryIcon from '@mui/icons-material/History'
import { useAuth } from '../context/AuthContext'
import MealTemplates from './MealTemplates'
import { API_BASE } from '../config'
import { VoiceNutritionLogger } from '../services/voiceNutritionLogger'
import PhotoLogFlow from './PhotoLogFlow'

// ── quick-action chips ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Log a meal', icon: <RestaurantIcon sx={{ fontSize: 14 }} />, prefix: '' },
  { label: 'Log water',  icon: <WaterDropIcon  sx={{ fontSize: 14 }} />, prefix: 'Drank ' },
  { label: 'Log weight', icon: <ScaleIcon       sx={{ fontSize: 14 }} />, prefix: 'My weight today is ' },
  { label: 'Quick Relog', icon: <HistoryIcon sx={{ fontSize: 14 }} />, prefix: '' },
]

function ChatPanel() {
  const { token } = useAuth()
  const [messages, setMessages] = useState([
    {
      id: 'init',
      from: 'ai',
      text: 'Hi! Tell me what you ate, ask about your wellness patterns, or use the quick actions below to log in seconds.',
    },
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const handleMealTemplateRelog = (payload) => {
    setMessages(prev => [...prev, {
      id: `ai-${Date.now()}`,
      from: 'ai',
      text: `Great! I've logged your ${payload.mealName || 'meal'} (${payload.totalCalories} kcal).`,
      foodLogged: true,
      committedMealId: { logId: payload.logId, mealIndex: payload.mealIndex }
    }]);
  };
  const [showPhotoLog, setShowPhotoLog] = useState(false);
  const [showMealTemplates, setShowMealTemplates] = useState(false);
  const [undoingId, setUndoingId] = useState(null);

  const messagesContainerRef = useRef(null)
  const messagesEndRef  = useRef(null)
  const mediaRecorderRef = useRef(null)
  const streamRef        = useRef(null)
  const chunksRef        = useRef([])
  const autoStopTimerRef = useRef(null)
  const speechRecognitionRef = useRef(null)
  const voiceActiveRef   = useRef(false)
  const voiceTextRef     = useRef('')
  const submitOnStopRef  = useRef(false)
  const inputRef         = useRef(null)

  // Auto-scroll to latest message — scroll the container directly to avoid
  // triggering a window-level scroll via scrollIntoView.
  useEffect(() => {
    const el = messagesContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isSending])

  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current)
      voiceActiveRef.current = false;
      submitOnStopRef.current = false;
      try { speechRecognitionRef.current?.stop?.() } catch { /* ignore */ }
      try { mediaRecorderRef.current?.stop?.() } catch { /* ignore */ }
      try { streamRef.current?.getTracks?.().forEach((t) => t.stop()) } catch { /* ignore */ }
    }
  }, [])

  // ── Undo a logged meal ───────────────────────────────────────────────────────
  const undoMeal = async (committedMealId, msgId) => {
    if (!token || undoingId !== null) return
    setUndoingId(msgId)
    try {
      const body = committedMealId
        ? { logId: committedMealId.logId, mealIndex: committedMealId.mealIndex }
        : {}
      const res = await fetch(`${API_BASE}/api/nutrition/logs/last-meal`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        // Mark that message as undone
        setMessages(prev => prev.map((m) =>
          m.id === msgId ? { ...m, foodLogged: false, undone: true } : m
        ))
        setMessages(prev => [...prev, { id: `sys-${Date.now()}`, from: 'system', text: `↩ Removed "${data.removed}" from today's log.` }])
      } else {
        setMessages(prev => [...prev, { id: `sys-${Date.now()}`, from: 'system', text: data.error || 'Could not undo meal.' }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, from: 'system', text: 'Undo failed — please try again.' }])
    } finally {
      setUndoingId(null)
    }
  }

  // ── Core send ────────────────────────────────────────────────────────────────
  const sendMessageText = async (text, { skipIngestion = false } = {}) => {
    const trimmed = String(text || '').trim()
    if (!trimmed || isSending) return

    setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: trimmed }])
    const lastInput = trimmed;
    setInput('')
    setIsSending(true)

    try {
      const history = [...messages, { from: 'user', text: trimmed }]
        .filter(m => m && (m.from === 'user' || m.from === 'ai') && typeof m.text === 'string')
        .slice(-12)
        .map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }))

      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: trimmed, history, skipIngestion }),
      })
      const data = await res.json()

      // Build the AI message — attach food-log metadata when present
      const aiMsg = {
        id: `ai-${Date.now()}`,
        from: 'ai',
        text: data.reply || data.error || 'Let me think about that…',
        foodLogged: Boolean(data.foodLogged),
        committedMealId: data.committedMealId || null,
        undone: false,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, from: 'system', text: 'Could not connect. Please try again.' }])
      setInput(lastInput) // Restore input on failure
    } finally {
      setIsSending(false)
    }
  }

  const sendMessage = () => sendMessageText(input)

  // ── Voice agent path (same as original) ─────────────────────────────────────
  const [voiceAgent] = useState(() => new VoiceNutritionLogger(API_BASE, null))
  useEffect(() => { if (token) voiceAgent.token = token }, [token, voiceAgent])

  const beginVoiceConfirmFlow = async (transcript) => {
    const t = String(transcript || '').trim()
    if (!t) return
    if (!token) { await sendMessageText(t); return }

    try {
      setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: t }])
      setInput('')
      setIsSending(true)

      const result = await voiceAgent.sendToAgent(t)
      if (result.reply) {
        const aiMsg = {
          id: `ai-${Date.now()}`,
          from: 'ai',
          text: result.reply,
          foodLogged: Boolean(result.foodLogged),
          committedMealId: result.committedMealId || null,
          undone: false,
        }
        setMessages(prev => [...prev, aiMsg])
        voiceAgent.speak(result.reply)
      } else {
        setMessages(prev => [...prev, { id: `sys-${Date.now()}`, from: 'system', text: "Agent didn't respond." }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, from: 'system', text: 'Voice action failed: ' + e.message }])
    } finally {
      setIsSending(false)
    }
  }

  // ── Recording / STT (unchanged logic) ────────────────────────────────────────
  const stopRecording = ({ submit = true } = {}) => {
    if (autoStopTimerRef.current) { clearTimeout(autoStopTimerRef.current); autoStopTimerRef.current = null }
    voiceActiveRef.current  = false
    submitOnStopRef.current = Boolean(submit)
    try { speechRecognitionRef.current?.stop() } catch { /* ignore */ }
    try { if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop() } catch { /* ignore */ }
  }

  const getSpeechRecognitionCtor = () => window.SpeechRecognition || window.webkitSpeechRecognition || null

  const startBrowserStt = async () => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return false
    if (isListening || isRecording || isTranscribing || isSending) return true
    if (!token) setMessages(prev => [...prev, { id: `sys-${Date.now()}`, from: 'system', text: 'Voice works, but sign in to auto-log across the app.' }])

    try {
      const rec = new Ctor()
      speechRecognitionRef.current = rec
      rec.lang = navigator?.language || 'en-US'
      rec.interimResults = true
      rec.continuous = true
      voiceActiveRef.current = true
      const prefix = String(input || '').trim()
      voiceTextRef.current = prefix ? `${prefix} ` : ''

      rec.onstart  = () => setIsListening(true)
      rec.onresult = (event) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i]
          const t = r?.[0]?.transcript ? String(r[0].transcript) : ''
          if (r.isFinal) voiceTextRef.current += t
          else interim += t
        }
        const combined = `${voiceTextRef.current}${interim}`.trim()
        if (combined) setInput(combined)
      }
      rec.onerror = () => {
        setIsListening(false)
        speechRecognitionRef.current = null
        setMessages(prev => [...prev, { id: `sys-${Date.now()}`, from: 'system', text: 'Voice recognition failed. Try again or type manually.' }])
      }
      rec.onend = async () => {
        setIsListening(false)
        speechRecognitionRef.current = null
        const transcript = String(voiceTextRef.current || '').trim() || String(input || '').trim()
        if (transcript) setInput(transcript)
        if (submitOnStopRef.current && transcript) {
          submitOnStopRef.current = false
          voiceTextRef.current = ''
          setInput('')
          await beginVoiceConfirmFlow(transcript)
          return
        }
        // Safety: only restart if still active and not sending
        if (voiceActiveRef.current && !isSending) {
          setTimeout(() => { if (voiceActiveRef.current) startBrowserStt().catch(() => {}) }, 250)
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
    const startedBrowser = await startBrowserStt()
    if (startedBrowser) return
    if (!token) { setMessages(prev => [...prev, { id: `sys-${Date.now()}`, from: 'system', text: 'Please sign in to use voice transcription.' }]); return }
    if (isRecording || isTranscribing || isSending) return
    if (!navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, from: 'system', text: 'Voice input is not supported in this browser.' }]); return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const preferredMime = 'audio/webm;codecs=opus'
      const actualMime = MediaRecorder.isTypeSupported?.(preferredMime) ? preferredMime : ''
      const mr = actualMime ? new MediaRecorder(stream, { mimeType: actualMime }) : new MediaRecorder(stream)
      
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e?.data?.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        setIsRecording(false)
        try { streamRef.current?.getTracks?.().forEach(t => t.stop()) } catch { /* ignore */ }
        streamRef.current = null
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        chunksRef.current = []
        if (blob.size < 256) return
        setIsTranscribing(true)
        try {
          const fd = new FormData()
          fd.append('audio', blob, 'voice.webm')
          const res = await fetch(`${API_BASE}/api/stt`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
          const json = await res.json().catch(() => null)
          if (!res.ok) throw new Error(json?.error || `Transcription failed (${res.status})`)
          const transcript = String(json?.transcript || '').trim()
          if (!transcript) { setMessages(prev => [...prev, { id: `sys-${Date.now()}`, from: 'system', text: 'I couldn\'t hear anything clearly — try again.' }]); return }
          if (submitOnStopRef.current) { submitOnStopRef.current = false; await beginVoiceConfirmFlow(transcript) }
          else setInput(prev => { const p = String(prev || '').trim(); return p ? `${p} ${transcript}`.trim() : transcript })
        } catch (e) {
          setMessages(prev => [...prev, { id: `sys-${Date.now()}`, from: 'system', text: e?.message || 'Voice transcription failed.' }])
        } finally { setIsTranscribing(false) }
      }
      setIsRecording(true)
      mr.start()
      autoStopTimerRef.current = setTimeout(() => { autoStopTimerRef.current = null; stopRecording({ submit: false }) }, 25_000)
    } catch {
      setIsRecording(false)
      try { streamRef.current?.getTracks?.().forEach(t => t.stop()) } catch { /* ignore */ }
      streamRef.current = null
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, from: 'system', text: 'Microphone permission denied or unavailable.' }])
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const isVoiceActive = isRecording || isListening

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>

      {/* Messages list */}
      <Box ref={messagesContainerRef} sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {messages.map((m) => (
            <Box key={m.id} sx={{ display: 'flex', gap: 2, flexDirection: m.from === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: m.from === 'user' ? 'text.primary' : m.from === 'system' ? 'action.selected' : 'success.light', color: m.from === 'user' ? 'background.paper' : m.from === 'system' ? 'text.disabled' : 'success.contrastText', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {m.from === 'user' ? 'U' : m.from === 'system' ? '·' : 'L'}
              </Avatar>

              <Box sx={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Typography variant="body2" sx={{
                  p: '10px 14px',
                  borderRadius: 2,
                  bgcolor: m.from === 'user' ? 'text.primary' : m.from === 'system' ? 'transparent' : 'action.hover',
                  color: m.from === 'user' ? 'background.paper' : m.from === 'system' ? 'text.secondary' : 'text.secondary',
                  lineHeight: 1.6,
                  fontStyle: m.from === 'system' ? 'italic' : 'normal',
                  fontSize: m.from === 'system' ? '0.8rem' : '0.875rem',
                  border: m.from === 'system' ? 'none' : '1px solid transparent',
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.text}
                </Typography>

                {/* ✅ Food-logged confirmation badge */}
                {m.foodLogged && !m.undone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                    <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.72rem' }}>
                      Logged to Nutrition Tracker
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<UndoIcon sx={{ fontSize: 12 }} />}
                      onClick={() => undoMeal(m.committedMealId, m.id)}
                      disabled={undoingId !== null}
                      sx={{ ml: 0.5, minWidth: 0, py: 0, px: 0.75, fontSize: '0.68rem', color: 'text.disabled', textTransform: 'none', lineHeight: 1.5, '&:hover': { color: 'error.main', bgcolor: 'error.light' } }}
                    >
                      {undoingId === m.id ? 'Undoing…' : 'Undo'}
                    </Button>
                  </Box>
                )}

                {/* Undone state */}
                {m.undone && (
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', fontStyle: 'italic' }}>
                    ↩ Removed from log
                  </Typography>
                )}
              </Box>
            </Box>
          ))}

          {isSending && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.light', color: 'success.contrastText', fontSize: 13, fontWeight: 700 }}>L</Avatar>
              <Box sx={{ display: 'flex', gap: 0.5, p: '12px 16px', bgcolor: 'action.hover', borderRadius: 2 }}>
                {[0, 1, 2].map(i => (
                  <Box key={i} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.disabled', animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s`, '@keyframes pulse': { '0%,100%': { opacity: 0.3 }, '50%': { opacity: 1 } } }} />
                ))}
              </Box>
            </Box>
          )}

          <div ref={messagesEndRef} style={{ height: 1 }} />
        </Box>
      </Box>

      {/* Input area */}
      <Box sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>

        {/* Quick-action chips */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          {QUICK_ACTIONS.map(action => (
            <Chip
              key={action.label}
              icon={action.icon}
              label={action.label}
              size="small"
              onClick={() => {
                setInput(action.prefix);
                inputRef.current?.focus();
              }}
              sx={{ fontSize: '0.75rem', height: 26, cursor: 'pointer', bgcolor: 'action.selected', color: 'text.secondary', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'divider' }, '& .MuiChip-icon': { color: 'text.secondary' } }}
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', '&:focus-within': { borderColor: 'text.primary' } }}>
          <TextField
            inputRef={inputRef}
            variant="standard"
            placeholder={isListening ? 'Listening…' : 'Tell me what you ate, ask a question, or use a quick action…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            fullWidth
            InputProps={{ disableUnderline: true, sx: { px: 1, fontSize: '0.9rem' } }}
          />
          <IconButton
            onClick={isVoiceActive ? () => stopRecording({ submit: true }) : startRecording}
            disabled={isTranscribing || isSending}
            title={isVoiceActive ? 'Stop & send voice' : 'Voice input'}
            sx={{ 
              bgcolor: isVoiceActive ? 'error.main' : 'action.hover', 
              color: isVoiceActive ? '#fff' : 'text.primary', 
              width: 38, height: 38, 
              border: '1px solid',
              borderColor: isVoiceActive ? 'error.main' : 'divider',
              '&:hover': { bgcolor: isVoiceActive ? 'error.dark' : 'action.selected' }
            }}
          >
            {isVoiceActive ? <StopIcon sx={{ fontSize: 20 }} /> : <MicIcon sx={{ fontSize: 20 }} />}
          </IconButton>
          <IconButton
            onClick={() => setShowMealTemplates(!showMealTemplates)}
            disabled={isSending || isTranscribing}
            title="Quick relog"
            sx={{ 
              bgcolor: 'action.hover', 
              color: 'text.primary', 
              width: 38, height: 38, 
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.selected' } 
            }}
          >
            <HistoryIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <IconButton
            onClick={() => setShowPhotoLog(true)}
            disabled={isSending || isTranscribing}
            title="Photo logging"
            sx={{ 
              bgcolor: 'action.hover', 
              color: 'text.primary', 
              width: 38, height: 38, 
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.selected' } 
            }}
          >
            <CameraAltIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <IconButton
            onClick={sendMessage}
            disabled={isSending || !input.trim()}
            sx={{ 
              bgcolor: 'primary.main', 
              color: 'primary.contrastText', 
              width: 38, height: 38, 
              '&:hover': { opacity: 0.9 },
              '&.Mui-disabled': { bgcolor: 'divider', color: 'text.disabled' }
            }}
          >
            <SendIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {isTranscribing && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary', textAlign: 'center' }}>
            Transcribing…
          </Typography>
        )}
      </Box>

      {showPhotoLog && (
        <PhotoLogFlow
          apiBase={API_BASE}
          token={token}
          onCancel={() => setShowPhotoLog(false)}
          onComplete={(payload) => {
            setShowPhotoLog(false);
            setMessages(prev => [...prev, {
              from: 'ai',
              text: `Great! I've logged your ${payload.mealType || 'meal'}: ${payload.mealName}. (~${payload.totalCalories} kcal)`,
              foodLogged: true,
              committedMealId: { logId: payload.logId, mealIndex: payload.mealIndex }
            }]);
          }}
        />
      )}
      {showMealTemplates && (
        <MealTemplates
          apiBase={API_BASE}
          token={token}
          onRelog={(payload) => {
            setShowMealTemplates(false);
            handleMealTemplateRelog(payload);
          }}
        />
      )}
    </Box>
  )
}

export default ChatPanel
