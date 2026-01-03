
import React from 'react';
import { ProjectFiles } from '../types';
import { FileText, FolderOpen, Download } from 'lucide-react';

interface FileExplorerProps {
  files: ProjectFiles;
  selectedPath: string;
  onSelect: (path: string) => void;
  onDownload: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ 
  files, 
  selectedPath, 
  onSelect,
  onDownload
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700 w-64 overflow-y-auto">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-sm">Project Files</span>
        </div>
        <button 
          onClick={onDownload}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          title="Download Project ZIP"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
      <div className="py-2">
        {Object.keys(files).length === 0 ? (
          <p className="px-4 text-xs text-slate-500 italic">No files generated yet.</p>
        ) : (
          Object.keys(files).sort().map(path => (
            <button
              key={path}
              onClick={() => onSelect(path)}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                selectedPath === path ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="truncate">{path}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
