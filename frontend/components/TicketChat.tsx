'use client';

import { useState, useEffect, useRef } from 'react';
import { ticketsAPI, TicketMessage, SendMessageRequest } from '@/lib/api';

interface TicketChatProps {
  ticketId: string;
}

export default function TicketChat({ ticketId }: TicketChatProps) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const existing = await loadMessages();
      if (!existing || existing.length === 0) {
        // First visit: trigger the AI to acknowledge the form content
        await streamAssistantReply('');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (): Promise<TicketMessage[]> => {
    try {
      const response = await ticketsAPI.get(ticketId);
      // Hide internal seed messages from the visible transcript
      const visible = (response.data.messages || []).filter(m => !m.isInternal);
      setMessages(visible);
      return response.data.messages || [];
    } catch (err) {
      console.error('Failed to load messages', err);
      return [];
    }
  };

  const streamAssistantReply = async (userText: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (userText) {
        const userMessage: TicketMessage = {
          id: `u-${Date.now()}`,
          ticketId,
          role: 'user',
          content: userText,
          isInternal: false,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMessage]);
      }

      const response = await ticketsAPI.streamChat(ticketId, userText);
      if (!response.ok) throw new Error('Failed to get AI response');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let assistantMessage = '';
      const assistantId = `a-${Date.now()}`;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text' && data.text) {
              assistantMessage += data.text;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.id === assistantId) {
                  return [...prev.slice(0, -1), { ...last, content: assistantMessage }];
                }
                return [...prev, {
                  id: assistantId,
                  ticketId,
                  role: 'assistant',
                  content: assistantMessage,
                  isInternal: false,
                  createdAt: new Date().toISOString(),
                }];
              });
            } else if (data.type === 'error') {
              setError(data.error || 'AI error');
            }
          } catch {
            /* ignore parse errors */
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    await streamAssistantReply(text);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-96">
      {/* Header */}
      <div className="bg-cricket-green-light text-white p-4">
        <h3 className="font-bold text-lg">🤖 AI Support Assistant</h3>
        <p className="text-sm opacity-90">Help me understand your issue better</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg">👋 Hi! I'm here to help.</p>
            <p className="text-sm">Tell me about your issue and I'll guide you through it.</p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`chat-message ${msg.role === 'user' ? 'user' : 'assistant'}`}>
            <div className="flex gap-2">
              <span className="font-bold text-sm">{msg.role === 'user' ? '👤 You' : '🤖 AI'}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap">{msg.content}</p>
            <p className="text-xs opacity-70 mt-2">{new Date(msg.createdAt).toLocaleTimeString()}</p>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-800 p-3 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSendMessage} className="border-t p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message or response..."
            disabled={isLoading}
            className="chat-input flex-1"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="btn btn-primary px-4 py-2 text-sm"
          >
            {isLoading ? '...' : '→'}
          </button>
        </div>
      </form>
    </div>
  );
}
