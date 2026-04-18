'use client';

import { useState } from 'react';
import { CreateTicketRequest } from '@/lib/api';

interface TicketFormProps {
  onSubmit: (data: CreateTicketRequest, files: File[]) => void;
  isLoading: boolean;
}

const CATEGORIES = [
  { value: 'player_registration', label: '👤 Player Registration & Eligibility' },
  { value: 'umpire_issues', label: '🏐 Umpire & Match Officiating Issues' },
  { value: 'scoring_disputes', label: '📊 Scoring & Scorecard Issues' },
  { value: 'equipment_issues', label: '🏏 Equipment & Ground Issues' },
  { value: 'match_scheduling', label: '📅 Match Scheduling & Walk-Overs' },
  { value: 'disciplinary', label: '⚖️ Disciplinary & Rules Enforcement' },
  { value: 'feature_request', label: '💡 Feature Requests' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low - Nice to have' },
  { value: 'medium', label: 'Medium - Should fix soon' },
  { value: 'high', label: 'High - Important issue' },
  { value: 'urgent', label: 'Urgent - Playoff or time-sensitive' },
];

const ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,.txt,.md';

const MAX_SIZE_BYTES = 15 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function TicketForm({ onSubmit, isLoading }: TicketFormProps) {
  const [formData, setFormData] = useState<CreateTicketRequest>({
    category: '',
    subject: '',
    description: '',
    priority: 'medium',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    const oversized = incoming.find(f => f.size > MAX_SIZE_BYTES);
    if (oversized) {
      setFileError(`"${oversized.name}" is larger than 15 MB. Please pick a smaller file.`);
      return;
    }
    setFileError(null);
    setFiles(prev => [...prev, ...incoming]);
    // Reset input so picking the same file again re-fires onChange
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.subject || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }
    onSubmit(formData, files);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-6">
      <h2 className="text-2xl font-bold text-cricket-green mb-6">Create New Ticket</h2>

      <div className="form-group">
        <label htmlFor="category" className="form-label">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="form-select"
          required
        >
          <option value="">Select a category...</option>
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="subject" className="form-label">
          Subject <span className="text-red-500">*</span>
        </label>
        <input
          id="subject"
          type="text"
          name="subject"
          placeholder="Brief summary of your issue"
          value={formData.subject}
          onChange={handleChange}
          className="form-input"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          placeholder="Detailed description of your issue. Include match date, player/umpire names, when it happened, what you've already tried, etc."
          value={formData.description}
          onChange={handleChange}
          className="form-textarea"
          rows={6}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="priority" className="form-label">
          Priority <span className="text-red-500">*</span>
        </label>
        <select
          id="priority"
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          className="form-select"
          required
        >
          {PRIORITIES.map(pri => (
            <option key={pri.value} value={pri.value}>
              {pri.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">
          Evidence <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <p className="text-sm text-gray-600 mb-2">
          Attach photos, scorecards, PDFs, or other proof. Images and PDFs will be transcribed
          automatically so the AI can reference them.
        </p>
        <input
          type="file"
          accept={ACCEPT}
          multiple
          onChange={handleFiles}
          className="block w-full text-sm text-gray-600
            file:mr-3 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-cricket-green file:text-white
            hover:file:bg-cricket-green-dark
            cursor-pointer"
        />
        {fileError && (
          <p className="text-sm text-red-600 mt-2">{fileError}</p>
        )}

        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <span>📎</span>
                  <span className="font-medium truncate">{f.name}</span>
                  <span className="text-gray-500 text-xs">{formatSize(f.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-red-600 hover:text-red-800 text-xs font-semibold"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={`btn btn-primary w-full font-bold text-lg py-3 ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? '🔄 Creating Ticket...' : '📝 Create Ticket & Start Chat'}
      </button>

      <p className="text-sm text-gray-600">
        💡 Tip: After creating the ticket, our AI assistant will use the form details and any
        uploaded evidence to help triage your issue.
      </p>
    </form>
  );
}
