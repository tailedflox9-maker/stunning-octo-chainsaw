// src/types.ts
export type ModelProvider = 'google' | 'mistral' | 'zhipu';

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
  | 'pixtral-large-latest';

export interface APISettings {
  googleApiKey: string;
  zhipuApiKey: string;
  mistralApiKey: string;
  selectedModel: ModelID;
  selectedProvider: ModelProvider; // Added missing property
}

export * from './types/book';
