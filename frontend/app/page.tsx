'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { chatSessionsAPI, Attachment } from '@/lib/api';
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

interface AttachmentTurn {
  id: string;
  role: 'attachment';
  attachment: Attachment;
  createdAt: string;
}

type Turn = AssistantTurn | UserTurn | AttachmentTurn;

export default function ChatHomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escalating, setEscalating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auth gate
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!user.profileComplete) router.replace('/onboarding');
  }, [loading, user, router]);

  // Bootstrap session
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

  // Poll for transcription updates while anything is pending
  useEffect(() => {
    if (!sessionId) return;
    const hasPending = attachments.some(a => a.transcriptionStatus === 'pending');
    if (!hasPending) return;
    const interval = setInterval(async () => {
      try {
        const res = await chatSessionsAPI.listAttachments(sessionId);
        setAttachments(res.data);
      } catch {
        /* best-effort */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId, attachments]);

  // Auto-scroll on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  const latestAssistant =
    [...turns].reverse().find(t => t.role === 'assistant') as AssistantTurn | undefined;

  const handleReply = async (text: string) => {
    if (!sessionId || busy) return;

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

  const handleFiles = async (files: File[]) => {
    if (!sessionId || uploading) return;
    setUploading(true);
    setError(null);

    try {
      const res = await chatSessionsAPI.uploadAttachments(sessionId, files);
      // Append new attachment turns to the chat stream
      const newTurns: AttachmentTurn[] = res.data.map(a => ({
        id: `att-${a.id}`,
        role: 'attachment',
        attachment: a,
        createdAt: a.createdAt,
      }));
      setTurns(prev => [...prev, ...newTurns]);
      setAttachments(prev => [...prev, ...res.data]);

      // Tell the AI about the upload so it can acknowledge and continue the flow
      const names = files.map(f => f.name).join(', ');
      await handleReply(`I just uploaded: ${names}. Please take this evidence into account.`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Keep attachment turn records up-to-date when polling updates statuses
  useEffect(() => {
    setTurns(prev =>
      prev.map(t => {
        if (t.role !== 'attachment') return t;
        const latest = attachments.find(a => a.id === t.attachment.id);
        return latest ? { ...t, attachment: latest } : t;
      }),
    );
  }, [attachments]);

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
            <TurnBubble key={turn.id} turn={turn} sessionId={sessionId} />
          ))}

          {busy && <div className="text-sm text-gray-500 italic">AI is thinking…</div>}
          {uploading && (
            <div className="text-sm text-gray-500 italic">Uploading and transcribing…</div>
          )}

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
              uploading={uploading}
              onPick={handleReply}
              onFiles={handleFiles}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusLabel(status: string): string {
  if (status === 'completed') return '✓ Transcribed';
  if (status === 'pending') return '⏳ Transcribing…';
  return '✗ Transcription failed';
}

function TurnBubble({ turn, sessionId }: { turn: Turn; sessionId: string | null }) {
  if (turn.role === 'attachment') {
    const a = turn.attachment;
    const isImage = a.mimeType.startsWith('image/');
    const downloadUrl = sessionId ? chatSessionsAPI.attachmentUrl(sessionId, a.id) : '#';
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-blue-50 border border-blue-200 rounded-2xl rounded-br-sm px-4 py-3">
          <div className="text-xs font-semibold text-blue-700 mb-2">📎 Evidence uploaded</div>
          <div className="flex items-center gap-3">
            {isImage ? (
              <img
                src={downloadUrl}
                alt={a.fileName}
                className="w-14 h-14 rounded border border-blue-200 object-cover"
              />
            ) : (
              <div className="w-14 h-14 bg-white rounded border border-blue-200 flex items-center justify-center text-2xl">
                📄
              </div>
            )}
            <div className="min-w-0">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-blue-900 hover:underline truncate block"
              >
                {a.fileName}
              </a>
              <div className="text-xs text-blue-700 mt-0.5">
                {formatSize(a.fileSize)} · {statusLabel(a.transcriptionStatus)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {(turn as UserTurn | AssistantTurn).content}
        </div>
      </div>
    </div>
  );
}
