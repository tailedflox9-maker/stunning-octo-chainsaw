// src/utils/logger.ts - UPDATED FOR BETTER PROMPT LOGGING
interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug' | 'api';
  message: string;
  data?: any;
  module?: string;
  apiDetails?: {
    provider?: string;
    model?: string;
    prompt?: string; // This will hold the full prompt
    promptLength?: number;
    responseLength?: number;
    duration?: number;
  };
}

class ConsoleLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 500;
  private sessionStartTime = new Date();
  private listeners: Array<(logs: any[]) => void> = [];

  private addLog(level: LogEntry['level'], message: string, data?: any, module?: string, apiDetails?: any) {
    const entry: LogEntry = { timestamp: new Date(), level, message, data, module, apiDetails };
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    this.notifyListeners();
  }

  subscribe(listener: (logs: any[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.logs.map(log => ({
        id: log.timestamp.getTime(),
        timestamp: log.timestamp.toLocaleTimeString(),
        message: log.message,
        type: log.level
    }))]));
  }

  info(message: string, data?: any, module?: string) { this.addLog('info', message, data, module); }
  warn(message: string, data?: any, module?: string) { this.addLog('warn', message, data, module); }
  error(message: string, data?: any, module?: string) { this.addLog('error', message, data, module); }
  debug(message: string, data?: any, module?: string) { this.addLog('debug', message, data, module); }
  api(message: string, apiDetails: any, module?: string) { this.addLog('api', message, undefined, module, apiDetails); }
  getLogs() { return [...this.logs]; }

  exportLogs(): string {
    const header = [
      '='.repeat(100),
      'PUSTAKAM AI BOOK GENERATION ENGINE - COMPREHENSIVE LOG EXPORT',
      '='.repeat(100),
      `Export Date: ${new Date().toISOString()}`,
      `Session Started: ${this.sessionStartTime.toISOString()}`,
      `Total Log Entries: ${this.logs.length}`,
      '='.repeat(100),
      ''
    ].join('\n');

    const logEntries = this.logs.map(log => {
      const timestamp = log.timestamp.toISOString();
      const module = log.module ? `[${log.module}]` : '';
      const level = `[${log.level.toUpperCase()}]`;
      let entry = `${timestamp} ${level} ${module} ${log.message}`;

      if (log.apiDetails) {
        entry += `\n  API Details:`;
        entry += `\n    - Provider: ${log.apiDetails.provider || 'N/A'}`;
        entry += `\n    - Model: ${log.apiDetails.model || 'N/A'}`;
        if (log.apiDetails.promptLength) entry += `\n    - Prompt Length: ${log.apiDetails.promptLength} chars`;
        if (log.apiDetails.responseLength) entry += `\n    - Response Length: ${log.apiDetails.responseLength} chars`;
        if (log.apiDetails.duration) entry += `\n    - Duration: ${log.apiDetails.duration}ms`;
        
        // <<< --- THIS BLOCK INCLUDES THE FULL PROMPT IN THE LOG FILE --- >>>
        if (log.apiDetails.prompt) {
          entry += `\n\n  --- PROMPT SENT TO AI ---\n${'-'.repeat(80)}\n${log.apiDetails.prompt}\n${'-'.repeat(80)}\n  --- END OF PROMPT ---\n`;
        }
      }
      
      if (log.data) {
        try {
          entry += `\n  Data: ${JSON.stringify(log.data, null, 2)}`;
        } catch (e) {
          entry += `\n  Data: (Circular reference, not shown)`;
        }
      }
      
      return entry;
    }).reverse().join('\n\n' + '-'.repeat(100) + '\n\n');

    return header + '\n' + logEntries;
  }
}

export const logger = new ConsoleLogger();
