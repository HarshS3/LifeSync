import React, { useState, useEffect } from 'react';
import { History, Plus, Loader2, Zap } from 'lucide-react';

export default function MealTemplates({ apiBase, token, onRelog }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloggingId, setReloggingId] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, [token]);

  const fetchTemplates = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/api/nutrition/meal-templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Failed to fetch meal templates', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRelog = async (template, idx) => {
    setReloggingId(idx);
    try {
      const res = await fetch(`${apiBase}/api/nutrition/meal-templates/relog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mealName: template.mealName,
          mealType: template.mealType,
          foods: template.foods
        })
      });
      
      if (!res.ok) throw new Error('Relog failed');
      
      const payload = await res.json();
      if (onRelog) onRelog(payload);
    } catch (err) {
      console.error('Relog error', err);
    } finally {
      setReloggingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 overflow-x-auto pb-4 hide-scrollbar">
        {[1, 2, 3].map(i => (
          <div key={i} className="min-w-[160px] h-28 bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (templates.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2">
          <History className="w-3 h-3" />
          Quick Relog
        </div>
        <div className="text-[10px] text-white/30">Your most frequent meals</div>
      </div>
      
      <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x">
        {templates.map((t, idx) => (
          <button
            key={idx}
            onClick={() => handleRelog(t, idx)}
            disabled={reloggingId !== null}
            className="min-w-[180px] text-left bg-[#242426] hover:bg-[#2c2c2e] border border-white/5 rounded-2xl p-4 transition-all duration-200 snap-start relative overflow-hidden group shadow-lg active:scale-95"
          >
            {reloggingId === idx ? (
              <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[2px] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              </div>
            ) : null}
            
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 fill-emerald-400" />
                {t.frequency}×
              </div>
              <div className="text-[10px] text-white/30 capitalize">{t.mealType}</div>
            </div>
            
            <div className="text-sm font-semibold text-white mb-1 line-clamp-1 group-hover:text-emerald-400 transition-colors">
              {t.mealName}
            </div>
            
            <div className="text-[11px] text-white/50 flex items-center gap-2">
               <span>{Math.round(t.totalCalories)} kcal</span>
               <span className="w-1 h-1 rounded-full bg-white/10" />
               <span>{Math.round(t.totalProtein)}g P</span>
            </div>
            
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
               <Plus className="w-3 h-3" />
               Log Now
            </div>
          </button>
        ))}
      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
