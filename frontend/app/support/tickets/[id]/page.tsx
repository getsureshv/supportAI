'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ticketsAPI, Ticket } from '@/lib/api';
import TicketChat from '@/components/TicketChat';
import AttachmentList from '@/components/AttachmentList';

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    load();
  }, [ticketId]);

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading ticket…</div>;
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <Link href="/support/tickets" className="text-cricket-green hover:underline">
          ← Back to tickets
        </Link>
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-800">
          {error || 'Ticket not found'}
        </div>
      </div>
    );
  }

  const sla = ticket.sla;
  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/support/tickets" className="text-cricket-green hover:underline">
          ← Back to tickets
        </Link>
        <span className={`badge ${ticket.priority}`}>{ticket.priority.toUpperCase()}</span>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-cricket-green mb-2">{ticket.subject}</h1>
        <p className="text-sm text-gray-500 mb-4">
          ID: <span className="font-mono">{ticket.id}</span>
        </p>
        <p className="text-gray-800 whitespace-pre-wrap">{ticket.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <Meta label="Category" value={ticket.category.replace(/_/g, ' ')} />
          <Meta label="Status" value={ticket.status.replace(/_/g, ' ')} />
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

      {ticket.attachments && ticket.attachments.length > 0 && (
        <AttachmentList ticketId={ticket.id} attachments={ticket.attachments} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <TicketChat ticketId={ticket.id} />
        </div>
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 h-fit">
          <h3 className="font-bold text-lg text-blue-900 mb-3">💬 Continue the conversation</h3>
          <p className="text-sm text-blue-800">
            The AI assistant has full context on this ticket. Ask follow-up questions,
            share evidence, or provide updates. Support staff will see your full transcript.
          </p>
        </div>
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
