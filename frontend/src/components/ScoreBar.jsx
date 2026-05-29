export default function ScoreBar({ score, size = 'md' }) {
  const barColor =
    score >= 70 ? 'bg-emerald-500' :
    score >= 45 ? 'bg-amber-400'   : 'bg-red-400';

  const textColor =
    score >= 70 ? 'text-emerald-600' :
    score >= 45 ? 'text-amber-600'   : 'text-red-500';

  const h = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-100 rounded-full overflow-hidden ${h}`}>
        <div
          className={`${h} ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      <span className={`text-xs font-medium tabular-nums w-8 text-right ${textColor}`}>
        {score}%
      </span>
    </div>
  );
}
