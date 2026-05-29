export function exportToCSV(results, filename = 'candidate-rankings') {
  const headers = [
    'Rank', 'Name', 'Score', 'Recommendation', 'Current Title',
    'Experience (yrs)', 'Education', 'Skills Match %', 'Experience Match %',
    'Education Match %', 'Keyword Score %', 'Matched Skills', 'Missing Skills', 'Summary',
  ];
  const rows = results.map(r => [
    r.rank,
    r.name,
    r.score,
    r.recommendation || '',
    r.current_title  || '',
    r.experience_years ?? '',
    r.education      || '',
    r.skills_match,
    r.experience_match,
    r.education_match,
    r.keyword_score,
    (r.matched_skills || []).join('; '),
    (r.missing_skills || []).join('; '),
    (r.summary || '').replace(/"/g, "'"),
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${c}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
