import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ChipListInput from '../ChipListInput'

const SectionTitle = ({ children }) => {
  return (
    <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
      {children}
    </Typography>
  )
}

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'divider' },
    '&:hover fieldset': { borderColor: '#d1d5db' },
    '&.Mui-focused fieldset': { borderColor: 'text.primary' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: 'text.primary' },
}

export default function HealthTab({
  profile,
  updateField,
  newMedication,
  setNewMedication,
  addMedication,
  removeMedication,
  updateLabMarker,
  updateLipidMarker,
  ocrFile,
  setOcrFile,
  ocrLoading,
  ocrError,
  importLabMarkersFromOcr
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <SectionTitle>Health Conditions</SectionTitle>
        <ChipListInput
          items={profile.conditions}
          onChange={(items) => updateField('conditions', items)}
          placeholder="Add condition (e.g., Asthma, Diabetes)"
        />
      </Box>

      <Box>
        <SectionTitle>Allergies</SectionTitle>
        <ChipListInput
          items={profile.allergies}
          onChange={(items) => updateField('allergies', items)}
          placeholder="Add allergy"
        />
      </Box>

      <Box>
        <SectionTitle>Injuries / Physical Limitations</SectionTitle>
        <ChipListInput
          items={profile.injuries}
          onChange={(items) => updateField('injuries', items)}
          placeholder="Add injury (e.g., Lower back pain)"
        />
      </Box>

      <Box>
        <SectionTitle>Current Medications</SectionTitle>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            size="small"
            placeholder="Medicine name"
            value={newMedication.name}
            onChange={(e) => setNewMedication(prev => ({ ...prev, name: e.target.value }))}
            sx={{ ...inputSx, flex: 2 }}
          />
          <TextField
            size="small"
            placeholder="Dosage"
            value={newMedication.dosage}
            onChange={(e) => setNewMedication(prev => ({ ...prev, dosage: e.target.value }))}
            sx={{ ...inputSx, flex: 1 }}
          />
          <TextField
            size="small"
            placeholder="Schedule"
            value={newMedication.schedule}
            onChange={(e) => setNewMedication(prev => ({ ...prev, schedule: e.target.value }))}
            sx={{ ...inputSx, flex: 1 }}
          />
          <IconButton onClick={addMedication} sx={{ bgcolor: 'action.selected' }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
        {profile.medications.map((med, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ flex: 2, fontWeight: 500 }}>{med.name}</Typography>
            <Typography variant="body2" sx={{ flex: 1, color: 'text.secondary' }}>{med.dosage}</Typography>
            <Typography variant="body2" sx={{ flex: 1, color: 'text.secondary' }}>{med.schedule}</Typography>
            <IconButton size="small" onClick={() => removeMedication(idx)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Box>

      <Box>
        <SectionTitle>Supplements</SectionTitle>
        <ChipListInput
          items={profile.supplements}
          onChange={(items) => updateField('supplements', items)}
          placeholder="Add supplement (e.g., Vitamin D, Creatine)"
        />
      </Box>

      <Box>
        <SectionTitle>Key Lab Markers</SectionTitle>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Track a small set of labs that explain most fatigue, mood, recovery, and metabolic stability signals.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Hemoglobin"
              type="number"
              value={profile.labMarkers?.hemoglobin?.value ?? ''}
              onChange={(e) => updateLabMarker('hemoglobin', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
            <TextField
              label="Ferritin"
              type="number"
              value={profile.labMarkers?.ferritin?.value ?? ''}
              onChange={(e) => updateLabMarker('ferritin', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Iron"
              type="number"
              value={profile.labMarkers?.iron?.value ?? ''}
              onChange={(e) => updateLabMarker('iron', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
            <TextField
              label="Vitamin B12"
              type="number"
              value={profile.labMarkers?.vitaminB12?.value ?? ''}
              onChange={(e) => updateLabMarker('vitaminB12', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Vitamin D"
              type="number"
              value={profile.labMarkers?.vitaminD?.value ?? ''}
              onChange={(e) => updateLabMarker('vitaminD', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
            <TextField
              label="TSH"
              type="number"
              value={profile.labMarkers?.tsh?.value ?? ''}
              onChange={(e) => updateLabMarker('tsh', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="CRP (optional)"
              type="number"
              value={profile.labMarkers?.crp?.value ?? ''}
              onChange={(e) => updateLabMarker('crp', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
            <TextField
              label="Fasting Glucose"
              type="number"
              value={profile.labMarkers?.fastingGlucose?.value ?? ''}
              onChange={(e) => updateLabMarker('fastingGlucose', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="HbA1c"
              type="number"
              value={profile.labMarkers?.hba1c?.value ?? ''}
              onChange={(e) => updateLabMarker('hba1c', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
            <TextField
              label="Total Cholesterol"
              type="number"
              value={profile.labMarkers?.lipids?.totalCholesterol?.value ?? ''}
              onChange={(e) => updateLipidMarker('totalCholesterol', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="LDL"
              type="number"
              value={profile.labMarkers?.lipids?.ldl?.value ?? ''}
              onChange={(e) => updateLipidMarker('ldl', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
            <TextField
              label="HDL"
              type="number"
              value={profile.labMarkers?.lipids?.hdl?.value ?? ''}
              onChange={(e) => updateLipidMarker('hdl', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Triglycerides"
              type="number"
              value={profile.labMarkers?.lipids?.triglycerides?.value ?? ''}
              onChange={(e) => updateLipidMarker('triglycerides', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
            <Box sx={{ flex: 1 }} />
          </Box>

          <Box sx={{ mt: 1, p: 2, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}>
              Update from Lab Report (OCR)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
              />
              <Button
                variant="outlined"
                disabled={!ocrFile || ocrLoading}
                onClick={importLabMarkersFromOcr}
                sx={{ textTransform: 'none', borderColor: 'text.primary', color: 'text.primary', '&:hover': { borderColor: 'text.secondary' } }}
              >
                {ocrLoading ? 'Reading...' : 'Import from Image'}
              </Button>
              {ocrError ? (
                <Typography variant="body2" sx={{ color: '#b91c1c' }}>
                  {ocrError}
                </Typography>
              ) : null}
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              This will auto-fill the fields above; click “Save All” to persist.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
