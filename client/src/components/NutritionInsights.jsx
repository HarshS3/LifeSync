import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';

// ----------------------------------------------------------------------
// NEW DAILYLIFESTATE-ALIGNED NUTRITION INSIGHTS (Brutalist/Editorial UI)
// ----------------------------------------------------------------------

const NutritionInsights = ({ selectedDate }) => {
  const { token } = useAuth();
  const [macroData, setMacroData] = useState(null);
  const [microData, setMicroData] = useState(null);
  const [metabolicMap, setMetabolicMap] = useState(null);
  const [hypotheses, setHypotheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('macro');

  const feedbackHypothesis = async (id, isPositive) => {
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/hypotheses/${id}/feedback`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPositive }),
      });
      if (res.ok) {
        setHypotheses(prev => prev.map(h => h._id === id ? { ...h, feedback: isPositive ? 1 : -1 } : h));
      }
    } catch (err) {
      console.error('Failed to save feedback:', err);
    }
  };

  const getWeekKey = (dateObj) => {
    const istDateStr = new Date(dateObj).toLocaleString('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
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
  };

  const getWeekRangeDisplay = (dateObj) => {
    const istDateStr = new Date(dateObj).toLocaleString('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).substring(0, 10).replace(/\//g, '-');
    const [y, m, dDay] = istDateStr.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1, dDay, 0, 0, 0));
    const dayNum = d.getUTCDay();
    const start = new Date(d);
    start.setUTCDate(start.getUTCDate() - dayNum); // Sunday
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6); // Saturday
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
  };

  useEffect(() => {
    const fetchAggregationData = async () => {
      try {
        setLoading(true);
        const weekKey = getWeekKey(selectedDate);

        const [macroRes, microRes, metabolicRes, hypoRes] = await Promise.all([
          fetch(`${API_BASE}/api/nutrition/aggregation/weekly-macros/${weekKey}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/nutrition/aggregation/weekly-micros/${weekKey}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/nutrition/metabolic-map?daysBack=60`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/nutrition/hypotheses`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!macroRes.ok || !microRes.ok) throw new Error('Failed to fetch aggregation data');
        setMacroData(await macroRes.json());
        setMicroData(await microRes.json());
        if (metabolicRes.ok) setMetabolicMap(await metabolicRes.json());
        if (hypoRes.ok) setHypotheses(await hypoRes.json());
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAggregationData();
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
            {getWeekRangeDisplay(selectedDate)} ({getWeekKey(selectedDate)})
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
          {['macro', 'micro', 'metabolic', 'hypo'].map(tab => (
            <Typography key={tab} component="button" onClick={() => setActiveTab(tab)} sx={{
              background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid var(--ls-text)' : '2px solid transparent',
              pb: 0.5, cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem',
              color: activeTab === tab ? 'var(--ls-text)' : 'var(--ls-text-muted)', transition: 'all 0.2s', '&:hover': { color: 'var(--ls-text)' },
              whiteSpace: 'nowrap'
            }}>
              {tab === 'macro' ? 'Macros' : tab === 'micro' ? 'Micronutrients' : tab === 'metabolic' ? 'Metabolic Map' : 'AI Hypotheses'}
            </Typography>
          ))}
        </Box>
      </Box>

      <Box sx={{ animation: 'fadeIn 0.5s ease-out' }}>
        {activeTab === 'macro' && macroData && <MacroEditorialView data={macroData} />}
        {activeTab === 'micro' && microData && <MicroEditorialView data={microData} />}
        {activeTab === 'metabolic' && <MetabolicMapView data={metabolicMap} />}

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
                        onClick={() => feedbackHypothesis(h._id, true)}
                        sx={{ cursor: 'pointer', opacity: h.feedback === 1 ? 1 : 0.3, '&:hover': { opacity: 1 }, fontFamily: 'monospace', fontWeight: 700 }}
                      >
                        [YES]
                      </Box>
                      <Box 
                        onClick={() => feedbackHypothesis(h._id, false)}
                        sx={{ cursor: 'pointer', opacity: h.feedback === -1 ? 1 : 0.3, '&:hover': { opacity: 1 }, fontFamily: 'monospace', fontWeight: 700 }}
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

export default NutritionInsights;
