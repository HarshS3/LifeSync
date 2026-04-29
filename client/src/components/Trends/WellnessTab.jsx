import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import SleepArchitecture from '../SleepArchitecture'
import StressImpact from '../StressImpact'
import { StatCard, BarChart } from './TrendsShared'

function WellnessTab({
  wellnessDayKey,
  setWellnessDayKey,
  defaultWellnessDayKey,
  todayLifeState,
  setTodayLifeState,
  todayLifeStateReflection,
  setTodayLifeStateReflection,
  todayLifeStateLoading,
  setTodayLifeStateLoading,
  todayLifeStateError,
  setTodayLifeStateError,
  nutritionReview,
  setNutritionReview,
  setNutritionReviewNarration,
  nutritionReviewNarration,
  nutritionReviewLoading,
  setNutritionReviewLoading,
  nutritionReviewError,
  setNutritionReviewError,
  token,
  API_BASE,
  checkinInsight,
  generateCheckinInsight,
  journalInsight,
  generateJournalInsight,
  journalToday,
  journalTodayLoading,
  aiGenerating,
  latestMentalLog,
  patterns,
  data,
  calcAvg
}) {
  return (
    <Box>
      <SleepArchitecture />
      <StressImpact />

      <Box sx={{ mb: 4, p: 3, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
          Date Explorer
        </Typography>
        <TextField
          type="date"
          size="small"
          value={wellnessDayKey}
          onChange={(e) => setWellnessDayKey(e.target.value)}
          sx={{ maxWidth: 220 }}
          inputProps={{ max: defaultWellnessDayKey }}
        />
        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 1 }}>
          Tip for demos: pick a seeded date like 2025-12-15.
        </Typography>
      </Box>

      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
        <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
          Today’s Life State (derived)
        </Typography>

        {todayLifeStateError ? (
          <Typography variant="caption" sx={{ color: '#991b1b', display: 'block', whiteSpace: 'pre-line' }}>
            {todayLifeStateError}
          </Typography>
        ) : todayLifeStateLoading ? (
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
            Loading today’s state…
          </Typography>
        ) : todayLifeState?.summaryState ? (
          <>
            <Typography variant="body2" sx={{ color: '#111827', fontWeight: 700 }}>
              {todayLifeState.summaryState.label || 'unknown'}
              {todayLifeState.summaryState.confidence != null
                ? ` (conf ${Math.round((todayLifeState.summaryState.confidence || 0) * 100)}%)`
                : ''}
            </Typography>
            {Array.isArray(todayLifeState.summaryState.reasons) && todayLifeState.summaryState.reasons.length ? (
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.75 }}>
                {todayLifeState.summaryState.reasons.join(' • ')}
              </Typography>
            ) : null}

            {todayLifeStateReflection ? (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                  Calm reflection
                </Typography>
                <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                  {todayLifeStateReflection}
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 1 }}>
                No reflection generated (silence is normal when confidence is low).
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
            No daily state yet. Add a check-in (sleep/stress/energy) or logs.
          </Typography>
        )}

        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setTodayLifeState(null)
            setTodayLifeStateReflection('')
            setTodayLifeStateError('')
            setTodayLifeStateLoading(true)

            fetch(`${API_BASE}/api/daily-life-state/${wellnessDayKey}?refresh=1`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then(async (r) => {
                const reflection = r.headers.get('X-LifeSync-State-Reflection') || ''
                setTodayLifeStateReflection(reflection)
                if (!r.ok) throw new Error(await r.text().catch(() => 'Failed'))
                return r.json()
              })
              .then((json) => setTodayLifeState(json))
              .catch((e) => setTodayLifeStateError(String(e?.message || 'Failed to refresh DailyLifeState.')))
              .finally(() => setTodayLifeStateLoading(false))
          }}
          disabled={todayLifeStateLoading || !token}
          sx={{ mt: 2, textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}
        >
          {todayLifeStateLoading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </Box>

      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
        <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
          Nutrition Review (medical-style)
        </Typography>

        {nutritionReviewError ? (
          <Typography variant="caption" sx={{ color: '#991b1b', display: 'block', whiteSpace: 'pre-line' }}>
            {nutritionReviewError}
          </Typography>
        ) : nutritionReviewLoading ? (
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
            Building nutrition review…
          </Typography>
        ) : nutritionReview ? (
          <>
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
              confidence {Math.round((nutritionReview.confidence || 0) * 100)}% • completeness {Math.round((nutritionReview.completeness || 0) * 100)}%
            </Typography>

            {nutritionReviewNarration ? (
              <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                  {nutritionReviewNarration}
                </Typography>
              </Box>
            ) : null}

            {Array.isArray(nutritionReview.flags) && nutritionReview.flags.length ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {nutritionReview.flags.slice(0, 6).map((f) => (
                  <Box key={f.key} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <Typography variant="body2" sx={{ color: '#111827', fontWeight: 700 }}>
                      {f.title}
                      <Typography component="span" variant="caption" sx={{ color: '#6b7280', fontWeight: 500, ml: 1 }}>
                        ({f.severity})
                      </Typography>
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                No notable flags found for this day.
              </Typography>
            )}

            {Array.isArray(nutritionReview.questionsForClinician) && nutritionReview.questionsForClinician.length ? (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
                  Questions to discuss with a clinician (optional):
                </Typography>
                <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                  {nutritionReview.questionsForClinician.map((q) => `• ${q}`).join('\n')}
                </Typography>
              </>
            ) : null}
          </>
        ) : (
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
            No nutrition log found for this date.
          </Typography>
        )}

        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setNutritionReview(null)
            setNutritionReviewNarration('')
            setNutritionReviewError('')
            setNutritionReviewLoading(true)
            fetch(`${API_BASE}/api/insights/nutrition/review?dayKey=${encodeURIComponent(wellnessDayKey)}&narrate=1`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then(async (r) => {
                if (!r.ok) throw new Error(await r.text().catch(() => 'Failed'))
                return r.json()
              })
              .then((json) => {
                setNutritionReview(json?.review || null)
                setNutritionReviewNarration(json?.narration || '')
              })
              .catch((e) => setNutritionReviewError(String(e?.message || 'Failed to refresh nutrition review.')))
              .finally(() => setNutritionReviewLoading(false))
          }}
          disabled={nutritionReviewLoading || !token}
          sx={{ mt: 2, textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}
        >
          {nutritionReviewLoading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', flex: 1, minWidth: 280 }}>
          <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
            AI Insight (check-in)
          </Typography>
          {checkinInsight?.text ? (
            <>
              <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                {checkinInsight.text}
              </Typography>
              {checkinInsight?.createdAt && (
                <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 1 }}>
                  Updated {new Date(checkinInsight.createdAt).toLocaleString()}
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
              Generate an insight from your latest check-in.
            </Typography>
          )}

          <Button
            variant="outlined"
            size="small"
            onClick={generateCheckinInsight}
            disabled={aiGenerating || !latestMentalLog}
            sx={{ mt: 2, textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}
          >
            {aiGenerating ? 'Generating…' : 'Generate'}
          </Button>
        </Box>

        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', flex: 1, minWidth: 280 }}>
          <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
            AI Insight (journal)
          </Typography>
          {journalInsight?.text ? (
            <>
              <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                {journalInsight.text}
              </Typography>
              {journalInsight?.createdAt && (
                <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 1 }}>
                  Updated {new Date(journalInsight.createdAt).toLocaleString()}
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
              Generate an insight from today’s journal.
            </Typography>
          )}

          <Button
            variant="outlined"
            size="small"
            onClick={generateJournalInsight}
            disabled={aiGenerating || journalTodayLoading || !journalToday.trim()}
            sx={{ mt: 2, textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}
          >
            {journalTodayLoading ? 'Loading journal…' : aiGenerating ? 'Generating…' : 'Generate'}
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
        <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
          Pattern Insights
        </Typography>

        {patterns.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {patterns.map((p, idx) => (
              <Box key={idx} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <Typography variant="body2" sx={{ color: '#374151', fontWeight: 600, mb: 0.5 }}>
                  {p.insight}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                  {p.action}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
            Keep logging to discover patterns.
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <StatCard label="Avg Mood" value={calcAvg(data.mental, 'moodScore')} unit="/10" trend={10} />
        <StatCard label="Avg Energy" value={calcAvg(data.mental, 'energyLevel')} unit="/10" trend={-5} />
        <StatCard label="Avg Sleep" value={calcAvg(data.mental, 'sleepHours')} unit="hrs" trend={3} />
      </Box>
      {data.mental.length > 0 && (
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle2" sx={{ mb: 3, color: '#6b7280' }}>
            Mood (last 7 days)
          </Typography>
          <BarChart items={data.mental} maxValue={10} valueKey="moodScore" labelKey="date" />
        </Box>
      )}
    </Box>
  )
}

export default WellnessTab
