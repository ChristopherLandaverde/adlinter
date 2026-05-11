'use client';

import { useState, useRef, useCallback } from 'react';

interface FileDropZoneProps {
  accept: string;
  label: string;
  onFile: (file: File) => void;
  uploaded?: boolean;
  fileName?: string;
  processing?: boolean;
  error?: string;
  compact?: boolean;
}

export default function FileDropZone({
  accept,
  label,
  onFile,
  uploaded = false,
  fileName,
  processing = false,
  error,
  compact = false,
}: FileDropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        className={`cursor-pointer rounded-md border border-dashed px-6 py-5 transition-colors ${
          uploaded
            ? 'border-pass/30 bg-pass/5'
            : dragActive
              ? 'border-accent bg-surface-2'
              : 'border-border bg-surface hover:border-ink/20'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-ink text-sm">{label}</p>
            {uploaded && fileName ? (
              <p className="text-pass text-xs mt-0.5 truncate">{fileName}</p>
            ) : error ? (
              <p className="text-critical text-xs mt-0.5">{error}</p>
            ) : (
              <p className="text-muted text-xs mt-0.5">Click or drop file here ({accept})</p>
            )}
          </div>
          <div className="flex-shrink-0">
            {processing ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            ) : uploaded ? (
              <span className="text-pass text-xl">&#10003;</span>
            ) : (
              <span className="inline-block rounded-sm bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover">
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
      className={`cursor-pointer rounded-lg border border-dashed transition-colors ${
        uploaded
          ? 'border-pass/30 bg-pass/5'
          : dragActive
            ? 'border-accent bg-surface-2 ring-4 ring-accent/10'
            : 'border-border bg-surface hover:border-ink/20 hover:bg-surface-2'
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
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            <p className="font-medium text-muted">Processing file...</p>
          </>
        ) : uploaded && fileName ? (
          <>
            <span className="text-pass text-4xl mb-4">&#10003;</span>
            <p className="text-pass font-semibold text-lg mb-1">{fileName}</p>
            <p className="text-pass text-sm">File loaded successfully. Click to replace.</p>
          </>
        ) : (
          <>
            <div className="mb-6">
              <svg className="w-16 h-16 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span
              className="mb-3 inline-block rounded-sm bg-accent px-8 py-3 text-base font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Select {label}
            </span>
            <p className="text-muted text-sm">or drag and drop your file here</p>
            <p className="text-muted/70 text-xs mt-2">Accepts: {accept}</p>
          </>
        )}

        {error && (
          <div className="mt-4 max-w-md rounded-md border border-critical/20 bg-critical/5 px-4 py-2 text-sm text-critical">
            {error}
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={handleChange} />
    </div>
  );
}
