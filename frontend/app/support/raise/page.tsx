'use client';

import { useState } from 'react';
import { ticketsAPI, CreateTicketRequest } from '@/lib/api';
import TicketForm from '@/components/TicketForm';
import TicketChat from '@/components/TicketChat';

export default function RaiseTicketPage() {
  const [ticketData, setTicketData] = useState<Partial<CreateTicketRequest>>({});
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleCreateTicket = async (data: CreateTicketRequest, files: File[]) => {
    setIsCreating(true);
    setError(null);
    setUploadStatus(null);
    try {
      const response = await ticketsAPI.create(data);
      const id = response.data.id;

      if (files.length > 0) {
        setUploadStatus(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}…`);
        try {
          await ticketsAPI.uploadAttachments(id, files);
          setUploadStatus(`Uploaded — transcription runs in the background.`);
        } catch (uploadErr: any) {
          setError(
            `Ticket created, but file upload failed: ${
              uploadErr.response?.data?.error || uploadErr.message
            }`,
          );
        }
      }

      setTicketId(id);
      setTicketData(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setIsCreating(false);
    }
  };

  if (ticketId) {
    return (
      <div>
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
          <h2 className="text-green-900 font-bold text-lg">✓ Ticket Created Successfully</h2>
          <p className="text-green-800">Ticket ID: <span className="font-mono font-bold">{ticketId}</span></p>
          {uploadStatus && <p className="text-green-800 text-sm mt-1">📎 {uploadStatus}</p>}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <TicketChat ticketId={ticketId} />
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-bold text-lg mb-4">Ticket Summary</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Category</p>
                <p className="font-bold">{ticketData.category}</p>
              </div>
              <div>
                <p className="text-gray-600">Priority</p>
                <p className="font-bold">{ticketData.priority}</p>
              </div>
              <div>
                <p className="text-gray-600">Subject</p>
                <p className="font-bold">{ticketData.subject}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-cricket-green mb-6">Raise a Support Ticket</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <TicketForm onSubmit={handleCreateTicket} isLoading={isCreating} />
        </div>

        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="font-bold text-lg text-blue-900 mb-4">ℹ️ Before You Start</h3>
          <ul className="text-blue-800 space-y-3">
            <li className="flex gap-2">
              <span>📹</span>
              <span>Have video/photo evidence ready (especially for umpire disputes)</span>
            </li>
            <li className="flex gap-2">
              <span>📅</span>
              <span>Know the match date and match type (T20, 30 overs, etc.)</span>
            </li>
            <li className="flex gap-2">
              <span>👥</span>
              <span>Have player/umpire names ready</span>
            </li>
            <li className="flex gap-2">
              <span>⚡</span>
              <span>Playoff tickets get faster response (2 hours vs 4-8 hours)</span>
            </li>
            <li className="flex gap-2">
              <span>📖</span>
              <span>Reference Cricket Laws if possible (e.g., Law 1.2.2)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
