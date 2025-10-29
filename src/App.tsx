import React, { useState, useEffect, useMemo } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Sidebar } from './components/Sidebar';
import { InstallPrompt } from './components/InstallPrompt';
import { SettingsModal } from './components/SettingsModal';
import { useGenerationStats } from './components/GenerationProgressPanel';
import { APISettings, ModelProvider } from './types';
import { usePWA } from './hooks/usePWA';
import { Menu, WifiOff, Settings, CheckCircle2 } from 'lucide-react';
import { storageUtils } from './utils/storage';
import { bookService } from './services/bookService';
import { BookView } from './components/BookView';
import { BookProject, BookSession } from './types/book';
import { generateId } from './utils/helpers';

type AppView = 'list' | 'create' | 'detail';

interface GenerationStatus {
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
  retryInfo?: {
    moduleTitle: string;
    error: string;
    retryCount: number;
    maxRetries: number;
    waitTime?: number;
  };
}

function App() {
  const [books, setBooks] = useState<BookProject[]>(() => storageUtils.getBooks());
  const [settings, setSettings] = useState<APISettings>(() => storageUtils.getSettings());
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [sidebarFolded, setSidebarFolded] = useState(() =>
    JSON.parse(localStorage.getItem('pustakam-sidebar-folded') || 'false')
  );
  const [view, setView] = useState<AppView>('list');
  const [showListInMain, setShowListInMain] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
    status: 'idle',
    totalProgress: 0,
    totalWordsGenerated: 0,
  });
  const [generationStartTime, setGenerationStartTime] = useState<Date>(new Date());
  const [showModelSwitch, setShowModelSwitch] = useState(false);
  const [modelSwitchOptions, setModelSwitchOptions] = useState<Array<{provider: ModelProvider; model: string; name: string}>>([]);
  
  const { isInstallable, isInstalled, installApp, dismissInstallPrompt } = usePWA();
  const currentBook = useMemo(() =>
    currentBookId ? books.find(b => b.id === currentBookId) : null,
    [currentBookId, books]
  );
  const isGenerating = useMemo(() => {
    if (!currentBook) return false;
    return (
      currentBook.status === 'generating_content' ||
      generationStatus.status === 'generating'
    );
  }, [currentBook?.status, generationStatus.status]);
  const totalWordsGenerated = currentBook?.modules.reduce((sum, m) =>
    sum + (m.status === 'completed' ? m.wordCount : 0), 0
  ) || 0;
  const generationStats = useGenerationStats(
    currentBook?.roadmap?.totalModules || 0,
    currentBook?.modules.filter(m => m.status === 'completed').length || 0,
    currentBook?.modules.filter(m => m.status === 'error').length || 0,
    generationStartTime,
    generationStatus.totalWordsGenerated || totalWordsGenerated
  );

  // ✅ FIX: Clean up pause flags for completed books on mount
  useEffect(() => {
    books.forEach(book => {
      if (book.status === 'completed') {
        try {
          localStorage.removeItem(`pause_flag_${book.id}`);
          console.log('✓ Cleared pause flag for completed book:', book.id);
        } catch (error) {
          console.warn('Failed to clear pause flag:', error);
        }
      }
    });
  }, []); // Run only once on mount

  useEffect(() => {
    if (currentBook && currentBook.status === 'generating_content') {
      const checkpoint = bookService.getCheckpointInfo(currentBook.id);
      if (checkpoint && checkpoint.completed > 0) {
        const isPaused = bookService.isPaused(currentBook.id);
        if (isPaused) {
          setGenerationStatus({
            status: 'paused',
            totalProgress: 0,
            totalWordsGenerated: currentBook.modules.reduce((sum, m) =>
              sum + (m.status === 'completed' ? m.wordCount : 0), 0
            ),
            logMessage: '⏸ Generation was paused'
          });
        }
      }
    }
  }, [currentBook?.id]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      const tablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      const desktop = window.innerWidth >= 1024;

      setIsMobile(mobile);

      if (desktop) {
        setSidebarOpen(true);
      } else if (mobile || tablet) {
        if (view === 'list' || view === 'create') {
          setSidebarOpen(false);
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 100);
    });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [view]);

  useEffect(() => {
    bookService.updateSettings(settings);
    bookService.setProgressCallback(handleBookProgressUpdate);
    bookService.setGenerationStatusCallback((bookId, status) => {
      setGenerationStatus(prevStatus => ({
        ...prevStatus,
        ...status,
        totalWordsGenerated: status.totalWordsGenerated || prevStatus.totalWordsGenerated,
      }));
    });
  }, [settings]);

  useEffect(() => {
    storageUtils.saveBooks(books);
  }, [books]);

  useEffect(() => {
    localStorage.setItem('pustakam-sidebar-folded', JSON.stringify(sidebarFolded));
  }, [sidebarFolded]);

  useEffect(() => {
    if (!currentBookId) {
      setView('list');
    }
  }, [currentBookId]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      const timeout = isMobile ? 7000 : 5000;
      setTimeout(() => setShowOfflineMessage(false), timeout);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, sidebarOpen]);

  const hasApiKey = !!(settings.googleApiKey || settings.mistralApiKey || settings.zhipuApiKey);

  const getAlternativeModels = () => {
    const alternatives: Array<{provider: ModelProvider; model: string; name: string}> = [];

    if (settings.googleApiKey && settings.selectedProvider !== 'google') {
      alternatives.push({
        provider: 'google',
        model: 'gemini-2.5-flash',
        name: 'Google Gemini 2.5 Flash'
      });
    }

    if (settings.mistralApiKey && settings.selectedProvider !== 'mistral') {
      alternatives.push({
        provider: 'mistral',
        model: 'mistral-small-latest',
        name: 'Mistral Small'
      });
    }

    if (settings.zhipuApiKey && settings.selectedProvider !== 'zhipu') {
      alternatives.push({
        provider: 'zhipu',
        model: 'glm-4.5-flash',
        name: 'GLM 4.5 Flash'
      });
    }

    return alternatives;
  };

  const showModelSwitchModal = (alternatives: Array<{provider: ModelProvider; model: string; name: string}>) => {
    setModelSwitchOptions(alternatives);
    setShowModelSwitch(true);
  };

  const handleModelSwitch = async (provider: ModelProvider, model: string) => {
    const newSettings = { ...settings, selectedProvider: provider, selectedModel: model };
    setSettings(newSettings);
    storageUtils.saveSettings(newSettings);

    setShowModelSwitch(false);

    setTimeout(() => {
      if (currentBook) {
        const modelName = modelSwitchOptions.find(m => m.provider === provider)?.name;
        alert(`✅ Switched to ${modelName}\n\nClick Resume to continue generation with the new model.`);

        setGenerationStatus(prev => ({
          ...prev,
          status: 'paused',
          logMessage: '⚙️ Model switched - Ready to resume'
        }));
      }
    }, 100);
  };

  const handleRetryDecision = async (decision: 'retry' | 'switch' | 'skip') => {
    if (!currentBook) return;

    if (decision === 'retry') {
      bookService.setRetryDecision(currentBook.id, 'retry');

    } else if (decision === 'switch') {
      bookService.setRetryDecision(currentBook.id, 'switch');

      const alternatives = getAlternativeModels();

      if (alternatives.length === 0) {
        alert('No alternative AI models available.\n\nPlease configure additional API keys in Settings.');
        setSettingsOpen(true);
        return;
      }

      showModelSwitchModal(alternatives);

    } else if (decision === 'skip') {
      const confirmed = window.confirm(
        '⚠️ Skip this module?\n\n' +
        '• The module will be marked as failed\n' +
        '• You can retry it later from the error summary\n' +
        '• Generation will continue with the next module\n\n' +
        'Are you sure?'
      );

      if (confirmed) {
        bookService.setRetryDecision(currentBook.id, 'skip');
      }
    }
  };

  // ✅ FIXED: Clear pause flag when selecting completed books
  const handleSelectBook = (id: string | null) => {
    setCurrentBookId(id);
    if (id) {
      setView('detail');

      const book = books.find(b => b.id === id);
      if (book) {
        // ✅ FIX: Clear pause flag if book is completed
        if (book.status === 'completed') {
          try {
            localStorage.removeItem(`pause_flag_${id}`);
            console.log('✓ Cleared pause flag for completed book:', id);
          } catch (error) {
            console.warn('Failed to clear pause flag:', error);
          }
          
          // Reset generation status for completed books
          setGenerationStatus({
            status: 'idle',
            totalProgress: 0,
            totalWordsGenerated: book.modules.reduce((sum, m) => sum + m.wordCount, 0)
          });
        } else if (book.status === 'generating_content') {
          const checkpoint = bookService.getCheckpointInfo(id);
          if (checkpoint && checkpoint.completed > 0) {
            const isPaused = bookService.isPaused(id);
            if (isPaused) {
              setGenerationStatus({
                status: 'paused',
                totalProgress: 0,
                totalWordsGenerated: book.modules.reduce((sum, m) =>
                  sum + (m.status === 'completed' ? m.wordCount : 0), 0
                ),
                logMessage: '⏸ Generation was paused'
              });
            }
          }
        }
      }
    }
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleBookProgressUpdate = (bookId: string, updates: Partial<BookProject>) => {
    setBooks(prev => prev.map(book =>
      book.id === bookId
        ? { ...book, ...updates, updatedAt: new Date() }
        : book
    ));
  };

  const handleCreateBookRoadmap = async (session: BookSession): Promise<void> => {
    if (!hasApiKey) {
      alert('Please configure an API key in Settings first.');
      setSettingsOpen(true);
      return;
    }
    const newBook: BookProject = {
      id: generateId(),
      title: session.goal,
      goal: session.goal,
      language: session.language,
      status: 'planning',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      modules: [],
      category: 'general',
    };
    setBooks(prev => [newBook, ...prev]);

    try {
      await bookService.generateRoadmap(session, newBook.id);
      handleSelectBook(newBook.id);
    } catch (error) {
      console.error("Roadmap generation failed:", error);
      handleBookProgressUpdate(newBook.id, {
        status: 'error',
        error: 'Failed to generate roadmap. Please check your internet connection, API key, and selected model.'
      });
    }
  };

  const handleGenerateAllModules = async (book: BookProject, session: BookSession): Promise<void> => {
    if (!book.roadmap || !isOnline) {
      alert('This feature requires an internet connection.');
      return;
    }
    const hasCheckpoint = bookService.hasCheckpoint(book.id);
    const checkpointInfo = bookService.getCheckpointInfo(book.id);
    if (hasCheckpoint && checkpointInfo && checkpointInfo.completed > 0) {
      const message = `📚 Previous Progress Found\n\n` +
        `Last saved: ${checkpointInfo.lastSaved}\n` +
        `✓ ${checkpointInfo.completed} module(s) completed\n` +
        `${checkpointInfo.failed > 0 ? `✗ ${checkpointInfo.failed} module(s) failed\n` : ''}\n` +
        `Would you like to:\n\n` +
        `• Click OK to RESUME from checkpoint\n` +
        `• Click Cancel to START FRESH (progress will be lost)`;
      const shouldResume = window.confirm(message);

      if (!shouldResume) {
        localStorage.removeItem(`checkpoint_${book.id}`);
        localStorage.removeItem(`pause_flag_${book.id}`);
        bookService.resumeGeneration(book.id);
        handleBookProgressUpdate(book.id, {
          modules: [],
          status: 'generating_content',
          progress: 15
        });
      } else {
        bookService.resumeGeneration(book.id);
      }
    } else {
      bookService.resumeGeneration(book.id);
    }
    const initialWords = book.modules.reduce((sum, m) => sum + (m.status === 'completed' ? m.wordCount : 0), 0);
    setGenerationStartTime(new Date());
    setGenerationStatus({
      status: 'generating',
      totalProgress: 0,
      totalWordsGenerated: initialWords,
      logMessage: 'Initializing generation engine...'
    });
    handleBookProgressUpdate(book.id, { status: 'generating_content' });
    try {
      await bookService.generateAllModulesWithRecovery(book, session);

      if (!bookService.isPaused(book.id)) {
        setGenerationStatus(prev => ({
          ...prev,
          status: 'completed',
          totalProgress: 100,
          logMessage: '✓ Generation complete!'
        }));
      }
    } catch (error) {
      console.error("Module generation failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';

      if (!bookService.isPaused(book.id)) {
        setGenerationStatus(prev => ({
          ...prev,
          status: 'error',
          logMessage: errorMessage
        }));

        handleBookProgressUpdate(book.id, {
          status: 'error',
          error: errorMessage
        });
      }
    }
  };

  const handlePauseGeneration = (bookId: string) => {
    console.log('🔴 Pausing generation for book:', bookId);
    bookService.pauseGeneration(bookId);

    setGenerationStatus(prev => ({
      ...prev,
      status: 'paused',
      logMessage: '⏸ Generation paused - progress saved'
    }));
  };

  const handleResumeGeneration = async (book: BookProject, session: BookSession) => {
    console.log('▶ Resuming generation for book:', book.id);
    bookService.resumeGeneration(book.id);

    setGenerationStartTime(new Date());

    const initialWords = book.modules.reduce((sum, m) =>
      sum + (m.status === 'completed' ? m.wordCount : 0), 0
    );

    setGenerationStatus({
      status: 'generating',
      totalProgress: 0,
      totalWordsGenerated: initialWords,
      logMessage: '▶ Resuming generation from checkpoint...'
    });

    handleBookProgressUpdate(book.id, { status: 'generating_content' });

    try {
      await bookService.generateAllModulesWithRecovery(book, session);

      if (!bookService.isPaused(book.id)) {
        setGenerationStatus(prev => ({
          ...prev,
          status: 'completed',
          totalProgress: 100,
          logMessage: '✓ Generation complete!'
        }));
      }
    } catch (error) {
      console.error("Generation failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';

      if (!bookService.isPaused(book.id)) {
        setGenerationStatus(prev => ({
          ...prev,
          status: 'error',
          logMessage: errorMessage
        }));

        handleBookProgressUpdate(book.id, {
          status: 'error',
          error: errorMessage
        });
      }
    }
  };

  const handleRetryFailedModules = async (book: BookProject, session: BookSession): Promise<void> => {
    if (!isOnline) {
      alert('This feature requires an internet connection.');
      return;
    }
    const failedCount = book.modules.filter(m => m.status === 'error').length;

    if (failedCount === 0) {
      alert('No failed modules to retry.');
      return;
    }
    const shouldRetry = window.confirm(
      `Retry ${failedCount} failed module${failedCount > 1 ? 's' : ''}?\n\n` +
      `This will attempt to regenerate only the modules that failed.\n` +
      `Successfully generated modules will be preserved.`
    );
    if (!shouldRetry) return;
    const initialWords = book.modules.reduce((sum, m) => sum + (m.status === 'completed' ? m.wordCount : 0), 0);
    setGenerationStartTime(new Date());
    setGenerationStatus({
      status: 'generating',
      totalProgress: 0,
      totalWordsGenerated: initialWords,
      logMessage: 'Retrying failed modules...'
    });
    handleBookProgressUpdate(book.id, { status: 'generating_content' });
    try {
      await bookService.retryFailedModules(book, session);

      setGenerationStatus(prev => ({
        ...prev,
        status: 'completed',
        totalProgress: 100,
        logMessage: '✓ Retry complete!'
      }));
    } catch (error) {
      console.error("Retry failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Retry failed';

      setGenerationStatus(prev => ({
        ...prev,
        status: 'error',
        logMessage: errorMessage
      }));

      handleBookProgressUpdate(book.id, {
        status: 'error',
        error: `Retry failed: ${errorMessage}`
      });
    }
  };

  const handleAssembleBook = async (book: BookProject, session: BookSession): Promise<void> => {
    if (!isOnline) {
      alert('This feature requires an internet connection.');
      return;
    }
    try {
      await bookService.assembleFinalBook(book, session);
    } catch (error) {
      console.error("Failed to assemble book:", error);
      handleBookProgressUpdate(book.id, { status: 'error', error: 'Final assembly failed.' });
    }
  };

  const handleDeleteBook = (id: string) => {
    const message = isMobile
      ? 'Delete this book? This cannot be undone.'
      : 'Are you sure you want to delete this book? This action cannot be undone.';

    if (window.confirm(message)) {
      setBooks(prev => prev.filter(b => b.id !== id));
      if (currentBookId === id) {
        setCurrentBookId(null);
        setShowListInMain(true);
      }
      localStorage.removeItem(`checkpoint_${id}`);
      localStorage.removeItem(`pause_flag_${id}`);
    }
  };

  const handleSaveSettings = (newSettings: APISettings) => {
    setSettings(newSettings);
    storageUtils.saveSettings(newSettings);
    setSettingsOpen(false);
  };

  const handleModelChange = (model: string, provider: ModelProvider) => {
    const newSettings = { ...settings, selectedModel: model, selectedProvider: provider };
    setSettings(newSettings);
    storageUtils.saveSettings(newSettings);
  };

  const handleInstallApp = async () => {
    if (await installApp()) {
      console.log('App installed successfully');
    }
  };

  const handleUpdateBookContent = (bookId: string, newContent: string) => {
    setBooks(prevBooks =>
      prevBooks.map(book =>
        book.id === bookId
          ? { ...book, finalBook: newContent, updatedAt: new Date() }
          : book
      )
    );
  };

  const handleMenuClick = () => {
    setSidebarOpen(true);
  };

  const handleBackdropClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="app-container viewport-full prevent-overscroll">
      {sidebarOpen && !window.matchMedia('(min-width: 1024px)').matches && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={handleBackdropClick}
        />
      )}
      <Sidebar
        books={books}
        currentBookId={currentBookId}
        onSelectBook={handleSelectBook}
        onDeleteBook={handleDeleteBook}
        onOpenSettings={() => setSettingsOpen(true)}
        onNewBook={() => {
          setView('create');
          setShowListInMain(false);
          if (isMobile) {
            setSidebarOpen(false);
          }
        }}
        onCloseSidebar={() => setSidebarOpen(false)}
        isFolded={sidebarFolded}
        onToggleFold={() => setSidebarFolded(!sidebarFolded)}
        isSidebarOpen={sidebarOpen}
        settings={settings}
        onModelChange={handleModelChange}
      />
      <div className="main-content">
        {!sidebarOpen && (
          <button
            onClick={handleMenuClick}
            className={`fixed z-30 btn-secondary shadow-lg transition-all duration-200 lg:hidden ${
              isMobile
                ? 'top-4 left-4 p-3 rounded-xl'
                : 'top-4 left-4 p-2.5 rounded-lg'
            }`}
            title="Open sidebar"
            style={{
              top: isMobile ? 'max(16px, env(safe-area-inset-top))' : '16px'
            }}
          >
            <Menu className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
          </button>
        )}
        {showOfflineMessage && (
          <div
            className={`fixed z-50 content-card animate-fade-in-up ${
              isMobile
                ? 'top-20 left-4 right-4 p-4'
                : 'top-4 right-4 p-3'
            }`}
            style={{
              top: isMobile ? 'max(80px, calc(env(safe-area-inset-top) + 64px))' : '16px'
            }}
          >
            <div className="flex items-center gap-2 text-yellow-400">
              <WifiOff className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
              <span className={`font-medium ${isMobile ? 'text-base' : 'text-sm'}`}>
                You're offline
              </span>
            </div>
          </div>
        )}
        <BookView
          books={books}
          currentBookId={currentBookId}
          onCreateBookRoadmap={handleCreateBookRoadmap}
          onGenerateAllModules={handleGenerateAllModules}
          onRetryFailedModules={handleRetryFailedModules}
          onAssembleBook={handleAssembleBook}
          onSelectBook={handleSelectBook}
          onDeleteBook={handleDeleteBook}
          hasApiKey={hasApiKey}
          view={view}
          setView={setView}
          onUpdateBookContent={handleUpdateBookContent}
          showListInMain={showListInMain}
          setShowListInMain={setShowListInMain}
          isMobile={isMobile}
          generationStatus={generationStatus}
          generationStats={generationStats}
          onPauseGeneration={handlePauseGeneration}
          onResumeGeneration={handleResumeGeneration}
          isGenerating={isGenerating}
          onRetryDecision={handleRetryDecision}
          availableModels={getAlternativeModels()}
        />
      </div>
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />
      {showModelSwitch && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--color-sidebar)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">Switch AI Model</h3>
            </div>

            <p className="text-sm text-gray-400 mb-6">
              Select a different AI model to continue generation:
            </p>

            <div className="space-y-3 mb-6">
              {modelSwitchOptions.map((option) => (
                <button
                  key={`${option.provider}-${option.model}`}
                  onClick={() => handleModelSwitch(option.provider, option.model)}
                  className="w-full p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg hover:border-blue-500 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {option.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Model: {option.model}
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModelSwitch(false)}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowModelSwitch(false);
                  setSettingsOpen(true);
                }}
                className="flex-1 btn btn-primary"
              >
                <Settings className="w-4 h-4" />
                Configure Keys
              </button>
            </div>

            <div className="mt-4 text-xs text-zinc-500 text-center">
              💡 You can add more AI providers in Settings
            </div>
          </div>
        </div>
      )}
      {isInstallable && !isInstalled && (
        <InstallPrompt
          onInstall={handleInstallApp}
          onDismiss={dismissInstallPrompt}
        />
      )}
      <Analytics />
    </div>
  );
}

export default App; 
