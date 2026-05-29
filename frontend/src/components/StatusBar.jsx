import { useEffect, useState, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Zap, ChevronDown } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function StatusBar() {
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState(false);
  const [open,    setOpen]    = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/providers`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  if (error) return (
    <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-full">
      <AlertTriangle size={12} /> Backend offline
    </div>
  );

  if (!data) return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
      <Loader2 size={12} className="animate-spin" /> Checking AI…
    </div>
  );

  const active = data.active;
  const providers = data.providers || {};

  return (
    <div className="relative" ref={ref}>
      {/* ── Pill button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors"
      >
        <CheckCircle2 size={12} />
        <span className="font-medium capitalize">{active.provider || 'none'}</span>
        <span className="text-emerald-400">·</span>
        <span className="font-mono truncate max-w-[120px]">{active.model || '—'}</span>
        <span className="text-emerald-500 font-semibold ml-0.5">FREE</span>
        <ChevronDown size={11} className={`ml-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="absolute right-0 top-9 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">AI Providers</p>

          {Object.entries(providers).map(([key, p]) => {
            const isActive = active.provider === key;
            const healthy  = p.healthy === true;
            const failed   = p.healthy === false;
            const unknown  = p.healthy === null;

            return (
              <div
                key={key}
                className={`flex items-start gap-3 p-2.5 rounded-xl mb-1.5 transition-colors
                  ${isActive ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-gray-50'}`}
              >
                {/* Status icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {healthy  ? <CheckCircle2 size={15} className="text-emerald-500" /> :
                   failed   ? <XCircle      size={15} className="text-red-400"     /> :
                               <Loader2     size={15} className="text-gray-300 animate-spin" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">{p.name}</span>
                    {isActive && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                        <Zap size={9} /> ACTIVE
                      </span>
                    )}
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">FREE</span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{p.model}</p>

                  {/* Status message */}
                  {failed && !p.hasKey && (
                    <div className="mt-1">
                      <span className="text-xs text-red-500">No API key · </span>
                      <a href={p.getKeyUrl} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline">
                        Get free key →
                      </a>
                    </div>
                  )}
                  {failed && p.hasKey && (
                    <p className="text-xs text-red-400 mt-1">Key invalid or rate limited</p>
                  )}
                  {healthy && (
                    <p className="text-xs text-emerald-500 mt-0.5">✓ Working</p>
                  )}
                  {unknown && (
                    <p className="text-xs text-gray-400 mt-0.5">Not tested yet</p>
                  )}
                </div>
              </div>
            );
          })}

          <p className="text-[11px] text-gray-400 mt-3 text-center">
            App auto-selects the best working provider
          </p>
        </div>
      )}
    </div>
  );
}
