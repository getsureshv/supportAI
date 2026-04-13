'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, AlertCircle, Loader2, ArrowLeft, Sparkles, Mic, MicOff } from 'lucide-react';
import Link from 'next/link';
import { projects as projectsApi, ApiProject } from '../../../../../lib/api';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
}

interface FieldUpdate {
  field: string;
  value: string;
}

/**
 * Strip hidden tags from AI responses so the user only sees conversational text.
 * Removes: <scope_update>, <options>, JSON code blocks, field_update JSON objects.
 */
function cleanAssistantMessage(text: string): string {
  let cleaned = text;

  // Remove <scope_update field="...">...</scope_update>
  cleaned = cleaned.replace(/<scope_update\s+field="[^"]*">[\s\S]*?<\/scope_update>/g, '');

  // Remove <options>...</options>
  cleaned = cleaned.replace(/<options>[\s\S]*?<\/options>/g, '');

  // Remove JSON code blocks
  cleaned = cleaned.replace(/```json\s*\{[\s\S]*?\}\s*```/g, '');

  // Remove standalone field_update JSON
  cleaned = cleaned.replace(/\{\s*"type"\s*:\s*"field_update"[\s\S]*?\}/g, '');

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/**
 * Extract quick-reply options from <options>opt1|opt2|opt3</options> tag.
 */
function extractOptions(text: string): string[] {
  const match = text.match(/<options>([\s\S]*?)<\/options>/);
  if (!match) return [];

  return match[1]
    .split('|')
    .map((o) => o.trim())
    .filter((o) => o.length > 0 && o.length < 80);
}

export default function ScopeArchitectPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<ApiProject | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [quickOptions, setQuickOptions] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load project data
  useEffect(() => {
    projectsApi
      .get(params.id)
      .then((p) => {
        setProject(p);
        setMessages([
          {
            id: 'welcome',
            type: 'assistant',
            content: `Hi! I'm the AI Scope Architect for "${p.title}". I'll help you build a comprehensive Scope of Work through a quick interview. Let's start — can you describe the main goal of this project? What are you looking to accomplish?`,
          },
        ]);
      })
      .catch((err) => setProjectError(err.message || 'Failed to load project'))
      .finally(() => setLoadingProject(false));
  }, [params.id]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Re-focus input after streaming completes
  useEffect(() => {
    if (!isStreaming && !aiUnavailable) {
      // Small delay so the disabled prop clears first
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, aiUnavailable]);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    setVoiceSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Show interim results in the input as the user speaks
      if (interimTranscript) {
        setInput((prev) => {
          // Replace any previous interim text (after last final segment)
          return finalTranscript || interimTranscript;
        });
      }

      if (finalTranscript) {
        setInput(finalTranscript);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setChatError('Microphone access denied. Please allow microphone permissions.');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      // Stop voice recognition if active
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: text.trim(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsStreaming(true);
      setChatError(null);
      setQuickOptions([]);

      const assistantId = `assistant-${Date.now()}`;
      setMessages((prev) => [...prev, { id: assistantId, type: 'assistant', content: '' }]);

      try {
        const res = await fetch(`/api/chat/scope/${params.id}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text.trim() }),
        });

        if (res.status === 503) {
          setAiUnavailable(true);
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          setIsStreaming(false);
          return;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(err.error || err.message || `Error ${res.status}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        if (!reader) throw new Error('No response stream');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === 'text_delta') {
                fullContent += event.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + event.content } : m,
                  ),
                );
              } else if (event.type === 'complete') {
                if (event.fieldUpdates?.length > 0) {
                  projectsApi.get(params.id).then(setProject).catch(() => {});
                }
                // Extract quick options from the full response
                const opts = extractOptions(fullContent);
                if (opts.length > 0) {
                  setQuickOptions(opts);
                }
              } else if (event.type === 'error') {
                setChatError(event.error);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } catch (err: any) {
        setChatError(err.message || 'Failed to send message');
        setMessages((prev) => {
          const msg = prev.find((m) => m.id === assistantId);
          if (msg && !msg.content) return prev.filter((m) => m.id !== assistantId);
          return prev;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, params.id],
  );

  const handleSendMessage = () => sendMessage(input);

  const handleOptionClick = (option: string) => {
    setQuickOptions([]);
    sendMessage(option);
  };

  if (loadingProject) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 flex items-center gap-3 text-red-400">
          <AlertCircle size={20} />
          <span>{projectError || 'Project not found'}</span>
        </div>
      </div>
    );
  }

  const scope = project.scopeDocument;
  const completeness = scope?.completenessPercent ?? 0;

  const scopeSections: { label: string; value: string | null }[] = [
    { label: 'Project Scope', value: scope?.projectScope ?? null },
    { label: 'Dimensions & Specifications', value: scope?.dimensions ?? null },
    { label: 'Materials & Grade', value: scope?.materialGrade ?? null },
    { label: 'Timeline', value: scope?.timeline ?? null },
    { label: 'Milestones', value: scope?.milestones ?? null },
    { label: 'Special Conditions', value: scope?.specialConditions ?? null },
    { label: 'Preferred Start Date', value: scope?.preferredStartDate ?? null },
    { label: 'Site Constraints', value: scope?.siteConstraints ?? null },
    { label: 'Aesthetic Preferences', value: scope?.aestheticPreferences ?? null },
  ];

  const populatedSections = scopeSections.filter((s) => s.value);
  const emptySections = scopeSections.filter((s) => !s.value);

  return (
    <div className="flex h-full bg-gradient-to-br from-navy via-navy-dark to-navy-light">
      {/* Left Panel - SOW Preview (60%) */}
      <div className="w-3/5 border-r border-white/10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white/5 border-b border-white/10 p-4 flex items-center justify-between">
          <Link
            href={`/projects/${params.id}`}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={14} />
            Back to Project
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="text-gold" size={16} />
            <span className="text-sm font-medium text-white">AI Scope Architect</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/5 border-b border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-white">Scope Completeness</h2>
            <span className="text-sm text-gold font-medium">{completeness}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold/70 transition-all duration-500"
              style={{ width: `${completeness}%` }}
            />
          </div>
          {completeness >= 65 && (
            <p className="text-xs text-green-400 mt-2">
              Scope is ready for PDF generation
            </p>
          )}
        </div>

        {/* SOW Preview */}
        <div className="flex-1 overflow-auto p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Scope of Work</h1>
            <p className="text-white/60 text-sm">{project.title} &mdash; {project.type}</p>
          </div>

          {populatedSections.map((section) => (
            <section key={section.label}>
              <h2 className="text-lg font-semibold text-gold mb-3">{section.label}</h2>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                  {section.value}
                </p>
              </div>
            </section>
          ))}

          {emptySections.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white/40 uppercase tracking-wide">
                Still Needed
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {emptySections.map((section) => (
                  <div
                    key={section.label}
                    className="bg-white/5 border border-dashed border-white/10 rounded-lg p-3"
                  >
                    <p className="text-white/30 text-xs">{section.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {populatedSections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles className="text-gold/30 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-white/60 mb-2">No scope data yet</h3>
              <p className="text-sm text-white/40 max-w-sm">
                Start chatting with the AI Scope Architect to build your Scope of Work.
                Answer questions about your project and watch the scope fill in here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Chat (40%) */}
      <div className="w-2/5 flex flex-col bg-white/5">
        {/* AI Unavailable Warning */}
        {aiUnavailable && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-4 flex items-start gap-3">
            <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
            <div className="text-sm">
              <p className="font-medium text-yellow-400">AI features unavailable</p>
              <p className="text-yellow-400/70 text-xs mt-1">
                The ANTHROPIC_API_KEY environment variable is not configured on the server.
              </p>
            </div>
          </div>
        )}

        {/* Chat Error */}
        {chatError && (
          <div className="bg-red-500/10 border-b border-red-500/20 p-3 flex items-center gap-2">
            <AlertCircle className="text-red-400 flex-shrink-0" size={14} />
            <p className="text-red-400 text-xs">{chatError}</p>
            <button
              onClick={() => setChatError(null)}
              className="ml-auto text-red-400/60 hover:text-red-400 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {messages.map((message, idx) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-gold text-navy rounded-br-none'
                    : 'bg-white/10 text-white rounded-bl-none'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.type === 'assistant'
                    ? cleanAssistantMessage(message.content)
                    : message.content}
                  {isStreaming &&
                    message.type === 'assistant' &&
                    idx === messages.length - 1 &&
                    !message.content && (
                      <span className="inline-flex gap-1 ml-1">
                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" />
                        <span
                          className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse"
                          style={{ animationDelay: '0.2s' }}
                        />
                        <span
                          className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse"
                          style={{ animationDelay: '0.4s' }}
                        />
                      </span>
                    )}
                </p>
              </div>
            </div>
          ))}

          {/* Quick Reply Options */}
          {quickOptions.length > 0 && !isStreaming && (
            <div className="flex flex-wrap gap-2 pt-2">
              {quickOptions.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleOptionClick(option)}
                  className="px-4 py-2 text-sm rounded-full border border-gold/40 text-gold
                    bg-gold/10 hover:bg-gold/20 hover:border-gold/60
                    transition-all duration-200 active:scale-95"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="border-t border-white/10 p-6 space-y-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus-within:border-gold/30 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={aiUnavailable ? 'AI is not available...' : 'Describe your project scope...'}
              disabled={aiUnavailable || isStreaming}
              className="flex-1 bg-transparent text-white placeholder-white/40 outline-none disabled:opacity-50"
              autoFocus
            />
            {voiceSupported && (
              <button
                onClick={toggleVoice}
                disabled={isStreaming || aiUnavailable}
                className={`transition-colors ${
                  isListening
                    ? 'text-red-400 hover:text-red-300 animate-pulse'
                    : 'text-white/40 hover:text-white/70'
                } disabled:text-white/20`}
                title={isListening ? 'Stop recording' : 'Voice input'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isStreaming || aiUnavailable}
              className="text-gold hover:text-gold/80 disabled:text-white/20 transition-colors"
            >
              {isStreaming ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          <p className="text-xs text-white/40">
            {isStreaming
              ? 'AI is thinking...'
              : isListening
                ? '🎙️ Listening... speak now, then press send'
                : quickOptions.length > 0
                  ? `Tap an option above${voiceSupported ? ', use voice 🎙️,' : ''} or type your own answer`
                  : `Describe your project details${voiceSupported ? ' — type or use voice 🎙️' : ''}.`}
          </p>
        </div>
      </div>
    </div>
  );
}
