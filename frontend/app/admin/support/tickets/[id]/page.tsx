'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ticketsAPI, adminAPI, Ticket } from '@/lib/api';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

export default function AdminTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await ticketsAPI.get(ticketId);
      setTicket(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [ticketId]);

  const updateStatus = async (status: string) => {
    setSaving(true);
    setToast(null);
    try {
      await adminAPI.updateTicket(ticketId, { status });
      setToast(`Status updated to ${status.replace(/_/g, ' ')}`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-600">Loading ticket…</div>;

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <Link href="/admin/support/tickets" className="text-cricket-green hover:underline">
          ← Back to queue
        </Link>
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-800">
          {error || 'Ticket not found'}
        </div>
      </div>
    );
  }

  const sla = ticket.sla;
  const messages = (ticket.messages || []).filter(m => !m.isInternal);
  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/support/tickets" className="text-cricket-green hover:underline">
          ← Back to queue
        </Link>
        <div className="flex gap-2">
          <span className={`badge ${ticket.priority}`}>{ticket.priority.toUpperCase()}</span>
          <span className="text-sm text-gray-600">Status: <strong>{ticket.status}</strong></span>
        </div>
      </div>

      {toast && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-sm">
          ✓ {toast}
        </div>
      )}

      {/* Ticket card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-cricket-green mb-2">{ticket.subject}</h1>
        <p className="text-sm text-gray-500 mb-4">ID: <span className="font-mono">{ticket.id}</span></p>
        <p className="text-gray-800 whitespace-pre-wrap">{ticket.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <Meta label="Category" value={ticket.category.replace(/_/g, ' ')} />
          <Meta label="Priority" value={ticket.priority} />
          <Meta label="Created" value={formatDate(ticket.createdAt)} />
          <Meta label="Resolved" value={formatDate(ticket.resolvedAt)} />
        </div>

        {sla && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <Meta label="First response due" value={formatDate(sla.firstResponseDueAt)} />
            <Meta label="Resolution due" value={formatDate(sla.resolutionDueAt)} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-bold text-lg mb-4">Admin Actions</h3>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              disabled={saving || ticket.status === s}
              className={`btn btn-small ${
                ticket.status === s ? 'btn-secondary opacity-50' : 'btn-primary'
              }`}
            >
              {ticket.status === s ? `✓ ${s.replace(/_/g, ' ')}` : `Set ${s.replace(/_/g, ' ')}`}
            </button>
          ))}
        </div>
      </div>

      {/* Transcript */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-bold text-lg mb-4">Conversation transcript ({messages.length})</h3>
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm">No conversation yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg border ${
                  msg.role === 'user'
                    ? 'bg-gray-50 border-gray-200'
                    : msg.role === 'assistant'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="font-semibold uppercase">
                    {msg.role === 'user' ? '👤 User' : msg.role === 'assistant' ? '🤖 AI' : '🧑‍💼 Support'}
                  </span>
                  <span>{new Date(msg.createdAt).toLocaleString()}</span>
                </div>
                <p className="whitespace-pre-wrap text-gray-800">{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="font-semibold text-gray-800">{value}</p>
    </div>
  );
}
