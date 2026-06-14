import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import { fmt, percent, TARGET_KEY_TO_TOTAL_KEY, SUMMARY_MICRO_META, MICRO_TO_TARGET_KEY } from '../lib/nutritionHelpers';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';
import DeficiencyRadar from './Nutrition/DeficiencyRadar';

// ── Utility ──────────────────────────────────────────────────────────────────
function getWeekKey(dateObj) {
  const istDateStr = new Date(dateObj).toLocaleString('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).substring(0, 10).replace(/\//g, '-');
  const [y, m, dDay] = istDateStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, dDay, 0, 0, 0));
  const dayNum = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const yearStartDay = yearStart.getUTCDay();
  yearStart.setUTCDate(yearStart.getUTCDate() - yearStartDay);
  const weekNum = Math.floor(((d - yearStart) / 86400000) / 7) + 1;
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function nextWeekKeyFrom(wk) {
  const [y, w] = wk.split('-W').map(Number);
  return w + 1 > 52 ? `${y + 1}-W01` : `${y}-W${String(w + 1).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────

const NutritionInsights = ({ selectedDate, clinicalTargets, weeklyTotals, monthlyTotals, user, dynamicTargets }) => {
  const { token } = useAuth();
  const [macroData, setMacroData] = useState(null);
  const [microData, setMicroData] = useState(null);
  const [metabolicMap, setMetabolicMap] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [weeklyReview, setWeeklyReview] = useState(null);
  const [hypotheses, setHypotheses] = useState([]);
  const [contract, setContract] = useState(null);
  const [contractEditing, setContractEditing] = useState(false);
  const [editedTargets, setEditedTargets] = useState([]);
  const [contractSaving, setContractSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('macro');

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const feedbackHypothesis = async (id, outcome) => {
    // outcome: 'support' | 'refute'
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/hypotheses/${id}/feedback`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ outcome }),
      });
      if (res.ok) {
        setHypotheses(prev => prev.map(h => h._id === id ? { ...h, _lastFeedback: outcome } : h));
      }
    } catch (err) {
      console.error('Failed to save feedback:', err);
    }
  };

  const saveContract = async () => {
    setContractSaving(true);
    try {
      const nwk = nextWeekKeyFrom(getWeekKey(selectedDate));
      const res = await fetch(`${API_BASE}/api/insights/weekly-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ weekKey: nwk, targets: editedTargets }),
      });
      if (res.ok) { setContract(await res.json()); setContractEditing(false); }
    } finally { setContractSaving(false); }
  };

  useEffect(() => {
    const handler = (e) => {
      const tab = e?.detail?.tab;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('lifesync:nutrition:insights:setTab', handler);
    return () => window.removeEventListener('lifesync:nutrition:insights:setTab', handler);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const wk = getWeekKey(selectedDate);
        const nwk = nextWeekKeyFrom(wk);
        const dayKey = new Date(selectedDate).toISOString().split('T')[0];

        const [macroRes, microRes, metabolicRes, hypoRes, reviewRes, weeklyRevRes, contractRes] = await Promise.all([
          fetch(`${API_BASE}/api/nutrition/aggregation/weekly-macros/${wk}`, { headers }),
          fetch(`${API_BASE}/api/nutrition/aggregation/weekly-micros/${wk}`, { headers }),
          fetch(`${API_BASE}/api/nutrition/metabolic-map?daysBack=60`, { headers }),
          fetch(`${API_BASE}/api/nutrition/hypotheses`, { headers }),
          fetch(`${API_BASE}/api/insights/nutrition/review?dayKey=${dayKey}`, { headers }),
          fetch(`${API_BASE}/api/insights/weekly-review?weekKey=${wk}`, { headers }),
          fetch(`${API_BASE}/api/insights/weekly-contract?weekKey=${nwk}`, { headers }),
        ]);

        if (!macroRes.ok || !microRes.ok) throw new Error('Failed to fetch aggregation data');
        setMacroData(await macroRes.json());
        setMicroData(await microRes.json());
        if (metabolicRes.ok) setMetabolicMap(await metabolicRes.json());
        if (hypoRes.ok) setHypotheses(await hypoRes.json());
        if (reviewRes.ok) { const r = await reviewRes.json(); setReviewData(r.review); }
        if (weeklyRevRes.ok) { const wr = await weeklyRevRes.json(); setWeeklyReview(wr); }
        if (contractRes.ok) { const c = await contractRes.json(); setContract(c); setEditedTargets(c.targets || []); }
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [selectedDate, token]);

  if (loading) return <Box sx={{ p: 10, textAlign: 'center', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--ls-text-muted)' }}>Assessing State...</Box>;
  if (error) return <Box sx={{ p: 4, background: '#ef4444', color: 'white', fontFamily: 'monospace' }}>[ERR] {error}</Box>;

  return (
    <Box sx={{ maxWidth: '1000px', mx: 'auto', p: { xs: 2, md: 6 }, pb: 12, fontFamily: 'var(--font-primary, "Arial", sans-serif)' }}>
      <Box sx={{ mb: 8, borderBottom: '2px solid var(--ls-border)', pb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'flex-end' }, gap: 4 }}>
        <Box>
          <Typography sx={{ fontFamily: 'var(--font-serif, "Georgia", serif)', fontSize: { xs: '2rem', md: '3.5rem' }, fontWeight: 700, lineHeight: 1, mb: 1, letterSpacing: '-0.02em', color: 'var(--ls-text)' }}>
            LifeState / Nutrition
          </Typography>
          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ls-text-muted)' }}>
            {getWeekKey(selectedDate)}
          </Typography>
        </Box>
        <Box sx={{
          display: 'flex',
          gap: { xs: 2, md: 3 },
          overflowX: 'auto',
          width: '100%',
          pb: 1,
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none'
        }}>
          {[
            { id: 'macro', label: 'Macros' },
            { id: 'micro', label: 'Micronutrients' },
            { id: 'period', label: 'Weekly / Monthly' },
            { id: 'radar', label: 'Deficiency Radar' },
            { id: 'metabolic', label: 'Metabolic Map' },
            { id: 'hypo', label: 'AI Hypotheses' },
            { id: 'review', label: 'Weekly Review' },
            { id: 'contract', label: 'Next Week Contract' },
          ].map(({ id, label }) => (
            <Typography key={id} component="button" onClick={() => setActiveTab(id)} sx={{
              background: 'none', border: 'none', borderBottom: activeTab === id ? '2px solid var(--ls-text)' : '2px solid transparent',
              pb: 0.5, cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem',
              color: activeTab === id ? 'var(--ls-text)' : 'var(--ls-text-muted)', transition: 'all 0.2s', '&:hover': { color: 'var(--ls-text)' },
              whiteSpace: 'nowrap'
            }}>
              {label}
            </Typography>
          ))}
        </Box>
      </Box>

      <Box sx={{ animation: 'fadeIn 0.5s ease-out' }}>
        {activeTab === 'macro' && macroData && <MacroEditorialView data={macroData} />}
        {activeTab === 'micro' && microData && <MicroEditorialView data={microData} />}
        {activeTab === 'period' && <PeriodSummaryView clinicalTargets={clinicalTargets} weeklyTotals={weeklyTotals} monthlyTotals={monthlyTotals} user={user} dynamicTargets={dynamicTargets} />}
        {activeTab === 'radar' && reviewData && <DeficiencyRadar risks={reviewData.deficiencyRisks} />}
        {activeTab === 'metabolic' && <MetabolicMapView data={metabolicMap} />}
        {activeTab === 'review' && <WeeklyReviewView data={weeklyReview} weekKey={getWeekKey(selectedDate)} />}
        {activeTab === 'contract' && <ContractView contract={contract} editedTargets={editedTargets} setEditedTargets={setEditedTargets} contractEditing={contractEditing} setContractEditing={setContractEditing} saveContract={saveContract} contractSaving={contractSaving} nextWeekKey={nextWeekKeyFrom(getWeekKey(selectedDate))} />}

        {activeTab === 'hypo' && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 4, fontFamily: 'var(--font-serif)' }}>Health Pattern Hypotheses</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              {hypotheses.map((h) => (
                <Box key={h._id} sx={{ p: 4, border: '2px solid var(--ls-border)', position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: -12, left: 20, bgcolor: 'var(--ls-bg)', px: 1 }}>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      Type: {h.type || 'General'}
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, letterSpacing: '-0.01em' }}>{h.title}</Typography>
                  <Typography sx={{ color: 'var(--ls-text-muted)', mb: 3, fontStyle: 'italic', fontSize: '0.95rem' }}>"{h.description}"</Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>Confidence: {Math.round((h.confidence || 0) * 100)}%</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box 
                        onClick={() => feedbackHypothesis(h._id, 'support')}
                        sx={{ cursor: 'pointer', opacity: h._lastFeedback === 'support' ? 1 : 0.3, '&:hover': { opacity: 1 }, fontFamily: 'monospace', fontWeight: 700 }}
                      >
                        [YES]
                      </Box>
                      <Box
                        onClick={() => feedbackHypothesis(h._id, 'refute')}
                        sx={{ cursor: 'pointer', opacity: h._lastFeedback === 'refute' ? 1 : 0.3, '&:hover': { opacity: 1 }, fontFamily: 'monospace', fontWeight: 700 }}
                      >
                        [NO]
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))}
              {hypotheses.length === 0 && (
                <Typography sx={{ gridColumn: '1 / -1', p: 8, textAlign: 'center', border: '1px dashed var(--ls-border)', color: 'var(--ls-text-muted)', fontFamily: 'monospace' }}>
                  No active hypotheses detected yet. Continue logging food to unlock AI pattern recognition.
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const MacroEditorialView = ({ data }) => {
  if (data.error) return <Box sx={{ fontFamily: 'monospace', color: '#b45309' }}>⚠ {data.error}</Box>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.insights?.length > 0 && (
        <Box sx={{ bgcolor: 'var(--ls-text)', color: 'var(--ls-bg)', p: { xs: 4, md: 6 }, borderRadius: '4px' }}>
          <Typography component="div" sx={{ fontFamily: 'var(--font-serif, "Georgia", serif)', fontStyle: 'italic', fontSize: '2rem', mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            State Reflection <Box sx={{ flex: 1, height: '1px', bgcolor: 'var(--ls-bg)', opacity: 0.2 }} />
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {data.insights.map((insight, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 3 }}>
                <Typography sx={{ fontFamily: 'monospace', opacity: 0.5, mt: 1 }}>{String(idx + 1).padStart(2, '0')}</Typography>
                <Typography sx={{ fontSize: '1.25rem', lineHeight: 1.6, opacity: 0.9 }}>{insight.message}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 6 }}>
        <MacroBlock title="Protein" subtitle="Daily, Non-Storable" data={data} nKey="protein" hex="#27272a" />
        <MacroBlock title="Carbohydrates" subtitle="Immediate Energy & Storage" data={data} nKey="carbs" hex="#71717a" extra={data.carbs.excessGrams > 0 && `+${data.carbs.excessGrams}g (≈ ${data.carbs.estimatedFatStored}g fat stored)`} />
        <MacroBlock title="Fat" subtitle="Hormonal Baseline" data={data} nKey="fat" hex="#a1a1aa" extra={data.fat.satFatPercent > 0 && `${data.fat.satFatPercent}% Density (${data.fat.status === 'excellent' ? 'Optimal' : 'Monitor'})`} />
        <MacroBlock title="Calories" subtitle="Weekly Aggregate Load" data={data} nKey="calories" hex="var(--ls-text)" extra={data.estimatedWeeklyWeightChange !== undefined && `Forecast: ${data.estimatedWeeklyWeightChange > 0 ? '+' : ''}${data.estimatedWeeklyWeightChange} lbs (≈ ${Math.round(data.estimatedWeeklyWeightChange * 4.33 * 10) / 10} lbs/mo)`} />
      </Box>
    </Box>
  );
};

const MacroBlock = ({ title, subtitle, data, nKey, hex, extra }) => {
  const daily = data.dailyData;
  const days = Object.keys(daily);
  const target = data.targets[nKey];
  const weeklyAvg = data.weeklyAverages[nKey];
  const weeklyPercent = data.weeklyAveragePercent[nKey];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontFamily: 'var(--font-serif, "Georgia", serif)', fontSize: '1.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--ls-text)' }}>{title}</Typography>
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{subtitle}</Typography>
      </Box>

      <Box sx={{ height: '120px', display: 'flex', alignItems: 'flex-end', gap: '4px', borderBottom: '2px solid var(--ls-border)', pb: 1, mb: 4 }}>
        {days.map(day => {
          const val = daily[day][nKey];
          const pct = daily[day][`${nKey}Percent`];
          const height = Math.min(100, Math.max(5, (pct / 150) * 100)); // cap visually
          const isOptimal = pct >= 90 && pct <= 110;
          return (
            <Box key={day} sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', '&:hover .tt': { opacity: 1 } }}>
              <Box sx={{ width: '100%', height: `${height}%`, bgcolor: isOptimal ? hex : 'var(--ls-text-muted)', opacity: isOptimal ? 1 : 0.3, transition: 'all 0.2s', '&:hover': { opacity: 1, bgcolor: 'var(--ls-text)' } }} />
              <Box className="tt" sx={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', mb: 1, opacity: 0, bgcolor: 'var(--ls-text)', color: 'var(--ls-bg)', py: 0.5, px: 1, fontSize: '0.65rem', fontFamily: 'monospace', borderRadius: '2px', pointerEvents: 'none', whiteSpace: 'nowrap', transition: 'opacity 0.2s', zIndex: 10 }}>{val}g ({pct}%)</Box>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--ls-text)' }}>
        <Box><Typography sx={{ fontSize: '0.65rem', opacity: 0.5, mb: 0.5, textTransform: 'uppercase' }}>Target</Typography><Typography sx={{ fontWeight: 700 }}>{target}{nKey === 'calories' ? 'kcal' : 'g'} / day</Typography></Box>
        <Box><Typography sx={{ fontSize: '0.65rem', opacity: 0.5, mb: 0.5, textTransform: 'uppercase' }}>Trajectory</Typography><Typography sx={{ fontWeight: 700 }}>{weeklyAvg}{nKey === 'calories' ? 'kcal' : 'g'} <span style={{ opacity: 0.6, fontWeight: 400 }}>({weeklyPercent}%)</span></Typography></Box>
      </Box>

      {extra && (
        <Typography sx={{ mt: 3, pt: 3, borderTop: '1px solid var(--ls-border)', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--ls-accent-2)', pr: 2 }}>
          {extra}
        </Typography>
      )}
    </Box>
  );
};

const MicroEditorialView = ({ data }) => {
  if (data.error) return <Box sx={{ fontFamily: 'monospace', color: '#b45309' }}>⚠ {data.error}</Box>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.insights?.length > 0 && (
        <Box sx={{ bgcolor: 'var(--ls-accent)', color: '#f6f1e7', p: { xs: 4, md: 6 }, borderRadius: '4px' }}>
          <Typography component="div" sx={{ fontFamily: 'var(--font-serif, "Georgia", serif)', fontStyle: 'italic', fontSize: '2rem', mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            Micronutrient Matrix <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(246, 241, 231, 0.2)' }} />
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {data.insights.map((insight, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 3 }}>
                <Typography sx={{ fontFamily: 'monospace', opacity: 0.5, mt: 1 }}>{String(idx + 1).padStart(2, '0')}</Typography>
                <Typography sx={{ fontSize: '1.25rem', lineHeight: 1.6, opacity: 0.9 }}>{insight.message}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 6 }}>
        <MicroGroup title="Daily Water-Soluble" subtitle="Must replenish daily" nutrients={data.byGroup?.water_soluble} />
        <MicroGroup title="Weekly Fat-Soluble" subtitle="Stored internally" nutrients={data.byGroup?.fat_soluble} isStorage={true} />
        <MicroGroup title="Electrolytes" subtitle="Hydration & Conduction" nutrients={data.byGroup?.electrolytes} />
        <MicroGroup title="Storage Minerals" subtitle="Long term reserves" nutrients={data.byGroup?.storage_minerals} />
        <MicroGroup title="Trace Minerals" subtitle="Microscopic catalysts" nutrients={data.byGroup?.trace} />
      </Box>

      <BioavailabilityMatrix />
    </Box>
  );
};

const BioavailabilityMatrix = () => {
  const pairings = [
    { name: 'Iron + Vitamin C', type: 'Synergy', icon: 'â†‘', effect: 'Boosts absorption up to 3x', tip: 'Add lemon squeeze or tomatoes to iron-rich foods.' },
    { name: 'Vitamin D + Fat', type: 'Synergy', icon: 'â†‘', effect: 'Required for absorption', tip: 'Take D3 supplements with your largest, fattiest meal.' },
    { name: 'Iron + Tannins (Tea)', type: 'Blocker', icon: 'â†“', effect: 'Reduces absorption by 60%', tip: 'Space chai/coffee 1 hour from main meals.' },
    { name: 'Calcium + Iron', type: 'Blocker', icon: 'â†“', effect: 'Competes for transport', tip: 'Avoid having high-dairy items with meat or beans.' },
    { name: 'Turmeric + Pepper', type: 'Synergy', icon: 'â†‘', effect: '2000% boost in curcumin', tip: 'A pinch of black pepper activates turmeric haldi.' },
    { name: 'Minerals + Phytates', type: 'Blocker', icon: 'â†“', effect: 'Binds iron/zinc/magnesium', tip: 'Soaking and sprouting grains neutralizes phytates.' },
  ];

  return (
    <Box sx={{ mt: 8, pt: 8, borderTop: '2px solid var(--ls-text)' }}>
      <Typography component="div" sx={{ fontFamily: 'var(--font-serif, "Georgia", serif)', fontStyle: 'italic', fontSize: '2rem', mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        Absorption & Bioavailability Matrix <Box sx={{ flex: 1, height: '1px', bgcolor: 'var(--ls-text)', opacity: 0.1 }} />
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
        {pairings.map((p, i) => (
          <Box key={i} sx={{ p: 3, border: '1px solid var(--ls-border)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -10, right: -5, fontSize: '4rem', opacity: 0.05, fontWeight: 900, fontFamily: 'serif', pointerEvents: 'none' }}>
              {p.icon}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.02em' }}>{p.name}</Typography>
              <Typography sx={{
                fontFamily: 'monospace', fontSize: '0.65rem', px: 1, py: 0.2,
                bgcolor: p.type === 'Synergy' ? 'var(--ls-text)' : 'var(--ls-accent-2)',
                color: 'white',
                borderRadius: '2px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>{p.type}</Typography>
            </Box>
            <Typography sx={{ fontSize: '1.1rem', mb: 2, color: 'var(--ls-text)', fontWeight: 500 }}>{p.effect}</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.7rem', opacity: 0.4, mt: 0.3 }}>TIP</Typography>
              <Typography sx={{ fontSize: '0.85rem', opacity: 0.7, lineHeight: 1.5 }}>{p.tip}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
      <Typography sx={{ mt: 4, fontFamily: 'monospace', fontSize: '0.7rem', opacity: 0.5, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        * Derived from clinical nutritional bioavailability standards
      </Typography>
    </Box>
  );
};

const MicroGroup = ({ title, subtitle, nutrients, isStorage }) => {
  if (!nutrients || Object.keys(nutrients).length === 0) return null;

  return (
    <Box sx={{ borderTop: '2px solid var(--ls-border)', pt: 4 }}>
      <Box sx={{ mb: 5 }}>
        <Typography sx={{ fontFamily: 'var(--font-serif, "Georgia", serif)', fontSize: '1.5rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ls-text)' }}>{title}</Typography>
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{subtitle}</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {Object.entries(nutrients).map(([name, info]) => {
          const isOptimal = info.status === 'excellent' || info.status === 'good';
          const pct = Math.min(100, (info.weeklyAvg / info.target) * 100) || 0;
          return (
            <Box key={name}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                <Typography sx={{ fontFamily: 'var(--font-primary, "Arial", sans-serif)', fontWeight: 600, textTransform: 'capitalize', fontSize: '0.95rem' }}>{name.replace(/_/g, ' ')}</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'baseline', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  <Typography sx={{ opacity: 0.6, fontSize: '0.75rem' }}>{Math.round(info.weeklyAvg)}/{info.target}</Typography>
                  <Typography sx={{ fontWeight: 700, textTransform: 'uppercase', color: isOptimal ? 'var(--ls-accent)' : 'var(--ls-accent-2)' }}>{info.status.replace(/_/g, ' ')}</Typography>
                </Box>
              </Box>
              <Box sx={{ height: '4px', width: '100%', bgcolor: 'var(--ls-border)', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: isOptimal ? 'var(--ls-text)' : 'var(--ls-accent-2)', transition: 'width 0.5s' }} />
              </Box>
              {isStorage && info.storageMonths > 0 && (
                <Typography sx={{ textAlign: 'right', fontSize: '0.65rem', textTransform: 'uppercase', fontFamily: 'monospace', mt: 1, opacity: 0.5 }}>
                  Reserve: {info.storageMonths}mo (+{Math.round(info.weeklyStorage)})
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const MetabolicMapView = ({ data }) => {
  if (!data) return (
    <Box sx={{ fontFamily: 'monospace', color: 'var(--ls-text-muted)', p: 8, textAlign: 'center' }}>
      <Box sx={{ fontSize: '3rem', mb: 2 }}>⚡</Box>
      <Box sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1 }}>Metabolic Map Unavailable</Box>
      <Box sx={{ opacity: 0.6, fontSize: '0.85rem' }}>Requires 5+ nutrition logs and 3+ weight entries over 60 days.</Box>
    </Box>
  );
  if (data.status === 'insufficient_data') return (
    <Box sx={{ fontFamily: 'monospace', color: '#b45309', p: 6, border: '1px solid #b45309', borderRadius: '4px' }}>⚠ {data.message}</Box>
  );

  const PHASE_LABEL = {
    aggressive_cut: { label: 'Aggressive Cut', color: '#ef4444' },
    moderate_cut: { label: 'Moderate Cut', color: '#f97316' },
    maintenance: { label: 'Maintenance', color: '#22c55e' },
    moderate_bulk: { label: 'Moderate Bulk', color: '#3b82f6' },
    aggressive_bulk: { label: 'Aggressive Bulk', color: '#8b5cf6' },
  };
  const phase = PHASE_LABEL[data.dietPhase] || { label: data.dietPhase, color: 'var(--ls-text)' };
  const { stress, training, adaptation } = data.modifiers;

  const ModifierRow = ({ label, value, detail }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', py: 3, borderBottom: '1px solid var(--ls-border)', gap: 4 }}>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, mb: 0.5 }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--ls-text)', opacity: 0.8 }}>{detail}</Typography>
      </Box>
      <Box sx={{ textAlign: 'right', minWidth: 80 }}>
        <Typography sx={{
          fontFamily: 'monospace', fontWeight: 700, fontSize: '1.5rem',
          color: value > 0 ? '#22c55e' : value < 0 ? '#ef4444' : 'var(--ls-text-muted)'
        }}>
          {value > 0 ? `+${value}` : value} cal
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Header hero block */}
      <Box sx={{ bgcolor: 'var(--ls-text)', color: 'var(--ls-bg)', p: { xs: 4, md: 6 }, borderRadius: '4px' }}>
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, mb: 2 }}>Personal Metabolic Map — 60 Day Analysis</Typography>
        <Box sx={{ display: 'flex', gap: { xs: 3, md: 8 }, flexWrap: 'wrap', alignItems: 'flex-start', mb: 4 }}>
          <Box sx={{ minWidth: { xs: 'calc(50% - 12px)', md: 'auto' } }}>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', mb: 0.5 }}>Formula TDEE</Typography>
            <Typography sx={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: { xs: '1.75rem', md: '2.5rem' }, fontWeight: 700, lineHeight: 1, textDecoration: 'line-through', opacity: 0.4 }}>{data.baseTDEE}</Typography>
          </Box>
          <Box sx={{ fontSize: '1.5rem', opacity: 0.4, alignSelf: 'center', display: { xs: 'none', md: 'block' } }}>→</Box>
          <Box sx={{ minWidth: { xs: '100%', md: 'auto' }, order: { xs: 3, md: 0 } }}>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', mb: 0.5 }}>Your Dynamic TDEE</Typography>
            <Typography sx={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: { xs: '2.5rem', md: '3.5rem' }, fontWeight: 700, lineHeight: 1 }}>{data.dynamicTDEE}</Typography>
          </Box>
          <Box sx={{ minWidth: { xs: 'calc(50% - 12px)', md: 'auto' } }}>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', mb: 0.5 }}>Diet Phase</Typography>
            <Box sx={{ px: 2, py: 0.5, bgcolor: phase.color, borderRadius: '3px', display: 'inline-block' }}>
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: 'white' }}>{phase.label}</Typography>
            </Box>
          </Box>
          <Box sx={{ minWidth: { xs: 'calc(50% - 12px)', md: 'auto' } }}>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', mb: 0.5 }}>Insulin Sensitivity</Typography>
            <Box sx={{ px: 2, py: 0.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '3px', display: 'inline-block', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: 'white' }}>{(data.insulinSensitivity || 'NORMAL').replace(/_/g, ' ')}</Typography>
            </Box>
          </Box>
        </Box>
        <Typography sx={{ fontSize: '1.1rem', lineHeight: 1.7, opacity: 0.85, fontStyle: 'italic', fontFamily: 'var(--font-serif, Georgia, serif)' }}>
          "{data.insight}"
        </Typography>
      </Box>

      {/* Modifier breakdown */}
      <Box>
        <Typography component="div" sx={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontStyle: 'italic', fontSize: '2rem', mb: 4, display: 'flex', alignItems: 'center', gap: 2, color: 'var(--ls-text)' }}>
          Modifier Breakdown <Box sx={{ flex: 1, height: '1px', bgcolor: 'var(--ls-text)', opacity: 0.1 }} />
        </Typography>
        <Box>
          <ModifierRow
            label={`Stress Modifier (Recent: ${stress.avgRecentStress}/10 vs Baseline: ${stress.avgBaselineStress}/10)`}
            value={stress.value}
            detail={stress.label}
          />
          <ModifierRow
            label={`Training Load Modifier (${training.sessionsThisWeek} sessions — ${(training.volumeRatio * 100).toFixed(0)}% of baseline volume)`}
            value={training.value}
            detail={training.label}
          />
          <ModifierRow
            label={`Metabolic Adaptation (${adaptation.deficitStreakWeeks} consecutive deficit weeks)`}
            value={adaptation.value}
            detail={adaptation.label}
          />
        </Box>

        {/* Breakdown math */}
        <Box sx={{ mt: 4, p: 3, border: '1px solid var(--ls-border)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', color: 'var(--ls-text-muted)' }}>
          <span>{data.baseTDEE}</span>
          <span style={{ color: stress.value < 0 ? '#ef4444' : '#22c55e' }}>{stress.value > 0 ? `+${stress.value}` : stress.value}</span>
          <span>(stress)</span>
          <span style={{ opacity: 0.4 }}>+</span>
          <span style={{ color: training.value < 0 ? '#ef4444' : '#22c55e' }}>{training.value > 0 ? `+${training.value}` : training.value}</span>
          <span>(training)</span>
          <span style={{ opacity: 0.4 }}>+</span>
          <span style={{ color: adaptation.value < 0 ? '#ef4444' : '#22c55e' }}>{adaptation.value > 0 ? `+${adaptation.value}` : adaptation.value}</span>
          <span>(adaptation)</span>
          <span style={{ opacity: 0.4 }}>=</span>
          <span style={{ color: 'var(--ls-text)', fontWeight: 700, fontSize: '1rem' }}>{data.dynamicTDEE} cal/day</span>
        </Box>
      </Box>

      <Box sx={{ fontFamily: 'monospace', fontSize: '0.7rem', opacity: 0.4, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em', pb: 4 }}>
        * Stress modifier: Dallman et al., 2004 · Training modifier: Schuenke et al., 2002 · Adaptation: Rosenbaum & Leibel, 2010
      </Box>
    </Box>
  );
};

// ── Period Summary View (formerly SummaryTab) ─────────────────────────────────
// Preserves the unique dynamic-target-per-day bar logic from SummaryTab.
const PeriodSummaryView = ({ clinicalTargets, weeklyTotals, monthlyTotals, user, dynamicTargets }) => {
  const getRequiredForPeriod = (targetKey, days) => {
    const pEnd = new Date(); pEnd.setHours(23, 59, 59, 999);
    const pStart = new Date(pEnd); pStart.setDate(pStart.getDate() - (days - 1)); pStart.setHours(0, 0, 0, 0);
    const staticTargets = clinicalTargets?.targets || {};
    const staticMicros = staticTargets.micronutrients || {};
    let staticVal = (targetKey in staticTargets) ? staticTargets[targetKey] : staticMicros[targetKey];
    if (!staticVal) {
      const defaults = { calories: 2100, protein: 150, carbs: 250, fat: 70, saturatedFat: 22, monounsaturatedFat: 30, polyunsaturatedFat: 15, cholesterol: 300 };
      staticVal = defaults[targetKey];
    }
    let total = 0;
    for (let d = new Date(pStart); d <= pEnd; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      const dyn = dynamicTargets?.[dateKey];
      const val = dyn ? ((dyn.targets || {})[targetKey] ?? (dyn.targets?.micronutrients || {})[targetKey]) : null;
      total += Number(val ?? staticVal ?? 0);
    }
    return total;
  };

  const buildRows = (totalsForPeriod, days) => {
    const rowMap = new Map();
    Object.entries(TARGET_KEY_TO_TOTAL_KEY).forEach(([targetKey, totalKey]) => {
      const required = getRequiredForPeriod(targetKey, days);
      const consumed = Number(totalsForPeriod?.[totalKey] || 0);
      const unit = targetKey === 'calories' ? 'kcal' : ['protein','fat','carbs','fiber','sugar','saturatedFat','monounsaturatedFat','polyunsaturatedFat'].includes(targetKey) ? 'g' : ['vitaminD','vitaminA','folate','selenium'].includes(targetKey) ? 'µg' : 'mg';
      rowMap.set(totalKey, { label: targetKey.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()), consumed, required: required > 0 ? required : null, unit });
    });
    SUMMARY_MICRO_META.forEach(({ key, label, unit }) => {
      if (rowMap.has(key)) return;
      const required = getRequiredForPeriod(MICRO_TO_TARGET_KEY[key], days);
      rowMap.set(key, { label, consumed: Number(totalsForPeriod?.[key] || 0), required: required > 0 ? required : null, unit });
    });
    return Array.from(rowMap.values());
  };

  return (
    <Box sx={{ mt: 4 }}>
      {[{ label: 'Weekly', days: 7, totals: weeklyTotals }, { label: 'Monthly', days: 30, totals: monthlyTotals }].map(({ label, days, totals }) => (
        <Box key={label} sx={{ mb: 6 }}>
          <Typography sx={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '1.75rem', fontWeight: 700, textTransform: 'uppercase', mb: 4, color: 'var(--ls-text)' }}>{label}</Typography>
          {!clinicalTargets?.targets && (
            <Box sx={{ fontFamily: 'monospace', color: '#b45309', mb: 3 }}>⚠ Clinical targets required. Complete Body + Clinical Profile.</Box>
          )}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            {buildRows(totals, days).map((row, i) => (
              <Box key={i}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{row.label}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {fmt(row.consumed, row.unit === 'kcal' ? 0 : 1)} / {row.required == null ? '—' : fmt(row.required, row.unit === 'kcal' ? 0 : 1)} {row.unit}
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={row.required == null ? 0 : percent(row.consumed, row.required)}
                  sx={{ height: 6, borderRadius: 99, bgcolor: 'action.selected', '& .MuiLinearProgress-bar': { bgcolor: row.required == null ? '#d1d5db' : '#2563eb' } }} />
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// ── Weekly Review View (from WeeklyReview.jsx, no duplication) ─────────────────
const WeeklyReviewView = ({ data, weekKey }) => {
  if (!data) return <Box sx={{ fontFamily: 'monospace', color: 'var(--ls-text-muted)', p: 8, textAlign: 'center' }}>No review data for this week yet.</Box>;
  const { weightTrend = [], strongestLift, bestDay, worstDay, insights = [], nextWeekGoal } = data;
  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <EmojiEventsIcon sx={{ fontSize: '3rem', color: '#f59e0b', mb: 1 }} />
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Week {weekKey?.split('-W')[1]} Review</Typography>
      </Box>
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon sx={{ color: '#3b82f6' }} /> Weight Trajectory
              </Typography>
              <Box sx={{ height: 240 }}>
                {weightTrend.length > 0 ? (
                  <ResponsiveContainer>
                    <LineChart data={weightTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tickFormatter={s => new Date(s).toLocaleDateString('en-IN', { weekday: 'short' })} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={val => [`${val} kg`, 'Weight']} />
                      <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, fill: '#3b82f6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Log weight daily to see trends here.</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 3, bgcolor: '#111827', color: '#fff' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FitnessCenterIcon sx={{ color: '#10b981' }} /> Weekly Peak
              </Typography>
              {strongestLift ? (
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 900 }}>{strongestLift.weight}kg</Typography>
                  <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 600 }}>{strongestLift.exercise}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.6, mt: 1 }}>{new Date(strongestLift.date).toLocaleDateString()} · {strongestLift.reps} reps</Typography>
                </Box>
              ) : <Typography sx={{ opacity: 0.5, fontStyle: 'italic' }}>No workout data this week.</Typography>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <RestaurantIcon sx={{ color: '#f59e0b' }} /> Nutrition Extremes
              </Typography>
              {bestDay && (
                <Box sx={{ mb: 2, p: 2, bgcolor: '#ecfdf5', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Best: {new Date(bestDay.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</Typography>
                    <Chip label={`${bestDay.proteinPercent}% protein`} size="small" sx={{ bgcolor: '#059669', color: '#fff', height: 20, fontSize: '0.65rem' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">{bestDay.calories} kcal</Typography>
                </Box>
              )}
              {worstDay && (
                <Box sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Lowest: {new Date(worstDay.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</Typography>
                    <Chip label={`${worstDay.proteinPercent}% protein`} size="small" sx={{ bgcolor: '#dc2626', color: '#fff', height: 20, fontSize: '0.65rem' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">{worstDay.explanation}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {insights.length > 0 && (
              <Card sx={{ borderRadius: 3, bgcolor: '#eff6ff', border: '1px solid #dbeafe' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, color: '#1e40af' }}>
                    <LightbulbIcon /> The One Thing
                  </Typography>
                  {insights.map((ins, i) => <Typography key={i} variant="body2" sx={{ color: '#1e3a8a', mb: 1 }}>• {ins}</Typography>)}
                </CardContent>
              </Card>
            )}
            {nextWeekGoal && (
              <Card sx={{ borderRadius: 3, bgcolor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1, color: '#5b21b6' }}>
                    <CheckCircleOutlineIcon /> Next Week's Focus
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#4c1d95', fontWeight: 600 }}>{nextWeekGoal}</Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

// ── Contract View (next week targets, propose/edit/commit) ────────────────────
const ContractView = ({ contract, editedTargets, setEditedTargets, contractEditing, setContractEditing, saveContract, contractSaving, nextWeekKey }) => {
  const DOMAIN_COLOR = { nutrition: '#10b981', training: '#3b82f6', wellness: '#8b5cf6' };
  if (!contract) return <Box sx={{ p: 6, textAlign: 'center', fontFamily: 'monospace', color: 'var(--ls-text-muted)' }}>Loading contract…</Box>;
  return (
    <Box sx={{ mt: 4, maxWidth: 640, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {nextWeekKey} — {contract.status === 'scored' ? `${contract.score}/3 met` : '3 targets for next week'}
        </Typography>
        {contract.status !== 'scored' && (
          <Button size="small" variant="outlined" startIcon={contractEditing ? <CheckIcon /> : <EditIcon />}
            onClick={() => setContractEditing(e => !e)} sx={{ textTransform: 'none' }}>
            {contractEditing ? 'Done editing' : 'Edit targets'}
          </Button>
        )}
      </Box>

      {(contractEditing ? editedTargets : contract.targets).map((t, i) => {
        const color = DOMAIN_COLOR[t.domain] || '#888';
        const met = contract.status === 'scored' ? t.met : null;
        return (
          <Box key={i} sx={{ borderLeft: `4px solid ${color}`, pl: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Chip label={t.domain} size="small" sx={{ bgcolor: color + '20', color, fontWeight: 700, height: 18, fontSize: '0.6rem' }} />
              {met === true && <CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#10b981' }} />}
              {met === false && <Typography variant="caption" sx={{ color: '#ef4444' }}>✗ actual: {t.actualValue}{t.unit}</Typography>}
            </Box>
            {contractEditing ? (
              <TextField size="small" fullWidth value={editedTargets[i]?.label || ''} multiline
                onChange={e => { const u = [...editedTargets]; u[i] = { ...u[i], label: e.target.value }; setEditedTargets(u); }}
                sx={{ mb: 0.5 }} />
            ) : (
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{t.label}</Typography>
            )}
            {!contractEditing && t.why && <Typography variant="caption" color="text.secondary">{t.why}</Typography>}
          </Box>
        );
      })}

      {contract.status !== 'scored' && (
        <Button fullWidth variant="contained" onClick={saveContract} disabled={contractSaving}
          sx={{ mt: 1, textTransform: 'none', fontWeight: 700, py: 1.5, borderRadius: 2 }}>
          {contractSaving ? 'Saving…' : contract.status === 'active' ? 'Update Contract' : 'Commit to These Targets'}
        </Button>
      )}
      {contract.status === 'active' && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          Contract active — automatically scored at week end.
        </Typography>
      )}
      {contract.status === 'scored' && (
        <Box sx={{ mt: 2, p: 2, bgcolor: contract.score >= 2 ? '#f0fdf4' : '#fef2f2', borderRadius: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: 700, color: contract.score >= 2 ? '#065f46' : '#b91c1c' }}>
            {contract.score === 3 ? 'Perfect week — all 3 targets met.' : contract.score === 2 ? '2 of 3 targets met. Strong week.' : contract.score === 1 ? '1 of 3 met. Something to build on.' : 'No targets met this week. Review and reset.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default NutritionInsights;
