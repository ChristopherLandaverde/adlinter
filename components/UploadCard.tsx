'use client';

import { useState, useRef } from 'react';

interface UploadCardProps {
  title: string;
  description: string;
  accept: string;
  icon: string;
  onFileUpload: (file: File) => void;
  uploaded?: boolean;
  fileName?: string;
}

export default function UploadCard({
  title,
  description,
  accept,
  icon,
  onFileUpload,
  uploaded = false,
  fileName,
}: UploadCardProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
        uploaded
          ? 'border-green-400 bg-green-50'
          : dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="text-5xl mb-4">{uploaded ? '\u2705' : icon}</div>
      <h3 className="text-xl font-bold mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-500 mb-5 text-sm">{description}</p>

      {uploaded && fileName ? (
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
          <span>{fileName}</span>
        </div>
      ) : (
        <span className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Upload {accept}
        </span>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleChange}
      />

      <p className="text-xs text-gray-400 mt-4">
        or drag and drop your file here
      </p>
    </div>
  );
}
