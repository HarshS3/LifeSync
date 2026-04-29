import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'

const SectionTitle = ({ children }) => {
  return (
    <Typography variant="subtitle2" sx={{ mb: 2, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
      {children}
    </Typography>
  )
}

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: '#e5e7eb' },
    '&:hover fieldset': { borderColor: '#d1d5db' },
    '&.Mui-focused fieldset': { borderColor: '#171717' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#171717' },
}

export default function MeasurementsTab({
  profile,
  addMeasurementLog,
  getMeasurementLogLabel,
  selectMeasurementLog,
  selectedMeasurementLogIndex,
  updateMeasurementLogField,
  bodyCompOcrFile,
  setBodyCompOcrFile,
  bodyCompOcrLoading,
  importBodyCompositionFromOcr,
  bodyCompOcrError,
  updateBodyCompositionField,
  updateBodyCompositionSegmental
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="body2" sx={{ color: '#6b7280' }}>
        Log measurements by date. Add a new entry, then click any previous date to view or edit all fields.
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <SectionTitle>Measurement Log</SectionTitle>
        <Button
          variant="outlined"
          size="small"
          onClick={addMeasurementLog}
          sx={{ textTransform: 'none', borderColor: '#171717', color: '#171717' }}
        >
          + Add Measurement
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {(profile.bodyMeasurementLogs || []).map((entry, idx) => (
          <Chip
            key={`${entry?.updatedAt || 'entry'}-${idx}`}
            label={getMeasurementLogLabel(entry, idx)}
            onClick={() => selectMeasurementLog(idx)}
            sx={{
              bgcolor: idx === selectedMeasurementLogIndex ? '#171717' : '#f3f4f6',
              color: idx === selectedMeasurementLogIndex ? '#fff' : '#374151',
            }}
          />
        ))}
      </Box>

      {(profile.bodyMeasurementLogs || []).length === 0 && (
        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
          No measurements logged yet. Click "Add Measurement" to create your first entry.
        </Typography>
      )}

      {(profile.bodyMeasurementLogs || []).length > 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Waist (cm)"
              type="number"
              value={profile.bodyMeasurements?.waistCm ?? ''}
              onChange={(e) => updateMeasurementLogField('waistCm', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
            <TextField
              label="Hip (cm)"
              type="number"
              value={profile.bodyMeasurements?.hipCm ?? ''}
              onChange={(e) => updateMeasurementLogField('hipCm', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Chest (cm)"
              type="number"
              value={profile.bodyMeasurements?.chestCm ?? ''}
              onChange={(e) => updateMeasurementLogField('chestCm', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
            <TextField
              label="Neck (cm)"
              type="number"
              value={profile.bodyMeasurements?.neckCm ?? ''}
              onChange={(e) => updateMeasurementLogField('neckCm', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Wrist (cm)"
              type="number"
              value={profile.bodyMeasurements?.wristCm ?? ''}
              onChange={(e) => updateMeasurementLogField('wristCm', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
            <TextField
              label="Bicep (cm)"
              type="number"
              value={profile.bodyMeasurements?.bicepCm ?? ''}
              onChange={(e) => updateMeasurementLogField('bicepCm', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Thigh (cm)"
              type="number"
              value={profile.bodyMeasurements?.thighCm ?? ''}
              onChange={(e) => updateMeasurementLogField('thighCm', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
            <TextField
              label="BMI"
              type="number"
              value={profile.bodyMeasurements?.bmi ?? ''}
              onChange={(e) => updateMeasurementLogField('bmi', e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
          </Box>
        </>
      )}

      <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1, border: '1px solid #e5e7eb' }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: '#374151', fontWeight: 600 }}>
          Body Composition (OCR)
        </Typography>
        <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
          Upload an InBody/Tanita/ACCUNIQ-style report (image or PDF). This fills Protein, SMM, Visceral Fat, Segmental Fat, etc.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setBodyCompOcrFile(e.target.files?.[0] || null)}
          />
          <Button
            variant="outlined"
            disabled={!bodyCompOcrFile || bodyCompOcrLoading}
            onClick={importBodyCompositionFromOcr}
            sx={{ textTransform: 'none', borderColor: '#171717', color: '#171717', '&:hover': { borderColor: '#374151' } }}
          >
            {bodyCompOcrLoading ? 'Reading…' : 'Import Body Scan'}
          </Button>
          {bodyCompOcrError ? (
            <Typography variant="body2" sx={{ color: '#b91c1c' }}>
              {bodyCompOcrError}
            </Typography>
          ) : null}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Protein (kg)"
            type="number"
            value={profile.bodyComposition?.proteinKg ?? ''}
            onChange={(e) => updateBodyCompositionField('proteinKg', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="SMM (kg)"
            type="number"
            value={profile.bodyComposition?.smmKg ?? ''}
            onChange={(e) => updateBodyCompositionField('smmKg', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Body Fat (%)"
            type="number"
            value={profile.bodyComposition?.bodyFatPercent ?? ''}
            onChange={(e) => updateBodyCompositionField('bodyFatPercent', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Fat Mass (kg)"
            type="number"
            value={profile.bodyComposition?.fatMassKg ?? ''}
            onChange={(e) => updateBodyCompositionField('fatMassKg', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Visceral Fat"
            type="number"
            value={profile.bodyComposition?.visceralFatLevel ?? ''}
            onChange={(e) => updateBodyCompositionField('visceralFatLevel', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="TBW (kg)"
            type="number"
            value={profile.bodyComposition?.tbwKg ?? ''}
            onChange={(e) => updateBodyCompositionField('tbwKg', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Mineral (kg)"
            type="number"
            value={profile.bodyComposition?.mineralKg ?? ''}
            onChange={(e) => updateBodyCompositionField('mineralKg', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="BMR (kcal)"
            type="number"
            value={profile.bodyComposition?.bmrKcal ?? ''}
            onChange={(e) => updateBodyCompositionField('bmrKcal', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Metabolic Age"
            type="number"
            value={profile.bodyComposition?.metabolicAge ?? ''}
            onChange={(e) => updateBodyCompositionField('metabolicAge', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="BMI"
            type="number"
            value={profile.bodyComposition?.bmi ?? ''}
            onChange={(e) => updateBodyCompositionField('bmi', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1, color: '#374151', fontWeight: 600 }}>
          Segmental Fat
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Right Arm (kg)"
            type="number"
            value={profile.bodyComposition?.segmentalFatKg?.rightArm ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'rightArm', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Left Arm (kg)"
            type="number"
            value={profile.bodyComposition?.segmentalFatKg?.leftArm ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'leftArm', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Trunk (kg)"
            type="number"
            value={profile.bodyComposition?.segmentalFatKg?.trunk ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'trunk', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Right Leg (kg)"
            type="number"
            value={profile.bodyComposition?.segmentalFatKg?.rightLeg ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'rightLeg', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Left Leg (kg)"
            type="number"
            value={profile.bodyComposition?.segmentalFatKg?.leftLeg ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'leftLeg', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
          <TextField
            label="Right Arm (%)"
            type="number"
            value={profile.bodyComposition?.segmentalFatPercent?.rightArm ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalFatPercent', 'rightArm', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Left Arm (%)"
            type="number"
            value={profile.bodyComposition?.segmentalFatPercent?.leftArm ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalFatPercent', 'leftArm', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Trunk (%)"
            type="number"
            value={profile.bodyComposition?.segmentalFatPercent?.trunk ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalFatPercent', 'trunk', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Right Leg (%)"
            type="number"
            value={profile.bodyComposition?.segmentalFatPercent?.rightLeg ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalFatPercent', 'rightLeg', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Left Leg (%)"
            type="number"
            value={profile.bodyComposition?.segmentalFatPercent?.leftLeg ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalFatPercent', 'leftLeg', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1, color: '#374151', fontWeight: 600 }}>
          Segmental Muscle (kg)
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Right Arm (kg)"
            type="number"
            value={profile.bodyComposition?.segmentalMuscleKg?.rightArm ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'rightArm', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Left Arm (kg)"
            type="number"
            value={profile.bodyComposition?.segmentalMuscleKg?.leftArm ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'leftArm', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Trunk (kg)"
            type="number"
            value={profile.bodyComposition?.segmentalMuscleKg?.trunk ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'trunk', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Right Leg (kg)"
            type="number"
            value={profile.bodyComposition?.segmentalMuscleKg?.rightLeg ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'rightLeg', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Left Leg (kg)"
            type="number"
            value={profile.bodyComposition?.segmentalMuscleKg?.leftLeg ?? ''}
            onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'leftLeg', e.target.value)}
            sx={{ ...inputSx, flex: 1, minWidth: 180 }}
          />
        </Box>
      </Box>
    </Box>
  )
}
