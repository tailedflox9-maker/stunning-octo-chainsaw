// src/services/pdfService.ts - ENHANCED PROFESSIONAL VERSION (Corrected)
import { BookProject } from '../types';

let isGenerating = false;
let pdfMake: any = null;
let fontsLoaded = false;

async function loadPdfMake() {
  if (pdfMake && fontsLoaded) {
    console.log('📦 Using cached pdfMake');
    return pdfMake;
  }

  try {
    console.log('🔄 Loading pdfMake modules...');

    const [pdfMakeModule, pdfFontsModule] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts')
    ]);

    pdfMake = pdfMakeModule.default || pdfMakeModule;
    const fonts = pdfFontsModule.default || pdfFontsModule;

    // VFS Detection
    let vfs = null;

    if (fonts?.pdfMake?.vfs) {
      vfs = fonts.pdfMake.vfs;
    } else if (fonts?.vfs) {
      vfs = fonts.vfs;
    } else if (typeof fonts === 'object' && fonts !== null) {
      const possibleVfs: any = {};
      for (const key in fonts) {
        if (key.includes('.ttf') || key.includes('Roboto')) {
          possibleVfs[key] = fonts[key];
        }
      }
      if (Object.keys(possibleVfs).length > 0) {
        vfs = possibleVfs;
      }
    }

    if (!vfs && pdfFontsModule?.pdfMake?.vfs) {
      vfs = pdfFontsModule.pdfMake.vfs;
    }

    if (!vfs && pdfFontsModule?.default?.pdfMake?.vfs) {
      vfs = pdfFontsModule.default.pdfMake.vfs;
    }

    if (!vfs && typeof fonts === 'object') {
      const findVfs = (obj: any, depth = 0): any => {
        if (depth > 3) return null;
        if (obj?.vfs && typeof obj.vfs === 'object') return obj.vfs;
        if (typeof obj !== 'object' || obj === null) return null;
        for (const key in obj) {
          const result = findVfs(obj[key], depth + 1);
          if (result) return result;
        }
        return null;
      };
      vfs = findVfs(fonts);
    }

    if (!vfs) {
      throw new Error('FONT_VFS_NOT_FOUND');
    }

    pdfMake.vfs = vfs;

    const vfsKeys = Object.keys(vfs);
    if (vfsKeys.length === 0) {
      throw new Error('VFS_EMPTY');
    }

    console.log('✓ VFS loaded with', vfsKeys.length, 'files');

    pdfMake.fonts = {
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      }
    };

    fontsLoaded = true;
    return pdfMake;

  } catch (error) {
    console.error('❌ pdfMake loading failed:', error);
    fontsLoaded = false;
    pdfMake = null;
    throw error;
  }
}

interface PDFContent {
  text?: string | any[];
  style?: string | string[];
  margin?: number[];
  alignment?: string;
  pageBreak?: string;
  ul?: any[];
  ol?: any[];
  table?: any;
  canvas?: any;
  columns?: any[];
  fillColor?: string;
  border?: boolean[];
  layout?: any;
  stack?: any[];
  absolutePosition?: any;
  fontSize?: number;
  bold?: boolean;
  color?: string;
  lineHeight?: number;
  italics?: boolean;
  characterSpacing?: number;
  link?: string;
  decoration?: string;
  decorationColor?: string;
  width?: string | number;
  preserveLeadingSpaces?: boolean;
  background?: string;
  id?: string;
  tocItem?: any;
}

interface TocEntry {
  text: string;
  level: number;
  pageNumber?: number;
  id: string;
}

class EnhancedPdfGenerator {
  private content: PDFContent[] = [];
  private tocEntries: TocEntry[] = [];
  private styles: any;

  constructor() {
    this.styles = {
      // Cover page styles - Premium elegance
      coverTitle: {
        fontSize: 32,
        bold: true,
        alignment: 'left',
        margin: [0, 0, 0, 10],
        color: '#0f172a',
        lineHeight: 1.15,
        characterSpacing: 0.5
      },
      coverSubtitle: {
        fontSize: 14,
        alignment: 'left',
        color: '#64748b',
        margin: [0, 0, 0, 6],
        lineHeight: 1.4
      },

      // Table of Contents
      tocTitle: {
        fontSize: 22,
        bold: true,
        margin: [0, 0, 0, 20],
        color: '#0f172a',
        lineHeight: 1.3
      },
      tocLevel1: {
        fontSize: 11,
        bold: true,
        margin: [0, 8, 0, 4],
        color: '#1e293b',
        lineHeight: 1.4
      },
      tocLevel2: {
        fontSize: 10,
        margin: [15, 3, 0, 3],
        color: '#334155',
        lineHeight: 1.4
      },
      tocLevel3: {
        fontSize: 9.5,
        margin: [30, 2, 0, 2],
        color: '#475569',
        lineHeight: 1.4
      },
      
      // Content styles - Professional hierarchy
      h1Module: { 
        fontSize: 28, 
        bold: true, 
        margin: [0, 0, 0, 20], 
        color: '#0f172a',
        lineHeight: 1.3,
        characterSpacing: 0.3
      },
      h2: { 
        fontSize: 18, 
        bold: true, 
        margin: [0, 24, 0, 12], 
        color: '#1e293b',
        lineHeight: 1.35
      },
      h3: { 
        fontSize: 15, 
        bold: true, 
        margin: [0, 20, 0, 10], 
        color: '#334155',
        lineHeight: 1.35
      },
      h4: { 
        fontSize: 13, 
        bold: true, 
        margin: [0, 16, 0, 8], 
        color: '#475569',
        lineHeight: 1.35
      },
      
      // Text styles - Optimized for readability
      paragraph: { 
        fontSize: 10.5, 
        lineHeight: 1.7, 
        alignment: 'justify', 
        margin: [0, 0, 0, 11], 
        color: '#1e293b'
      },
      listItem: { 
        fontSize: 10.5, 
        lineHeight: 1.65, 
        margin: [0, 3, 0, 3], 
        color: '#1e293b'
      },
      
      // Special elements
      codeBlock: { 
        fontSize: 9, 
        margin: [15, 12, 15, 12], 
        color: '#1e293b',
        fillColor: '#f8fafc',
        preserveLeadingSpaces: true,
        lineHeight: 1.5
      },
      blockquote: { 
        fontSize: 10.5, 
        italics: true, 
        margin: [25, 12, 20, 12], 
        color: '#475569',
        lineHeight: 1.75
      },
      
      // Table styles
      tableHeader: {
        fontSize: 10,
        bold: true,
        color: '#0f172a',
        fillColor: '#f1f5f9'
      },
      tableCell: {
        fontSize: 10,
        color: '#334155',
        lineHeight: 1.6
      },
      
      // Link style
      link: {
        color: '#3b82f6',
        decoration: 'underline'
      }
    };
  }

  private parseInlineFormatting(text: string): any[] {
    const result: any[] = [];
    let currentPos = 0;

    // Combined regex for bold, italic, code, and links
    const inlineRegex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
    let match;

    while ((match = inlineRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > currentPos) {
        result.push({ text: text.substring(currentPos, match.index) });
      }
      
      // Handle different formats
      if (match[2]) { // ***bold italic***
        result.push({ text: match[2], bold: true, italics: true });
      } else if (match[3]) { // **bold**
        result.push({ text: match[3], bold: true });
      } else if (match[4] || match[6]) { // *italic* or _italic_
        result.push({ text: match[4] || match[6], italics: true });
      } else if (match[5]) { // __bold__
        result.push({ text: match[5], bold: true });
      } else if (match[7]) { // `code`
        result.push({ text: match[7], fontSize: 9.5, background: '#f1f5f9', color: '#dc2626' });
      } else if (match[8] && match[9]) { // [text](url)
        result.push({ text: match[8], link: match[9], color: '#3b82f6', decoration: 'underline' });
      }
      
      currentPos = match.index + match[0].length;
    }

    // Add remaining text
    if (currentPos < text.length) {
      result.push({ text: text.substring(currentPos) });
    }

    return result.length > 0 ? result : [{ text }];
  }

  private cleanText(text: string, preserveFormatting: boolean = false): string | any[] {
    // Remove emojis
    text = text
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .trim();

    if (preserveFormatting) {
      return this.parseInlineFormatting(text);
    }

    // Strip all markdown for plain text
    return text
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/!\[.*?\]\(.+?\)/g, '');
  }

  private parseMarkdownToContent(markdown: string): PDFContent[] {
    const content: PDFContent[] = [];
    const lines = markdown.split('\n');
    let paragraphBuffer: string[] = [];
    let isFirstModule = true;
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeaders: string[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLanguage = '';
    let skipToC = false;
    let tocDepth = 0;
    let listStack: { type: 'ul' | 'ol', indent: number }[] = [];
    let currentListItems: any[] = [];

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        const text = paragraphBuffer.join(' ').trim();
        if (text && !skipToC) {
          content.push({ 
            text: this.cleanText(text, true), 
            style: 'paragraph' 
          });
        }
        paragraphBuffer = [];
      }
    };

    const flushList = () => {
      if (currentListItems.length > 0 && !skipToC) {
        content.push({
          stack: currentListItems,
          margin: [0, 4, 0, 10]
        });
        currentListItems = [];
        listStack = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBuffer.length > 0 && !skipToC) {
        content.push({
          stack: [
            ...(codeLanguage ? [{
              text: codeLanguage,
              fontSize: 8,
              color: '#64748b',
              margin: [15, 0, 0, 4]
            }] : []),
            {
              text: codeBuffer.join('\n'),
              style: 'codeBlock',
              background: '#f8fafc'
            }
          ],
          margin: [0, 8, 0, 12]
        });
        codeBuffer = [];
        codeLanguage = '';
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0 && tableHeaders.length > 0 && !skipToC) {
        const colCount = tableHeaders.length;
        const colWidths = Array(colCount).fill('*');
        
        content.push({
          table: {
            headerRows: 1,
            widths: colWidths,
            body: [
              tableHeaders.map(h => ({ 
                text: this.cleanText(h, true), 
                style: 'tableHeader',
                fillColor: '#f1f5f9',
                margin: [6, 6, 6, 6],
                alignment: 'left'
              })),
              ...tableRows.map(row => 
                row.map(cell => ({ 
                  text: this.cleanText(cell, true), 
                  style: 'tableCell',
                  margin: [6, 5, 6, 5],
                  alignment: 'left'
                }))
              )
            ]
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1.5 : 0.5,
            vLineWidth: () => 0.5,
            hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? '#cbd5e0' : '#e2e8f0',
            vLineColor: () => '#e2e8f0',
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 5,
            paddingBottom: () => 5
          },
          margin: [0, 10, 0, 14]
        });
        tableRows = [];
        tableHeaders = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Detect ToC section
      if (trimmed.match(/^#{1,2}\s+(table of contents|contents)/i)) {
        skipToC = true;
        tocDepth = (trimmed.match(/^#+/) || [''])[0].length;
        continue;
      }

      if (skipToC && trimmed.match(/^#{1,2}\s+/)) {
        const currentDepth = (trimmed.match(/^#+/) || [''])[0].length;
        if (currentDepth <= tocDepth) {
          skipToC = false;
        }
      }

      // Code block
      if (trimmed.startsWith('```')) {
        flushParagraph();
        flushList();
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeLanguage = trimmed.substring(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      if (!trimmed || skipToC) {
        flushParagraph();
        flushList();
        flushTable();
        continue;
      }

      // Table detection
      if (trimmed.includes('|') && !inTable) {
        flushParagraph();
        flushList();
        const cells = trimmed.split('|').filter(c => c.trim()).map(c => c.trim());
        
        const nextLine = lines[i + 1]?.trim() || '';
        if (nextLine.match(/^\|?[\s\-:]+\|/)) {
          tableHeaders = cells;
          inTable = true;
          i++;
          continue;
        }
      }

      if (inTable && trimmed.includes('|')) {
        const cells = trimmed.split('|').filter(c => c.trim()).map(c => c.trim());
        if (cells.length === tableHeaders.length) {
          tableRows.push(cells);
          continue;
        } else {
          flushTable();
        }
      }

      if (inTable && !trimmed.includes('|')) {
        flushTable();
      }

      // Headings
      const isModuleHeading = trimmed.startsWith('# ') && 
                              /^#\s+module\s+\d+/i.test(trimmed);

      if (trimmed.startsWith('# ')) {
        flushParagraph();
        flushList();
        const text = this.cleanText(trimmed.substring(2)) as string;
        const id = `heading-${this.tocEntries.length}`;
        
        this.tocEntries.push({ text, level: 1, id });
        
        if (isModuleHeading) {
          if (!isFirstModule) {
            content.push({ text: '', pageBreak: 'before' });
          }
          isFirstModule = false;
          content.push({ text, style: 'h1Module', id });
        } else {
          content.push({ text, style: 'h1Module', id });
        }
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        flushList();
        const text = this.cleanText(trimmed.substring(3)) as string;
        const id = `heading-${this.tocEntries.length}`;
        this.tocEntries.push({ text, level: 2, id });
        content.push({ text, style: 'h2', id });
      } else if (trimmed.startsWith('### ')) {
        flushParagraph();
        flushList();
        const text = this.cleanText(trimmed.substring(4)) as string;
        const id = `heading-${this.tocEntries.length}`;
        this.tocEntries.push({ text, level: 3, id });
        content.push({ text, style: 'h3', id });
      } else if (trimmed.startsWith('#### ')) {
        flushParagraph();
        flushList();
        content.push({ text: this.cleanText(trimmed.substring(5), true), style: 'h4' });
      } 
      // Lists
      else if (trimmed.match(/^[-*+]\s+/) || trimmed.match(/^\d+\.\s+/)) {
        flushParagraph();
        
        const isOrdered = /^\d+\.\s+/.test(trimmed);
        const indent = line.search(/\S/);
        const text = trimmed.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '');
        
        const listItem = {
          text: this.cleanText(text, true),
          style: 'listItem',
          margin: [indent * 2 + 10, 3, 0, 3]
        };
        
        currentListItems.push(listItem);
      } 
      // Blockquote
      else if (trimmed.startsWith('>')) {
        flushParagraph();
        flushList();
        content.push({
          columns: [
            {
              width: 4,
              canvas: [{
                type: 'rect',
                x: 0, y: 0,
                w: 4, h: '100%',
                color: '#3b82f6'
              }]
            },
            {
              width: '*',
              text: this.cleanText(trimmed.substring(1).trim(), true),
              style: 'blockquote',
              margin:
            }
          ],
          margin:
        });
      } 
      // Regular paragraph
      else {
        const cleaned = trimmed;
        if (cleaned) {
          flushList();
          paragraphBuffer.push(cleaned);
        }
      }
    }

    flushParagraph();
    flushList();
    flushCodeBlock();
    flushTable();
    return content;
  }

  private createTableOfContents(): PDFContent[] {
    if (this.tocEntries.length === 0) return [];

    const tocContent: PDFContent[] = [
      { text: 'Table of Contents', style: 'tocTitle' },
      { text: '', margin: }
    ];

    this.tocEntries.forEach(entry => {
      const style = entry.level === 1 ? 'tocLevel1' : 
                    entry.level === 2 ? 'tocLevel2' : 'tocLevel3';
      
      tocContent.push({
        text: entry.text,
        style: style,
        link: entry.id,
        color: entry.level === 1 ? '#1e293b' : '#475569'
      });
    });

    tocContent.push({ text: '', pageBreak: 'after' });
    return tocContent;
  }

  private createCoverPage(title: string, metadata: {
    words: number;
    modules: number;
    date: string;
    provider?: string;
    model?: string;
  }): PDFContent[] {
    return [
      // Decorative top bar
      {
        canvas: [{
          type: 'rect',
          x: 0, y: 0,
          w: 515, h: 4,
          color: '#3b82f6'
        }],
        margin:
      },

      // Main title
      { 
        text: title, 
        style: 'coverTitle',
        margin:
      },
      
      // Subtitle
      {
        text: 'AI-Generated Knowledge Document',
        fontSize: 12,
        color: '#64748b',
        margin:
      },
      
      // Abstract section
      {
        text: 'Abstract',
        fontSize: 12,
        bold: true,
        color: '#0f172a',
        margin:
      },
      {
        text: `This comprehensive ${metadata.modules}-chapter document comprises ${metadata.words.toLocaleString()} words of structured AI-generated content. Each chapter provides detailed analysis and practical insights, designed for educational and professional use.`,
        fontSize: 11,
        lineHeight: 1.7,
        alignment: 'justify',
        color: '#334155',
        margin:
      },
      
      // Document metadata box
      {
        stack: [
          {
            text: 'Document Information',
            fontSize: 12,
            bold: true,
            color: '#0f172a',
            margin:
          },
          {
            columns: [
              { text: 'Total Words:', width: 100, fontSize: 10, color: '#64748b', bold: true },
              { text: metadata.words.toLocaleString(), fontSize: 10, color: '#1e293b' }
            ],
            margin:
          },
          {
            columns: [
              { text: 'Chapters:', width: 100, fontSize: 10, color: '#64748b', bold: true },
              { text: metadata.modules.toString(), fontSize: 10, color: '#1e293b' }
            ],
            margin:
          },
          {
            columns: [
              { text: 'Generated:', width: 100, fontSize: 10, color: '#64748b', bold: true },
              { text: metadata.date, fontSize: 10, color: '#1e293b' }
            ],
            margin:
          },
          ...(metadata.provider && metadata.model ? [{
            columns: [
              { text: 'AI Model:', width: 100, fontSize: 10, color: '#64748b', bold: true },
              { text: `${metadata.provider} (${metadata.model})`, fontSize: 10, color: '#1e293b' }
            ],
            margin:
          }] : [])
        ],
        margin:
      },
      
      // Footer section
      {
        canvas: [{
          type: 'line',
          x1: 0, y1: 0,
          x2: 120, y2: 0,
          lineWidth: 2,
          lineColor: '#3b82f6'
        }],
        margin:
      },
      {
        text: 'Pustakam Engine',
        fontSize: 11,
        bold: true,
        color: '#0f172a',
        margin:
      },
      {
        text: 'AI-Powered Knowledge Creation Platform',
        fontSize: 9,
        color: '#64748b',
        margin:
      },
      {
        text: 'Created by Tanmay Kalbande',
        fontSize: 9,
        color: '#475569',
        margin:
      },
      {
        text: 'linkedin.com/in/tanmay-kalbande',
        fontSize: 9,
        color: '#3b82f6',
        link: 'https://www.linkedin.com/in/tanmay-kalbande/',
        decoration: 'underline'
      },
      
      { text: '', pageBreak: 'after' }
    ];
  }

  public async generate(project: BookProject, onProgress: (progress: number) => void): Promise<void> {
    console.log('🎨 Starting enhanced PDF generation for:', project.title);
    onProgress(10);

    const pdfMakeLib = await loadPdfMake();
    onProgress(25);

    const totalWords = project.modules.reduce((sum, m) => sum + m.wordCount, 0);

    const providerMatch = project.finalBook?.match(/\*\*Provider:\*\* (.+?) \((.+?)\)/);
    const provider = providerMatch ? providerMatch : undefined;
    const model = providerMatch ? providerMatch : undefined;

    const coverContent = this.createCoverPage(project.title, {
      words: totalWords,
      modules: project.modules.length,
      date: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      provider,
      model
    });

    onProgress(40);
    const mainContent = this.parseMarkdownToContent(project.finalBook || '');

    onProgress(60);
    const tocContent = this.createTableOfContents();

    onProgress(75);
    this.content = [...coverContent, ...tocContent, ...mainContent];

    const docDefinition: any = {
      content: this.content,
      styles: this.styles,
      defaultStyle: { 
        font: 'Roboto', 
        fontSize: 10.5, 
        color: '#1e293b',
        lineHeight: 1.7
      },
      pageSize: 'A4',
      pageMargins:,
      
      header: (currentPage: number) => {
        if (currentPage <= 2) return {}; // Skip cover + ToC
        
        return {
          columns: [
            {
              text: project.title,
              fontSize: 9,
              color: '#64748b',
              italics: true,
              width: '*'
            },
            {
              text: `${currentPage - 2}`,
              fontSize: 9,
              color: '#64748b',
              alignment: 'right',
              width: 'auto'
            }
          ],
          margin:
        };
      },
      
      footer: (currentPage: number, pageCount: number) => {
        if (currentPage <= 1) return {};
        
        return {
          columns: [
            { 
              text: 'Pustakam Engine', 
              fontSize: 8,
              color: '#94a3b8',
              margin:,
              width: '*'
            },
            { 
              text: 'Tanmay Kalbande', 
              fontSize: 8,
              color: '#94a3b8',
              alignment: 'right',
              margin:,
              width: '*'
            }
          ],
          margin:
        };
      },
      
      info: { 
        title: project.title, 
        author: 'Pustakam Engine - Tanmay Kalbande', 
        creator: 'Pustakam Engine',
        subject: project.goal,
        keywords: 'AI, Knowledge, Education, Pustakam, Book'
      }
    };

    onProgress(85);
    console.log('📄 Creating enhanced PDF document...');

    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMakeLib.createPdf(docDefinition);
        const filename = `${project.title
          .replace(/[^a-z0-9\s-]/gi, '')
          .replace(/\s+/g, '_')
          .toLowerCase()
          .substring(0, 50)}_${new Date().toISOString().slice(0, 10)}.pdf`;
        
        const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu.test(
          project.finalBook || ''
        );
        
        const hasComplexFormatting = (project.finalBook || '').includes('```') || 
                                     (project.finalBook || '').includes('~~');
        
        const hasTables = (project.finalBook || '').includes('|');
        
        const popup = document.createElement('div');
        popup.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in';
        popup.innerHTML = `
          <div class="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#2A2A2A] rounded-2xl shadow-2xl max-w-lg w-full p-7 animate-fade-in-up">
            <div class="flex items-center gap-4 mb-5">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-bold text-white">Enhanced PDF Ready</h3>
                <p class="text-sm text-gray-400">Professional formatting applied</p>
              </div>
            </div>
            
            <div class="bg-white/5 rounded-xl p-4 mb-5 border border-white/10">
              <p class="text-sm text-gray-300 leading-relaxed mb-4">
                Your document has been formatted with publication-quality typography and enhanced readability features.
              </p>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex items-start gap-2">
                  <span class="text-green-400 shrink-0 mt-0.5">✓</span>
                  <span class="text-xs text-gray-300">Professional cover page</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-green-400 shrink-0 mt-0.5">✓</span>
                  <span class="text-xs text-gray-300">Table of contents</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-green-400 shrink-0 mt-0.5">✓</span>
                  <span class="text-xs text-gray-300">Enhanced typography</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-green-400 shrink-0 mt-0.5">✓</span>
                  <span class="text-xs text-gray-300">Inline formatting</span>
                </div>
                ${hasComplexFormatting ? `
                <div class="flex items-start gap-2">
                  <span class="text-blue-400 shrink-0 mt-0.5">✓</span>
                  <span class="text-xs text-gray-300">Code highlighting</span>
                </div>` : ''}
                ${hasTables ? `
                <div class="flex items-start gap-2">
                  <span class="text-blue-400 shrink-0 mt-0.5">✓</span>
                  <span class="text-xs text-gray-300">Styled tables</span>
                </div>` : ''}
                ${hasEmojis ? `
                <div class="flex items-start gap-2">
                  <span class="text-yellow-400 shrink-0 mt-0.5">•</span>
                  <span class="text-xs text-gray-300">Emojis removed</span>
                </div>` : ''}
              </div>
            </div>
            
            <div class="flex gap-3">
              <button id="cancel-pdf" class="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 hover:text-white font-medium transition-all hover:scale-[1.02]">
                Cancel
              </button>
              <button id="download-pdf" class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl text-white font-semibold transition-all shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02]">
                Download PDF
              </button>
            </div>
          </div>
        `;
        
        document.body.appendChild(popup);
        
        const cancelBtn = popup.querySelector('#cancel-pdf');
        const downloadBtn = popup.querySelector('#download-pdf');
        
        cancelBtn?.addEventListener('click', () => {
          document.body.removeChild(popup);
          onProgress(0);
          reject(new Error('Download cancelled by user'));
        });
        
        downloadBtn?.addEventListener('click', () => {
          document.body.removeChild(popup);
          pdfDocGenerator.download(filename, () => {
            console.log('✅ Enhanced PDF downloaded:', filename);
            onProgress(100);
            resolve();
          });
        });
      } catch (error) {
        console.error('❌ PDF creation failed:', error);
        reject(error);
      }
    });
  }
}

export const pdfService = {
  async generatePdf(project: BookProject, onProgress: (progress: number) => void): Promise<void> {
    if (isGenerating) {
      alert('A PDF is already being generated. Please wait.');
      return;
    }

    if (!project.finalBook) {
      alert('Book content is not available for PDF export.');
      return;
    }

    isGenerating = true;
    onProgress(5);

    try {
      const generator = new EnhancedPdfGenerator();
      await generator.generate(project, onProgress);
      console.log('🎉 Enhanced PDF generation completed successfully');
    } catch (error: any) {
      console.error('💥 PDF generation error:', error);
      
      if (error.message !== 'Download cancelled by user') {
        alert('PDF generation failed. Please try:\n\n' +
              '1. Hard refresh the page (Ctrl+Shift+R)\n' +
              '2. Clear browser cache\n' +
              '3. Download Markdown (.md) version instead\n\n' +
              'Technical details: ' + (error.message || 'Unknown error'));
      }
      
      onProgress(0);
    } finally {
      isGenerating = false;
    }
  }
};
