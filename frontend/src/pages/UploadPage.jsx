import { useState } from 'react';
import { Plus, Trash2, PenLine } from 'lucide-react';
import DropZone from '../components/DropZone.jsx';

export default function UploadPage({ resumeFiles, setResumeFiles, manualResumes, setManualResumes, onNext }) {
  const [name,    setName]    = useState('');
  const [content, setContent] = useState('');

  function addManual() {
    if (!content.trim()) return;
    const n = name.trim() || `Candidate ${manualResumes.length + 1}`;
    setManualResumes(prev => [...prev, { name: n, content: content.trim() }]);
    setName(''); setContent('');
  }

  const total = resumeFiles.length + manualResumes.length;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Upload Resumes</h2>
        <p className="text-sm text-gray-500 mt-1">Add one or more resumes — files or pasted text.</p>
      </div>

      {/* File upload */}
      <DropZone
        files={resumeFiles}
        onChange={setResumeFiles}
        label="Drop resumes here or click to browse"
        multiple
      />

      {/* Manual paste */}
      <div className="border border-gray-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <PenLine size={14} /> Or paste resume text
        </div>
        <input
          type="text"
          placeholder="Candidate name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <textarea
          rows={6}
          placeholder="Paste resume content here..."
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
        />
        <button
          onClick={addManual}
          disabled={!content.trim()}
          className="flex items-center gap-1.5 text-sm px-4 py-2 border border-gray-200 rounded-lg
            hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={13} /> Add Resume
        </button>
      </div>

      {/* Manual list */}
      {manualResumes.length > 0 && (
        <ul className="space-y-2">
          {manualResumes.map((r, i) => (
            <li key={i} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-2.5">
              <PenLine size={13} className="text-purple-400 shrink-0" />
              <span className="flex-1 text-sm text-gray-700">{r.name}</span>
              <span className="text-xs text-gray-400">{r.content.length} chars</span>
              <button
                onClick={() => setManualResumes(prev => prev.filter((_, j) => j !== i))}
                className="text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-sm text-gray-400">
          {total === 0 ? 'No resumes added yet' : `${total} resume${total > 1 ? 's' : ''} ready`}
        </span>
        <button
          onClick={onNext}
          disabled={total === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium
            rounded-xl hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next: Job Description →
        </button>
      </div>
    </div>
  );
}
