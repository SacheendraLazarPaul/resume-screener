import { useState, useMemo } from 'react';
import { Download, Search, RotateCcw, TrendingUp, Users, Star, CheckCircle2 } from 'lucide-react';
import CandidateCard from '../components/CandidateCard.jsx';
import { exportToCSV } from '../utils/export.js';

export default function ResultsPage({ results, provider, onReset }) {
  const [query,  setQuery]  = useState('');
  const [sort,   setSort]   = useState('rank');
  const [filter, setFilter] = useState('all');

  const stats = useMemo(() => ({
    total:     results.length,
    top:       results[0]?.score ?? 0,
    avg:       results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0,
    qualified: results.filter(r => r.score >= 70).length,
  }), [results]);

  const filtered = useMemo(() => {
    let list = [...results];
    if (filter === 'qualified') list = list.filter(r => r.score >= 70);
    if (filter === 'strong')    list = list.filter(r => r.recommendation === 'strong_yes');
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.current_title || '').toLowerCase().includes(q) ||
        (r.matched_skills || []).some(s => s.toLowerCase().includes(q))
      );
    }
    if (sort === 'score_asc') list.sort((a, b) => a.score - b.score);
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else                       list.sort((a, b) => a.rank - b.rank);
    return list;
  }, [results, query, sort, filter]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">Results</h2>
          {provider && (
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              {provider.provider} · {provider.model}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(results)}
            className="flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200
              rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download size={13} /> Export CSV
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200
              rounded-xl hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={13} /> New Screen
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Candidates',   value: stats.total,     Icon: Users,        color: 'text-blue-500' },
          { label: 'Top score',    value: stats.top,       Icon: TrendingUp,   color: stats.top >= 70 ? 'text-emerald-500' : 'text-amber-500' },
          { label: 'Average',      value: stats.avg,       Icon: Star,         color: 'text-purple-500' },
          { label: 'Qualified ≥70',value: stats.qualified, Icon: CheckCircle2, color: 'text-emerald-500' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
            <Icon size={16} className={`${color} mx-auto mb-1.5`} />
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search candidates…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="all">All candidates</option>
          <option value="qualified">Qualified only (≥70)</option>
          <option value="strong">Strong Yes only</option>
        </select>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="rank">Highest score first</option>
          <option value="score_asc">Lowest score first</option>
          <option value="name">By name A–Z</option>
        </select>
      </div>

      {/* Cards */}
      {filtered.length === 0
        ? <p className="text-center py-12 text-sm text-gray-400">No candidates match your filters.</p>
        : <div className="space-y-3">{filtered.map(c => <CandidateCard key={c.rank} candidate={c} />)}</div>
      }
    </div>
  );
}
