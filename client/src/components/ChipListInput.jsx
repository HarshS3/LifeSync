import { useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: '#e5e7eb' },
    '&:hover fieldset': { borderColor: '#d1d5db' },
    '&.Mui-focused fieldset': { borderColor: '#171717' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#171717' },
}

function ChipListInput({ items = [], onChange, placeholder }) {
  const [inputValue, setInputValue] = useState('')

  const handleAdd = () => {
    if (inputValue.trim()) {
      onChange([...items, inputValue.trim()])
      setInputValue('')
    }
  }

  const handleRemove = (index) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ ...inputSx, flex: 1 }}
        />
        <IconButton
          onClick={handleAdd}
          sx={{ bgcolor: '#f3f4f6', '&:hover': { bgcolor: '#e5e7eb' } }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {items.map((item, idx) => (
          <Chip
            key={`${item}-${idx}`}
            label={item}
            onDelete={() => handleRemove(idx)}
            sx={{ bgcolor: '#f3f4f6' }}
          />
        ))}
      </Box>
    </Box>
  )
}

export default ChipListInput
