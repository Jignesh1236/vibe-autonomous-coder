
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { Send, Bot, User, Loader2, Square, Sparkles, Wand2, CheckCircle2, Bug, Eye, Edit3, Cpu, Terminal } from 'lucide-react';

interface ChatInterfaceProps {
  messages: Message[];
  isAutonomous: boolean;
  currentAction?: string;
  onSendMessage: (text: string) => void;
  onStop: () => void;
  isLoading: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isAutonomous,
  currentAction,
  onSendMessage,
  onStop,
  isLoading
}) => {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentAction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 shadow-2xl">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-50">
            <Wand2 className="w-10 h-10 text-blue-500 animate-pulse" />
            <p className="text-white font-bold text-xs uppercase tracking-widest">Enter a command to begin</p>
          </div>
        )}
        
        {messages.map((m, i) => {
          const isSystem = m.role === 'system';
          const isUser = m.role === 'user';
          const hasMeta = m.meta && (m.meta.readFiles?.length || m.meta.editedFiles?.length);
          
          return (
            <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1 px-1">
                {m.role === 'assistant' && <Bot className="w-3 h-3 text-blue-400" />}
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  {isUser ? 'User' : isSystem ? 'System' : `AI: ${m.meta?.model || 'Engine'}`}
                </span>
              </div>
              
              <div className={`max-w-[95%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed border ${
                isUser 
                  ? 'bg-blue-600 text-white border-blue-500 rounded-tr-none' 
                  : isSystem
                    ? 'bg-slate-950 text-emerald-400 border-emerald-500/20 w-full rounded-lg font-mono text-[11px]'
                    : 'bg-slate-800 text-slate-200 border-slate-700 rounded-tl-none'
              }`}>
                {!isUser && !isSystem && hasMeta && (
                  <div className="mb-2 flex flex-wrap gap-1.5 pb-2 border-b border-white/5">
                    {m.meta?.readFiles?.map(f => (
                      <span key={f} className="flex items-center gap-1 bg-slate-900/50 text-[9px] px-1.5 py-0.5 rounded border border-white/5 text-slate-500">
                        <Eye className="w-2.5 h-2.5" /> {f.split('/').pop()}
                      </span>
                    ))}
                    {m.meta?.editedFiles?.map(f => (
                      <span key={f} className="flex items-center gap-1 bg-blue-500/10 text-[9px] px-1.5 py-0.5 rounded border border-blue-500/20 text-blue-400">
                        <Edit3 className="w-2.5 h-2.5" /> {f.split('/').pop()}
                      </span>
                    ))}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex flex-col items-start gap-3 p-4 bg-slate-800/20 border border-slate-800 rounded-2xl animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] w-full">
              <Loader2 className="w-4 h-4 animate-spin" />
              <div className="flex-1 flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  {currentAction || 'Vibe Engine Thinking...'}
                </span>
                <div className="bg-slate-800 h-1.5 w-full rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full animate-progress-indeterminate shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-1">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div>
               <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">System Online • Deep Reasoning active</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-slate-950 border-t border-slate-800/50">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading && !isAutonomous}
            rows={2}
            placeholder="Type instructions..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-xs focus:ring-1 focus:ring-blue-500/50 text-white placeholder-slate-600 resize-none transition-all"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
          />
          <div className="absolute right-2 bottom-2 flex gap-2">
            {isAutonomous ? (
              <button type="button" onClick={onStop} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-all shadow-lg active:scale-95">
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button type="submit" disabled={isLoading || !input.trim()} className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-700 text-white rounded-lg transition-all shadow-lg active:scale-95">
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>
      <style>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-progress-indeterminate {
          width: 40%;
          animation: progress-indeterminate 1.8s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};
