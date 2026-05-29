import { useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

const ACCEPTED = ['.pdf', '.doc', '.docx', '.txt'];

function formatSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DropZone({ files, onChange, label, multiple = true }) {
  const inputRef  = useRef();
  const [dragging, setDragging] = useState(false);

  function add(newFiles) {
    const valid = Array.from(newFiles).filter(f =>
      ACCEPTED.some(ext => f.name.toLowerCase().endsWith(ext))
    );
    onChange(multiple ? [...files, ...valid] : [valid[0]].filter(Boolean));
  }

  function remove(idx) {
    onChange(files.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={e  => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors select-none
          ${dragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={ACCEPTED.join(',')}
          onChange={e => add(e.target.files)}
        />
        <Upload className="mx-auto mb-3 text-gray-400" size={26} />
        <p className="text-sm font-medium text-gray-600">{label || 'Drop files here or click to browse'}</p>
        <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, TXT</p>
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2">
              <FileText size={14} className="text-blue-500 shrink-0" />
              <span className="flex-1 text-sm text-gray-700 truncate">{f.name}</span>
              <span className="text-xs text-gray-400 shrink-0">{formatSize(f.size)}</span>
              <button onClick={() => remove(i)} className="text-gray-300 hover:text-red-400 shrink-0 transition-colors">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
