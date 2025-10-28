// src/services/pdfService.ts - PREMIUM ELEGANT VERSION
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
}

class PremiumPdfGenerator {
  private content: PDFContent[] = [];
  private styles: any;

  constructor() {
    this.styles = {
      // Cover page styles - Elegant and spacious
      coverTitle: { 
        fontSize: 36, 
        bold: true, 
        alignment: 'center', 
        margin: [30, 0, 30, 0], 
        color: '#1a202c',
        lineHeight: 1.3,
        characterSpacing: 1
      },
      coverSubtitle: { 
        fontSize: 13, 
        alignment: 'center', 
        color: '#4a5568', 
        margin: [0, 0, 0, 8]
      },
      
      // Content styles - Professional hierarchy
      h1Module: { 
        fontSize: 26, 
        bold: true, 
        margin: [0, 0, 0, 18], 
        color: '#1a202c',
        lineHeight: 1.35,
        characterSpacing: 0.5
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
      
      // Text styles - Optimized readability
      paragraph: { 
        fontSize: 11, 
        lineHeight: 1.75, 
        alignment: 'left', 
        margin: [0, 0, 0, 11], 
        color: '#2d3748'
      },
      listItem: { 
        fontSize: 11, 
        lineHeight: 1.65, 
        margin: [0, 3, 0, 3], 
        color: '#2d3748'
      },
      
      // Special elements
      codeBlock: { 
        fontSize: 9.5, 
        margin: [12, 10, 12, 10], 
        color: '#2d3748',
        background: '#f7fafc',
        fillColor: '#f7fafc',
        preserveLeadingSpaces: true,
        lineHeight: 1.5
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
        if (text && !skipToC) content.push({ text: this.cleanText(text), style: 'paragraph' });
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
                fillColor: '#edf2f7',
                margin: [5, 5, 5, 5],
                alignment: 'left'
              })),
              ...tableRows.map(row => 
                row.map(cell => ({ 
                  text: this.cleanText(cell), 
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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Detect ToC section (skip it)
      if (trimmed.match(/^#{1,2}\s+(table of contents|contents)/i)) {
        skipToC = true;
        tocDepth = (trimmed.match(/^#+/) || [''])[0].length;
        continue;
      }

      // Exit ToC when we hit a heading of same or higher level
      if (skipToC && trimmed.match(/^#{1,2}\s+/)) {
        const currentDepth = (trimmed.match(/^#+/) || [''])[0].length;
        if (currentDepth <= tocDepth) {
          skipToC = false;
        }
      }

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

      if (!trimmed || skipToC) {
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
          text: '• ' + this.cleanText(trimmed.replace(/^[-*+]\s+/, '')), 
          style: 'listItem',
          margin: [10, 3, 0, 3]
        });
      } else if (trimmed.match(/^\d+\.\s+/)) {
        flushParagraph();
        const num = trimmed.match(/^(\d+)\./)?.[1] || '';
        content.push({ 
          text: num + '. ' + this.cleanText(trimmed.replace(/^\d+\.\s+/, '')), 
          style: 'listItem',
          margin: [10, 3, 0, 3]
        });
      } else if (trimmed.startsWith('>')) {
        flushParagraph();
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
              text: this.cleanText(trimmed.substring(1).trim()),
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
  }): PDFContent[] {
    return [
      // Elegant top decoration
      {
        canvas: [
          {
            type: 'rect',
            x: 0, y: 0,
            w: 200, h: 2,
            color: '#667eea'
          }
        ],
        margin: [0, 60, 0, 0]
      },
      
      // Title with elegant spacing
      { 
        text: title, 
        style: 'coverTitle',
        margin: [30, 180, 30, 20]
      },
      
      // Subtle divider
      {
        canvas: [{
          type: 'line',
          x1: 140, y1: 0,
          x2: 375, y2: 0,
          lineWidth: 0.5,
          lineColor: '#cbd5e0'
        }],
        margin: [0, 0, 0, 30]
      },
      
      // Metadata with elegant presentation
      {
        stack: [
          { 
            text: `${metadata.words.toLocaleString()} WORDS  •  ${metadata.modules} CHAPTERS`, 
            fontSize: 11,
            alignment: 'center',
            color: '#718096',
            characterSpacing: 1,
            margin: [0, 0, 0, 10]
          },
          { 
            text: metadata.date, 
            fontSize: 12,
            alignment: 'center',
            color: '#4a5568',
            margin: [0, 0, 0, 0]
          }
        ]
      },
      
      // AI info
      ...(metadata.provider && metadata.model ? [{
        text: `Generated with ${metadata.provider} ${metadata.model}`,
        fontSize: 10,
        alignment: 'center',
        color: '#a0aec0',
        italics: true,
        margin: [0, 45, 0, 0]
      }] : []),
      
      // Bottom decoration
      {
        canvas: [
          {
            type: 'rect',
            x: 215, y: 0,
            w: 85, h: 1.5,
            color: '#667eea'
          }
        ],
        margin: [0, 120, 0, 12]
      },
      
      // Branding
      {
        text: 'PUSTAKAM AI',
        fontSize: 10,
        alignment: 'center',
        color: '#667eea',
        bold: true,
        characterSpacing: 2,
        margin: [0, 0, 0, 0]
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
    
    onProgress(75);
    this.content = [...coverContent, ...mainContent];

    const docDefinition: any = {
      content: this.content,
      styles: this.styles,
      defaultStyle: { 
        font: 'Roboto', 
        fontSize: 11, 
        color: '#2d3748',
        lineHeight: 1.7
      },
      pageSize: 'A4',
      pageMargins: [65, 75, 65, 70],
      
      header: (currentPage: number) => {
        if (currentPage <= 1) return {};
        
        return {
          text: project.title,
          fontSize: 8.5,
          color: '#718096',
          italics: true,
          margin: [65, 25, 65, 0]
        };
      },
      
      footer: (currentPage: number, pageCount: number) => {
        if (currentPage <= 1) return {};
        
        const pageNumber = currentPage - 1;
        
        return {
          columns: [
            { 
              text: 'Pustakam AI', 
              fontSize: 7.5,
              color: '#a0aec0',
              margin: [65, 0, 0, 0],
              width: '*'
            },
            { 
              text: `${pageNumber}`, 
              alignment: 'center', 
              fontSize: 10,
              color: '#4a5568',
              bold: true,
              width: 'auto'
            },
            { 
              text: '', 
              margin: [0, 0, 65, 0],
              width: '*'
            }
          ],
          margin: [0, 25, 0, 0]
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
              <div class="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-400">
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
                Your elegantly formatted PDF is ready for download!
              </p>
              <ul class="space-y-2 text-sm text-gray-400">
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Refined typography & spacing</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Professional table layout</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Elegant cover design</span></li>
                ${hasEmojis ? '<li class="flex items-start gap-2"><span class="text-yellow-400 shrink-0">•</span><span>Emojis removed for compatibility</span></li>' : ''}
                ${hasComplexFormatting ? '<li class="flex items-start gap-2"><span class="text-yellow-400 shrink-0">•</span><span>Advanced formatting simplified</span></li>' : ''}
              </ul>
            </div>
            
            <div class="flex gap-3">
              <button id="cancel-pdf" class="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white font-medium transition-all">
                Cancel
              </button>
              <button id="download-pdf" class="flex-1 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-semibold transition-all shadow-lg">
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
