'use client';

import { useState } from 'react';

interface ChatChipsProps {
  options: string[];
  disabled?: boolean;
  onPick: (value: string) => void;
}

export default function ChatChips({ options, disabled, onPick }: ChatChipsProps) {
  const [typed, setTyped] = useState('');

  const submitTyped = (e: React.FormEvent) => {
    e.preventDefault();
    const v = typed.trim();
    if (!v) return;
    setTyped('');
    onPick(v);
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

      <form onSubmit={submitTyped} className="flex gap-2">
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
