import React, { useState, useRef } from 'react';
import { Camera, X, Check, Loader2, Plus, Trash2, Save } from 'lucide-react';

export default function PhotoLogFlow({ apiBase, token, onComplete, onCancel }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleCaptureClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${apiBase}/api/photo-log/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to analyze photo');
      }

      const data = await res.json();
      setResult({
        ...data,
        detected: Array.isArray(data.detected) ? data.detected : []
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateItem = (index, field, value) => {
    if (!result) return;
    const newItems = [...result.detected];
    newItems[index] = { ...newItems[index], [field]: value };
    setResult({ ...result, detected: newItems });
  };

  const removeItem = (index) => {
    if (!result) return;
    const newItems = [...result.detected];
    newItems.splice(index, 1);
    setResult({ ...result, detected: newItems });
  };

  const handleSave = async () => {
    if (!result || result.detected.length === 0) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/api/photo-log/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: result.detected,
          mealType: result.mealType,
        }),
      });

      if (!res.ok) {
         const errData = await res.json();
         throw new Error(errData.error || 'Failed to save meal');
      }
      
      const payload = await res.json();
      if (onComplete) onComplete(payload);
      
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (!analyzing && !result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-8 text-center text-white border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Camera className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight mb-2">Photo Logger</h2>
          <p className="text-white/60 mb-8 text-sm">Take a photo of your meal. Our AI will instantly identify the foods and estimate portions.</p>
          
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-col gap-3">
            <button
              onClick={handleCaptureClick}
              className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-semibold tracking-wide text-lg flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors"
            >
              <Camera className="w-5 h-5" />
              Take or Choose Photo
            </button>
            <button
              onClick={onCancel}
              className="w-full py-4 rounded-2xl bg-white/5 text-white/70 font-medium text-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
          
          {error && <div className="mt-6 p-4 bg-red-500/10 text-red-400 rounded-2xl text-sm">{error}</div>}
        </div>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
         <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-6" />
            <div className="text-xl font-medium text-white tracking-tight">Analyzing your meal...</div>
            <div className="text-white/50 text-sm mt-3 animate-pulse">Identifying ingredients and portions</div>
         </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 pb-0">
      <div className="bg-[#1c1c1e] w-full max-w-md sm:rounded-[32px] rounded-t-[32px] rounded-b-none h-[85vh] sm:h-auto max-h-[85vh] flex flex-col overflow-hidden text-white border border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Review Meal</h2>
            <div className="text-sm text-emerald-400/90 flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Vision AI extracted
            </div>
          </div>
          <button onClick={onCancel} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
           {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm">{error}</div>}
           
           <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Meal Type</div>
                <select 
                  className="bg-transparent text-lg font-medium text-white outline-none w-full appearance-none cursor-pointer"
                  value={result.mealType}
                  onChange={e => setResult({...result, mealType: e.target.value})}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
              <div className="flex-1 bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
                <div className="text-xs text-emerald-500/70 font-medium uppercase tracking-wider mb-1">Confidence</div>
                <div className="text-lg font-medium text-emerald-400 capitalize">{result.overallConfidence}</div>
              </div>
           </div>

           {result.notes && (
             <div className="mb-8 text-sm text-white/60 bg-white/5 p-4 rounded-2xl leading-relaxed">
               <span className="font-medium text-white/80">Observation:</span> {result.notes}
             </div>
           )}

           <div className="space-y-3 mb-6">
              {result.detected.map((item, idx) => (
                <div key={idx} className="bg-[#242426] rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                   <div className="flex-1">
                      <input 
                         className="bg-transparent font-medium text-white text-lg outline-none w-full mb-1" 
                         value={item.name}
                         onChange={e => updateItem(idx, 'name', e.target.value)}
                         placeholder="Food name"
                      />
                      <div className="flex items-center gap-2 text-sm text-white/50">
                         <input 
                           type="number" 
                           className="bg-white/5 rounded-md px-2 py-1 w-16 outline-none text-white max-w-[4rem]" 
                           value={item.quantity}
                           onChange={e => updateItem(idx, 'quantity', e.target.value)}
                         />
                         <input 
                           className="bg-transparent outline-none w-16" 
                           value={item.unit}
                           onChange={e => updateItem(idx, 'unit', e.target.value)}
                         />
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="font-semibold text-emerald-400">{item.estimatedCalories || 0} <span className="text-xs font-normal opacity-70">kcal</span></div>
                      <div className="text-xs text-white/40 mt-1">{item.estimatedProtein || 0}g protein</div>
                   </div>
                   <button onClick={() => removeItem(idx)} className="p-2 text-white/30 hover:text-red-400 transition-colors ml-2">
                     <Trash2 className="w-5 h-5" />
                   </button>
                </div>
              ))}
           </div>
           
           {result.detected.length === 0 && (
              <div className="text-center py-10 text-white/40">
                No items detected. Try another photo.
              </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 shrink-0 bg-[#1c1c1e]">
          <button
            onClick={handleSave}
            disabled={saving || result.detected.length === 0}
            className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-semibold text-lg flex items-center justify-center gap-2 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            {saving ? 'Logging...' : 'Log to Tracker'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
