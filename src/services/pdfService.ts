// src/services/pdfService.ts - PREMIUM QUALITY VERSION
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
}

class PremiumPdfGenerator {
  private content: PDFContent[] = [];
  private styles: any;
  private tocItems: { title: string; level: number; page?: number }[] = [];

  constructor() {
    this.styles = {
      // Cover page styles - More elegant and spacious
      coverTitle: { 
        fontSize: 42, 
        bold: true, 
        alignment: 'center', 
        margin: [0, 200, 0, 20], 
        color: '#0F172A',
        lineHeight: 1.2,
        characterSpacing: 0.5
      },
      coverSubtitle: { 
        fontSize: 16, 
        alignment: 'center', 
        color: '#475569', 
        margin: [0, 0, 0, 12],
        lineHeight: 1.5
      },
      coverMetadata: {
        fontSize: 13,
        alignment: 'center',
        color: '#64748B',
        margin: [0, 0, 0, 10]
      },
      coverBrand: { 
        fontSize: 10, 
        alignment: 'center', 
        color: '#94A3B8', 
        margin: [0, 120, 0, 0], 
        italics: true,
        letterSpacing: 1
      },
      
      // TOC styles - Cleaner hierarchy
      tocTitle: { 
        fontSize: 32, 
        bold: true, 
        margin: [0, 60, 0, 40], 
        color: '#0F172A',
        characterSpacing: 0.3
      },
      tocH1: { 
        fontSize: 14, 
        bold: true, 
        margin: [0, 16, 0, 10], 
        color: '#1E293B',
        lineHeight: 1.4
      },
      tocH2: { 
        fontSize: 12, 
        margin: [24, 10, 0, 8], 
        color: '#475569',
        lineHeight: 1.3
      },
      
      // Content styles - Better readability
      h1Module: { 
        fontSize: 32, 
        bold: true, 
        margin: [0, 0, 0, 24], 
        color: '#0F172A',
        lineHeight: 1.3,
        characterSpacing: 0.3
      },
      h2: { 
        fontSize: 22, 
        bold: true, 
        margin: [0, 32, 0, 16], 
        color: '#1E293B',
        lineHeight: 1.3
      },
      h3: { 
        fontSize: 18, 
        bold: true, 
        margin: [0, 26, 0, 14], 
        color: '#334155',
        lineHeight: 1.3
      },
      h4: { 
        fontSize: 16, 
        bold: true, 
        margin: [0, 20, 0, 12], 
        color: '#475569' 
      },
      
      // Text styles - Optimized for reading
      paragraph: { 
        fontSize: 12, 
        lineHeight: 1.9, 
        alignment: 'justify', 
        margin: [0, 0, 0, 18], 
        color: '#1E293B'
      },
      listItem: { 
        fontSize: 12, 
        lineHeight: 1.8, 
        margin: [0, 7, 0, 7], 
        color: '#1E293B'
      },
      
      // Special elements - Better contrast
      codeBlock: { 
        fontSize: 10, 
        margin: [20, 14, 20, 18], 
        color: '#334155',
        background: '#F8FAFC',
        fillColor: '#F8FAFC',
        preserveLeadingSpaces: true
      },
      blockquote: { 
        fontSize: 11.5, 
        italics: true, 
        margin: [30, 18, 20, 18], 
        color: '#475569',
        lineHeight: 1.8
      },
      
      // Table styles - More professional
      tableHeader: {
        fontSize: 11.5,
        bold: true,
        color: '#0F172A',
        fillColor: '#F1F5F9',
        alignment: 'left'
      },
      tableCell: {
        fontSize: 11,
        color: '#334155',
        lineHeight: 1.5,
        alignment: 'left'
      }
    };
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

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        const text = paragraphBuffer.join(' ').trim();
        if (text) content.push({ text: this.cleanText(text), style: 'paragraph' });
        paragraphBuffer = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBuffer.length > 0) {
        content.push({
          text: codeBuffer.join('\n'),
          style: 'codeBlock',
          margin: [20, 14, 20, 18],
          fillColor: '#F8FAFC'
        });
        codeBuffer = [];
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0 && tableHeaders.length > 0) {
        const colCount = tableHeaders.length;
        const colWidth = Math.floor(515 / colCount);
        
        content.push({
          table: {
            headerRows: 1,
            widths: Array(colCount).fill(colWidth),
            body: [
              tableHeaders.map(h => ({ 
                text: this.cleanText(h), 
                style: 'tableHeader',
                fillColor: '#F1F5F9',
                margin: [8, 8, 8, 8]
              })),
              ...tableRows.map(row => 
                row.map(cell => ({ 
                  text: this.cleanText(cell), 
                  style: 'tableCell',
                  margin: [8, 6, 8, 6]
                }))
              )
            ]
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#E2E8F0',
            vLineColor: () => '#E2E8F0',
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0
          },
          margin: [0, 12, 0, 18]
        });
        tableRows = [];
        tableHeaders = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Code block detection
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

      if (!trimmed) {
        flushParagraph();
        flushTable();
        continue;
      }

      // Table detection
      if (trimmed.includes('|') && !inTable) {
        flushParagraph();
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

      const isModuleHeading = trimmed.startsWith('# ') && 
                              /^#\s+module\s+\d+/i.test(trimmed);

      if (trimmed.startsWith('# ')) {
        flushParagraph();
        const text = this.cleanText(trimmed.substring(2));
        this.tocItems.push({ title: text, level: 1 });
        
        if (isModuleHeading) {
          if (!isFirstModule) {
            content.push({ text: '', pageBreak: 'before' });
          }
          isFirstModule = false;
          content.push({ text, style: 'h1Module' });
        } else {
          content.push({ text, style: 'h1Module' });
        }
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        const text = this.cleanText(trimmed.substring(3));
        this.tocItems.push({ title: text, level: 2 });
        content.push({ text, style: 'h2' });
      } else if (trimmed.startsWith('### ')) {
        flushParagraph();
        content.push({ text: this.cleanText(trimmed.substring(4)), style: 'h3' });
      } else if (trimmed.startsWith('#### ')) {
        flushParagraph();
        content.push({ text: this.cleanText(trimmed.substring(5)), style: 'h4' });
      } else if (trimmed.match(/^[-*+]\s+/)) {
        flushParagraph();
        content.push({ 
          text: '•  ' + this.cleanText(trimmed.replace(/^[-*+]\s+/, '')), 
          style: 'listItem',
          margin: [12, 7, 0, 7]
        });
      } else if (trimmed.match(/^\d+\.\s+/)) {
        flushParagraph();
        const num = trimmed.match(/^(\d+)\./)?.[1] || '';
        content.push({ 
          text: num + '.  ' + this.cleanText(trimmed.replace(/^\d+\.\s+/, '')), 
          style: 'listItem',
          margin: [12, 7, 0, 7]
        });
      } else if (trimmed.startsWith('>')) {
        flushParagraph();
        content.push({ 
          text: this.cleanText(trimmed.substring(1).trim()), 
          style: 'blockquote',
          canvas: [{
            type: 'line',
            x1: -10, y1: 0,
            x2: -10, y2: 20,
            lineWidth: 3,
            lineColor: '#CBD5E0'
          }]
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

  private createTableOfContents(): PDFContent[] {
    // Skip ToC generation - it's already in the markdown
    return [];
  }

  private createCoverPage(title: string, metadata: { 
    words: number; 
    modules: number; 
    date: string;
    provider?: string;
    model?: string;
  }): PDFContent[] {
    return [
      // Geometric decorative pattern at top
      {
        canvas: [
          // Top accent line
          {
            type: 'rect',
            x: 0, y: 0,
            w: 515, h: 4,
            color: '#3B82F6'
          },
          // Subtle geometric shapes
          {
            type: 'rect',
            x: 0, y: 8,
            w: 2, h: 40,
            color: '#3B82F6',
            opacity: 0.3
          },
          {
            type: 'rect',
            x: 513, y: 8,
            w: 2, h: 40,
            color: '#3B82F6',
            opacity: 0.3
          }
        ],
        margin: [0, 0, 0, 0]
      },
      
      // Large icon/badge area
      {
        canvas: [
          {
            type: 'ellipse',
            x: 257.5, y: 120,
            r1: 60, r2: 60,
            color: '#EFF6FF',
            lineColor: '#3B82F6',
            lineWidth: 2
          },
          // Inner circle
          {
            type: 'ellipse',
            x: 257.5, y: 120,
            r1: 50, r2: 50,
            color: '#DBEAFE'
          }
        ],
        margin: [0, 80, 0, 30]
      },
      
      // AI Book icon (simplified)
      {
        canvas: [
          // Book pages
          {
            type: 'rect',
            x: 227, y: 0,
            w: 50, h: 35,
            color: '#3B82F6'
          },
          {
            type: 'rect',
            x: 232, y: 5,
            w: 40, h: 25,
            color: '#FFFFFF'
          },
          // Lines on page
          {
            type: 'line',
            x1: 237, y1: 12,
            x2: 267, y2: 12,
            lineWidth: 1.5,
            lineColor: '#3B82F6'
          },
          {
            type: 'line',
            x1: 237, y1: 18,
            x2: 267, y2: 18,
            lineWidth: 1.5,
            lineColor: '#3B82F6'
          },
          {
            type: 'line',
            x1: 237, y1: 24,
            x2: 267, y2: 24,
            lineWidth: 1.5,
            lineColor: '#3B82F6'
          }
        ],
        margin: [0, -60, 0, 50]
      },
      
      // Title with better spacing
      { 
        text: title, 
        style: 'coverTitle',
        margin: [0, 0, 0, 30]
      },
      
      // Elegant subtitle divider
      {
        canvas: [{
          type: 'line',
          x1: 180, y1: 0,
          x2: 335, y2: 0,
          lineWidth: 1.5,
          lineColor: '#CBD5E0'
        }],
        margin: [0, 0, 0, 35]
      },
      
      // Metadata cards with icons
      {
        columns: [
          { width: 50, text: '' },
          {
            width: '*',
            stack: [
              // Word count
              {
                columns: [
                  {
                    canvas: [{
                      type: 'ellipse',
                      x: 15, y: 10,
                      r1: 15, r2: 15,
                      color: '#EFF6FF'
                    }],
                    width: 30
                  },
                  {
                    stack: [
                      { 
                        text: `${metadata.words.toLocaleString()}`, 
                        style: { fontSize: 22, bold: true, color: '#1E293B' }
                      },
                      { 
                        text: 'words', 
                        style: { fontSize: 11, color: '#64748B', margin: [0, 2, 0, 0] }
                      }
                    ],
                    width: '*'
                  }
                ],
                margin: [0, 0, 0, 20]
              },
              // Chapter count
              {
                columns: [
                  {
                    canvas: [{
                      type: 'ellipse',
                      x: 15, y: 10,
                      r1: 15, r2: 15,
                      color: '#F0F9FF'
                    }],
                    width: 30
                  },
                  {
                    stack: [
                      { 
                        text: `${metadata.modules}`, 
                        style: { fontSize: 22, bold: true, color: '#1E293B' }
                      },
                      { 
                        text: 'chapters', 
                        style: { fontSize: 11, color: '#64748B', margin: [0, 2, 0, 0] }
                      }
                    ],
                    width: '*'
                  }
                ],
                margin: [0, 0, 0, 20]
              },
              // Date
              {
                columns: [
                  {
                    canvas: [{
                      type: 'ellipse',
                      x: 15, y: 10,
                      r1: 15, r2: 15,
                      color: '#F8FAFC'
                    }],
                    width: 30
                  },
                  {
                    stack: [
                      { 
                        text: metadata.date, 
                        style: { fontSize: 13, color: '#475569', margin: [0, 8, 0, 0] }
                      }
                    ],
                    width: '*'
                  }
                ]
              }
            ]
          },
          { width: 50, text: '' }
        ],
        margin: [0, 0, 0, 50]
      },
      
      // AI Model info with badge
      ...(metadata.provider && metadata.model ? [{
        stack: [
          {
            text: 'POWERED BY',
            style: {
              fontSize: 9,
              alignment: 'center',
              color: '#94A3B8',
              letterSpacing: 2,
              margin: [0, 0, 0, 8]
            }
          },
          {
            text: `${metadata.provider} ${metadata.model}`,
            style: { 
              fontSize: 12, 
              alignment: 'center', 
              color: '#475569',
              bold: true,
              margin: [0, 0, 0, 0]
            }
          }
        ],
        margin: [0, 40, 0, 0]
      }] : []),
      
      // Bottom branding with accent
      {
        stack: [
          {
            canvas: [{
              type: 'line',
              x1: 200, y1: 0,
              x2: 315, y2: 0,
              lineWidth: 1,
              lineColor: '#E2E8F0'
            }],
            margin: [0, 0, 0, 15]
          },
          { 
            text: 'Pustakam AI', 
            style: { 
              fontSize: 14, 
              alignment: 'center', 
              color: '#3B82F6',
              bold: true,
              margin: [0, 0, 0, 5]
            }
          },
          { 
            text: 'Book Engine', 
            style: { 
              fontSize: 10, 
              alignment: 'center', 
              color: '#94A3B8',
              margin: [0, 0, 0, 0]
            }
          }
        ],
        margin: [0, 80, 0, 0]
      },
      
      { text: '', pageBreak: 'after' }
    ];
  }

  public async generate(project: BookProject, onProgress: (progress: number) => void): Promise<void> {
    console.log('🎨 Starting premium PDF generation for:', project.title);
    onProgress(10);
    
    const pdfMakeLib = await loadPdfMake();
    onProgress(25);

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
        fontSize: 12, 
        color: '#1E293B',
        lineHeight: 1.6
      },
      pageSize: 'A4',
      pageMargins: [75, 90, 75, 80],
      
      header: (currentPage: number) => {
        if (currentPage <= 2) return {};
        
        return {
          columns: [
            { 
              text: project.title, 
              style: { 
                fontSize: 9, 
                color: '#64748B', 
                italics: true 
              }, 
              margin: [75, 30, 0, 0], 
              width: '*' 
            },
            { 
              canvas: [{ 
                type: 'line', 
                x1: 0, y1: 0, 
                x2: 80, y2: 0, 
                lineWidth: 0.5, 
                lineColor: '#CBD5E0' 
              }], 
              margin: [0, 35, 75, 0], 
              width: 80 
            }
          ]
        };
      },
      
      footer: (currentPage: number, pageCount: number) => {
        if (currentPage <= 2) return {};
        
        const pageNumber = currentPage - 2;
        
        return {
          columns: [
            { 
              text: 'Pustakam AI', 
              style: { 
                fontSize: 8, 
                color: '#94A3B8' 
              }, 
              margin: [75, 0, 0, 0] 
            },
            { 
              text: `${pageNumber}`, 
              alignment: 'center', 
              style: { 
                fontSize: 11, 
                color: '#475569', 
                bold: true 
              } 
            },
            { 
              text: '', 
              margin: [0, 0, 75, 0] 
            }
          ],
          margin: [0, 30, 0, 0]
        };
      },
      
      info: { 
        title: project.title, 
        author: 'Pustakam AI', 
        creator: 'Pustakam Book Generator',
        subject: project.goal,
        keywords: 'AI, Book, Education'
      }
    };

    onProgress(85);
    console.log('📄 Creating premium PDF document...');

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
              <h3 class="text-lg font-semibold text-white">Premium PDF Ready</h3>
            </div>
            
            <div class="space-y-3 mb-6">
              <p class="text-sm text-gray-300 leading-relaxed">
                Your professionally formatted PDF is ready!
              </p>
              <ul class="space-y-2 text-sm text-gray-400">
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Enhanced typography and spacing</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Professional table formatting</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Elegant cover and TOC</span></li>
                ${hasEmojis ? '<li class="flex items-start gap-2"><span class="text-yellow-400 shrink-0">•</span><span>Emojis removed for compatibility</span></li>' : ''}
                ${hasComplexFormatting ? '<li class="flex items-start gap-2"><span class="text-yellow-400 shrink-0">•</span><span>Advanced formatting simplified</span></li>' : ''}
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
            console.log('✅ Premium PDF downloaded:', filename);
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
      const generator = new PremiumPdfGenerator();
      await generator.generate(project, onProgress);
      console.log('🎉 Premium PDF generation completed successfully');
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
