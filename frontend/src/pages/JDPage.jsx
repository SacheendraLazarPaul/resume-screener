import { Sparkles } from 'lucide-react';
import DropZone from '../components/DropZone.jsx';

export default function JDPage({ jdText, setJdText, jdFile, setJdFile, onBack, onAnalyze, loading }) {
  const canAnalyze = !loading && (jdText.trim() || jdFile);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Job Description</h2>
        <p className="text-sm text-gray-500 mt-1">Paste or upload the job description to screen against.</p>
      </div>

      <textarea
        rows={12}
        placeholder={`Paste the full job description here...\n\nExample:\nWe are looking for a Senior Software Engineer with 5+ years of Python and React experience. Must have experience with AWS, microservices, REST APIs, and CI/CD pipelines. CS degree or equivalent required.`}
        value={jdText}
        onChange={e => setJdText(e.target.value)}
        className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none
          focus:ring-2 focus:ring-blue-200 resize-y leading-relaxed"
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400">or upload a file</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <DropZone
        files={jdFile ? [jdFile] : []}
        onChange={files => setJdFile(files[0] || null)}
        label="Upload Job Description file"
        multiple={false}
      />

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium
            rounded-xl hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                  strokeDasharray="31.4" strokeDashoffset="10" />
              </svg>
              Analysing…
            </>
          ) : (
            <><Sparkles size={14} /> Analyse Candidates</>
          )}
        </button>
      </div>
    </div>
  );
}
