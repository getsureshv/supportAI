'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ticketsAPI, Ticket } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import UserHeader from '@/components/UserHeader';

export default function TicketDetailPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/login');
    else if (!user.profileComplete) router.replace('/onboarding');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user?.profileComplete) return;
    (async () => {
      try {
        const res = await ticketsAPI.get(ticketId);
        setTicket(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to load ticket');
      } finally {
        setLoading(false);
      }
    })();
  }, [ticketId, user]);

  if (authLoading || !user) return <div className="p-12 text-center text-gray-500">Loading…</div>;

  if (loading) return (
    <div className="min-h-screen">
      <UserHeader />
      <div className="text-center py-12 text-gray-600">Loading ticket…</div>
    </div>
  );

  if (error || !ticket) {
    return (
      <div className="min-h-screen">
        <UserHeader />
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">
          <Link href="/support/tickets" className="text-cricket-green hover:underline text-sm">
            ← Back to tickets
          </Link>
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-800">
            {error || 'Ticket not found'}
          </div>
        </main>
      </div>
    );
  }

  const sla = ticket.sla;
  const messages = (ticket.messages || []).filter(m => !m.isInternal);
  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <div className="min-h-screen">
      <UserHeader />
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/support/tickets" className="text-cricket-green hover:underline text-sm">
            ← Back to tickets
          </Link>
          <span className={`badge ${ticket.priority}`}>{ticket.priority.toUpperCase()}</span>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h1 className="text-2xl font-bold text-cricket-green mb-2">{ticket.subject}</h1>
          <p className="text-xs text-gray-500 mb-4 font-mono">ID: {ticket.id}</p>
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

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h3 className="font-bold text-lg mb-4">Conversation ({messages.length})</h3>
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet.</p>
          ) : (
            <div className="space-y-3">
              {messages.map(m => (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg border ${
                    m.role === 'user'
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span className="font-semibold uppercase">
                      {m.role === 'user' ? '👤 You' : '🤖 AI'}
                    </span>
                    <span>{new Date(m.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-gray-800 text-sm">{m.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="font-semibold text-gray-800 text-sm">{value}</p>
    </div>
  );
}
