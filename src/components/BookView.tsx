// src/components/BookView.tsx - COMPLETE FIXED VERSION
import React, { useEffect, ReactNode, useMemo, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Book,
  Plus,
  Download,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Target,
  Users,
  Brain,
  Sparkles,
  BarChart3,
  ListChecks,
  Play,
  Box,
  ArrowLeft,
  Check,
  BookText,
  RefreshCw,
  Edit,
  Save,
  X,
  FileText,
  Maximize2,
  Minimize2,
  List,
  Settings,
  Moon,
  ZoomIn,
  ZoomOut,
  BookOpen,
  ChevronUp,
  RotateCcw,
  Palette,
  Hash,
  Activity,
  TrendingUp,
  Zap,
  Gauge,
  Terminal,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  Pause,
} from 'lucide-react';
import { BookProject, BookSession } from '../types/book';
import { bookService } from '../services/bookService';
import { BookAnalytics } from './BookAnalytics';
import { CustomSelect } from './CustomSelect';
import { pdfService } from '../services/pdfService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

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
  status: 'idle' | 'generating' | 'completed' | 'error' | 'paused';
  logMessage?: string;
  totalWordsGenerated?: number;
  aiStage?: 'analyzing' | 'writing' | 'examples' | 'polishing' | 'complete';
}

interface GenerationStats {
  startTime: Date;
  totalModules: number;
  completedModules: number;
  failedModules: number;
  averageTimePerModule: number;
  estimatedTimeRemaining: number;
  totalWordsGenerated: number;
  wordsPerMinute: number;
}

interface BookViewProps {
  books: BookProject[];
  currentBookId: string | null;
  onCreateBookRoadmap: (session: BookSession) => Promise<void>;
  onGenerateAllModules: (book: BookProject, session: BookSession) => Promise<void>;
  onRetryFailedModules: (book: BookProject, session: BookSession) => Promise<void>;
  onAssembleBook: (book: BookProject, session: BookSession) => Promise<void>;
  onSelectBook: (id: string | null) => void;
  onDeleteBook: (id: string) => void;
  hasApiKey: boolean;
  view: AppView;
  setView: React.Dispatch<React.SetStateAction<AppView>>;
  onUpdateBookContent: (bookId: string, newContent: string) => void;
  showListInMain: boolean;
  setShowListInMain: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile?: boolean;
  generationStatus?: GenerationStatus;
  generationStats?: GenerationStats;
  onPauseGeneration?: (bookId: string) => void;
  onResumeGeneration?: (book: BookProject, session: BookSession) => void;
  isGenerating?: boolean;
}

interface ReadingModeProps {
  content: string;
  isEditing: boolean;
  editedContent: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onContentChange: (content: string) => void;
}

interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: 'serif' | 'sans' | 'mono';
  theme: 'dark' | 'sepia';
  maxWidth: 'narrow' | 'medium' | 'wide';
  textAlign: 'left' | 'justify';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const THEMES = {
  dark: {
    bg: '#0F0F0F',
    contentBg: '#1A1A1A',
    text: '#E5E5E5',
    secondary: '#A0A0A0',
    border: '#333333',
    accent: '#6B7280',
  },
  sepia: {
    bg: '#F5F1E8',
    contentBg: '#FAF7F0',
    text: '#3C2A1E',
    secondary: '#8B7355',
    border: '#D4C4A8',
    accent: '#B45309',
  },
};

const FONT_FAMILIES = {
  serif: 'ui-serif, Georgia, "Times New Roman", serif',
  sans: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono: 'ui-monospace, "SF Mono", "Monaco", "Cascadia Code", monospace',
};

const MAX_WIDTHS = {
  narrow: '65ch',
  medium: '75ch',
  wide: '85ch',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 1) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const GradientProgressBar = ({ progress = 0, active = true }) => (
  <div className="relative w-full h-2.5 bg-zinc-800/50 rounded-full overflow-hidden border border-zinc-700/50">
    <div
      className="absolute inset-0 bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 transition-all duration-700 ease-out"
      style={{
        width: `${progress}%`,
        backgroundSize: '200% 100%',
        animation: active ? 'gradient-flow 3s ease infinite' : 'none',
      }}
    />
  </div>
);

const PixelAnimation = () => {
  const [pixels, setPixels] = useState<any[]>([]);

  useEffect(() => {
    const colors = [
      'bg-orange-500',
      'bg-yellow-500',
      'bg-amber-600',
      'bg-red-500',
      'bg-zinc-700',
      'bg-zinc-600',
    ];

    const generate = () => {
      const newPixels = Array(70)
        .fill(0)
        .map((_, i) => ({
          id: i,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: Math.random() > 0.6 ? 'opacity-100' : 'opacity-30',
        }));
      setPixels(newPixels);
    };

    generate();
    const interval = setInterval(generate, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-wrap gap-1.5 h-14">
      {pixels.map((p) => (
        <div
          key={p.id}
          className={`w-1.5 h-1.5 rounded-sm ${p.color} ${p.opacity} transition-all duration-200`}
        />
      ))}
    </div>
  );
};

const EmbeddedProgressPanel = ({
  generationStatus,
  stats,
  onCancel,
  onPause,
  onResume,
}: {
  generationStatus: GenerationStatus;
  stats: GenerationStats;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}) => {
  const streamBoxRef = useRef<HTMLDivElement>(null);
  
  // FIX: Check if paused OR if status is 'paused'
  const isPaused = generationStatus.status === 'paused';
  const isGenerating = generationStatus.status === 'generating';

  useEffect(() => {
    if (streamBoxRef.current && generationStatus.currentModule?.generatedText) {
      streamBoxRef.current.scrollTop = streamBoxRef.current.scrollHeight;
    }
  }, [generationStatus.currentModule?.generatedText]);

  const overallProgress = (stats.completedModules / (stats.totalModules || 1)) * 100;

  return (
    <div className={`bg-zinc-900/60 backdrop-blur-xl border rounded-xl overflow-hidden animate-fade-in-up ${
      isPaused ? 'border-yellow-500/50' : 'border-zinc-800/50'
    }`}>
      <div className="p-6">
        {/* Header with Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isPaused ? (
              <div className="w-12 h-12 flex items-center justify-center bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                <Pause className="w-6 h-6 text-yellow-400" />
              </div>
            ) : (
              <div className="w-12 h-12 flex items-center justify-center bg-blue-500/20 rounded-lg border border-blue-500/30">
                <Brain className="w-6 h-6 text-blue-400 animate-pulse" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-white">
                {isPaused ? 'Generation Paused' : 'Generating Chapters...'}
              </h3>
              <p className="text-sm text-gray-400">
                {stats.completedModules} of {stats.totalModules} complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 border rounded-full text-xs font-semibold ${
              isPaused 
                ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' 
                : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
            }`}>
              {Math.round(overallProgress)}%
            </div>
            <div className="text-sm font-mono text-zinc-400">
              {stats.totalWordsGenerated.toLocaleString()} words
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <GradientProgressBar
            progress={overallProgress}
            active={isGenerating}
          />
        </div>

        {/* Paused Message */}
        {isPaused && (
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <Pause className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-300 mb-1">
                  Generation Paused
                </p>
                <p className="text-xs text-yellow-400/80">
                  Your progress is saved. You can resume anytime or close this tab safely.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Module Status (only when generating) */}
        {isGenerating && generationStatus.currentModule && (
          <>
            <div className="mt-5 mb-4">
              <PixelAnimation />
            </div>
            
            {generationStatus.currentModule.generatedText && (
              <div className="bg-black/40 border border-zinc-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    {generationStatus.currentModule.title}
                  </h4>
                  {generationStatus.currentModule.attempt > 1 && (
                    <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20">
                      <RefreshCw className="w-3 h-3" />
                      <span>Attempt {generationStatus.currentModule.attempt}</span>
                    </div>
                  )}
                </div>
                <div
                  ref={streamBoxRef}
                  className="text-sm text-zinc-300 leading-relaxed max-h-32 overflow-y-auto font-mono streaming-text-box"
                >
                  {generationStatus.currentModule.generatedText}
                  <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer with Action Buttons - ALWAYS VISIBLE */}
        <div className="mt-6 pt-4 border-t border-zinc-800/50">
          <div className="flex items-center justify-between">
            {/* Left side - Time info */}
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span>
                {isPaused 
                  ? `Paused • ${stats.completedModules}/${stats.totalModules} done`
                  : `${formatTime(stats.estimatedTimeRemaining)} remaining`
                }
              </span>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center gap-3">
              {/* FIX: Show cancel button when generating OR paused */}
              {(isGenerating || isPaused) && onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 border border-zinc-700 hover:bg-zinc-800 rounded-lg text-sm font-medium transition-all hover:border-red-500/50 hover:text-red-400"
                  title="Stop generation and save progress"
                >
                  <X className="w-4 h-4 inline mr-1.5" />
                  Cancel
                </button>
              )}

              {/* FIX: Show pause button when generating, resume when paused */}
              {isPaused ? (
                onResume && (
                  <button
                    onClick={onResume}
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition-all shadow-lg hover:shadow-green-500/30 flex items-center gap-2"
                    title="Resume generation from where you left off"
                  >
                    <Play className="w-4 h-4" />
                    Resume Generation
                  </button>
                )
              ) : isGenerating && onPause && (
                <button
                  onClick={onPause}
                  className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white font-semibold transition-all shadow-lg hover:shadow-yellow-500/30 flex items-center gap-2"
                  title="Pause and save progress"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              )}
            </div>
          </div>

          {/* Helper text */}
          <div className="mt-3 text-xs text-zinc-500 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>
              {isPaused 
                ? 'Progress is saved. You can close this tab safely.'
                : 'You can pause anytime. Progress will be saved automatically.'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CodeBlock = React.memo(({ children, language, theme }: any) => (
  <SyntaxHighlighter
    style={vscDarkPlus}
    language={language}
    PreTag="div"
    className={`!rounded-xl !my-6 !text-sm border ${
      theme === 'dark'
        ? '!bg-[#0D1117] border-gray-700'
        : '!bg-[#F0EAD6] border-[#D4C4A8] !text-gray-800'
    }`}
    customStyle={{
      padding: '1.5rem',
      fontSize: '0.875rem',
      lineHeight: '1.5',
    }}
  >
    {String(children).replace(/\n$/, '')}
  </SyntaxHighlighter>
));

const HomeView = ({
  onNewBook,
  onShowList,
  hasApiKey,
  bookCount,
}: {
  onNewBook: () => void;
  onShowList: () => void;
  hasApiKey: boolean;
  bookCount: number;
}) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
    <div className="absolute inset-0 bg-black [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
    <div className="relative z-10 max-w-2xl mx-auto animate-fade-in-up">
      <div className="relative w-28 h-28 mx-auto mb-6">
        <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-30 animate-subtle-glow"></div>
        <img src="/white-logo.png" alt="Pustakam Logo" className="w-28 h-28 relative" />
      </div>
      <h1 className="text-5xl font-bold mb-4 text-white">Turn Ideas into Books</h1>
      <p className="text-xl text-[var(--color-text-secondary)] mb-10">
        Pustakam is an AI-powered engine that transforms your concepts into fully-structured
        digital books.
      </p>
      {hasApiKey ? (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onNewBook}
            className="btn btn-primary btn-lg shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 w-full sm:w-auto"
          >
            <Sparkles className="w-5 h-5" />
            Create New Book
          </button>
          {bookCount > 0 && (
            <button onClick={onShowList} className="btn btn-secondary w-full sm:w-auto">
              <List className="w-4 h-4" />
              View My Books
            </button>
          )}
        </div>
      ) : (
        <div className="content-card p-6 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">API Key Required</h3>
          <p className="text-sm text-gray-400">
            Please configure your API key in Settings to begin.
          </p>
        </div>
      )}
    </div>
  </div>
);

const BookListGrid = ({
  books,
  onSelectBook,
  onDeleteBook,
  setView,
  setShowListInMain,
}: {
  books: BookProject[];
  onSelectBook: (id: string) => void;
  onDeleteBook: (id: string) => void;
  setView: (view: AppView) => void;
  setShowListInMain: (show: boolean) => void;
}) => {
  const getStatusIcon = (status: BookProject['status']) => {
    const iconMap: Record<BookProject['status'], React.ElementType> = {
      planning: Clock,
      generating_roadmap: Loader2,
      roadmap_completed: ListChecks,
      generating_content: Loader2,
      assembling: Box,
      completed: CheckCircle,
      error: AlertCircle,
    };
    const Icon = iconMap[status] || Loader2;
    const colorClass =
      status === 'completed'
        ? 'text-green-500'
        : status === 'error'
        ? 'text-red-500'
        : 'text-blue-500';
    const animateClass = ['generating_roadmap', 'generating_content', 'assembling'].includes(
      status
    )
      ? 'animate-spin'
      : '';
    return <Icon className={`w-5 h-5 ${colorClass} ${animateClass}`} />;
  };

  const getStatusText = (status: BookProject['status']) =>
    ({
      planning: 'Planning',
      generating_roadmap: 'Creating Roadmap',
      roadmap_completed: 'Ready to Write',
      generating_content: 'Writing Chapters',
      assembling: 'Finalizing Book',
      completed: 'Completed',
      error: 'Error',
    }[status] || 'Unknown');

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Books</h1>
            <p className="text-gray-400">{books.length} projects</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setView('create');
                setShowListInMain(false);
              }}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" /> New Book
            </button>
            <button onClick={() => setShowListInMain(false)} className="btn btn-secondary">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Book List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4 sm:gap-6">
          {books.map((book) => (
            <div
              key={book.id}
              className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4 sm:p-6 transition-all hover:border-gray-600 hover:shadow-lg cursor-pointer group"
              onClick={() => onSelectBook(book.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(book.status)}
                    <h3 className="text-lg font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                      {book.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{book.goal}</p>
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(book.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className="capitalize">{getStatusText(book.status)}</span>
                    {book.status !== 'completed' && book.status !== 'error' && (
                      <span>{Math.round(book.progress)}%</span>
                    )}
                    {book.modules.length > 0 && <span>{book.modules.length} modules</span>}
                  </div>
                  {book.status !== 'completed' && book.status !== 'error' && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-800/50 rounded-full h-2.5 overflow-hidden border border-gray-700">
                        <div
                          className="bg-gradient-to-r from-green-500 via-green-400 to-emerald-400 h-full rounded-full transition-all duration-500 ease-out relative"
                          style={{ width: `${Math.min(100, Math.max(0, book.progress))}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-4">
                  {book.status === 'completed' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        bookService.downloadAsMarkdown(book);
                      }}
                      className="btn-ghost p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBook(book.id);
                    }}
                    className="btn-ghost p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DetailTabButton = ({
  label,
  Icon,
  isActive,
  onClick,
}: {
  label: ReactNode;
  Icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-[var(--color-card)] text-[var(--color-text-primary)] shadow-sm'
        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] hover:text-white'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const ReadingMode: React.FC<ReadingModeProps> = ({
  content,
  isEditing,
  editedContent,
  onEdit,
  onSave,
  onCancel,
  onContentChange,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const settingsTimeoutRef = useRef<NodeJS.Timeout>();

  const [settings, setSettings] = useState<ReadingSettings>(() => {
    const saved = localStorage.getItem('pustakam-reading-settings');
    const parsed = saved ? JSON.parse(saved) : {};
    if (parsed.theme === 'light') parsed.theme = 'dark';
    return {
      fontSize: 18,
      lineHeight: 1.7,
      fontFamily: 'serif',
      theme: 'dark',
      maxWidth: 'medium',
      textAlign: 'left',
      ...parsed,
    };
  });

  useEffect(() => {
    localStorage.setItem('pustakam-reading-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
      setShowScrollTop(scrollTop > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isFullscreen]);

  useEffect(() => {
    if (showSettings) {
      if (settingsTimeoutRef.current) clearTimeout(settingsTimeoutRef.current);
      settingsTimeoutRef.current = setTimeout(() => setShowSettings(false), 5000);
    }
    return () => {
      if (settingsTimeoutRef.current) clearTimeout(settingsTimeoutRef.current);
    };
  }, [showSettings]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'auto';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      } else if (e.key === 'F11') {
        e.preventDefault();
      } else if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setSettings((prev) => ({ ...prev, fontSize: Math.min(28, prev.fontSize + 1) }));
        } else if (e.key === '-') {
          e.preventDefault();
          setSettings((prev) => ({ ...prev, fontSize: Math.max(12, prev.fontSize - 1) }));
        } else if (e.key === '0') {
          e.preventDefault();
          setSettings((prev) => ({ ...prev, fontSize: 18 }));
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const currentTheme = THEMES[settings.theme];
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const updateSetting = <K extends keyof ReadingSettings>(
    key: K,
    value: ReadingSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (settingsTimeoutRef.current) clearTimeout(settingsTimeoutRef.current);
    settingsTimeoutRef.current = setTimeout(() => setShowSettings(false), 5000);
  };

  if (isEditing) {
    return (
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-[var(--color-bg)] z-30 pt-4 pb-2 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Editing Mode
          </h3>
          <div className="flex gap-3">
            <button onClick={onCancel} className="btn btn-secondary">
              <X size={16} /> Cancel
            </button>
            <button onClick={onSave} className="btn btn-primary">
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>
        <textarea
          className="w-full h-[70vh] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4 text-white font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          value={editedContent}
          onChange={(e) => onContentChange(e.target.value)}
          style={{ fontSize: `${settings.fontSize - 2}px` }}
        />
      </div>
    );
  }

  const fullscreenStyles = isFullscreen
    ? {
        backgroundColor: currentTheme.bg,
        color: currentTheme.text,
        minHeight: '100vh',
      }
    : {};

  const contentStyles = {
    fontFamily: FONT_FAMILIES[settings.fontFamily],
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    maxWidth: MAX_WIDTHS[settings.maxWidth],
    textAlign: settings.textAlign as any,
    backgroundColor: isFullscreen ? currentTheme.contentBg : undefined,
    color: isFullscreen ? currentTheme.text : undefined,
    padding: isFullscreen ? '3rem 2rem' : undefined,
    margin: isFullscreen ? '0 auto' : undefined,
    borderRadius: isFullscreen ? '0' : undefined,
    boxShadow:
      isFullscreen && settings.theme !== 'light'
        ? '0 0 80px rgba(0,0,0,0.5)'
        : isFullscreen
        ? '0 0 40px rgba(0,0,0,0.1)'
        : undefined,
  };

  return (
    <div
      className={`reading-container theme-${settings.theme} ${
        isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto' : ''
      }`}
      style={fullscreenStyles}
    >
      {isFullscreen && (
        <div
          className="fixed top-0 left-0 h-1 z-50 transition-all duration-200"
          style={{
            width: `${scrollProgress}%`,
            backgroundColor: currentTheme.accent,
          }}
        />
      )}

      {isFullscreen ? (
        <>
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 rounded-xl transition-all duration-200"
              style={{
                backgroundColor: showSettings ? currentTheme.accent : 'rgba(0,0,0,0.7)',
                color: showSettings ? 'white' : currentTheme.text,
                backdropFilter: 'blur(10px)',
              }}
              title="Reading settings"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={onEdit}
              className="p-3 rounded-xl transition-all duration-200"
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: currentTheme.text,
                backdropFilter: 'blur(10px)',
              }}
              title="Edit content"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-3 rounded-xl transition-all duration-200"
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: currentTheme.text,
                backdropFilter: 'blur(10px)',
              }}
              title="Exit fullscreen (Esc)"
            >
              <Minimize2 size={18} />
            </button>
          </div>

          {showSettings && (
            <div
              className="fixed top-16 right-4 z-50 p-6 rounded-2xl shadow-2xl min-w-[280px] animate-fade-in-up"
              style={{
                backgroundColor: currentTheme.contentBg,
                border: `1px solid ${currentTheme.border}`,
                color: currentTheme.text,
                backdropFilter: 'blur(20px)',
              }}
            >
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <BookOpen size={16} />
                Reading Settings
              </h4>

              {/* Font Size */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Font Size</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateSetting('fontSize', Math.max(12, settings.fontSize - 1))}
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: currentTheme.bg }}
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="min-w-[3rem] text-center font-mono">{settings.fontSize}px</span>
                  <button
                    onClick={() => updateSetting('fontSize', Math.min(28, settings.fontSize + 1))}
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: currentTheme.bg }}
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>
              </div>

              {/* Line Spacing */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Line Spacing</label>
                <input
                  type="range"
                  min="1.2"
                  max="2.2"
                  step="0.1"
                  value={settings.lineHeight}
                  onChange={(e) => updateSetting('lineHeight', parseFloat(e.target.value))}
                  className="w-full"
                  style={{ accentColor: currentTheme.accent }}
                />
                <div className="text-xs opacity-70 mt-1">{settings.lineHeight.toFixed(1)}</div>
              </div>

              {/* Font Style */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Font Style</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['serif', 'sans', 'mono'] as const).map((font) => (
                    <button
                      key={font}
                      onClick={() => updateSetting('fontFamily', font)}
                      className={`p-2 text-xs rounded-lg transition-all ${
                        settings.fontFamily === font ? 'font-semibold' : ''
                      }`}
                      style={{
                        backgroundColor:
                          settings.fontFamily === font ? currentTheme.accent : currentTheme.bg,
                        color: settings.fontFamily === font ? 'white' : currentTheme.text,
                        fontFamily: FONT_FAMILIES[font],
                      }}
                    >
                      {font === 'serif' ? 'Serif' : font === 'sans' ? 'Sans' : 'Mono'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Theme</label>
                <div className="flex gap-1">
                  {(['dark', 'sepia'] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => updateSetting('theme', theme)}
                      className={`flex-1 p-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1 ${
                        settings.theme === theme ? 'font-semibold' : ''
                      }`}
                      style={{
                        backgroundColor:
                          settings.theme === theme ? currentTheme.accent : currentTheme.bg,
                        color: settings.theme === theme ? 'white' : currentTheme.text,
                      }}
                    >
                      {theme === 'dark' ? <Moon size={12} /> : <Palette size={12} />}
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column Width */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Column Width</label>
                <div className="flex gap-1">
                  {(['narrow', 'medium', 'wide'] as const).map((width) => (
                    <button
                      key={width}
                      onClick={() => updateSetting('maxWidth', width)}
                      className={`flex-1 p-2 text-xs rounded-lg transition-all ${
                        settings.maxWidth === width ? 'font-semibold' : ''
                      }`}
                      style={{
                        backgroundColor:
                          settings.maxWidth === width ? currentTheme.accent : currentTheme.bg,
                        color: settings.maxWidth === width ? 'white' : currentTheme.text,
                      }}
                    >
                      {width.charAt(0).toUpperCase() + width.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={() =>
                  setSettings({
                    fontSize: 18,
                    lineHeight: 1.7,
                    fontFamily: 'serif',
                    theme: 'dark',
                    maxWidth: 'medium',
                    textAlign: 'left',
                  })
                }
                className="w-full p-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1"
                style={{
                  backgroundColor: currentTheme.bg,
                  color: currentTheme.secondary,
                }}
              >
                <RotateCcw size={12} />
                Reset to Defaults
              </button>
            </div>
          )}

          {showScrollTop && (
            <button
              onClick={scrollToTop}
              className="fixed bottom-8 right-8 p-4 rounded-full shadow-lg transition-all duration-300 animate-fade-in"
              style={{
                backgroundColor: currentTheme.accent,
                color: 'white',
              }}
              title="Scroll to top"
            >
              <ChevronUp size={20} />
            </button>
          )}
        </>
      ) : (
        <div className="flex justify-end items-center gap-3 mb-6 sticky top-0 bg-[var(--color-bg)] z-10 py-2">
          <button onClick={onEdit} className="btn btn-secondary btn-sm">
            <Edit size={14} /> Edit
          </button>
          <button
            onClick={() => setIsFullscreen(true)}
            className="btn btn-secondary btn-sm"
            title="Enter fullscreen reading mode"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      )}

      <div ref={contentRef} style={isFullscreen ? { paddingTop: '2rem' } : {}}>
        <article
          className={`prose prose-invert prose-lg max-w-none transition-all duration-300 ${
            isFullscreen ? 'mx-auto' : ''
          }`}
          style={contentStyles}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: (props) => <CodeBlock {...props} theme={settings.theme} />,
            }}
            className="focus:outline-none"
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN BOOKVIEW COMPONENT
// ============================================================================

export function BookView({
  books,
  currentBookId,
  onCreateBookRoadmap,
  onGenerateAllModules,
  onRetryFailedModules,
  onAssembleBook,
  onSelectBook,
  onDeleteBook,
  hasApiKey,
  view,
  setView,
  onUpdateBookContent,
  showListInMain,
  setShowListInMain,
  isMobile = false,
  generationStatus,
  generationStats,
  onPauseGeneration,
  onResumeGeneration,
  isGenerating,
}: BookViewProps) {
  const [detailTab, setDetailTab] = useState<'overview' | 'analytics' | 'read'>('overview');
  const [localIsGenerating, setLocalIsGenerating] = useState(false);
  const [formData, setFormData] = useState<BookSession>({
    goal: '',
    language: 'en',
    targetAudience: '',
    complexityLevel: 'intermediate',
    preferences: {
      includeExamples: true,
      includePracticalExercises: false,
      includeQuizzes: false,
    },
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const currentBook = currentBookId ? books.find((b) => b.id === currentBookId) : null;
  const [pdfProgress, setPdfProgress] = useState(0);

  useEffect(() => {
    if (currentBook) {
      const isGen = ['generating_roadmap', 'generating_content', 'assembling'].includes(
        currentBook.status
      );
      setLocalIsGenerating(isGen);
      setIsEditing(false);
    }
  }, [currentBook]);

  useEffect(() => {
    return () => {
      if (currentBookId) bookService.cancelActiveRequests(currentBookId);
    };
  }, [currentBookId]);

  const handleCreateRoadmap = async () => {
    if (!formData.goal.trim() || !hasApiKey) return;
    setLocalIsGenerating(true);
    try {
      await onCreateBookRoadmap(formData);
    } catch (error) {
      console.error('Failed to create roadmap:', error);
    } finally {
      setLocalIsGenerating(false);
    }
  };

  const handleStartGeneration = async () => {
    if (!currentBook) return;
    setLocalIsGenerating(true);
    try {
      await onGenerateAllModules(currentBook, {
        goal: currentBook.goal,
        language: currentBook.language,
        targetAudience: formData.targetAudience || currentBook.goal,
        complexityLevel: formData.complexityLevel || 'intermediate',
        preferences: formData.preferences || {
          includeExamples: true,
          includePracticalExercises: false,
          includeQuizzes: false,
        },
      });
    } catch (error) {
      console.error('Failed to generate modules:', error);
    } finally {
      setLocalIsGenerating(false);
    }
  };

  const handlePause = () => {
    if (currentBook && onPauseGeneration) {
      onPauseGeneration(currentBook.id);
    }
  };

  const handleResume = () => {
    if (currentBook && onResumeGeneration) {
      onResumeGeneration(currentBook, {
        goal: currentBook.goal,
        language: currentBook.language,
        targetAudience: formData.targetAudience || currentBook.goal,
        complexityLevel: formData.complexityLevel || 'intermediate',
        preferences: formData.preferences || {
          includeExamples: true,
          includePracticalExercises: false,
          includeQuizzes: false,
        },
      });
    }
  };

  const handleStartAssembly = async () => {
    if (!currentBook) return;
    setLocalIsGenerating(true);
    try {
      await onAssembleBook(currentBook, {
        goal: currentBook.goal,
        language: currentBook.language,
        targetAudience: formData.targetAudience || currentBook.goal,
        complexityLevel: formData.complexityLevel || 'intermediate',
        preferences: formData.preferences || {
          includeExamples: true,
          includePracticalExercises: false,
          includeQuizzes: false,
        },
      });
    } catch (error) {
      console.error('Failed to assemble book:', error);
    } finally {
      setLocalIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!currentBook) return;
    setPdfProgress(1);
    await pdfService.generatePdf(currentBook, setPdfProgress);
    setTimeout(() => setPdfProgress(0), 2000);
  };

  const handleStartEditing = () => {
    if (currentBook?.finalBook) {
      setEditedContent(currentBook.finalBook);
      setIsEditing(true);
    }
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const handleSaveChanges = () => {
    if (currentBook && editedContent) {
      onUpdateBookContent(currentBook.id, editedContent);
      setIsEditing(false);
      setEditedContent('');
    }
  };

  const getStatusIcon = (status: BookProject['status']) => {
    const iconMap: Record<BookProject['status'], React.ElementType> = {
      planning: Clock,
      generating_roadmap: Loader2,
      roadmap_completed: ListChecks,
      generating_content: Loader2,
      assembling: Box,
      completed: CheckCircle,
      error: AlertCircle,
    };
    const Icon = iconMap[status] || Loader2;
    const colorClass =
      status === 'completed'
        ? 'text-green-500'
        : status === 'error'
        ? 'text-red-500'
        : 'text-blue-500';
    const animateClass = ['generating_roadmap', 'generating_content', 'assembling'].includes(
      status
    )
      ? 'animate-spin'
      : '';
    return <Icon className={`w-5 h-5 ${colorClass} ${animateClass}`} />;
  };

  const getStatusText = (status: BookProject['status']) =>
    ({
      planning: 'Planning',
      generating_roadmap: 'Creating Roadmap',
      roadmap_completed: 'Ready to Write',
      generating_content: 'Writing Chapters',
      assembling: 'Finalizing Book',
      completed: 'Completed',
      error: 'Error',
    }[status] || 'Unknown');

  // ============================================================================
  // VIEW RENDERING
  // ============================================================================

  if (view === 'list') {
    if (showListInMain)
      return (
        <BookListGrid
          books={books}
          onSelectBook={onSelectBook}
          onDeleteBook={onDeleteBook}
          setView={setView}
          setShowListInMain={setShowListInMain}
        />
      );
    return (
      <HomeView
        onNewBook={() => setView('create')}
        onShowList={() => setShowListInMain(true)}
        hasApiKey={hasApiKey}
        bookCount={books.length}
      />
    );
  }

  if (view === 'create') {
    return (
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setView('list');
                setShowListInMain(false);
              }}
              className="btn-ghost p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Create New Book</h1>
              <p className="text-gray-400">Define your learning goal and let AI do the rest.</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="content-card p-6">
              <div className="space-y-6">
                {/* Learning Goal */}
                <div>
                  <label className="flex items-center gap-2 text-lg font-semibold mb-2">
                    <Target size={18} className="text-blue-400" />
                    Learning Goal
                  </label>
                  <textarea
                    value={formData.goal}
                    onChange={(e) => setFormData((p) => ({ ...p, goal: e.target.value }))}
                    placeholder="e.g., Learn Python for Data Science..."
                    className="textarea-style focus:ring-blue-500/50"
                    rows={3}
                    required
                  />
                </div>

                {/* Target Audience & Complexity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 font-semibold mb-2">
                      <Users size={16} className="text-green-400" />
                      Target Audience
                    </label>
                    <input
                      type="text"
                      value={formData.targetAudience}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, targetAudience: e.target.value }))
                      }
                      placeholder="e.g., Beginners, Professionals..."
                      className="input-style focus:ring-green-500/50"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 font-semibold mb-2">
                      <Brain size={16} className="text-yellow-400" />
                      Complexity
                    </label>
                    <CustomSelect
                      value={formData.complexityLevel || 'intermediate'}
                      onChange={(val) =>
                        setFormData((p) => ({ ...p, complexityLevel: val as any }))
                      }
                      options={[
                        { value: 'beginner', label: 'Beginner' },
                        { value: 'intermediate', label: 'Intermediate' },
                        { value: 'advanced', label: 'Advanced' },
                      ]}
                    />
                  </div>
                </div>

                {/* Preferences */}
                <div>
                  <label className="font-semibold mb-3 block">Preferences</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.preferences?.includeExamples}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            preferences: { ...p.preferences!, includeExamples: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 accent-blue-500"
                      />
                      Include Examples
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.preferences?.includePracticalExercises}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            preferences: {
                              ...p.preferences!,
                              includePracticalExercises: e.target.checked,
                            },
                          }))
                        }
                        className="w-4 h-4 accent-blue-500"
                      />
                      Include Exercises
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    onClick={handleCreateRoadmap}
                    disabled={!formData.goal.trim() || !hasApiKey || localIsGenerating}
                    className="btn btn-primary btn-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {localIsGenerating ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles />
                        Create Roadmap
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'detail' && currentBook) {
    const areAllModulesDone =
      currentBook.roadmap &&
      currentBook.modules.length === currentBook.roadmap.modules.length &&
      currentBook.modules.every((m) => m.status === 'completed');
    const failedModules = currentBook.modules.filter((m) => m.status === 'error');
    const completedModules = currentBook.modules.filter((m) => m.status === 'completed');
    const isPaused = generationStatus?.status === 'paused';

    return (
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--color-border)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setView('list');
                  onSelectBook(null);
                  setShowListInMain(true);
                }}
                className="btn-ghost p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">{currentBook.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    {getStatusIcon(currentBook.status)}
                    {getStatusText(currentBook.status)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          {currentBook.status === 'completed' && (
            <div className="mt-4 flex items-center gap-2">
              <DetailTabButton
                label="Overview"
                Icon={ListChecks}
                isActive={detailTab === 'overview'}
                onClick={() => setDetailTab('overview')}
              />
              <DetailTabButton
                label="Analytics"
                Icon={BarChart3}
                isActive={detailTab === 'analytics'}
                onClick={() => setDetailTab('analytics')}
              />
              <DetailTabButton
                label="Read Book"
                Icon={BookText}
                isActive={detailTab === 'read'}
                onClick={() => setDetailTab('read')}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className={detailTab === 'read' ? '' : 'p-4 sm:p-6'}>
            <div className={detailTab === 'read' ? '' : 'max-w-4xl mx-auto'}>
              {detailTab === 'analytics' && currentBook.status === 'completed' ? (
                <BookAnalytics book={currentBook} />
              ) : detailTab === 'read' && currentBook.status === 'completed' ? (
                <div className="px-4 sm:px-6 py-6">
                  <ReadingMode
                    content={currentBook.finalBook || ''}
                    isEditing={isEditing}
                    editedContent={editedContent}
                    onEdit={handleStartEditing}
                    onSave={handleSaveChanges}
                    onCancel={handleCancelEditing}
                    onContentChange={setEditedContent}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Generation Progress Panel */}
                  {(isGenerating || isPaused) &&
                    generationStatus &&
                    generationStats && (
                      <EmbeddedProgressPanel
                        generationStatus={generationStatus}
                        stats={generationStats}
                        onCancel={() => {
                          if (
                            window.confirm('Cancel generation? Progress will be saved.')
                          ) {
                            bookService.cancelActiveRequests(currentBook.id);
                          }
                        }}
                        onPause={handlePause}
                        onResume={handleResume}
                      />
                    )}

                  {/* Ready to Generate */}
                  {currentBook.status === 'roadmap_completed' &&
                    !areAllModulesDone &&
                    !isGenerating && !isPaused && (
                      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 flex items-center justify-center bg-blue-500/10 rounded-lg">
                            <Play className="w-6 h-6 text-blue-500" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              Ready to Generate Content
                            </h3>
                            <p className="text-sm text-gray-400">
                              {completedModules.length > 0
                                ? `Resume from ${completedModules.length} completed modules`
                                : 'Start generating all modules'}
                            </p>
                          </div>
                        </div>
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 mb-4">
                          <div className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                            <div className="text-sm text-gray-300">
                              <p className="font-medium text-white mb-2">Smart Recovery Enabled</p>
                              <ul className="space-y-1 text-xs text-gray-400">
                                <li>✓ Progress is saved automatically</li>
                                <li>✓ Failed modules will be retried 5 times</li>
                                <li>✓ You can safely close and resume later</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleStartGeneration}
                          disabled={localIsGenerating}
                          className="btn btn-primary w-full"
                        >
                          {localIsGenerating ? (
                            <>
                              <Loader2 className="animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              {completedModules.length > 0
                                ? 'Resume Generation'
                                : 'Generate All Modules'}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    
                  {/* Paused State */}
                  {isPaused && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 text-center">
                        <h3 className="text-lg font-semibold text-yellow-300 mb-2">Generation Paused</h3>
                        <p className="text-sm text-yellow-400 mb-4">Your progress is saved. You can resume generation whenever you're ready.</p>
                        <button onClick={handleResume} className="btn btn-primary">
                            <Play className="w-4 h-4" /> Resume Generation
                        </button>
                    </div>
                  )}

                  {/* All Modules Done */}
                  {areAllModulesDone && currentBook.status !== 'completed' && !localIsGenerating && (
                    <div className="bg-[var(--color-card)] border border-green-500/30 rounded-lg p-6 space-y-6 animate-fade-in-up">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 flex items-center justify-center bg-green-500/10 rounded-lg">
                            <CheckCircle className="w-7 h-7 text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">Generation Complete!</h3>
                            <p className="text-sm text-gray-400">
                              All chapters written. Ready to assemble.
                            </p>
                          </div>
                        </div>
                      </div>
                      <button onClick={handleStartAssembly} className="btn btn-primary w-full btn-lg">
                        <Box className="w-5 h-5" />
                        Assemble Final Book
                      </button>
                    </div>
                  )}

                  {/* Book Completed */}
                  {currentBook.status === 'completed' && (
                    <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/30 rounded-xl p-8 text-center animate-fade-in-up">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/50">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Book Generation Complete!</h2>
                      <p className="text-zinc-400 mb-6">
                        Your book "{currentBook.title}" is ready.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          onClick={() => setDetailTab('read')}
                          className="btn btn-secondary"
                        >
                          <Eye className="w-4 h-4" />
                          Read Book
                        </button>
                        <button
                          onClick={() => bookService.downloadAsMarkdown(currentBook)}
                          className="btn btn-secondary"
                        >
                          <Download className="w-4 h-4" />
                          Download .MD
                        </button>
                        <button
                          onClick={handleDownloadPdf}
                          disabled={pdfProgress > 0}
                          className="btn bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-wait"
                        >
                          {pdfProgress > 0 ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {`Generating PDF (${pdfProgress}%)`}
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              Download PDF
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Assembling Status */}
                  {currentBook.status === 'assembling' && (
                    <div className="bg-zinc-900/60 backdrop-blur-xl border-2 rounded-lg p-8 space-y-6 animate-assembling-glow">
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className="relative w-16 h-16">
                          <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                          <div className="relative w-16 h-16 flex items-center justify-center bg-green-500/10 rounded-full">
                            <Box className="w-8 h-8 text-green-400" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white">Assembling Your Book</h3>
                          <p className="text-gray-400 mt-2 max-w-md mx-auto">
                            Finalizing chapters and preparing for download...
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-black/30 rounded-full h-2.5 overflow-hidden border border-white/10">
                        <div className="h-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 rounded-full animate-slide-in-out"></div>
                      </div>
                    </div>
                  )}

                  {/* Learning Roadmap */}
                  {currentBook.roadmap &&
                    (currentBook.status !== 'completed' && !isGenerating && !isPaused) && (
                      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-6">
                          <ListChecks className="w-5 h-5 text-purple-400" />
                          <h3 className="text-xl font-bold">Learning Roadmap</h3>
                        </div>
                        <div className="space-y-4">
                          {currentBook.roadmap.modules.map((module, index) => {
                            const completedModule = currentBook.modules.find(
                              (m) => m.roadmapModuleId === module.id
                            );
                            const isActive =
                              generationStatus?.currentModule?.id === module.id;

                            return (
                              <div
                                key={module.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                  isActive
                                    ? 'bg-blue-500/10 border-blue-500/40'
                                    : completedModule?.status === 'completed'
                                    ? 'bg-emerald-500/10 border-emerald-500/30'
                                    : completedModule?.status === 'error'
                                    ? 'border-red-500/30 bg-red-500/5'
                                    : 'bg-zinc-800/30 border-zinc-800/50'
                                }`}
                              >
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                                    completedModule?.status === 'completed'
                                      ? 'bg-emerald-500 text-white'
                                      : completedModule?.status === 'error'
                                      ? 'bg-red-500 text-white'
                                      : isActive
                                      ? 'bg-blue-500 text-white animate-pulse'
                                      : 'bg-zinc-700 text-zinc-500'
                                  }`}
                                >
                                  {completedModule?.status === 'completed' ? (
                                    <Check size={12} />
                                  ) : completedModule?.status === 'error' ? (
                                    <X size={12} />
                                  ) : isActive ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    index + 1
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <h4 className="font-medium text-sm truncate text-white">
                                    {module.title}
                                  </h4>
                                  <p className="text-xs text-zinc-500">{module.estimatedTime}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
