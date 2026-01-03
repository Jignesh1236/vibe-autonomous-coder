
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectFiles, AIResponse, SupportedModel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_PROMPT = `You are a world-class Senior React Engineer specializing in browser-native ES Modules. 

BEHAVIOR RULES:
1. **Surgical Edits**: DO NOT rewrite the entire project. Only return the files you have actually modified in the 'changes' array.
2. **Debug First**: Analyze the provided logic, find the root cause of issues, and fix them precisely.
3. **ESM Priority**: ALWAYS use '.js' extensions for local imports (e.g., import App from "./App.js").
4. **Transparency**: In 'readFiles', list all files you looked at. In 'changes', only include modified files.

JSON RESPONSE SCHEMA:
{
  "thoughts": "Technical reasoning and debugging findings",
  "readFiles": ["paths of files you analyzed for context"],
  "changes": [{"path": "full/path", "content": "FULL content of the MODIFIED file", "reason": "why this edit was made"}],
  "finishReason": "continue|done",
  "currentAction": "Status update for the user (e.g., 'Fixing import path in index.js')"
}`;

async function callPollinations(model: string, prompt: string, system: string): Promise<string> {
  // Use the universal endpoint which is more stable for various models
  const endpoint = `https://text.pollinations.ai/`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        model: model,
        jsonMode: true,
        seed: Math.floor(Math.random() * 1000)
      })
    });
    
    if (!response.ok) {
      throw new Error(`Model '${model}' returned status ${response.status}`);
    }

    const data = await response.json();
    
    // Handle different response formats (OpenAI-like vs direct)
    if (data && typeof data === 'object') {
      if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content;
      }
      // If the API returns the JSON object directly due to jsonMode
      return JSON.stringify(data);
    }
    
    return String(data || "");
  } catch (err) {
    console.error("Pollinations call failed:", err);
    throw err;
  }
}

export async function processProjectIteration(
  userPrompt: string,
  files: ProjectFiles,
  history: { role: string; content: string }[],
  isReviewPhase: boolean = false,
  selectedModel: SupportedModel = 'gemini-3-pro-preview'
): Promise<AIResponse> {
  
  const filesContext = Object.entries(files)
    .map(([path, file]) => `File: ${path}\n\`\`\`${file.language}\n${file.content}\n\`\`\``)
    .join('\n\n');

  const phaseInstruction = isReviewPhase 
    ? `STABILITY CHECK: Read all files. Fix any missing .js extensions or logic errors.`
    : `TASK: ${userPrompt}. Identify bugs, debug the logic, and edit only the necessary files.`;

  const prompt = `
Task: ${userPrompt}
Context: ${phaseInstruction}
FILESYSTEM:
${filesContext}
HISTORY:
${history.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}

Output JSON. Be surgical. Only edit what is broken or requested.`;

  try {
    let textResponse: string = "";

    if (selectedModel === 'gemini-3-pro-preview') {
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 4000 }
        }
      });
      textResponse = response.text || '';
    } else {
      textResponse = await callPollinations(selectedModel, prompt, SYSTEM_PROMPT);
    }

    if (!textResponse) {
      throw new Error("Empty response from AI.");
    }

    // Clean JSON string
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    const cleaned = jsonMatch ? jsonMatch[0] : textResponse;
    
    const parsed = JSON.parse(cleaned);
    
    return {
      thoughts: parsed.thoughts || "No technical thoughts shared.",
      readFiles: Array.isArray(parsed.readFiles) ? parsed.readFiles : [],
      changes: Array.isArray(parsed.changes) ? parsed.changes : [],
      finishReason: parsed.finishReason || 'done',
      currentAction: parsed.currentAction || 'Analysis complete'
    };
  } catch (err: any) {
    console.error("AI Logic Error:", err);
    return { 
      thoughts: `Error with ${selectedModel}: ${err.message}. Please try a different model (e.g., 'gemini' or 'openai-large') or re-submit.`, 
      readFiles: [], 
      changes: [], 
      finishReason: 'error',
      currentAction: 'System Halted (Retry needed)'
    };
  }
}
