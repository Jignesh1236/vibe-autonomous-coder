
export interface FileNode {
  name: string;
  content: string;
  language: string;
}

export interface ProjectFiles {
  [path: string]: FileNode;
}

export type SupportedModel = 
  | 'gemini-3-pro-preview' 
  | 'openai' 
  | 'openai-large' 
  | 'mistral' 
  | 'llama' 
  | 'claude' 
  | 'gemini' 
  | 'deepseek' 
  | 'pixtral';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  meta?: {
    readFiles?: string[];
    editedFiles?: string[];
    model?: string;
  };
}

export interface AIChange {
  path: string;
  content: string;
  reason: string;
}

export interface AIResponse {
  thoughts: string;
  readFiles: string[];
  changes: AIChange[];
  finishReason: 'done' | 'continue' | 'error';
  currentAction?: string;
}
