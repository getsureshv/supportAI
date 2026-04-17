'use client';

import { useState } from 'react';
import { CreateTicketRequest } from '@/lib/api';

interface TicketFormProps {
  onSubmit: (data: CreateTicketRequest) => void;
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

export default function TicketForm({ onSubmit, isLoading }: TicketFormProps) {
  const [formData, setFormData] = useState<CreateTicketRequest>({
    category: '',
    subject: '',
    description: '',
    priority: 'medium',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.subject || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }
    onSubmit(formData);
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

      <button
        type="submit"
        disabled={isLoading}
        className={`btn btn-primary w-full font-bold text-lg py-3 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isLoading ? '🔄 Creating Ticket...' : '📝 Create Ticket & Start Chat'}
      </button>

      <p className="text-sm text-gray-600">
        💡 Tip: After creating the ticket, our AI support assistant will help you gather more details through a chat conversation.
      </p>
    </form>
  );
}
