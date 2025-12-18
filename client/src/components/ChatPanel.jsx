import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import SendIcon from '@mui/icons-material/Send'
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

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || isSending) return

    setMessages((prev) => [...prev, { from: 'user', text: trimmed }])
    setInput('')
    setIsSending(true)

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      console.log('[ChatPanel] Sending with token:', token ? 'YES' : 'NO TOKEN')
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { from: 'ai', text: data.reply || 'Let me think about that...' }])
    } catch {
      setMessages((prev) => [...prev, { from: 'system', text: 'Could not connect. Please try again.' }])
    } finally {
      setIsSending(false)
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
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            fullWidth
            InputProps={{
              disableUnderline: true,
              sx: { px: 1, fontSize: '0.938rem' },
            }}
          />
          <IconButton
            onClick={sendMessage}
            disabled={isSending || !input.trim()}
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
      </Box>
    </Box>
  )
}

export default ChatPanel
