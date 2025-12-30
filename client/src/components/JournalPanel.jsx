import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

function JournalPanel({ onSave, initialValue = '' }) {
  const [entry, setEntry] = useState(initialValue);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (entry.trim()) {
      onSave(entry);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Daily Journal
      </Typography>
      <TextField
        label="How was your day?"
        multiline
        minRows={5}
        fullWidth
        value={entry}
        onChange={e => setEntry(e.target.value)}
        variant="outlined"
        sx={{ mb: 2 }}
      />
      <Button variant="contained" onClick={handleSave} disabled={!entry.trim()}>
        Save Journal
      </Button>
      {saved && (
        <Typography variant="body2" sx={{ color: 'green', mt: 1 }}>
          Saved!
        </Typography>
      )}
    </Box>
  );
}

export default JournalPanel;
