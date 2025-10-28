// src/services/pdfService.ts - PROFESSIONAL ACADEMIC VERSION (Updated: Aptos-Mono as Main Font)
// Quick Update: Removed Lora loading. Uses Aptos-Mono (Regular & Bold) as primary font for all text.
// Falls back to Roboto if files missing. Monospaced for a clean, code-inspired academic look.
// Italics fall back to regular (no italic variant). Code blocks also use it for consistency.
// ENHANCEMENTS: Includes zebra-striped tables, elegant blockquotes, and improved markdown parsing for inline styles.

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
    
    // VFS Detection (unchanged)
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
    
    // UPDATED: Auto-load Aptos-Mono fonts from /fonts/ (now as MAIN font)
    const basePath = '/fonts/';
    const aptosMonoFonts = [
      { name: 'Aptos-Mono.ttf', key: 'Aptos-Mono.ttf' },
      { name: 'Aptos-Mono-Bold.ttf', key: 'Aptos-Mono-Bold.ttf' }
    ];
    
    let hasAptosMono = false;
    console.log('🔍 Checking for Aptos-Mono fonts in', basePath);
    
    for (const font of aptosMonoFonts) {
      try {
        const response = await fetch(`${basePath}${font.name}`);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );
          pdfMake.vfs[font.key] = base64;
          console.log(`✓ Loaded ${font.name}`);
          hasAptosMono = true;
        } else {
          console.warn(`⚠ ${font.name} not found (HTTP ${response.status}). Will use fallback.`);
        }
      } catch (error) {
        console.error(`❌ Failed to load ${font.name}:`, error);
      }
    }
    
    const vfsKeys = Object.keys(vfs);
    if (vfsKeys.length === 0) {
      throw new Error('VFS_EMPTY');
    }
    
    console.log('✓ VFS loaded with', vfsKeys.length, 'files');
    
    // Main font: Aptos-Mono if loaded, else Roboto
    const mainFontFamily = hasAptosMono ? 'Aptos-Mono' : 'Roboto';
    
    // Configure fonts: Primary + fallback
    pdfMake.fonts = {
      [mainFontFamily]: {
        normal: hasAptosMono ? 'Aptos-Mono.ttf' : 'Roboto-Regular.ttf',
        bold: hasAptosMono ? 'Aptos-Mono-Bold.ttf' : 'Roboto-Medium.ttf',
        italics: hasAptosMono ? 'Aptos-Mono.ttf' : 'Roboto-Italic.ttf', // Fallback for mono
        bolditalics: hasAptosMono ? 'Aptos-Mono-Bold.ttf' : 'Roboto-MediumItalic.ttf' // Fallback for mono
      },
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      }
    };
    
    console.log(`✓ Using main font: ${mainFontFamily} (monospaced pro style)`);
    
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
}

class ProfessionalPdfGenerator {
  private content: PDFContent[] = [];
  private styles: any;
  private fontFamily: string;

  constructor() {
    this.fontFamily = 'Roboto';  // Default
    this.styles = {
      // Cover page styles
      coverTitle: { 
        fontSize: 28, bold: true, alignment: 'left', 
        margin: [0, 0, 0, 8], color: '#1a1a1a',
        lineHeight: 1.1, characterSpacing: 0.5
      },
      coverSubtitle: { 
        fontSize: 18, alignment: 'left', color: '#1a1a1a',
        bold: true, margin: [0, 0, 0, 4], lineHeight: 1.2
      },
      
      // Content styles
      h1Module: { 
        fontSize: 26, bold: true, margin: [0, 0, 0, 18], 
        color: '#1a202c', lineHeight: 1.3, characterSpacing: 0.8
      },
      h2: { 
        fontSize: 18, bold: true, margin: [0, 22, 0, 11], 
        color: '#2d3748', lineHeight: 1.3
      },
      h3: { 
        fontSize: 15, bold: true, margin: [0, 18, 0, 9], 
        color: '#2d3748', lineHeight: 1.3
      },
      h4: { 
        fontSize: 13, bold: true, margin: [0, 15, 0, 8], 
        color: '#4a5568' 
      },
      
      // Text styles
      paragraph: { 
        fontSize: 10, lineHeight: 1.5, alignment: 'justify', 
        margin: [0, 0, 0, 10], color: '#1a1a1a'
      },
      listItem: { 
        fontSize: 10, lineHeight: 1.4,
        margin: [0, 2, 0, 2], color: '#1a1a1a'
      },
      
      // Special elements
      codeBlock: { 
        fontSize: 9.5, margin: [12, 10, 12, 10], color: '#2d3748',
        background: '#f7fafc', fillColor: '#f7fafc',
        preserveLeadingSpaces: true, lineHeight: 1.4
      },
      blockquote: { 
        fontSize: 10.5, italics: true, margin: [10, 0, 0, 0], // Adjusted margin
        color: '#4a5568', lineHeight: 1.6
      },
      
      // Table styles
      tableHeader: {
        fontSize: 10.5, bold: true, color: '#1a202c',
        fillColor: '#edf2f7', margin: [6, 6, 6, 6] // Increased padding
      },
      tableCell: {
        fontSize: 10, color: '#2d3748',
        lineHeight: 1.4, margin: [6, 5, 6, 5] // Increased padding
      }
    };
  }
  
  // NEW: More intelligent inline parser that preserves bold, italics, and links
  private parseInlineMarkdown(text: string): any[] {
    const segments: any[] = [];
    const regex = /(\*\*\*|___|\*\*|__|\*|_|`|\[.+?\]\(.+?\))/g;
    let lastIndex = 0;
    let match;

    const sanitizedText = text
      .replace(/~~(.+?)~~/g, '$1') // Strikethrough (remove)
      .replace(/!\[.*?\]\(.+?\)/g, '') // Images (remove)
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '');

    // For simplicity, this parser is basic. A full markdown-it style parser would be overkill.
    // This handles the most common cases. For now, we just handle links, bold, and italics.
    const linkRegex = /\[(.+?)\]\((.+?)\)/g;
    let linkMatch;
    let runningText = sanitizedText;
    
    while((linkMatch = linkRegex.exec(sanitizedText)) !== null) {
        const fullMatch = linkMatch[0];
        const linkText = linkMatch[1];
        const linkUrl = linkMatch[2];
        const index = runningText.indexOf(fullMatch);
        
        if (index > 0) {
            segments.push({ text: runningText.substring(0, index) });
        }
        segments.push({
            text: linkText,
            link: linkUrl,
            color: '#2b6cb0', // Professional blue for links
            decoration: 'underline'
        });
        runningText = runningText.substring(index + fullMatch.length);
    }
    if (runningText) {
        segments.push({ text: runningText });
    }
    
    // A simplified bold/italic handler (less robust than a real parser)
    const processSegment = (segment: any) => {
        if (typeof segment.text !== 'string') return [segment];
        
        const finalSegments = [];
        const parts = segment.text.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(p => p);
        
        for (const part of parts) {
            if (part.startsWith('**') && part.endsWith('**')) {
                finalSegments.push({ text: part.slice(2, -2), bold: true });
            } else if (part.startsWith('*') && part.endsWith('*')) {
                finalSegments.push({ text: part.slice(1, -1), italics: true });
            } else {
                finalSegments.push({ text: part });
            }
        }
        return finalSegments;
    };
    
    return segments.flatMap(processSegment);
  }

  private cleanText(text: string): string {
    return text
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/!\[.*?\]\(.+?\)/g, '')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
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

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        const text = paragraphBuffer.join(' ').trim();
        if (text && !skipToC) {
            // UPDATED: Use the new inline parser
            content.push({ text: this.parseInlineMarkdown(text), style: 'paragraph' });
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
        
        content.push({
          table: {
            headerRows: 1,
            widths: colWidths,
            body: [
              tableHeaders.map(h => ({ 
                text: this.cleanText(h), 
                style: 'tableHeader',
                alignment: 'left'
              })),
              ...tableRows.map((row, rowIndex) => 
                row.map(cell => ({ 
                  text: this.parseInlineMarkdown(cell), // Use inline parser for table cells
                  style: 'tableCell',
                  // NEW: Zebra striping for readability
                  fillColor: (rowIndex % 2 === 0) ? '#f7fafc' : undefined,
                  alignment: 'left'
                }))
              )
            ]
          },
          // NEW: Cleaner table layout (no vertical lines)
          layout: {
            hLineWidth: (i: number, node: any) => (i === 1 || i === node.table.body.length) ? 1 : 0,
            vLineWidth: () => 0, // No vertical lines
            hLineColor: () => '#cbd5e0',
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
          margin: [0, 8, 0, 12]
        });
        tableRows = [];
        tableHeaders = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

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

      if (trimmed.startsWith('```')) {
        flushParagraph();
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

      if (trimmed.includes('|') && !inTable) {
        flushParagraph();
        const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
        const nextLine = lines[i + 1]?.trim() || '';
        if (nextLine.match(/^\|?[\s\-:]+\|/)) {
          tableHeaders = cells;
          inTable = true;
          i++;
          continue;
        }
      }

      if (inTable && trimmed.includes('|')) {
        const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length > 0) { // Allow for flexible column counts
          tableRows.push(cells);
          continue;
        } else {
          flushTable();
        }
      }

      if (inTable && !trimmed.includes('|')) {
        flushTable();
      }

      const isModuleHeading = trimmed.startsWith('# ') && /^#\s+module\s+\d+/i.test(trimmed);

      if (trimmed.startsWith('# ')) {
        flushParagraph();
        const text = this.cleanText(trimmed.substring(2));
        if (isModuleHeading) {
          if (!isFirstModule) {
            content.push({ text: '', pageBreak: 'before' });
          }
          isFirstModule = false;
        }
        content.push({ text, style: 'h1Module' });
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        content.push({ text: this.cleanText(trimmed.substring(3)), style: 'h2' });
      } else if (trimmed.startsWith('### ')) {
        flushParagraph();
        content.push({ text: this.cleanText(trimmed.substring(4)), style: 'h3' });
      } else if (trimmed.startsWith('#### ')) {
        flushParagraph();
        content.push({ text: this.cleanText(trimmed.substring(5)), style: 'h4' });
      } else if (trimmed.match(/^[-*+]\s+/)) {
        flushParagraph();
        content.push({
            // Use inline parser for list items
            text: [{ text: '•\t', bold: true }, ...this.parseInlineMarkdown(trimmed.replace(/^[-*+]\s+/, ''))],
            style: 'listItem', margin:
        });
      } else if (trimmed.match(/^\d+\.\s+/)) {
        flushParagraph();
        const num = trimmed.match(/^(\d+)\./)?. || '';
        content.push({
            text: [{ text: `${num}.\t`, bold: true }, ...this.parseInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))],
            style: 'listItem', margin:
        });
      } else if (trimmed.startsWith('>')) {
        flushParagraph();
        // NEW: More elegant blockquote with a vertical line
        content.push({
          columns: [
            { width: 3, canvas: [{ type: 'rect', x: 0, y: 0, w: 3, h: '100%', color: '#a3bffa' }] },
            { width: '*', text: this.parseInlineMarkdown(trimmed.substring(1).trim()), style: 'blockquote' }
          ],
          margin:,
          columnGap: 10
        });
      } else {
        const cleaned = trimmed; // No need to clean aggressively anymore
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
  }): PDFContent[] {
    // Unchanged
    return [
      { text: '', margin: },
      
      { text: title, style: 'coverTitle', margin: },
      
      { text: 'Generated by Pustakam Engine', fontSize: 11, color: '#666666', margin: },
      
      { text: 'Abstract', fontSize: 11, bold: true, color: '#1a1a1a', margin: },
      {
        text: `This comprehensive ${metadata.modules}-chapter document contains ${metadata.words.toLocaleString()} words of AI-generated content. Each section has been carefully structured to provide in-depth coverage of the topic with clear explanations and practical insights.`,
        fontSize: 10, lineHeight: 1.6, alignment: 'justify', color: '#1a1a1a', margin:
      },
      
      {
        stack: [
          { text: 'Document Information', fontSize: 11, bold: true, color: '#1a1a1a', margin: },
          {
            columns: [
              { text: 'Word Count:', width: 80, fontSize: 9, color: '#666666' },
              { text: metadata.words.toLocaleString(), fontSize: 9, color: '#1a1a1a' }
            ], margin:
          },
          {
            columns: [
              { text: 'Chapters:', width: 80, fontSize: 9, color: '#666666' },
              { text: metadata.modules.toString(), fontSize: 9, color: '#1a1a1a' }
            ], margin:
          },
          {
            columns: [
              { text: 'Generated:', width: 80, fontSize: 9, color: '#666666' },
              { text: metadata.date, fontSize: 9, color: '#1a1a1a' }
            ], margin:
          },
          ...(metadata.provider && metadata.model ? [{
            columns: [
              { text: 'AI Model:', width: 80, fontSize: 9, color: '#666666' },
              { text: `${metadata.provider} ${metadata.model}`, fontSize: 9, color: '#1a1a1a' }
            ], margin:
          }] : [])
        ]
      },
      
      { text: '', margin: },
      
      {
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 1, lineColor: '#1a1a1a' }], margin: },
          { text: 'Pustakam Engine', fontSize: 10, bold: true, color: '#1a1a1a', margin: },
          { text: 'AI-Powered Knowledge Creation', fontSize: 9, color: '#666666', margin: },
          { text: 'Tanmay Kalbande', fontSize: 9, color: '#1a1a1a', link: 'https://www.linkedin.com/in/tanmay-kalbande/', decoration: 'underline', decorationColor: '#1a1a1a' }
        ]
      },
      
      { text: '', pageBreak: 'after' }
    ];
  }

  public async generate(project: BookProject, onProgress: (progress: number) => void): Promise<void> {
    console.log('🎨 Starting professional PDF generation for:', project.title);
    onProgress(10);
    
    const pdfMakeLib = await loadPdfMake();
    
    const hasAptosMono = Object.keys(pdfMakeLib.vfs).some(key => key.includes('Aptos-Mono'));
    this.fontFamily = hasAptosMono ? 'Aptos-Mono' : 'Roboto';
    
    onProgress(25);

    const totalWords = project.modules.reduce((sum, m) => sum + m.wordCount, 0);
    
    const providerMatch = project.finalBook?.match(/\*\*Provider:\*\* (.+?) \((.+?)\)/);
    
    const coverContent = this.createCoverPage(project.title, {
      words: totalWords,
      modules: project.modules.length,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      provider: providerMatch ? providerMatch : undefined,
      model: providerMatch ? providerMatch : undefined
    });
    
    onProgress(40);
    const mainContent = this.parseMarkdownToContent(project.finalBook || '');
    
    onProgress(75);
    this.content = [...coverContent, ...mainContent];

    const docDefinition: any = {
      content: this.content,
      styles: this.styles,
      defaultStyle: { 
        font: this.fontFamily,
        fontSize: 10, 
        color: '#1a1a1a',
        lineHeight: 1.5
      },
      pageSize: 'A4',
      pageMargins:,
      
      header: (currentPage: number) => {
        if (currentPage <= 1) return {};
        return {
          columns: [
            { text: project.title, fontSize: 8, color: '#666666', italics: true, width: '*' },
            { text: `Page ${currentPage - 1}`, fontSize: 8, color: '#666666', alignment: 'right', width: 'auto' }
          ],
          margin:
        };
      },
      
      footer: (currentPage: number) => {
        if (currentPage <= 1) return {};
        // NEW: Footer with a decorative line above it
        return {
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 595 - 130, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }], margin: },
            {
              columns: [
                { text: 'Pustakam Engine', fontSize: 7, color: '#999999', width: '*' },
                { text: 'https://www.linkedin.com/in/tanmay-kalbande/', fontSize: 7, color: '#999999', alignment: 'right', width: '*' }
              ],
              margin:
            }
          ]
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
    console.log(`📄 Creating PDF with ${this.fontFamily} font throughout`);

    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMakeLib.createPdf(docDefinition);
        const filename = `${project.title
          .replace(/[^a-z0-9\s-]/gi, '')
          .replace(/\s+/g, '_')
          .toLowerCase()
          .substring(0, 50)}_${new Date().toISOString().slice(0, 10)}.pdf`;
        
        const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu.test(project.finalBook || '');
        const hasComplexFormatting = (project.finalBook || '').includes('```') || (project.finalBook || '').includes('~~');
        
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
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Zebra-striped tables for readability</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>${this.fontFamily} font for consistent monospaced style</span></li>
                ${hasEmojis ? '<li class="flex items-start gap-2"><span class="text-yellow-400 shrink-0">•</span><span>Emojis removed for compatibility</span></li>' : ''}
                ${hasComplexFormatting ? '<li class="flex items-start gap-2"><span class="text-yellow-400 shrink-0">•</span><span>Advanced formatting simplified</span></li>' : ''}
              </ul>
            </div>
            <div class="flex gap-3">
              <button id="cancel-pdf" class="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white font-medium transition-all">Cancel</button>
              <button id="download-pdf" class="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-semibold transition-all shadow-lg">Download PDF</button>
            </div>
          </div>
        `;
        
        document.body.appendChild(popup);
        
        const cancelBtn = popup.querySelector('#cancel-pdf');
        const downloadBtn = popup.querySelector('#download-pdf');
        
        const closePopup = () => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
            }
        };

        cancelBtn?.addEventListener('click', () => {
          closePopup();
          onProgress(0);
          reject(new Error('Download cancelled by user'));
        });
        
        downloadBtn?.addEventListener('click', () => {
          closePopup();
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
      // Don't show alert if user cancelled
      if (error.message !== 'Download cancelled by user') {
          console.error('💥 PDF generation error:', error);
          alert('PDF generation failed. Please try:\n\n' +
                '1. Hard refresh the page (Ctrl+Shift+R)\n' +
                '2. Clear browser cache\n' +
                '3. Check console for font loading errors\n' +
                '4. Download Markdown (.md) version instead\n\n' +
                'The .md file contains complete content.');
      } else {
        console.log('PDF generation cancelled by user.');
      }
      onProgress(0);
    } finally {
      isGenerating = false;
    }
  }
};
