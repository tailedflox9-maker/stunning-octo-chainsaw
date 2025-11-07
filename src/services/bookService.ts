// ============================================================================
// FILE 1: src/services/bookService.ts (COMPLETE WITH FIX)
// ============================================================================

import { BookProject, BookRoadmap, BookModule, RoadmapModule, BookSession } from '../types/book';
import { APISettings, ModelProvider } from '../types';
import { generateId } from '../utils/helpers';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface GenerationCheckpoint {
  bookId: string;
  completedModuleIds: string[];
  failedModuleIds: string[];
  moduleRetryCount: Record<string, number>;
  lastSuccessfulIndex: number;
  timestamp: string;
  totalWordsGenerated: number;
}

export interface GenerationStatus {
  currentModule?: {
    id: string;
    title: string;
    attempt: number;
    progress: number;
    generatedText?: string;
  };
  totalProgress: number;
  status: 'idle' | 'generating' | 'completed' | 'error' | 'paused' | 'waiting_retry';
  logMessage?: string;
  totalWordsGenerated?: number;
  aiStage?: 'analyzing' | 'writing' | 'examples' | 'polishing' | 'complete';
  retryInfo?: {
    moduleTitle: string;
    error: string;
    retryCount: number;
    maxRetries: number;
    waitTime?: number;
  };
}

class BookGenerationService {
  private settings: APISettings = {
    googleApiKey: '',
    zhipuApiKey: '',
    mistralApiKey: '',
    groqApiKey: '', // ✅ NEW
    selectedProvider: 'google',
    selectedModel: 'gemini-2.5-flash'
  };

  private onProgressUpdate?: (bookId: string, updates: Partial<BookProject>) => void;
  private onGenerationStatusUpdate?: (bookId: string, status: GenerationStatus) => void;
  private requestTimeout = 360000;
  private activeRequests = new Map<string, AbortController>();
  private checkpoints = new Map<string, GenerationCheckpoint>();
  private currentGeneratedTexts = new Map<string, string>();
  private userRetryDecisions = new Map<string, 'retry' | 'switch' | 'skip'>();
  
  private readonly MAX_MODULE_RETRIES = 5;
  private readonly RETRY_DELAY_BASE = 3000;
  private readonly MAX_RETRY_DELAY = 30000;
  private readonly RATE_LIMIT_DELAY = 5000;

  updateSettings(settings: APISettings) {
    this.settings = settings;
  }

  setProgressCallback(callback: (bookId: string, updates: Partial<BookProject>) => void) {
    this.onProgressUpdate = callback;
  }

  setGenerationStatusCallback(callback: (bookId: string, status: GenerationStatus) => void) {
    this.onGenerationStatusUpdate = callback;
  }

  private updateProgress(bookId: string, updates: Partial<BookProject>) {
    if (this.onProgressUpdate) {
      this.onProgressUpdate(bookId, { ...updates, updatedAt: new Date() });
    }
  }

  private updateGenerationStatus(bookId: string, status: GenerationStatus) {
    if (this.onGenerationStatusUpdate) {
      this.onGenerationStatusUpdate(bookId, status);
    }
  }

  private getCurrentGeneratedText(bookId: string): string {
    return this.currentGeneratedTexts.get(bookId) || '';
  }

  private clearCurrentGeneratedText(bookId: string): void {
    this.currentGeneratedTexts.delete(bookId);
  }

  private saveCheckpoint(
    bookId: string, 
    completedModuleIds: string[], 
    failedModuleIds: string[], 
    lastIndex: number,
    moduleRetryCount: Record<string, number> = {},
    totalWordsGenerated: number = 0
  ) {
    const checkpoint: GenerationCheckpoint = {
      bookId,
      completedModuleIds,
      failedModuleIds,
      moduleRetryCount,
      lastSuccessfulIndex: lastIndex,
      timestamp: new Date().toISOString(),
      totalWordsGenerated
    };
    
    this.checkpoints.set(bookId, checkpoint);
    
    try {
      localStorage.setItem(`checkpoint_${bookId}`, JSON.stringify(checkpoint));
      console.log(`✓ Checkpoint saved: ${completedModuleIds.length} completed, ${failedModuleIds.length} failed`);
    } catch (error) {
      console.warn('Failed to save checkpoint to localStorage:', error);
    }
  }

  private loadCheckpoint(bookId: string): GenerationCheckpoint | null {
    if (this.checkpoints.has(bookId)) {
      return this.checkpoints.get(bookId)!;
    }
    
    try {
      const stored = localStorage.getItem(`checkpoint_${bookId}`);
      if (stored) {
        const checkpoint: GenerationCheckpoint = JSON.parse(stored);
        
        if (!checkpoint.completedModuleIds || !Array.isArray(checkpoint.completedModuleIds)) {
          console.warn('Invalid checkpoint structure, ignoring');
          return null;
        }
        
        this.checkpoints.set(bookId, checkpoint);
        console.log(`✓ Checkpoint loaded: ${checkpoint.completedModuleIds.length} completed`);
        return checkpoint;
      }
    } catch (error) {
      console.warn('Failed to load checkpoint from localStorage:', error);
    }
    
    return null;
  }

  private clearCheckpoint(bookId: string) {
    this.checkpoints.delete(bookId);
    try {
      localStorage.removeItem(`checkpoint_${bookId}`);
      console.log('✓ Checkpoint cleared');
    } catch (error) {
      console.warn('Failed to clear checkpoint:', error);
    }
  }

  pauseGeneration(bookId: string) {
    try {
      localStorage.setItem(`pause_flag_${bookId}`, 'true');
      console.log('⏸ Pause flag set for book:', bookId);
    } catch (error) {
      console.warn('Failed to set pause flag:', error);
    }
    
    this.updateGenerationStatus(bookId, {
      status: 'paused',
      totalProgress: 0,
      logMessage: '⏸ Generation paused by user'
    });
  }

  resumeGeneration(bookId: string) {
    try {
      localStorage.removeItem(`pause_flag_${bookId}`);
      console.log('▶ Pause flag cleared for book:', bookId);
    } catch (error) {
      console.warn('Failed to clear pause flag:', error);
    }
  }

  isPaused(bookId: string): boolean {
    try {
      const pauseFlag = localStorage.getItem(`pause_flag_${bookId}`);
      return pauseFlag === 'true';
    } catch (error) {
      console.warn('Failed to check pause flag:', error);
      return false;
    }
  }

  validateSettings(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.settings.selectedProvider) errors.push('No AI provider selected');
    if (!this.settings.selectedModel) errors.push('No model selected');
    const apiKey = this.getApiKeyForProvider(this.settings.selectedProvider);
    if (!apiKey) errors.push(`No API key configured for ${this.settings.selectedProvider}`);
    return { isValid: errors.length === 0, errors };
  }

  // ✅ ADDED/UPDATED: getApiKeyForProvider method
  private getApiKeyForProvider(provider: string): string | null {
    switch (provider) {
      case 'google': return this.settings.googleApiKey || null;
      case 'mistral': return this.settings.mistralApiKey || null;
      case 'zhipu': return this.settings.zhipuApiKey || null;
      case 'groq': return this.settings.groqApiKey || null; // ✅ NEW
      default: return null;
    }
  }

  private getApiKey(): string {
    const key = this.getApiKeyForProvider(this.settings.selectedProvider);
    if (!key) {
      throw new Error(`${this.settings.selectedProvider} API key not configured`);
    }
    return key;
  }

  private isRateLimitError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const statusCode = error?.status || error?.response?.status;
    
    return (
      statusCode === 429 ||
      statusCode === 503 ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('too many requests')
    );
  }

  private isNetworkError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      error?.name === 'NetworkError'
    );
  }

  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.MAX_MODULE_RETRIES) return false;
    
    if (this.isRateLimitError(error) || this.isNetworkError(error)) {
      return true;
    }
    
    const errorMessage = error?.message?.toLowerCase() || '';
    const retryableErrors = ['timeout', 'overloaded', 'unavailable', 'internal error', 'bad gateway'];
    
    return retryableErrors.some(msg => errorMessage.includes(msg));
  }

  private calculateRetryDelay(attempt: number, isRateLimit: boolean): number {
    if (isRateLimit) {
      return this.RATE_LIMIT_DELAY * Math.pow(1.5, attempt);
    }
    
    const exponentialDelay = this.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, this.MAX_RETRY_DELAY);
  }

  private getAlternativeProviders(): Array<{provider: ModelProvider; model: string; name: string}> {
    const alternatives: Array<{provider: ModelProvider; model: string; name: string}> = [];
    
    if (this.settings.googleApiKey && this.settings.selectedProvider !== 'google') {
      alternatives.push({
        provider: 'google',
        model: 'gemini-2.5-flash',
        name: 'Google Gemini 2.5 Flash'
      });
    }
    
    if (this.settings.mistralApiKey && this.settings.selectedProvider !== 'mistral') {
      alternatives.push({
        provider: 'mistral',
        model: 'mistral-small-latest',
        name: 'Mistral Small'
      });
    }
    
    if (this.settings.zhipuApiKey && this.settings.selectedProvider !== 'zhipu') {
      alternatives.push({
        provider: 'zhipu',
        model: 'glm-4.5-flash',
        name: 'GLM 4.5 Flash'
      });
    }

    // ✅ NEW: Add Groq alternative
    if (this.settings.groqApiKey && this.settings.selectedProvider !== 'groq') {
      alternatives.push({
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        name: 'Groq Llama 3.3 70B Versatile'
      });
    }
    
    return alternatives;
  }

  private async waitForUserRetryDecision(
    bookId: string,
    moduleTitle: string,
    error: string,
    retryCount: number
  ): Promise<'retry' | 'switch' | 'skip'> {
    const alternatives = this.getAlternativeProviders();
    
    this.updateGenerationStatus(bookId, {
      status: 'waiting_retry',
      totalProgress: 0,
      logMessage: `⚠️ Error generating: ${moduleTitle}`,
      retryInfo: {
        moduleTitle,
        error,
        retryCount,
        maxRetries: this.MAX_MODULE_RETRIES,
        waitTime: this.calculateRetryDelay(retryCount, this.isRateLimitError({ message: error }))
      }
    });

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const decision = this.userRetryDecisions.get(bookId);
        if (decision) {
          this.userRetryDecisions.delete(bookId);
          clearInterval(checkInterval);
          resolve(decision);
        }
      }, 500);
    });
  }

  setRetryDecision(bookId: string, decision: 'retry' | 'switch' | 'skip') {
    this.userRetryDecisions.set(bookId, decision);
  }

  // ✅ UPDATED: generateWithAI switch statement
  private async generateWithAI(prompt: string, bookId?: string, onChunk?: (chunk: string) => void): Promise<string> {
    const validation = this.validateSettings();
    if (!validation.isValid) {
      throw new Error(`Configuration error: ${validation.errors.join(', ')}`);
    }

    if (!navigator.onLine) {
      throw new Error('No internet connection');
    }

    const requestId = bookId || generateId();
    const abortController = new AbortController();
    this.activeRequests.set(requestId, abortController);

    const timeoutId = setTimeout(() => {
      abortController.abort();
      this.activeRequests.delete(requestId);
    }, this.requestTimeout);

    try {
      let result: string;
      switch (this.settings.selectedProvider) {
        case 'google': 
          result = await this.generateWithGoogle(prompt, abortController.signal, onChunk); 
          break;
        case 'mistral': 
          result = await this.generateWithMistral(prompt, abortController.signal, onChunk); 
          break;
        case 'zhipu': 
          result = await this.generateWithZhipu(prompt, abortController.signal, onChunk); 
          break;
        case 'groq': // ✅ NEW
          result = await this.generateWithGroq(prompt, abortController.signal, onChunk); 
          break;
        default: 
          throw new Error(`Unsupported provider: ${this.settings.selectedProvider}`);
      }
      return result;
    } finally {
      clearTimeout(timeoutId);
      this.activeRequests.delete(requestId);
    }
  }

  private async generateWithGoogle(prompt: string, signal?: AbortSignal, onChunk?: (chunk: string) => void): Promise<string> {
    const apiKey = this.getApiKey();
    const model = this.settings.selectedModel;
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const streamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
        
        const response = await fetch(streamEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 8192 }
          }),
          signal
        });

        if (response.status === 429 || response.status === 503) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          await sleep(delay);
          attempt++;
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
        }

        if (!response.body) throw new Error('Response body is null');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              const jsonStr = trimmedLine.substring(6);
              if (jsonStr === '[DONE]') continue;

              try {
                const data = JSON.parse(jsonStr);
                const textPart = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (textPart) {
                  fullContent += textPart;
                  if (onChunk) onChunk(textPart);
                }
              } catch (parseError) {}
            }
          }
        }

        if (!fullContent) throw new Error('No content generated');
        return fullContent;

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        attempt++;
        if (attempt >= maxRetries) throw error;
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
    throw new Error('Google API failed after retries');
  }

  private async generateWithMistral(prompt: string, signal?: AbortSignal, onChunk?: (chunk: string) => void): Promise<string> {
    const apiKey = this.getApiKey();
    const model = this.settings.selectedModel;
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 8192,
            stream: true
          }),
          signal
        });

        if (response.status === 429) {
          const delay = Math.pow(2, attempt) * 1000;
          await sleep(delay);
          attempt++;
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error?.message || `Mistral API Error: ${response.status}`);
        }

        if (!response.body) throw new Error('Response body is null');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              const jsonStr = trimmedLine.substring(6);
              if (jsonStr === '[DONE]') continue;

              try {
                const data = JSON.parse(jsonStr);
                const textPart = data?.choices?.[0]?.delta?.content || '';
                if (textPart) {
                  fullContent += textPart;
                  if (onChunk) onChunk(textPart);
                }
              } catch (parseError) {}
            }
          }
        }

        if (!fullContent) throw new Error('No content generated');
        return fullContent;

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        attempt++;
        if (attempt >= maxRetries) throw error;
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
    throw new Error('Mistral API failed after retries');
  }

  private async generateWithZhipu(prompt: string, signal?: AbortSignal, onChunk?: (chunk: string) => void): Promise<string> {
    const apiKey = this.getApiKey();
    const model = this.settings.selectedModel;
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 8192,
            stream: true
          }),
          signal
        });

        if (response.status === 429 || response.status === 503) {
          const delay = Math.pow(2, attempt) * 1000;
          await sleep(delay);
          attempt++;
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error?.message || `ZhipuAI API Error: ${response.status}`);
        }

        if (!response.body) throw new Error('Response body is null');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              const jsonStr = trimmedLine.substring(6);
              if (jsonStr === '[DONE]') continue;

              try {
                const data = JSON.parse(jsonStr);
                const textPart = data?.choices?.[0]?.delta?.content || '';
                if (textPart) {
                  fullContent += textPart;
                  if (onChunk) onChunk(textPart);
                }
              } catch (parseError) {}
            }
          }
        }

        if (!fullContent) throw new Error('No content generated');
        return fullContent;

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        attempt++;
        if (attempt >= maxRetries) throw error;
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
    throw new Error('ZhipuAI API failed after retries');
  }

  // ✅ ADDED: New Groq generation method
  private async generateWithGroq(prompt: string, signal?: AbortSignal, onChunk?: (chunk: string) => void): Promise<string> {
    const apiKey = this.getApiKey();
    const model = this.settings.selectedModel;
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 8192,
            stream: true
          }),
          signal
        });

        if (response.status === 429 || response.status === 503) {
          const delay = Math.pow(2, attempt) * 1000;
          await sleep(delay);
          attempt++;
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error?.message || `Groq API Error: ${response.status}`);
        }

        if (!response.body) throw new Error('Response body is null');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              const jsonStr = trimmedLine.substring(6);
              if (jsonStr === '[DONE]') continue;

              try {
                const data = JSON.parse(jsonStr);
                const textPart = data?.choices?.[0]?.delta?.content || '';
                if (textPart) {
                  fullContent += textPart;
                  if (onChunk) onChunk(textPart);
                }
              } catch (parseError) {
                // Ignore parse errors for individual chunks
              }
            }
          }
        }

        if (!fullContent) throw new Error('No content generated');
        return fullContent;

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        attempt++;
        if (attempt >= maxRetries) throw error;
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
    throw new Error('Groq API failed after retries');
  }

  async generateRoadmap(session: BookSession, bookId: string): Promise<BookRoadmap> {
    this.updateProgress(bookId, { status: 'generating_roadmap', progress: 5 });

    const maxAttempts = 2;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        const prompt = this.buildRoadmapPrompt(session);
        const response = await this.generateWithAI(prompt, bookId);
        const roadmap = await this.parseRoadmapResponse(response, session);
        
        this.updateProgress(bookId, { status: 'roadmap_completed', progress: 10, roadmap });
        return roadmap;
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          this.updateProgress(bookId, { status: 'error', error: 'Roadmap generation failed' });
          throw error;
        }
        await sleep(2000);
      }
    }
    throw new Error('Roadmap generation failed');
  }

  private buildRoadmapPrompt(session: BookSession): string {
    const reasoningPrompt = session.reasoning
      ? `\n- Reasoning/Motivation for the book: ${session.reasoning}`
      : '';
  
    return `Create a comprehensive learning roadmap for: "${session.goal}"
  
  Requirements:
  - Generate a suitable number of modules, with a minimum of 8. The final number should be based on the complexity and scope of the learning goal.
  - Each module should have a clear title and 3-5 specific learning objectives
  - Estimate realistic reading/study time for each module
  - Target audience: ${session.targetAudience || 'general learners'}
  - Complexity: ${session.complexityLevel || 'intermediate'}${reasoningPrompt}
  
  Return ONLY valid JSON:
  {
    "modules": [
      {
        "title": "Module Title",
        "objectives": ["Objective 1", "Objective 2"],
        "estimatedTime": "2-3 hours"
      }
    ],
    "estimatedReadingTime": "20-25 hours",
    "difficultyLevel": "intermediate"
  }`;
  }

  private async parseRoadmapResponse(response: string, session: BookSession): Promise<BookRoadmap> {
    let cleanedResponse = response.trim()
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^[^{]*/, '')
      .replace(/[^}]*$/, '');

    let jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    const roadmap = JSON.parse(jsonMatch[0]);

    if (!roadmap.modules || !Array.isArray(roadmap.modules)) {
      throw new Error('Invalid roadmap: missing modules array');
    }

    roadmap.modules = roadmap.modules.map((module: any, index: number) => ({
      id: `module_${index + 1}`,
      title: module.title?.trim() || `Module ${index + 1}`,
      objectives: Array.isArray(module.objectives) ? module.objectives : [`Learn ${module.title}`],
      estimatedTime: module.estimatedTime || '1-2 hours',
      order: index + 1
    }));

    roadmap.totalModules = roadmap.modules.length;
    roadmap.estimatedReadingTime = roadmap.estimatedReadingTime || `${roadmap.modules.length * 2} hours`;
    roadmap.difficultyLevel = roadmap.difficultyLevel || session.complexityLevel || 'intermediate';

    return roadmap;
  }

  async generateModuleContentWithRetry(
    book: BookProject,
    roadmapModule: RoadmapModule,
    session: BookSession,
    attemptNumber: number = 1
  ): Promise<BookModule> {
    if (this.isPaused(book.id)) {
      throw new Error('GENERATION_PAUSED');
    }

    const totalWordsBefore = book.modules.reduce((sum, m) => sum + (m.status === 'completed' ? m.wordCount : 0), 0);
    this.currentGeneratedTexts.set(book.id, '');

    this.updateGenerationStatus(book.id, {
      currentModule: {
        id: roadmapModule.id,
        title: roadmapModule.title,
        attempt: attemptNumber,
        progress: 0,
        generatedText: ''
      },
      totalProgress: 0,
      status: 'generating',
      logMessage: `Starting: ${roadmapModule.title}`,
      totalWordsGenerated: totalWordsBefore,
      aiStage: 'analyzing'
    });

    try {
      const previousModules = book.modules.filter(m => m.status === 'completed');
      const isFirstModule = previousModules.length === 0;
      const moduleIndex = roadmapModule.order;
      const totalModules = book.roadmap?.totalModules || 0;

      const prompt = this.buildModulePrompt(session, roadmapModule, previousModules, isFirstModule, moduleIndex, totalModules);
      
      const moduleContent = await this.generateWithAI(prompt, book.id, (chunk) => {
        if (this.isPaused(book.id)) {
          const controller = this.activeRequests.get(book.id);
          if (controller) {
            controller.abort();
          }
          return;
        }

        const currentText = (this.currentGeneratedTexts.get(book.id) || '') + chunk;
        this.currentGeneratedTexts.set(book.id, currentText);
        
        const currentWordCount = currentText.split(/\s+/).filter(w => w.length > 0).length;
        const estimatedWordTarget = 3000;
        const progress = Math.min(95, (currentWordCount / estimatedWordTarget) * 100);
        
        let aiStage: GenerationStatus['aiStage'] = 'analyzing';
        if (currentWordCount >= estimatedWordTarget * 0.9) aiStage = 'polishing';
        else if (currentWordCount >= estimatedWordTarget * 0.6) aiStage = 'examples';
        else if (currentWordCount >= estimatedWordTarget * 0.15) aiStage = 'writing';
        
        this.updateGenerationStatus(book.id, {
          currentModule: {
            id: roadmapModule.id,
            title: roadmapModule.title,
            attempt: attemptNumber,
            progress,
            generatedText: currentText.slice(-800)
          },
          totalProgress: 0,
          status: 'generating',
          totalWordsGenerated: totalWordsBefore + currentWordCount,
          aiStage
        });
      });

      const wordCount = moduleContent.split(/\s+/).filter(word => word.length > 0).length;

      if (wordCount < 300) {
        throw new Error(`Generated content too short (${wordCount} words)`);
      }

      const module: BookModule = {
        id: generateId(),
        roadmapModuleId: roadmapModule.id,
        title: roadmapModule.title,
        content: moduleContent.trim(),
        wordCount,
        status: 'completed',
        generatedAt: new Date()
      };

      this.currentGeneratedTexts.delete(book.id);

      this.updateGenerationStatus(book.id, {
        currentModule: {
          id: roadmapModule.id,
          title: roadmapModule.title,
          attempt: attemptNumber,
          progress: 100
        },
        totalProgress: 0,
        status: 'generating',
        logMessage: `✓ Completed: ${roadmapModule.title}`,
        totalWordsGenerated: totalWordsBefore + wordCount,
        aiStage: 'complete'
      });

      return module;
    } catch (error) {
      if (error instanceof Error && error.message === 'GENERATION_PAUSED') {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (attemptNumber < this.MAX_MODULE_RETRIES && this.shouldRetry(error, attemptNumber)) {
        const decision = await this.waitForUserRetryDecision(
          book.id,
          roadmapModule.title,
          errorMessage,
          attemptNumber
        );

        if (decision === 'retry') {
          const delay = this.calculateRetryDelay(attemptNumber, this.isRateLimitError(error));
          await sleep(delay);
          return this.generateModuleContentWithRetry(book, roadmapModule, session, attemptNumber + 1);
        } else if (decision === 'switch') {
          throw new Error('USER_REQUESTED_MODEL_SWITCH');
        } else {
          return {
            id: generateId(),
            roadmapModuleId: roadmapModule.id,
            title: roadmapModule.title,
            content: '',
            wordCount: 0,
            status: 'error',
            error: `Skipped by user after ${attemptNumber} attempts`,
            generatedAt: new Date()
          };
        }
      }

      this.updateGenerationStatus(book.id, {
        status: 'error',
        logMessage: `✗ Failed: ${roadmapModule.title}`
      });

      return {
        id: generateId(),
        roadmapModuleId: roadmapModule.id,
        title: roadmapModule.title,
        content: '',
        wordCount: 0,
        status: 'error',
        error: errorMessage,
        generatedAt: new Date()
      };
    }
  }

  private buildModulePrompt(
    session: BookSession,
    roadmapModule: RoadmapModule,
    previousModules: BookModule[],
    isFirstModule: boolean,
    moduleIndex: number,
    totalModules: number
  ): string {
    const contextSummary = !isFirstModule && previousModules.length > 0 ?
      `\n\nPREVIOUS MODULES CONTEXT:\n${previousModules.slice(-2).map(m =>
        `${m.title}: ${m.content.substring(0, 300)}...`
      ).join('\n\n')}` : '';
  
    const reasoningPrompt = session.reasoning
      ? `\n- Book's Core Reasoning: ${session.reasoning}`
      : '';
  
    return `Generate a comprehensive chapter for: "${roadmapModule.title}"
  
  CONTEXT:
  - Learning Goal: ${session.goal}
  - Module ${moduleIndex} of ${totalModules}
  - Objectives: ${roadmapModule.objectives.join(', ')}
  - Target Audience: ${session.targetAudience || 'general learners'}
  - Complexity: ${session.complexityLevel || 'intermediate'}${reasoningPrompt}${contextSummary}
  
  REQUIREMENTS:
  - Write 2000-4000 words
  - ${isFirstModule ? 'Provide introduction' : 'Build upon previous content'}
  - Use ## markdown headers
  - Include bullet points and lists
  ${session.preferences?.includeExamples ? '- Include practical examples' : ''}
  ${session.preferences?.includePracticalExercises ? '- Add exercises at the end' : ''}
  
  STRUCTURE:
  ## ${roadmapModule.title}
  ### Introduction
  ### Core Concepts
  ### Practical Application
  ${session.preferences?.includePracticalExercises ? '### Practice Exercises' : ''}
  ### Key Takeaways`;
  }

  async generateAllModulesWithRecovery(book: BookProject, session: BookSession): Promise<void> {
    if (!book.roadmap) {
      throw new Error('No roadmap available');
    }
    
    this.resumeGeneration(book.id);
    
    const checkpoint = this.loadCheckpoint(book.id);
    
    let completedModules = [...book.modules.filter(m => m.status === 'completed')];
    const completedModuleIds = new Set<string>();
    const failedModuleIds = new Set<string>();
    const moduleRetryCount: Record<string, number> = {};

    if (checkpoint) {
      checkpoint.completedModuleIds.forEach(id => completedModuleIds.add(id));
      checkpoint.failedModuleIds.forEach(id => failedModuleIds.add(id));
      Object.assign(moduleRetryCount, checkpoint.moduleRetryCount || {});

      completedModules.forEach(m => {
        if (m.roadmapModuleId) {
          completedModuleIds.add(m.roadmapModuleId);
        }
      });
    } else {
      completedModules.forEach(m => {
        if (m.roadmapModuleId) {
          completedModuleIds.add(m.roadmapModuleId);
        }
      });
    }

    const modulesToGenerate = book.roadmap.modules.filter(
      roadmapModule => !completedModuleIds.has(roadmapModule.id)
    );

    if (modulesToGenerate.length === 0) {
      this.updateProgress(book.id, { 
        status: 'roadmap_completed', 
        progress: 90,
        modules: completedModules
      });
      return;
    }

    this.updateProgress(book.id, { status: 'generating_content', progress: 15 });

    for (let i = 0; i < modulesToGenerate.length; i++) {
      const roadmapModule = modulesToGenerate[i];
      
      if (this.isPaused(book.id)) {
        console.log('⏸ Generation paused, saving checkpoint...');
        const totalWords = completedModules.reduce((sum, m) => 
          sum + (m.status === 'completed' ? m.wordCount : 0), 0
        );
        
        this.saveCheckpoint(
          book.id,
          Array.from(completedModuleIds),
          Array.from(failedModuleIds),
          i - 1,
          moduleRetryCount,
          totalWords
        );
        
        this.updateProgress(book.id, {
          status: 'generating_content',
          modules: [...completedModules],
          progress: 15 + ((completedModules.length / book.roadmap.modules.length) * 70)
        });
        
        this.updateGenerationStatus(book.id, {
          status: 'paused',
          totalProgress: 0,
          logMessage: '⏸ Generation paused - progress saved'
        });
        
        return;
      }
      
      this.clearCurrentGeneratedText(book.id);

      try {
        const retryCount = moduleRetryCount[roadmapModule.id] || 0;
        
        const newModule = await this.generateModuleContentWithRetry(
          { ...book, modules: completedModules },
          roadmapModule,
          session,
          retryCount + 1
        );

        if (this.isPaused(book.id)) {
          console.log('⏸ Generation paused after module completion');
          const totalWords = completedModules.reduce((sum, m) => 
            sum + (m.status === 'completed' ? m.wordCount : 0), 0
          );
          
          if (newModule.status === 'completed') {
            completedModules.push(newModule);
            completedModuleIds.add(roadmapModule.id);
          }
          
          this.saveCheckpoint(
            book.id,
            Array.from(completedModuleIds),
            Array.from(failedModuleIds),
            i,
            moduleRetryCount,
            totalWords + (newModule.status === 'completed' ? newModule.wordCount : 0)
          );
          
          this.updateProgress(book.id, {
            status: 'generating_content',
            modules: [...completedModules]
          });
          
          this.updateGenerationStatus(book.id, {
            status: 'paused',
            totalProgress: 0,
            logMessage: '⏸ Generation paused - progress saved'
          });
          
          return;
        }

        if (newModule.status === 'completed') {
          completedModules.push(newModule);
          completedModuleIds.add(roadmapModule.id);
          failedModuleIds.delete(roadmapModule.id);
          delete moduleRetryCount[roadmapModule.id];
          
          const totalWords = completedModules.reduce((sum, m) => 
            sum + (m.status === 'completed' ? m.wordCount : 0), 0
          );
          
          this.saveCheckpoint(
            book.id,
            Array.from(completedModuleIds),
            Array.from(failedModuleIds),
            i,
            moduleRetryCount,
            totalWords
          );

          const progress = 15 + ((completedModules.length / book.roadmap.modules.length) * 70);
          
          this.updateProgress(book.id, {
            modules: [...completedModules],
            progress: Math.min(85, progress)
          });

        } else {
          failedModuleIds.add(roadmapModule.id);
          moduleRetryCount[roadmapModule.id] = (moduleRetryCount[roadmapModule.id] || 0) + 1;
          
          const totalWords = completedModules.reduce((sum, m) => 
            sum + (m.status === 'completed' ? m.wordCount : 0), 0
          );
          
          this.saveCheckpoint(
            book.id,
            Array.from(completedModuleIds),
            Array.from(failedModuleIds),
            i,
            moduleRetryCount,
            totalWords
          );

          completedModules.push(newModule);
          this.updateProgress(book.id, { modules: [...completedModules] });
        }

        if (i < modulesToGenerate.length - 1) {
          await sleep(1000);
        }

      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'GENERATION_PAUSED') {
            console.log('⏸ Generation paused during module generation');
            const totalWords = completedModules.reduce((sum, m) => 
              sum + (m.status === 'completed' ? m.wordCount : 0), 0
            );
            
            this.saveCheckpoint(
              book.id,
              Array.from(completedModuleIds),
              Array.from(failedModuleIds),
              i - 1,
              moduleRetryCount,
              totalWords
            );
            
            this.updateProgress(book.id, {
              status: 'generating_content',
              modules: [...completedModules]
            });
          
            this.updateGenerationStatus(book.id, {
              status: 'paused',
              totalProgress: 0,
              logMessage: '⏸ Generation paused by user'
            });
          
            return;
          } else if (error.message === 'USER_REQUESTED_MODEL_SWITCH') {
            const totalWords = completedModules.reduce((sum, m) => 
              sum + (m.status === 'completed' ? m.wordCount : 0), 0
            );
            
            this.saveCheckpoint(
              book.id,
              Array.from(completedModuleIds),
              Array.from(failedModuleIds),
              i,
              moduleRetryCount,
              totalWords
            );
            
            this.updateProgress(book.id, {
              status: 'generating_content',
              modules: [...completedModules]
            });
            
            this.updateGenerationStatus(book.id, {
              status: 'paused',
              totalProgress: 0,
              logMessage: '⚙️ Waiting for model switch...'
            });
            
            return;
          }
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        failedModuleIds.add(roadmapModule.id);
        moduleRetryCount[roadmapModule.id] = (moduleRetryCount[roadmapModule.id] || 0) + 1;
        
        const totalWords = completedModules.reduce((sum, m) => 
          sum + (m.status === 'completed' ? m.wordCount : 0), 0
        );
        
        this.saveCheckpoint(
          book.id,
          Array.from(completedModuleIds),
          Array.from(failedModuleIds),
          i,
          moduleRetryCount,
          totalWords
        );

        completedModules.push({
          id: generateId(),
          roadmapModuleId: roadmapModule.id,
          title: roadmapModule.title,
          content: '',
          wordCount: 0,
          status: 'error',
          error: errorMessage,
          generatedAt: new Date()
        });

        this.updateProgress(book.id, { modules: [...completedModules] });
      }
    }

    const hasFailures = completedModules.some(m => m.status === 'error');

    if (hasFailures) {
      const failedCount = completedModules.filter(m => m.status === 'error').length;
      
      this.updateProgress(book.id, {
        status: 'error',
        error: `Generation completed with ${failedCount} failed module(s)`,
        modules: completedModules
      });
    } else {
      this.clearCheckpoint(book.id);
      this.updateProgress(book.id, {
        status: 'roadmap_completed',
        modules: completedModules,
        progress: 90
      });
    }
  }

  async retryFailedModules(book: BookProject, session: BookSession): Promise<void> {
    if (!book.roadmap) {
      throw new Error('No roadmap available');
    }

    const failedModules = book.modules.filter(m => m.status === 'error');
    
    if (failedModules.length === 0) {
      return;
    }

    this.resumeGeneration(book.id);

    const completedModules = book.modules.filter(m => m.status === 'completed');
    const updatedModules = [...completedModules];

    for (const failedModule of failedModules) {
      if (this.isPaused(book.id)) {
        console.log('⏸ Retry paused');
        this.updateProgress(book.id, { 
          modules: [...updatedModules],
          status: 'error',
          error: `Retry paused with ${failedModules.length - updatedModules.filter(m => m.status === 'completed').length} remaining`
        });
        return;
      }

      const roadmapModule = book.roadmap.modules.find(
        rm => rm.id === failedModule.roadmapModuleId
      );

      if (!roadmapModule) continue;

      try {
        const newModule = await this.generateModuleContentWithRetry(
          { ...book, modules: updatedModules },
          roadmapModule,
          session
        );

        if (this.isPaused(book.id)) {
            console.log('⏸ Retry paused after module completion');
            updatedModules.push(newModule);
            this.updateProgress(book.id, { 
                modules: [...updatedModules],
                status: 'error',
                error: 'Retry paused by user'
            });
            return;
        }

        updatedModules.push(newModule);
        this.updateProgress(book.id, { modules: [...updatedModules] });
        await sleep(1000);

      } catch (error) {
        if (error instanceof Error && error.message === 'GENERATION_PAUSED') {
          this.updateProgress(book.id, { 
            modules: [...updatedModules],
            status: 'error',
            error: 'Retry paused by user'
          });
          return;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Module ${roadmapModule.title} failed during retry: ${errorMessage}`);
      }
    }

    const stillFailed = updatedModules.filter(m => m.status === 'error').length;
    
    if (stillFailed === 0) {
      this.clearCheckpoint(book.id);
      this.updateProgress(book.id, {
        status: 'roadmap_completed',
        modules: updatedModules,
        progress: 90
      });
    } else {
      this.updateProgress(book.id, {
        status: 'error',
        error: `${stillFailed} module(s) still failed after retry`,
        modules: updatedModules
      });
    }
  }

  // ✅ FIXED: Clear pause flag when book is completed
  async assembleFinalBook(book: BookProject, session: BookSession): Promise<void> {
    this.updateProgress(book.id, { status: 'assembling', progress: 90 });

    try {
      const [introduction, summary, glossary] = await Promise.all([
        this.generateBookIntroduction(session, book.roadmap!),
        this.generateBookSummary(session, book.modules),
        this.generateGlossary(book.modules)
      ]);

      const totalWords = book.modules.reduce((sum, m) => sum + m.wordCount, 0);
      const providerName = this.getProviderDisplayName();
      const modelName = this.settings.selectedModel;

      const finalBook = [
        `# ${book.title}\n`,
        `**Generated:** ${new Date().toLocaleDateString()}\n`,
        `**Words:** ${totalWords.toLocaleString()}\n`,
        `**Provider:** ${providerName} (${modelName})\n\n`,
        `---\n\n## Table of Contents\n`,
        this.generateTableOfContents(book.modules),
        `\n\n---\n\n## Introduction\n\n${introduction}\n\n---\n\n`,
        ...book.modules.map((m, i) => 
          `${m.content}\n\n${i < book.modules.length - 1 ? '---\n\n' : ''}`
        ),
        `\n---\n\n## Summary\n\n${summary}\n\n---\n\n`,
        `## Glossary\n\n${glossary}`
      ].join('');

      this.clearCheckpoint(book.id);
      
      // ✅ FIX: Clear pause flag when book is completed
      try {
        localStorage.removeItem(`pause_flag_${book.id}`);
        console.log('✓ Cleared pause flag for completed book:', book.id);
      } catch (error) {
        console.warn('Failed to clear pause flag:', error);
      }
      
      this.updateProgress(book.id, {
        status: 'completed',
        progress: 100,
        finalBook,
        totalWords
      });
    } catch (error) {
      this.updateProgress(book.id, { status: 'error', error: 'Book assembly failed' });
      throw error;
    }
  }

  // ✅ UPDATED: getProviderDisplayName method
  private getProviderDisplayName(): string {
    const names: Record<string, string> = { 
      google: 'Google Gemini', 
      mistral: 'Mistral AI', 
      zhipu: 'ZhipuAI',
      groq: 'Groq' // ✅ NEW
    };
    return names[this.settings.selectedProvider] || 'AI';
  }

  private generateTableOfContents(modules: BookModule[]): string {
    return modules.map((m, i) => 
      `${i + 1}. [${m.title}](#${m.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')})`
    ).join('\n');
  }

  private async generateBookIntroduction(session: BookSession, roadmap: BookRoadmap): Promise<string> {
    const prompt = `Generate a compelling introduction for: "${session.goal}"

ROADMAP:
${roadmap.modules.map(m => `- ${m.title}`).join('\n')}

TARGET: ${session.targetAudience || 'general learners'}
LEVEL: ${roadmap.difficultyLevel}

Write 800-1200 words covering:
- Welcome and book purpose
- What readers will learn
- Book structure overview
- Motivation and expectations
Use engaging tone with ## markdown headers.`;

    return await this.generateWithAI(prompt);
  }

  private async generateBookSummary(session: BookSession, modules: BookModule[]): Promise<string> {
    const prompt = `Generate summary for: "${session.goal}"

MODULES:
${modules.map(m => `- ${m.title}`).join('\n')}

Write 600-900 words covering:
- Key learning outcomes
- Important concepts recap
- Next steps guidance
- Congratulations to reader`;

    return await this.generateWithAI(prompt);
  }

  private async generateGlossary(modules: BookModule[]): Promise<string> {
    const content = modules.map(m => m.content).join('\n\n').substring(0, 12000);
    
    const prompt = `Extract key terms from this content and create a glossary:
${content}

Create 20-30 terms with:
- Clear 1-2 sentence definitions
- Alphabetical order
- Focus on technical/important terms

Format:
**Term**: Definition.
**Term 2**: Definition.`;

    return await this.generateWithAI(prompt);
  }

  downloadAsMarkdown(project: BookProject): void {
    if (!project.finalBook) {
      throw new Error('No book content available');
    }

    const blob = new Blob([project.finalBook], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = project.title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').toLowerCase().substring(0, 50);
    const filename = `${safeTitle}_${new Date().toISOString().slice(0, 10)}_book.md`;

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  cancelActiveRequests(bookId?: string): void {
    if (bookId) {
      if (this.activeRequests.has(bookId)) {
        this.activeRequests.get(bookId)?.abort();
        this.activeRequests.delete(bookId);
      }
      this.pauseGeneration(bookId);
    } else {
      this.activeRequests.forEach(controller => controller.abort());
      this.activeRequests.clear();
    }
  }

  hasCheckpoint(bookId: string): boolean {
    return this.checkpoints.has(bookId) || localStorage.getItem(`checkpoint_${bookId}`) !== null;
  }

  getCheckpointInfo(bookId: string): { completed: number; failed: number; total: number; lastSaved: string } | null {
    const checkpoint = this.loadCheckpoint(bookId);
    if (!checkpoint) return null;
    
    const completed = Array.isArray(checkpoint.completedModuleIds) ? checkpoint.completedModuleIds.length : 0;
    const failed = Array.isArray(checkpoint.failedModuleIds) ? checkpoint.failedModuleIds.length : 0;

    return {
      completed: completed,
      failed: failed,
      total: completed + failed,
      lastSaved: new Date(checkpoint.timestamp).toLocaleString()
    };
  }
}

export const bookService = new BookGenerationService();
