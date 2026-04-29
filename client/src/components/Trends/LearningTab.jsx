import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'

function LearningTab({
  learningOverview,
  setLearningOverview,
  learningLoading,
  setLearningLoading,
  learningError,
  setLearningError,
  token,
  API_BASE
}) {
  const refreshLearning = () => {
    setLearningOverview(null)
    setLearningError('')
    setLearningLoading(true)
    fetch(`${API_BASE}/api/insights/learning/overall?days=120`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text().catch(() => 'Failed'))
        return r.json()
      })
      .then((json) => setLearningOverview(json))
      .catch((e) => {
        setLearningOverview(null)
        setLearningError(String(e?.message || 'Failed to refresh learning overview.'))
      })
      .finally(() => setLearningLoading(false))
  }

  return (
    <Box>
      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
        <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
          What LifeSync has learned (deterministic)
        </Typography>
        <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.7 }}>
          This view shows stable patterns and identities derived from DailyLifeState. It’s designed to be calm and factual.
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={refreshLearning}
          disabled={learningLoading || !token}
          sx={{ mt: 2, textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}
        >
          {learningLoading ? 'Loading…' : 'Refresh'}
        </Button>
      </Box>

      {learningError ? (
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #fecaca', mb: 3 }}>
          <Typography variant="body2" sx={{ color: '#991b1b', whiteSpace: 'pre-line' }}>
            {learningError}
          </Typography>
        </Box>
      ) : null}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', flex: 1, minWidth: 280 }}>
          <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
            Recent Day-State (last {learningOverview?.windowDays ?? 120} days)
          </Typography>
          {learningOverview?.stateSummary?.latestDayKey ? (
            <>
              <Typography variant="body2" sx={{ color: '#111827', fontWeight: 600 }}>
                Latest: {learningOverview.stateSummary.latestDayKey}
              </Typography>
              <Typography variant="body2" sx={{ color: '#374151', mt: 0.5 }}>
                {learningOverview.stateSummary.latestSummaryState?.label || 'unknown'}
                {learningOverview.stateSummary.latestSummaryState?.confidence != null
                  ? ` (conf ${Math.round((learningOverview.stateSummary.latestSummaryState.confidence || 0) * 100)}%)`
                  : ''}
              </Typography>
              {Array.isArray(learningOverview.stateSummary.latestSummaryState?.reasons) &&
              learningOverview.stateSummary.latestSummaryState.reasons.length ? (
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 1 }}>
                  {learningOverview.stateSummary.latestSummaryState.reasons.join(' • ')}
                </Typography>
              ) : null}
            </>
          ) : (
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
              No daily state data found yet for this window.
            </Typography>
          )}
        </Box>

        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', flex: 1, minWidth: 280 }}>
          <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
            Counts
          </Typography>
          <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.8 }}>
            Total days with state: {learningOverview?.stateSummary?.totalDaysWithState ?? 0}
            <br />
            Stable: {learningOverview?.stateSummary?.counts?.stable ?? 0} | Recovering:{' '}
            {learningOverview?.stateSummary?.counts?.recovering ?? 0}
            <br />
            Overloaded: {learningOverview?.stateSummary?.counts?.overloaded ?? 0} | Depleted:{' '}
            {learningOverview?.stateSummary?.counts?.depleted ?? 0}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
        <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 2 }}>
          PatternMemory (correlations)
        </Typography>
        {Array.isArray(learningOverview?.patterns) && learningOverview.patterns.length ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {learningOverview.patterns.slice(0, 20).map((p) => (
              <Box
                key={p._id || p.patternKey}
                sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}
              >
                <Typography variant="body2" sx={{ color: '#111827', fontWeight: 700 }}>
                  {(p.conditions || []).join(' + ') || 'context'} → {p.effect}
                  <Typography component="span" variant="caption" sx={{ color: '#6b7280', fontWeight: 500, ml: 1 }}>
                    ({p.window})
                  </Typography>
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.25 }}>
                  conf {Math.round((p.confidence || 0) * 100)}% • support {p.supportCount || 0} • last{' '}
                  {p.lastObserved ? new Date(p.lastObserved).toLocaleDateString() : '—'} • {p.status}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
            Not enough repeated signal yet to form patterns.
          </Typography>
        )}
      </Box>

      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
        <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 2 }}>
          IdentityMemory (stable truths)
        </Typography>
        {Array.isArray(learningOverview?.identities) && learningOverview.identities.length ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {learningOverview.identities.slice(0, 12).map((im) => (
              <Box
                key={im._id || im.identityKey}
                sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}
              >
                <Typography variant="body2" sx={{ color: '#111827', fontWeight: 700 }}>
                  {im.claim}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.25 }}>
                  conf {Math.round((im.confidence || 0) * 100)}% • stability {Math.round((im.stabilityScore || 0) * 100)}% • last{' '}
                  {im.lastReinforced ? new Date(im.lastReinforced).toLocaleDateString() : '—'} • {im.status}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
            No identities confirmed yet.
          </Typography>
        )}
      </Box>

      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
          Field coverage (what feeds learning today)
        </Typography>
        {learningOverview?.fieldCoverage?.learnedFrom ? (
          <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.8 }}>
            {(learningOverview.fieldCoverage.learnedFrom.dailyLifeStateSignals || []).map((x) => `• ${x}`).join('\n')}
            {'\n'}
            {(learningOverview.fieldCoverage.learnedFrom.contextSignals || []).map((x) => `• ${x}`).join('\n')}
          </Typography>
        ) : (
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
            Coverage info unavailable.
          </Typography>
        )}

        {learningOverview?.fieldCoverage?.notYetUsed?.examples?.length ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
              Not yet used for learning:
            </Typography>
            <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.8 }}>
              {(learningOverview.fieldCoverage.notYetUsed.examples || []).map((x) => `• ${x}`).join('\n')}
            </Typography>
          </>
        ) : null}
      </Box>
    </Box>
  )
}

export default LearningTab
