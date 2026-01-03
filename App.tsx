
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectFiles, Message, AIResponse, SupportedModel } from './types';
import { CodeEditor } from './components/CodeEditor';
import { PreviewFrame } from './components/PreviewFrame';
import { ChatInterface } from './components/ChatInterface';
import { processProjectIteration } from './services/gemini';
import { Terminal, Layout, Code2, Cpu, Bot, FileCode, Sparkles, FolderTree, ChevronRight, Activity, Globe, Zap, Settings2 } from 'lucide-react';

const INITIAL_FILES: ProjectFiles = {
  'src/index.html': {
    name: 'src/index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#05080f] text-white font-sans">
  <div id="root"></div>
  <script type="module" src="./index.js"></script>
</body>
</html>`
  },
  'src/index.js': {
    name: 'src/index.js',
    language: 'javascript',
    content: `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);`
  },
  'src/App.js': {
    name: 'src/App.js',
    language: 'javascript',
    content: `import React, { useState } from 'react';
import { Sparkles, Rocket } from 'lucide-react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#020617]">
      <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-xl shadow-2xl text-center">
        <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
          <Rocket className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">
          Vibe <span className="text-blue-500">Autonomous</span>
        </h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          The autonomous engine is online. I will surgicaly edit and debug your code based on your requests.
        </p>
        
        <button 
          onClick={() => setCount(c => c + 1)}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
        >
          <Sparkles className="w-5 h-5" /> Test Interactions: {count}
        </button>
      </div>
    </div>
  );
}`
  }
};

const MODELS: { id: SupportedModel; name: string; color: string }[] = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', color: 'bg-blue-500' },
  { id: 'openai-large', name: 'GPT-4o', color: 'bg-emerald-500' },
  { id: 'claude', name: 'Claude 3.5', color: 'bg-orange-500' },
  { id: 'deepseek', name: 'DeepSeek R1', color: 'bg-indigo-500' },
  { id: 'mistral', name: 'Mistral Large', color: 'bg-yellow-500' },
  { id: 'llama', name: 'Llama 3.1', color: 'bg-purple-500' },
  { id: 'gemini', name: 'Gemini (Pollinations)', color: 'bg-cyan-500' }
];

const App: React.FC = () => {
  const [files, setFiles] = useState<ProjectFiles>(INITIAL_FILES);
  const [selectedPath, setSelectedPath] = useState<string>('src/App.js');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutonomous, setIsAutonomous] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [view, setView] = useState<'split' | 'code' | 'preview'>('split');
  const [selectedModel, setSelectedModel] = useState<SupportedModel>('gemini-3-pro-preview');
  
  const stopSignal = useRef(false);

  const applyChanges = (aiResponse: AIResponse) => {
    let lastPath = selectedPath;
    const editedPaths: string[] = [];

    setFiles(prev => {
      const next = { ...prev };
      if (!aiResponse.changes || aiResponse.changes.length === 0) return prev;

      aiResponse.changes.forEach(change => {
        const ext = change.path.split('.').pop() || 'text';
        next[change.path] = {
          name: change.path,
          content: change.content,
          language: ext
        };
        lastPath = change.path;
        editedPaths.push(change.path);
      });
      return next;
    });

    if (aiResponse.changes && aiResponse.changes.length > 0) {
      setSelectedPath(lastPath);
    }

    if (aiResponse.thoughts) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiResponse.thoughts,
        timestamp: Date.now(),
        meta: {
          readFiles: aiResponse.readFiles,
          editedFiles: editedPaths,
          model: selectedModel
        }
      }]);
    }
  };

  const startCodingLoop = async (prompt: string) => {
    setIsLoading(true);
    setIsAutonomous(true);
    stopSignal.current = false;

    let iterationCount = 0;
    const maxIterations = 15;
    let reviewPhase = false;

    while (!stopSignal.current && iterationCount < maxIterations) {
      const statusPrefix = reviewPhase ? "🛡️ Stability Check: " : `Cycle ${iterationCount + 1}: `;
      setCurrentAction(`${statusPrefix} Analyzing filesystem...`);

      const response = await processProjectIteration(
        prompt,
        files,
        messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
        reviewPhase,
        selectedModel
      );

      if (stopSignal.current) break;
      
      if (response.currentAction) {
        setCurrentAction(`${statusPrefix} ${response.currentAction}`);
      }
      
      applyChanges(response);

      if (response.finishReason === 'done') {
        if (!reviewPhase) {
          reviewPhase = true;
          iterationCount++;
          continue; 
        } else {
          break;
        }
      }

      if (response.finishReason === 'error') {
        setIsAutonomous(false);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
      iterationCount++;
    }

    setIsLoading(false);
    setIsAutonomous(false);
    setCurrentAction('');
    
    const finalMsg = stopSignal.current ? "Autonomous loop stopped by user." : 
                    iterationCount >= maxIterations ? "Iteration limit reached." :
                    "Task complete. All systems stable.";

    setMessages(prev => [...prev, {
      role: 'system',
      content: finalMsg,
      timestamp: Date.now()
    }]);
  };

  const handleSendMessage = (text: string) => {
    setMessages(prev => [...prev, {
      role: 'user',
      content: text,
      timestamp: Date.now()
    }]);
    startCodingLoop(text);
  };

  const downloadProject = () => {
    Object.entries(files).forEach(([path, file]) => {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.replace(/\//g, '_');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="h-screen flex flex-col bg-[#05080f] font-sans text-slate-200 overflow-hidden">
      <header className="bg-[#0a0f1d] border-b border-slate-800/50 px-6 py-2.5 flex items-center justify-between z-30 shadow-2xl relative">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className={`absolute inset-0 ${MODELS.find(m => m.id === selectedModel)?.color} rounded-xl blur-lg transition-all duration-1000 ${isAutonomous ? 'opacity-40 animate-pulse' : 'opacity-0'}`}></div>
            <div className={`relative bg-slate-900 p-2 rounded-xl border ${isAutonomous ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-slate-800'}`}>
              <Cpu className={`w-4.5 h-4.5 ${isAutonomous ? 'text-blue-400' : 'text-slate-500'}`} />
            </div>
          </div>
          <div>
            <h1 className="text-[11px] font-black tracking-[0.3em] text-white flex items-center gap-2 uppercase">
              Vibe <span className="text-blue-500">Studio</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isAutonomous ? 'bg-blue-500 animate-ping' : 'bg-slate-700'}`}></div>
              <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">
                {isAutonomous ? 'Auto-Cycle Active' : 'Idle Mode'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-black/40 rounded-xl p-1 border border-slate-800/50">
            <Settings2 className="w-3.5 h-3.5 text-slate-600 ml-2" />
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as SupportedModel)}
              className="bg-transparent text-[10px] font-bold text-slate-400 px-3 py-1.5 focus:outline-none cursor-pointer hover:text-white transition-colors"
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id} className="bg-slate-900">{m.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-black/40 rounded-xl p-1 border border-slate-800/50">
            {['code', 'split', 'preview'].map((m) => (
              <button 
                key={m}
                onClick={() => setView(m as any)}
                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${view === m ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex overflow-hidden">
          {(view === 'code' || view === 'split') && (
            <div className="flex-1 flex overflow-hidden border-r border-slate-900/80">
              <div className="w-60 bg-[#080c16] border-r border-slate-800/40 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-800/50 text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
                  Navigator
                  <button onClick={downloadProject} className="p-1 hover:text-blue-400 transition-colors" title="Download Source">
                    <Zap className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {Object.keys(files).sort().map(path => (
                    <button
                      key={path}
                      onClick={() => setSelectedPath(path)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-bold truncate transition-all flex items-center gap-2.5 ${selectedPath === path ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10 shadow-[0_2px_10px_rgba(59,130,246,0.05)]' : 'text-slate-600 hover:bg-slate-800/50 hover:text-slate-300'}`}
                    >
                      <FileCode className={`w-3.5 h-3.5 shrink-0 ${selectedPath === path ? 'text-blue-400' : 'text-slate-700'}`} />
                      {path.split('/').pop()}
                    </button>
                  ))}
                </div>
              </div>
              <CodeEditor file={files[selectedPath]} path={selectedPath} onCodeChange={(p, c) => setFiles(prev => ({...prev, [p]: {...prev[p], content: c}}))} />
            </div>
          )}
          {(view === 'preview' || view === 'split') && <PreviewFrame files={files} />}
        </main>

        <div className="w-80 lg:w-[400px] flex flex-col bg-[#0a0f1d] border-l border-slate-800/50 shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
          <ChatInterface 
            messages={messages}
            isLoading={isLoading}
            isAutonomous={isAutonomous}
            currentAction={currentAction}
            onSendMessage={handleSendMessage}
            onStop={() => { stopSignal.current = true; setIsAutonomous(false); }}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
