import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, GraduationCap } from 'lucide-react';
import ScoreBar from './ScoreBar.jsx';

const RANK_STYLE = {
  1: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300',
  2: 'bg-gray-100 text-gray-600 ring-1 ring-gray-300',
  3: 'bg-orange-100 text-orange-600 ring-1 ring-orange-300',
};

const REC_STYLE = {
  strong_yes: 'bg-emerald-100 text-emerald-700',
  yes:        'bg-blue-100   text-blue-700',
  maybe:      'bg-amber-100  text-amber-700',
  no:         'bg-red-100    text-red-600',
};

const REC_LABEL = {
  strong_yes: '⭐ Strong Yes',
  yes:        '✓ Yes',
  maybe:      '~ Maybe',
  no:         '✗ No',
};

export default function CandidateCard({ candidate: r }) {
  const [open, setOpen] = useState(false);

  const scoreColor =
    r.score >= 70 ? 'text-emerald-600' :
    r.score >= 45 ? 'text-amber-500'   : 'text-red-500';

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">

      {/* ── Top row ─────────────────────────────────────────── */}
      <div className="flex items-start gap-4 p-5">
        {/* Rank badge */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0
          ${RANK_STYLE[r.rank] || 'bg-gray-50 text-gray-500'}`}>
          {r.rank}
        </div>

        {/* Name + title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">{r.name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {r.current_title || 'Unknown title'}
                {r.experience_years != null && ` · ${r.experience_years} yrs`}
              </p>
            </div>
            {/* Score */}
            <div className="text-right shrink-0">
              <span className={`text-3xl font-bold tabular-nums ${scoreColor}`}>{r.score}</span>
              <span className="text-xs text-gray-400 block">/100</span>
            </div>
          </div>

          {/* Main score bar */}
          <div className="mt-3">
            <ScoreBar score={r.score} />
          </div>

          {/* Sub-score grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3">
            {[
              ['Skills',     r.skills_match],
              ['Experience', r.experience_match],
              ['Education',  r.education_match],
              ['Keywords',   r.keyword_score],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                  <span>{label}</span><span>{val}%</span>
                </div>
                <ScoreBar score={val} size="sm" />
              </div>
            ))}
          </div>

          {/* Recommendation + education pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            {r.recommendation && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium
                ${REC_STYLE[r.recommendation] || 'bg-gray-100 text-gray-500'}`}>
                {REC_LABEL[r.recommendation] || r.recommendation}
              </span>
            )}
            {r.education && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <GraduationCap size={11} /> {r.education}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Skill tags ──────────────────────────────────────── */}
      {(r.matched_skills?.length > 0 || r.missing_skills?.length > 0) && (
        <div className="px-5 pb-3 pt-2 border-t border-gray-50 flex flex-wrap gap-1.5">
          {r.matched_skills?.slice(0, 8).map(s => (
            <span key={s} className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={10} /> {s}
            </span>
          ))}
          {r.missing_skills?.slice(0, 5).map(s => (
            <span key={s} className="flex items-center gap-1 text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">
              <XCircle size={10} /> {s}
            </span>
          ))}
        </div>
      )}

      {/* ── Expandable AI summary ────────────────────────────── */}
      <div className="border-t border-gray-50">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-gray-400
            hover:text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span>AI Assessment</span>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {open && (
          <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
            {r.summary || 'No summary available.'}
          </p>
        )}
      </div>
    </div>
  );
}
