import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';

const DeficiencyRadar = ({ risks = [] }) => {
  if (!risks || risks.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(34, 197, 94, 0.05)', borderRadius: 2, border: '1px solid rgba(34, 197, 94, 0.2)' }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 48, color: '#22c55e', mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#166534', mb: 1 }}>
          Micronutrient All-Clear
        </Typography>
        <Typography variant="body2" sx={{ color: '#15803d', maxWidth: 500, mx: 'auto' }}>
          Your 7-day rolling averages are within optimal ranges. We haven't detected any predictive deficiency risks based on your current logging consistency.
        </Typography>
      </Box>
    );
  }

  // Transform risks for Radar Chart
  // We want to show how far they are from the target.
  // Lower values (closer to center) mean higher risk.
  const chartData = risks.map(r => ({
    subject: r.nutrient,
    A: Math.min(100, Math.round((r.average / r.target) * 100)),
    fullMark: 100,
  }));

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <WarningAmberIcon sx={{ color: '#f59e0b' }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Micronutrient Risk Analysis</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Based on 7-day rolling average consumption vs. RDA targets.</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 4, alignItems: 'start' }}>
        {/* Radar Chart */}
        <Box sx={{ height: 400, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb', p: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Consumption"
                dataKey="A"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.4}
              />
            </RadarChart>
          </ResponsiveContainer>
          <Typography variant="caption" sx={{ textAlign: 'center', display: 'block', color: 'text.secondary', mt: -2 }}>
            Center = 0% of Target · Outer Edge = 100% of Target
          </Typography>
        </Box>

        {/* Risk Cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {risks.map((risk, idx) => {
            const pct = Math.round((risk.average / risk.target) * 100);
            return (
              <Box 
                key={idx} 
                sx={{ 
                  p: 3, 
                  borderRadius: 2, 
                  border: '1px solid', 
                  borderColor: '#fed7aa', 
                  bgcolor: '#fff7ed' 
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#9a3412' }}>
                    {risk.nutrient}
                  </Typography>
                  <Chip 
                    label={`${pct}% of Goal`} 
                    size="small" 
                    sx={{ bgcolor: '#ffedd5', color: '#9a3412', fontWeight: 700 }} 
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <InfoOutlinedIcon sx={{ fontSize: 14 }} /> Symptom Risk
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#431407', lineHeight: 1.4 }}>{risk.symptomRisk}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <TipsAndUpdatesIcon sx={{ fontSize: 14 }} /> Quick Fix
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#064e3b', lineHeight: 1.4 }}>{risk.foodFix}</Typography>
                  </Box>
                </Box>

                <Box sx={{ height: 4, width: '100%', bgcolor: '#ffedd5', borderRadius: 99, overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${Math.min(100, pct)}%`, bgcolor: '#f97316' }} />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default DeficiencyRadar;
