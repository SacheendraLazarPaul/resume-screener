import { useState } from 'react';
import { FileText, Briefcase, BarChart2, History } from 'lucide-react';
import UploadPage  from './pages/UploadPage.jsx';
import JDPage      from './pages/JDPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import StatusBar   from './components/StatusBar.jsx';
import { screenResumes } from './utils/api.js';

const STEPS = [
  { id: 'upload',  label: 'Resumes',         Icon: FileText  },
  { id: 'jd',      label: 'Job Description', Icon: Briefcase },
  { id: 'results', label: 'Results',         Icon: BarChart2 },
];

export default function App() {
  const [page,           setPage]           = useState('upload');   // upload | jd | results | history
  const [resumeFiles,    setResumeFiles]    = useState([]);
  const [manualResumes,  setManualResumes]  = useState([]);
  const [jdText,         setJdText]         = useState('');
  const [jdFile,         setJdFile]         = useState(null);
  const [results,        setResults]        = useState([]);
  const [provider,       setProvider]       = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');

  async function handleAnalyse() {
    setError('');
    setLoading(true);
    try {
      const data = await screenResumes({ resumeFiles, manualResumes, jdText, jdFile });
      setResults(data.results);
      setProvider(data.provider);
      setPage('results');
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPage('upload');
    setResumeFiles([]);
    setManualResumes([]);
    setJdText('');
    setJdFile(null);
    setResults([]);
    setError('');
  }

  const stepIdx = STEPS.findIndex(s => s.id === page);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top bar ───────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => setPage('upload')}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
            <FileText size={13} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900">Resume Screener</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage(page === 'history' ? 'upload' : 'history')}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors
              ${page === 'history'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <History size={13} /> History
          </button>
          <StatusBar />
        </div>
      </header>

      {/* ── Step indicator (only for main flow) ──────────── */}
      {page !== 'history' && (
        <div className="bg-white border-b border-gray-50 px-6 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-1">
            {STEPS.map((s, i) => {
              const active = s.id === page;
              const done   = i < stepIdx;
              return (
                <div key={s.id} className="flex items-center gap-1">
                  <button
                    onClick={() => { if (done || active) setPage(s.id); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                      ${active ? 'bg-gray-900 text-white' :
                        done   ? 'text-gray-500 hover:bg-gray-100 cursor-pointer' :
                                  'text-gray-300 cursor-default'}`}
                  >
                    <s.Icon size={12} /> {s.label}
                  </button>
                  {i < STEPS.length - 1 && <span className="text-gray-200 text-xs">›</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Error banner ─────────────────────────────────── */}
      {error && (
        <div className="max-w-3xl mx-auto mt-4 px-6">
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
            ⚠ {error}
          </div>
        </div>
      )}

      {/* ── Page content ─────────────────────────────────── */}
      <main className="px-6 py-8">
        {page === 'history' && <HistoryPage />}

        {page === 'upload' && (
          <UploadPage
            resumeFiles={resumeFiles}   setResumeFiles={setResumeFiles}
            manualResumes={manualResumes} setManualResumes={setManualResumes}
            onNext={() => setPage('jd')}
          />
        )}

        {page === 'jd' && (
          <JDPage
            jdText={jdText}   setJdText={setJdText}
            jdFile={jdFile}   setJdFile={setJdFile}
            onBack={() => setPage('upload')}
            onAnalyze={handleAnalyse}
            loading={loading}
          />
        )}

        {page === 'results' && (
          <ResultsPage results={results} provider={provider} onReset={reset} />
        )}
      </main>
    </div>
  );
}
