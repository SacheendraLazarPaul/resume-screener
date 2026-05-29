import { useEffect, useState } from 'react';
import { Trash2, ChevronRight, Clock, Users, TrendingUp } from 'lucide-react';
import { getHistory, getSession, deleteSession } from '../utils/api.js';
import CandidateCard from '../components/CandidateCard.jsx';
import { exportToCSV } from '../utils/export.js';

export default function HistoryPage() {
  const [sessions, setSessions]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState('');

  useEffect(() => {
    getHistory()
      .then(setSessions)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function open(id) {
    const s = await getSession(id);
    setSelected(s);
  }

  async function del(id) {
    if (!window.confirm('Delete this screening session?')) return;
    await deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
      Loading history…
    </div>
  );

  if (error) return (
    <div className="max-w-2xl mx-auto mt-8 text-sm text-red-500 bg-red-50 rounded-xl p-4">
      Could not load history: {error}
    </div>
  );

  if (selected) return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-gray-400 hover:text-gray-700 mb-2 transition-colors"
          >
            ← Back to history
          </button>
          <h2 className="text-xl font-semibold">{selected.title || 'Screening Session'}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(selected.created_at).toLocaleString()} · {selected.candidates.length} candidates
          </p>
        </div>
        <button
          onClick={() => exportToCSV(selected.candidates, `session-${selected.id}`)}
          className="flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>
      <div className="space-y-3">
        {selected.candidates.map(c => <CandidateCard key={c.id} candidate={c} />)}
      </div>
    </div>
  );

  if (sessions.length === 0) return (
    <div className="text-center py-24 text-gray-400">
      <Clock size={32} className="mx-auto mb-3 opacity-40" />
      <p className="text-sm">No screening history yet.</p>
      <p className="text-xs mt-1">Run your first analysis to see results saved here.</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold">Screening History</h2>
      {sessions.map(s => (
        <div
          key={s.id}
          className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
        >
          <button onClick={() => open(s.id)} className="flex-1 text-left">
            <p className="font-medium text-gray-900 truncate">{s.title || 'Untitled session'}</p>
            <div className="flex items-center gap-4 mt-1.5">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={11} /> {new Date(s.created_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Users size={11} /> {s.candidate_count} candidates
              </span>
              {s.top_score != null && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <TrendingUp size={11} /> Top: {s.top_score}
                </span>
              )}
              {s.avg_score != null && (
                <span className="text-xs text-gray-400">Avg: {s.avg_score}</span>
              )}
            </div>
          </button>
          <button onClick={() => open(s.id)} className="text-gray-300 hover:text-gray-600 transition-colors">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => del(s.id)} className="text-gray-200 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
