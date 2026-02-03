'use client';

import { useState, useRef, useCallback } from 'react';

interface FileDropZoneProps {
  accept: string;
  label: string;
  color: string;
  onFile: (file: File) => void;
  uploaded?: boolean;
  fileName?: string;
  processing?: boolean;
  error?: string;
  compact?: boolean;
}

const colorMap: Record<string, { bg: string; border: string; button: string; buttonHover: string; ring: string; text: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-400',    button: 'bg-blue-600',    buttonHover: 'hover:bg-blue-700',    ring: 'ring-blue-200',    text: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-400', button: 'bg-emerald-600', buttonHover: 'hover:bg-emerald-700', ring: 'ring-emerald-200', text: 'text-emerald-600' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-400',  button: 'bg-violet-600',  buttonHover: 'hover:bg-violet-700',  ring: 'ring-violet-200',  text: 'text-violet-600' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-400',   button: 'bg-amber-600',   buttonHover: 'hover:bg-amber-700',   ring: 'ring-amber-200',   text: 'text-amber-600' },
  pink:    { bg: 'bg-pink-50',    border: 'border-pink-400',    button: 'bg-pink-600',    buttonHover: 'hover:bg-pink-700',    ring: 'ring-pink-200',    text: 'text-pink-600' },
};

export default function FileDropZone({
  accept,
  label,
  color,
  onFile,
  uploaded = false,
  fileName,
  processing = false,
  error,
  compact = false,
}: FileDropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const colors = colorMap[color] ?? colorMap.blue;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) {
        onFile(e.dataTransfer.files[0]);
      }
    },
    [onFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
        onFile(e.target.files[0]);
        e.target.value = '';
      }
    },
    [onFile],
  );

  if (compact) {
    return (
      <div
        className={`border-2 border-dashed rounded-xl transition-all cursor-pointer px-6 py-5 ${
          uploaded
            ? 'border-green-400 bg-green-50'
            : dragActive
              ? `${colors.border} ${colors.bg}`
              : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm">{label}</p>
            {uploaded && fileName ? (
              <p className="text-green-700 text-xs mt-0.5 truncate">{fileName}</p>
            ) : error ? (
              <p className="text-red-600 text-xs mt-0.5">{error}</p>
            ) : (
              <p className="text-gray-400 text-xs mt-0.5">Click or drop file here ({accept})</p>
            )}
          </div>
          <div className="flex-shrink-0">
            {processing ? (
              <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${colors.border}`} />
            ) : uploaded ? (
              <span className="text-green-600 text-xl">&#10003;</span>
            ) : (
              <span className={`inline-block ${colors.button} text-white px-4 py-1.5 rounded-lg text-xs font-medium ${colors.buttonHover} transition-colors`}>
                Upload
              </span>
            )}
          </div>
        </div>
        <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={handleChange} />
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
        uploaded
          ? 'border-green-400 bg-green-50'
          : dragActive
            ? `${colors.border} ${colors.bg} ring-4 ${colors.ring}`
            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-8">
        {processing ? (
          <>
            <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin ${colors.border} mb-4`} />
            <p className="text-gray-600 font-medium">Processing file...</p>
          </>
        ) : uploaded && fileName ? (
          <>
            <span className="text-5xl mb-4">&#9989;</span>
            <p className="text-green-800 font-semibold text-lg mb-1">{fileName}</p>
            <p className="text-green-600 text-sm">File loaded successfully. Click to replace.</p>
          </>
        ) : (
          <>
            <div className="mb-6">
              <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span
              className={`inline-block ${colors.button} text-white px-8 py-3 rounded-xl text-base font-semibold ${colors.buttonHover} transition-colors shadow-sm mb-3`}
            >
              Select {label}
            </span>
            <p className="text-gray-400 text-sm">or drag and drop your file here</p>
            <p className="text-gray-300 text-xs mt-2">Accepts: {accept}</p>
          </>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm max-w-md">
            {error}
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={handleChange} />
    </div>
  );
}
