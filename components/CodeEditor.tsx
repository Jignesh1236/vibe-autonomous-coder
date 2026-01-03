
import React from 'react';
import { FileNode } from '../types';

interface CodeEditorProps {
  file: FileNode | null;
  path: string;
  onCodeChange: (path: string, newContent: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ file, path, onCodeChange }) => {
  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#05080f] text-slate-600">
        <div className="p-10 border-2 border-dashed border-slate-900 rounded-[40px] flex flex-col items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Project Integrity</span>
          <p className="text-xs italic">Select a source file to reveal logic</p>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onCodeChange(path, e.target.value);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#05080f] overflow-hidden">
      <div className="px-6 py-3 bg-[#0a0f1d] border-b border-slate-800/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-red-500/50 shadow-[0_0_5px_rgba(239,68,68,0.3)]"></div>
             <div className="w-2 h-2 rounded-full bg-amber-500/50 shadow-[0_0_5px_rgba(245,158,11,0.3)]"></div>
             <div className="w-2 h-2 rounded-full bg-emerald-500/50 shadow-[0_0_5px_rgba(16,185,129,0.3)]"></div>
          </div>
          <div className="h-4 w-[1px] bg-slate-800 mx-1"></div>
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Source</span>
            <span className="text-xs font-mono text-blue-400 font-bold bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 tracking-tight">{path}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400 uppercase font-black tracking-widest shadow-sm">
            {file.language}
          </span>
        </div>
      </div>
      <div className="flex-1 relative overflow-hidden flex">
        {/* Line Numbers gutter */}
        <div className="w-14 bg-[#070b14] border-r border-slate-800/30 flex flex-col items-end py-6 pr-4 text-[10px] font-mono text-slate-700 select-none">
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} className="h-6 leading-6 tabular-nums">{i + 1}</div>
          ))}
        </div>
        <textarea
          value={file.content}
          onChange={handleChange}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="flex-1 p-6 bg-transparent outline-none resize-none code-font text-[13px] leading-6 text-slate-300 overflow-auto placeholder-slate-800 selection:bg-blue-500/20"
          placeholder="// Vibe is waiting for your instructions..."
        />
      </div>
    </div>
  );
};
