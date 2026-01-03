
import React, { useEffect, useState, useRef } from 'react';
import { ProjectFiles } from '../types';
import { RefreshCw, Zap, Terminal as ConsoleIcon, XCircle, Activity, Globe, Wifi, AlertTriangle, Play, ShieldAlert } from 'lucide-react';

// Load Babel Standalone for transpilation
const loadBabel = () => {
  return new Promise<any>((resolve) => {
    if ((window as any).Babel) return resolve((window as any).Babel);
    const script = document.createElement('script');
    script.src = "https://unpkg.com/@babel/standalone/babel.min.js";
    script.onload = () => resolve((window as any).Babel);
    document.head.appendChild(script);
  });
};

interface PreviewFrameProps {
  files: ProjectFiles;
}

export const PreviewFrame: React.FC<PreviewFrameProps> = ({ files }) => {
  const [url, setUrl] = useState<string>('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [logs, setLogs] = useState<{ type: string, message: string, id: number }[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logIdCounter = useRef(0);

  // Message listener for internal iframe logs
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'PREVIEW_LOG' || event.data.type === 'PREVIEW_ERROR') {
        const isError = event.data.type === 'PREVIEW_ERROR';
        if (isError) {
          setError(event.data.message);
          setShowConsole(true);
        }
        setLogs(prev => [...prev.slice(-99), { 
          type: isError ? 'error' : 'info', 
          message: event.data.message,
          id: ++logIdCounter.current
        }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const generatePreview = async () => {
    if (!isStarted) return;
    setIsCompiling(true);
    setError(null);
    setLogs([]);
    
    try {
      const Babel = await loadBabel();
      const htmlEntryPath = Object.keys(files).find(p => p.endsWith('index.html')) || 'src/index.html';
      const htmlFile = files[htmlEntryPath];

      if (!htmlFile) {
        setError("Missing 'src/index.html'. Please ask the AI to generate an entry point.");
        setUrl('');
        return;
      }

      const blobUrls: Record<string, string> = {};
      
      // PRE-TRANSPILE EVERYTHING BEFORE CREATING BLOBS
      for (const [path, file] of Object.entries(files)) {
        if (/\.(js|jsx|ts|tsx)$/.test(path)) {
          try {
            // CRITICAL: Set modules: false to keep ESM and prevent Babel from injecting 'require'
            const transformed = Babel.transform(file.content, {
              presets: [
                ['env', { modules: false }], 
                ['react', { runtime: 'automatic' }], 
                'typescript'
              ],
              filename: path
            }).code;
            const blob = new Blob([transformed], { type: 'text/javascript' });
            blobUrls[path] = URL.createObjectURL(blob);
          } catch (e: any) {
            console.error(`Transpilation error in ${path}:`, e);
            setLogs(prev => [...prev, { type: 'error', message: `Babel [${path}]: ${e.message}`, id: ++logIdCounter.current }]);
          }
        } else if (path.endsWith('.css')) {
          const blob = new Blob([file.content], { type: 'text/css' });
          blobUrls[path] = URL.createObjectURL(blob);
        }
      }

      // Build Exhaustive Import Map
      const imports: Record<string, string> = {
        "react": "https://esm.sh/react@19.0.0",
        "react-dom": "https://esm.sh/react-dom@19.0.0",
        "react-dom/client": "https://esm.sh/react-dom@19.0.0/client",
        "lucide-react": "https://esm.sh/lucide-react@0.469.0"
      };

      Object.entries(blobUrls).forEach(([path, bUrl]) => {
        const fileName = path.split('/').pop() || '';
        const nameNoExt = fileName.replace(/\.[^/.]+$/, "");
        
        imports[path] = bUrl;
        imports[`./${fileName}`] = bUrl;
        imports[`./${nameNoExt}`] = bUrl;

        if (path.startsWith('src/')) {
          const sub = path.replace('src/', '');
          imports[`./${sub}`] = bUrl;
          imports[`./${sub.replace(/\.[^/.]+$/, "")}`] = bUrl;
        }
      });

      let htmlContent = htmlFile.content;

      const injection = `
        <script>
          window.onerror = function(msg, url, line) {
            let errorMsg = msg;
            if (msg.includes('require is not defined')) {
              errorMsg += ' (Check for CommonJS syntax or Babel config issues)';
            }
            window.parent.postMessage({ type: 'PREVIEW_ERROR', message: errorMsg + (line ? ' (Line: ' + line + ')' : '') }, '*');
          };
          window.onunhandledrejection = function(event) {
            window.parent.postMessage({ type: 'PREVIEW_ERROR', message: 'Promise: ' + (event.reason?.message || event.reason) }, '*');
          };
          const originalLog = console.log;
          console.log = function(...args) {
            const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            window.parent.postMessage({ type: 'PREVIEW_LOG', message: msg }, '*');
            originalLog.apply(console, args);
          };
          console.error = function(...args) {
             const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
             window.parent.postMessage({ type: 'PREVIEW_ERROR', message: msg }, '*');
          };
        </script>
        <script type="importmap">
          { "imports": ${JSON.stringify(imports)} }
        </script>
      `;

      htmlContent = htmlContent.includes('</head>') 
        ? htmlContent.replace('</head>', `${injection}</head>`)
        : injection + htmlContent;

      // Map references in HTML to the generated blobs
      Object.entries(blobUrls).forEach(([path, bUrl]) => {
        const fileName = path.split('/').pop() || '';
        const scriptRegex = new RegExp(`src=["'](?:\\./)?${fileName}["']`, 'g');
        htmlContent = htmlContent.replace(scriptRegex, `src="${bUrl}"`);
        const linkRegex = new RegExp(`href=["'](?:\\./)?${fileName}["']`, 'g');
        htmlContent = htmlContent.replace(linkRegex, `href="${bUrl}"`);
      });

      const finalBlob = new Blob([htmlContent], { type: 'text/html' });
      setUrl(URL.createObjectURL(finalBlob));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTimeout(() => setIsCompiling(false), 400);
    }
  };

  useEffect(() => {
    if (isStarted) {
      const timer = setTimeout(generatePreview, 600);
      return () => clearTimeout(timer);
    }
  }, [files, isStarted]);

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] overflow-hidden relative border-l border-slate-200 shadow-inner">
      <div className="h-10 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <div className="bg-slate-50 border border-slate-200 rounded px-2.5 py-0.5 text-[10px] text-slate-500 font-mono shadow-inner min-w-[120px] select-all">
            http://localhost:3000
          </div>
          <div className="flex items-center gap-1.5 ml-2">
             <div className={`w-1.5 h-1.5 rounded-full ${isStarted ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
               {isStarted ? 'Live' : 'Offline'}
             </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isStarted ? (
            <button 
              onClick={() => setIsStarted(true)}
              className="flex items-center gap-2 px-4 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[10px] font-black uppercase transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Play className="w-3 h-3 fill-current" /> Initialize Engine
            </button>
          ) : (
            <>
              <button 
                onClick={() => setShowConsole(!showConsole)}
                className={`flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-bold transition-all border ${showConsole ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                <ConsoleIcon className="w-3 h-3" /> Console {logs.length > 0 && `(${logs.length})`}
              </button>
              <button 
                onClick={generatePreview}
                className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 transition-all active:rotate-180 duration-500"
                title="Force Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCompiling ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={() => setIsStarted(false)}
                className="p-1.5 hover:bg-red-50 text-red-400 rounded-md transition-all"
                title="Stop Server"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 relative bg-white flex items-center justify-center overflow-hidden">
        {isStarted && url ? (
          <iframe 
            src={url} 
            className="w-full h-full border-none bg-white"
            title="Vibe App Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        ) : !isStarted ? (
          <div className="flex flex-col items-center gap-8 text-slate-300">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full"></div>
              <Activity className="w-16 h-16 opacity-20 relative animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Environment Ready</p>
              <p className="text-xs text-slate-400 italic max-w-xs leading-relaxed">System in standby mode. Click run to compile the virtual filesystem.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Compiling Modules...</span>
          </div>
        )}

        {isCompiling && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-blue-100 shadow-2xl flex items-center gap-3 z-30 animate-in fade-in zoom-in">
            <Zap className="w-4 h-4 text-blue-500 animate-bounce" />
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Syncing Virtual Core</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50 p-10">
            <div className="max-w-md w-full p-8 bg-white rounded-3xl border border-red-100 shadow-[0_20px_50px_rgba(220,38,38,0.1)]">
              <div className="flex items-center gap-3 text-red-600 mb-6 font-black uppercase text-[10px] tracking-[0.2em]">
                <AlertTriangle className="w-6 h-6" /> Critical Runtime Error
              </div>
              <div className="p-5 bg-slate-950 rounded-2xl font-mono text-[11px] text-red-400 mb-8 border border-slate-800 overflow-auto max-h-48 leading-relaxed shadow-inner scrollbar-hide">
                {error}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={generatePreview}
                  className="py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg text-[10px] uppercase tracking-widest"
                >
                  Hot Fix
                </button>
                <button 
                  onClick={() => setIsStarted(false)}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest"
                >
                  Reset Env
                </button>
              </div>
              <p className="mt-6 text-[9px] text-slate-400 text-center uppercase font-bold tracking-widest">Hint: Modules must be ESM (import/export), not CommonJS (require).</p>
            </div>
          </div>
        )}

        {showConsole && (
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-slate-900 border-t border-slate-800 z-40 flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-5 py-2 bg-slate-800/50 border-b border-slate-800">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2.5">
                <ConsoleIcon className="w-3 h-3 text-blue-500" /> Virtual Runtime Log
              </span>
              <button onClick={() => setShowConsole(false)} className="text-slate-500 hover:text-white transition-colors">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
              {logs.length === 0 ? (
                <div className="text-slate-700 italic flex items-center gap-2">
                   <div className="w-1 h-1 rounded-full bg-slate-800 animate-pulse"></div>
                   Ready for output...
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className={`group flex gap-4 px-3 py-1.5 rounded-lg transition-colors ${log.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-slate-300 hover:bg-white/5'}`}>
                    <span className="opacity-20 text-[9px] mt-0.5 w-16 tabular-nums">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                    <span className="break-all leading-relaxed">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="h-6 bg-slate-50 border-t border-slate-200 px-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex items-center gap-5">
           <div className="flex items-center gap-1.5"><Wifi className="w-3 h-3 text-emerald-500" /> VNET: STABLE</div>
           <div className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-blue-400" /> BABEL: ESM_ONLY</div>
        </div>
        <div>BUILD v3.8.5</div>
      </div>
    </div>
  );
};
