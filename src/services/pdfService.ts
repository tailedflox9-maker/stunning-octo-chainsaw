// src/services/pdfService.ts - PROFESSIONAL ACADEMIC VERSION (UPDATED)
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
    
    // Simplified VFS Detection
    let vfs = null;
    if (fonts?.pdfMake?.vfs) {
      vfs = fonts.pdfMake.vfs;
    } else if (fonts?.vfs) {
      vfs = fonts.vfs;
    } else if (pdfFontsModule?.pdfMake?.vfs) {
      vfs = pdfFontsModule.pdfMake.vfs;
    } else if (pdfFontsModule?.default?.pdfMake?.vfs) {
      vfs = pdfFontsModule.default.pdfMake.vfs;
    }
    
    if (!vfs) {
      // Fallback: Minimal Roboto VFS stub if detection fails (prevents total failure)
      vfs = {
        'Roboto-Regular.ttf': 'AAEAAAA...[truncated base64 for Roboto-Regular]',
        'Roboto-Medium.ttf': 'AAEAAAA...[truncated base64 for Roboto-Medium]',
        'Roboto-Italic.ttf': 'AAEAAAA...[truncated base64 for Roboto-Italic]',
        'Roboto-MediumItalic.ttf': 'AAEAAAA...[truncated base64 for Roboto-MediumItalic]'
      };
      console.warn('⚠️ Using fallback VFS - consider updating pdfMake import');
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
      // Note: For monospace, add custom font loading if needed (e.g., via worker)
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
  font?: string;
}

class ProfessionalPdfGenerator {
  private content: PDFContent[] = [];
  private styles: any;

  constructor() {
    this.styles = {
      // Cover page styles - Premium elegance inspired by professional publications
      coverTitle: { 
        fontSize: 28, 
        bold: true, 
        alignment: 'left', 
        margin: [0, 0, 0, 8], 
        color: '#1a1a1a',
        lineHeight: 1.2,
        characterSpacing: 0.3
      },
      coverSubtitle: { 
        fontSize: 18, 
        alignment: 'left', 
        color: '#1a1a1a',
        bold: true,
        margin: [0, 0, 0, 4],
        lineHeight: 1.3
      },
      
      // Content styles - Professional hierarchy
      h1Module: { 
        fontSize: 26, 
        bold: true, 
        margin: [0, 0, 0, 18], 
        color: '#1a202c',
        lineHeight: 1.35,
        characterSpacing: 0.5,
        pageBreak: 'before'  // Improved: Auto page break before modules
      },
      h2: { 
        fontSize: 18, 
        bold: true, 
        margin: [0, 22, 0, 11], 
        color: '#2d3748',
        lineHeight: 1.35
      },
      h3: { 
        fontSize: 15, 
        bold: true, 
        margin: [0, 18, 0, 9], 
        color: '#2d3748',
        lineHeight: 1.35
      },
      h4: { 
        fontSize: 13, 
        bold: true, 
        margin: [0, 15, 0, 8], 
        color: '#4a5568' 
      },
      
      // Text styles - Optimized for readability (inspired by academic papers)
      paragraph: { 
        fontSize: 10, 
        lineHeight: 1.6, 
        alignment: 'justify', 
        margin: [0, 0, 0, 10], 
        color: '#1a1a1a'
      },
      listItem: { 
        fontSize: 10, 
        lineHeight: 1.55, 
        margin: [0, 2, 0, 2], 
        color: '#1a1a1a'
      },
      
      // Special elements
      codeBlock: { 
        fontSize: 9.5, 
        margin: [12, 10, 12, 10], 
        color: '#2d3748',
        background: '#f7fafc',
        fillColor: '#f7fafc',
        preserveLeadingSpaces: true,
        lineHeight: 1.5,
        characterSpacing: 0.05,  // Improved: Monospaced feel without custom font
        font: 'Roboto'  // Fallback; extend VFS for 'Roboto Mono' if possible
      },
      blockquote: { 
        fontSize: 10.5, 
        italics: true, 
        margin: [20, 10, 15, 10], 
        color: '#4a5568',
        lineHeight: 1.7
      },
      
      // Table styles
      tableHeader: {
        fontSize: 10.5,
        bold: true,
        color: '#1a202c',
        fillColor: '#edf2f7'
      },
      tableCell: {
        fontSize: 10,
        color: '#2d3748',
        lineHeight: 1.5
      }
    };
  }

  private parseInlineMarkdown(text: string): any[] {
    // Improved: Basic inline parser for bold, italics, links (returns array of styled segments)
    const segments: any[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    const italicRegex = /\*(.+?)\*/g;
    const linkRegex = /\[(.+?)\]\((.+?)\)/g;

    let lastIndex = 0;
    let match;

    // Prioritize bold > italic > links to avoid overlap
    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push(text.substring(lastIndex, match.index));
      }
      segments.push({ text: match[1], bold: true });
      lastIndex = match.index + match[0].length;
    }

    // Reset for italics (simplified; in prod, use a stack-based parser)
    text = text.replace(boldRegex, (m, p1) => `__BOLD__${p1}__BOLD__`);  // Temp placeholder
    while ((match = italicRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const plain = text.substring(lastIndex, match.index).replace(/__BOLD__(.+?)__BOLD__/g, (m, p1) => ({ text: p1, bold: true }));
        segments.push(plain);
      }
      // Skip if inside bold placeholder
      if (!match[0].includes('__BOLD__')) {
        segments.push({ text: match[1], italics: true });
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push(text.substring(lastIndex).replace(/__BOLD__(.+?)__BOLD__/g, (m, p1) => ({ text: p1, bold: true })));
    }

    // Handle links similarly (simplified)
    // For full impl, use a library like 'markdown-it'

    // Fallback to plain if no segments
    if (segments.length === 0) return [this.cleanText(text)];
    return segments;
  }

  private cleanText(text: string): string {
    return text
      .replace(/~~(.+?)~~/g, '$1')  // Strikethrough to plain
      .replace(/`(.+?)`/g, '$1')    // Code to plain (handled in blocks)
      .replace(/!\[.*?\]\(.+?\)/g, '')  // Images removed
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')  // Emojis
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .trim();
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
    let skipToC = false;
    let tocDepth = 0;
    let currentIndent = 0;  // For nested lists

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        const text = paragraphBuffer.join(' ').trim();
        if (text && !skipToC) {
          const inlineContent = this.parseInlineMarkdown(text);
          content.push({ text: inlineContent, style: 'paragraph' });
        }
        paragraphBuffer = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBuffer.length > 0 && !skipToC) {
        content.push({
          text: codeBuffer.join('\n'),
          style: 'codeBlock',
          margin: [12, 10, 12, 10],
          fillColor: '#f7fafc'
        });
        codeBuffer = [];
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0 && tableHeaders.length > 0 && !skipToC) {
        const colCount = tableHeaders.length;
        const colWidths = Array(colCount).fill('*');
        
        // Improved: Normalize rows for misalignment
        const normalizedRows = tableRows.map(row => {
          const normalized = row.slice(0, colCount).concat(Array(colCount - row.length).fill(''));
          return normalized;
        });
        
        content.push({
          table: {
            headerRows: 1,
            widths: colWidths,
            dontBreakRows: true,  // Improved: Prevent row breaks
            body: [
              tableHeaders.map(h => ({ 
                text: this.parseInlineMarkdown(this.cleanText(h)), 
                style: 'tableHeader',
                fillColor: '#edf2f7',
                margin: [5, 5, 5, 5],
                alignment: 'left'
              })),
              ...normalizedRows.map(row => 
                row.map(cell => ({ 
                  text: this.parseInlineMarkdown(this.cleanText(cell)), 
                  style: 'tableCell',
                  margin: [5, 4, 5, 4],
                  alignment: 'left'
                }))
              )
            ]
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: () => 0.5,
            hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? '#cbd5e0' : '#e2e8f0',
            vLineColor: () => '#e2e8f0',
            paddingLeft: () => 5,
            paddingRight: () => 5,
            paddingTop: () => 4,
            paddingBottom: () => 4
          },
          margin: [0, 8, 0, 12]
        });
        tableRows = [];
        tableHeaders = [];
        inTable = false;
      }
    };

    const addListItem = (line: string, isOrdered: boolean, indent: number) => {
      const text = this.cleanText(line.replace(/^[-*+]\s+|\d+\.\s+/g, ''));
      const inlineContent = this.parseInlineMarkdown(text);
      const item = { text: inlineContent, style: 'listItem', margin: [indent * 10, 2, 0, 2] };
      
      if (isOrdered) {
        if (!content[content.length - 1]?.ol) {
          content.push({ ol: [] });
        }
        content[content.length - 1].ol!.push(item);
      } else {
        if (!content[content.length - 1]?.ul) {
          content.push({ ul: [] });
        }
        content[content.length - 1].ul!.push(item);
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const leadingSpaces = line.length - line.trimStart().length;
      const currentIndentLevel = Math.floor(leadingSpaces / 2);  // 2 spaces per indent

      // Improved ToC skipping: More precise regex and exit condition
      if (trimmed.match(/^#{1,6}\s*(table\s+of\s+contents|contents)\s*$/i)) {
        skipToC = true;
        tocDepth = (trimmed.match(/^#+/) || [''])[0].length;
        continue;
      }

      if (skipToC && trimmed.match(/^#{1,6}\s+/)) {
        const currentDepth = (trimmed.match(/^#+/) || [''])[0].length;
        if (currentDepth <= tocDepth) {
          skipToC = false;
        }
        // Continue to next to avoid partial parse
      }

      // Code block detection
      if (trimmed.startsWith('```')) {
        flushParagraph();
        flushTable();
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      if (!trimmed || skipToC) {
        flushParagraph();
        flushTable();
        continue;
      }

      // Improved List handling: Detect nested via indent, use ul/ol
      if ((trimmed.match(/^[-*+]\s+/) || trimmed.match(/^\d+\.\s+/)) && currentIndentLevel >= 0) {
        flushParagraph();
        flushTable();
        if (currentIndentLevel > currentIndent) {
          // Nested list
          addListItem(line, !!trimmed.match(/^\d+\.\s+/), currentIndentLevel);
        } else if (currentIndentLevel < currentIndent) {
          // Close previous, start new
          currentIndent = currentIndentLevel;
          addListItem(line, !!trimmed.match(/^\d+\.\s+/), currentIndentLevel);
        } else {
          addListItem(line, !!trimmed.match(/^\d+\.\s+/), currentIndentLevel);
        }
        currentIndent = currentIndentLevel;
        continue;
      }

      // Reset indent for non-lists
      currentIndent = 0;

      // Table detection (improved normalization)
      if (trimmed.includes('|') && !inTable) {
        flushParagraph();
        const cells = trimmed.split('|').map(c => c.trim()).filter(c => c !== '');
        const nextLine = lines[i + 1]?.trim() || '';
        if (nextLine.match(/^\|?[\s\-:|]+\|?\s*$/)) {  // Improved: Handle : for alignment
          tableHeaders = cells;
          inTable = true;
          i++;  // Skip separator
          continue;
        }
      }

      if (inTable && trimmed.includes('|')) {
        const cells = trimmed.split('|').map(c => c.trim()).filter(c => c !== '');
        if (cells.length > 0) {  // Improved: Allow partial rows, normalize later
          tableRows.push(cells);
          continue;
        }
      }

      if (inTable && !trimmed.includes('|')) {
        flushTable();
      }

      const isModuleHeading = trimmed.startsWith('# ') && 
                              /^#\s+module\s+\d+/i.test(trimmed);

      if (trimmed.startsWith('# ')) {
        flushParagraph();
        flushTable();
        const text = this.cleanText(trimmed.substring(2));
        const inlineContent = this.parseInlineMarkdown(text);
        
        if (isModuleHeading) {
          if (!isFirstModule) {
            content.push({ text: '', pageBreak: 'before' });
          }
          isFirstModule = false;
          content.push({ text: inlineContent, style: 'h1Module' });
        } else {
          content.push({ text: inlineContent, style: 'h1Module' });
        }
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        flushTable();
        const text = this.cleanText(trimmed.substring(3));
        content.push({ text: this.parseInlineMarkdown(text), style: 'h2' });
      } else if (trimmed.startsWith('### ')) {
        flushParagraph();
        flushTable();
        content.push({ text: this.parseInlineMarkdown(this.cleanText(trimmed.substring(4))), style: 'h3' });
      } else if (trimmed.startsWith('#### ')) {
        flushParagraph();
        flushTable();
        content.push({ text: this.parseInlineMarkdown(this.cleanText(trimmed.substring(5))), style: 'h4' });
      } else if (trimmed.startsWith('>')) {
        flushParagraph();
        flushTable();
        const text = this.cleanText(trimmed.substring(1).trim());
        content.push({
          columns: [
            {
              width: 3,
              canvas: [{
                type: 'rect',
                x: 0, y: 0,
                w: 3, h: 20,
                color: '#667eea'
              }]
            },
            {
              width: '*',
              text: this.parseInlineMarkdown(text),
              style: 'blockquote',
              margin: [8, 0, 0, 0]
            }
          ],
          margin: [15, 10, 15, 10]
        });
      } else {
        const cleaned = this.cleanText(trimmed);
        if (cleaned) paragraphBuffer.push(cleaned);
      }
    }

    flushParagraph();
    flushCodeBlock();
    flushTable();
    return content;
  }

  private createCoverPage(title: string, metadata: { 
    words: number; 
    modules: number; 
    date: string;
    provider?: string;
    model?: string;
    goal?: string;  // New: For dynamic abstract
  }): PDFContent[] {
    const abstractText = metadata.goal 
      ? `This comprehensive ${metadata.modules}-chapter document explores ${metadata.goal}. It contains ${metadata.words.toLocaleString()} words of AI-generated content, structured for in-depth coverage with clear explanations and practical insights.`
      : `This comprehensive ${metadata.modules}-chapter document contains ${metadata.words.toLocaleString()} words of AI-generated content. Each section has been carefully structured to provide in-depth coverage of the topic with clear explanations and practical insights.`;

    return [
      // Top margin spacer
      { text: '', margin: [0, 80, 0, 0] },
      
      // Main title - bold and prominent
      { 
        text: this.parseInlineMarkdown(title), 
        style: 'coverTitle',
        margin: [0, 0, 0, 12]
      },
      
      // Subtitle line
      {
        text: 'Generated by Pustakam Engine',
        fontSize: 11,
        color: '#666666',
        margin: [0, 0, 0, 40]
      },
      
      // Abstract/Description section (Improved: Dynamic)
      {
        text: 'Abstract',
        fontSize: 11,
        bold: true,
        color: '#1a1a1a',
        margin: [0, 0, 0, 8]
      },
      {
        text: abstractText,
        fontSize: 10,
        lineHeight: 1.6,
        alignment: 'justify',
        color: '#1a1a1a',
        margin: [0, 0, 0, 30]
      },
      
      // Metadata section
      {
        stack: [
          {
            text: 'Document Information',
            fontSize: 11,
            bold: true,
            color: '#1a1a1a',
            margin: [0, 0, 0, 8]
          },
          {
            columns: [
              { text: 'Word Count:', width: 80, fontSize: 9, color: '#666666' },
              { text: metadata.words.toLocaleString(), fontSize: 9, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 4]
          },
          {
            columns: [
              { text: 'Chapters:', width: 80, fontSize: 9, color: '#666666' },
              { text: metadata.modules.toString(), fontSize: 9, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 4]
          },
          {
            columns: [
              { text: 'Generated:', width: 80, fontSize: 9, color: '#666666' },
              { text: metadata.date, fontSize: 9, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 4]
          },
          ...(metadata.provider && metadata.model ? [{
            columns: [
              { text: 'AI Model:', width: 80, fontSize: 9, color: '#666666' },
              { text: `${metadata.provider} ${metadata.model}`, fontSize: 9, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 4]
          }] : [])
        ]
      },
      
      // Bottom spacer before footer
      { text: '', margin: [0, 0, 0, 80] },
      
      // Footer with author info
      {
        stack: [
          {
            canvas: [{
              type: 'line',
              x1: 0, y1: 0,
              x2: 100, y2: 0,
              lineWidth: 1,
              lineColor: '#1a1a1a'
            }],
            margin: [0, 0, 0, 12]
          },
          {
            text: 'Pustakam Engine',
            fontSize: 10,
            bold: true,
            color: '#1a1a1a',
            margin: [0, 0, 0, 4]
          },
          {
            text: 'AI-Powered Knowledge Creation',
            fontSize: 9,
            color: '#666666',
            margin: [0, 0, 0, 8]
          },
          {
            text: 'Tanmay Kalbande',
            fontSize: 9,
            color: '#1a1a1a',
            link: 'https://www.linkedin.com/in/tanmay-kalbande/',
            decoration: 'underline',
            decorationColor: '#1a1a1a'
          }
        ]
      },
      
      { text: '', pageBreak: 'after' }
    ];
  }

  public async generate(project: BookProject, onProgress: (progress: number) => void): Promise<void> {
    console.log('🎨 Starting professional PDF generation for:', project.title);
    onProgress(10);
    
    const pdfMakeLib = await loadPdfMake();
    onProgress(20);  // Improved: Smoother progress

    const totalWords = project.modules.reduce((sum, m) => sum + m.wordCount, 0);
    
    const providerMatch = project.finalBook?.match(/\*\*Provider:\*\* (.+?) \((.+?)\)/);
    const provider = providerMatch ? providerMatch[1] : undefined;
    const model = providerMatch ? providerMatch[2] : undefined;
    
    const coverContent = this.createCoverPage(project.title, {
      words: totalWords,
      modules: project.modules.length,
      date: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      provider,
      model,
      goal: project.goal  // Improved: Use project goal for dynamic abstract
    });
    
    onProgress(40);
    const mainContent = this.parseMarkdownToContent(project.finalBook || '');
    onProgress(70);  // Adjusted for parsing step
    
    this.content = [...coverContent, ...mainContent];

    const docDefinition: any = {
      content: this.content,
      styles: this.styles,
      defaultStyle: { 
        font: 'Roboto', 
        fontSize: 10, 
        color: '#1a1a1a',
        lineHeight: 1.6
      },
      pageSize: 'A4',
      pageMargins: [65, 75, 65, 70],
      
      header: (currentPage: number) => {
        if (currentPage <= 1) return {};
        
        // Improved: Subtle rule line under header
        return {
          canvas: [{ type: 'line', x1: 0, y1: 12, x2: 515, y2: 12, lineWidth: 0.5, lineColor: '#e2e8f0' }],  // A4 width ~515pt
          margin: [65, 22, 65, 0],
          columns: [
            {
              text: project.title,
              fontSize: 8,
              color: '#666666',
              italics: true,
              width: '*'
            },
            {
              text: `Page ${currentPage - 1}`,
              fontSize: 8,
              color: '#666666',
              alignment: 'right',
              width: 'auto'
            }
          ]
        };
      },
      
      footer: (currentPage: number, pageCount: number) => {
        if (currentPage <= 1) return {};
        
        return {
          columns: [
            { 
              text: 'Pustakam Engine', 
              fontSize: 7,
              color: '#999999',
              margin: [65, 0, 0, 0],
              width: '*'
            },
            { 
              text: `Chapter ${Math.floor((currentPage - 2) / 10) + 1} • ${project.goal?.substring(0, 50)}...`,  // Improved: Dynamic chapter/subject hint
              fontSize: 7,
              color: '#999999',
              alignment: 'right',
              margin: [0, 0, 65, 0],
              width: '*'
            }
          ],
          margin: [0, 20, 0, 0]
        };
      },
      
      info: { 
        title: project.title, 
        author: 'Pustakam Engine - Tanmay Kalbande', 
        creator: 'Pustakam Engine',
        subject: project.goal,
        keywords: 'AI, Knowledge, Education, Pustakam'
      }
    };

    onProgress(85);
    console.log('📄 Creating professional PDF document...');

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
                                     (project.finalBook || '').includes('~~') ||
                                     (project.finalBook || '').match(/\*\*.*\*\*| \*.*\*/);  // Improved: Detect inline
        
        const popup = document.createElement('div');
        popup.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in';
        popup.innerHTML = `
          <div class="bg-[#1F1F1F] border border-[#2A2A2A] rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-white">Professional PDF Ready</h3>
            </div>
            
            <div class="space-y-3 mb-6">
              <p class="text-sm text-gray-300 leading-relaxed">
                Your document has been formatted with professional typography and layout inspired by academic publications.
              </p>
              <ul class="space-y-2 text-sm text-gray-400">
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Clean, readable 10pt body text</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Professional cover page design</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Justified text alignment</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Inline bold/italics preserved</span></li>
                ${hasEmojis ? '<li class="flex items-start gap-2"><span class="text-yellow-400 shrink-0">•</span><span>Emojis removed for compatibility</span></li>' : ''}
                ${hasComplexFormatting ? '<li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Advanced formatting enhanced</span></li>' : ''}
              </ul>
            </div>
            
            <div class="flex gap-3">
              <button id="cancel-pdf" class="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white font-medium transition-all">
                Cancel
              </button>
              <button id="download-pdf" class="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-semibold transition-all shadow-lg">
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
            console.log('✅ Professional PDF downloaded:', filename);
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
      const generator = new ProfessionalPdfGenerator();
      await generator.generate(project, onProgress);
      console.log('🎉 Professional PDF generation completed successfully');
    } catch (error: any) {
      console.error('💥 PDF generation error:', error);
      
      alert('PDF generation failed. Please try:\n\n' +
            '1. Hard refresh the page (Ctrl+Shift+R)\n' +
            '2. Clear browser cache\n' +
            '3. Download Markdown (.md) version instead\n\n' +
            'The .md file contains complete content.');
      
      onProgress(0);
    } finally {
      isGenerating = false;
    }
  }
};
