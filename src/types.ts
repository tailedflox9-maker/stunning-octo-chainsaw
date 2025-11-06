// src/types.ts
export type ModelProvider = 'google' | 'mistral' | 'zhipu' | 'groq' | 'openrouter';

export type ModelID =
  // Google Gemini Models
  | 'gemini-2.0-flash-lite'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.0-flash'
  | 'gemini-2.5-flash'
  | 'gemma-3-27b-it'
  | 'gemini-2.5-pro'
  // ZhipuAI (GLM) Models
  | 'glm-4.5-flash'
  // Mistral Models
  | 'mistral-small-latest'
  | 'mistral-medium-latest'
  | 'mistral-large-latest'
  | 'pixtral-large-latest'
  // Groq Models
  | 'llama-3.3-70b-versatile'
  | 'openai/gpt-oss-120b'
  | 'openai/gpt-oss-20b'
  | 'moonshotai/kimi-k2-instruct-0905'
  | 'moonshotai/kimi-k2-instruct'
  // OpenRouter Free Models (✅ NEW)
  | 'deepseek/deepseek-chat-v3.1:free'
  | 'deepseek/deepseek-r1-0528:free'
  | 'microsoft/mai-ds-r1:free'
  | 'deepseek/deepseek-r1:free'
  | 'tngtech/deepseek-r1t2-chimera:free';

export interface APISettings {
  googleApiKey: string;
  zhipuApiKey: string;
  mistralApiKey: string;
  groqApiKey: string;
  openrouterApiKey: string; // ✅ NEW
  selectedModel: ModelID;
  selectedProvider: ModelProvider;
}

export * from './types/book';
