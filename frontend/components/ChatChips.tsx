'use client';

import { useRef, useState } from 'react';

interface ChatChipsProps {
  options: string[];
  disabled?: boolean;
  onPick: (value: string) => void;
  onFiles?: (files: File[]) => void;
  uploading?: boolean;
}

const ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,.txt,.md';

export default function ChatChips({
  options,
  disabled,
  onPick,
  onFiles,
  uploading,
}: ChatChipsProps) {
  const [typed, setTyped] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitTyped = (e: React.FormEvent) => {
    e.preventDefault();
    const v = typed.trim();
    if (!v) return;
    setTyped('');
    onPick(v);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    onFiles?.(files);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onPick(opt)}
            className={`px-4 py-2 rounded-full border text-sm font-medium transition
              ${
                disabled
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-cricket-green text-cricket-green bg-white hover:bg-cricket-green hover:text-white'
              }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <form onSubmit={submitTyped} className="flex gap-2 items-center">
        {onFiles && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              onChange={handleFiles}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              title="Attach evidence (images, PDFs, text)"
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:border-cricket-green hover:text-cricket-green disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="spinner inline-block">⟳</span>
              ) : (
                '📎'
              )}
            </button>
          </>
        )}
        <input
          type="text"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          disabled={disabled}
          placeholder="Or type your own response…"
          className="form-input flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={disabled || !typed.trim()}
          className="btn btn-primary text-sm disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
