'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { chatSessionsAPI } from '@/lib/api';
import UserHeader from '@/components/UserHeader';
import ChatChips from '@/components/ChatChips';

interface AssistantTurn {
  id: string;
  role: 'assistant';
  content: string;
  options: string[];
  suggest_ticket?: boolean;
  is_resolution?: boolean;
  createdAt: string;
}

interface UserTurn {
  id: string;
  role: 'user';
  content: string;
  createdAt: string;
}

type Turn = AssistantTurn | UserTurn;

export default function ChatHomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escalating, setEscalating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auth gate
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!user.profileComplete) router.replace('/onboarding');
  }, [loading, user, router]);

  // Bootstrap session on first load
  useEffect(() => {
    if (!user?.profileComplete || sessionId) return;
    (async () => {
      try {
        const res = await chatSessionsAPI.create();
        setSessionId(res.data.session.id);
        setTurns([
          {
            id: res.data.opener.id,
            role: 'assistant',
            content: res.data.opener.message,
            options: res.data.opener.options,
            suggest_ticket: res.data.opener.suggest_ticket,
            is_resolution: res.data.opener.is_resolution,
            createdAt: res.data.opener.createdAt,
          },
        ]);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Could not start session');
      }
    })();
  }, [user, sessionId]);

  // Auto-scroll to bottom on new turns
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  const latestAssistant =
    [...turns].reverse().find(t => t.role === 'assistant') as AssistantTurn | undefined;

  const handleReply = async (text: string) => {
    if (!sessionId || busy) return;

    // If the user picked "Raise a ticket", escalate instead of sending a message
    if (/raise.*ticket/i.test(text)) {
      await handleEscalate();
      return;
    }

    setBusy(true);
    setError(null);

    const tempUserId = `temp-${Date.now()}`;
    setTurns(prev => [
      ...prev,
      { id: tempUserId, role: 'user', content: text, createdAt: new Date().toISOString() },
    ]);

    try {
      const res = await chatSessionsAPI.sendMessage(sessionId, text);
      setTurns(prev => {
        const withoutTemp = prev.filter(t => t.id !== tempUserId);
        return [
          ...withoutTemp,
          { ...res.data.user, role: 'user' },
          { ...res.data.assistant, role: 'assistant' },
        ];
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Message failed');
      setTurns(prev => prev.filter(t => t.id !== tempUserId));
    } finally {
      setBusy(false);
    }
  };

  const handleEscalate = async () => {
    if (!sessionId || escalating) return;
    setEscalating(true);
    setError(null);
    try {
      const res = await chatSessionsAPI.escalate(sessionId);
      router.push(`/support/tickets/${res.data.ticketId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not raise ticket');
      setEscalating(false);
    }
  };

  if (loading || !user || !user.profileComplete) {
    return <div className="p-12 text-center text-gray-500">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UserHeader
        rightSlot={
          <button
            onClick={handleEscalate}
            disabled={escalating || !sessionId}
            className="btn btn-primary text-sm py-2 px-4 disabled:opacity-40"
          >
            {escalating ? 'Raising…' : '🎫 Raise Ticket'}
          </button>
        }
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-6 flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-6">
          {turns.map(turn => (
            <TurnBubble key={turn.id} turn={turn} />
          ))}

          {busy && <div className="text-sm text-gray-500 italic">AI is thinking…</div>}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {latestAssistant && latestAssistant.options.length > 0 && (
          <div className="border-t border-gray-200 pt-4 bg-gray-50 -mx-6 px-6 pb-4">
            <ChatChips
              options={latestAssistant.options}
              disabled={busy || escalating}
              onPick={handleReply}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function TurnBubble({ turn }: { turn: Turn }) {
  const isUser = turn.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-cricket-green text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm shadow-sm'
        }`}
      >
        {!isUser && (
          <div className="text-xs font-semibold text-cricket-green mb-1">🤖 Support AI</div>
        )}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{turn.content}</div>
      </div>
    </div>
  );
}
