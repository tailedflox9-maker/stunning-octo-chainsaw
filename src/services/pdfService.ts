// src/services/pdfService.ts - ENHANCED VERSION
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
      },
      Courier: {
        normal: 'Courier',
        bold: 'Courier-Bold',
        italics: 'Courier-Oblique',
        bolditalics: 'Courier-BoldOblique'
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
}

class PremiumPdfGenerator {
  private content: PDFContent[] = [];
  private styles: any;
  private tocItems: { title: string; level: number; page?: number }[] = [];

  constructor() {
    this.styles = {
      // Cover page styles
      coverTitle: { 
        fontSize: 36, 
        bold: true, 
        alignment: 'center', 
        margin: [0, 180, 0, 30], 
        color: '#1a1a1a',
        lineHeight: 1.3
      },
      coverSubtitle: { 
        fontSize: 14, 
        alignment: 'center', 
        color: '#555555', 
        margin: [0, 0, 0, 10] 
      },
      coverBrand: { 
        fontSize: 11, 
        alignment: 'center', 
        color: '#888888', 
        margin: [0, 100, 0, 0], 
        italics: true 
      },
      
      // TOC styles
      tocTitle: { 
        fontSize: 26, 
        bold: true, 
        margin: [0, 50, 0, 30], 
        color: '#1a1a1a' 
      },
      tocH1: { 
        fontSize: 13, 
        bold: true, 
        margin: [0, 14, 0, 8], 
        color: '#2a2a2a' 
      },
      tocH2: { 
        fontSize: 11, 
        margin: [20, 8, 0, 6], 
        color: '#4a5568' 
      },
      
      // Content styles
      h1Module: { 
        fontSize: 28, 
        bold: true, 
        margin: [0, 0, 0, 20], 
        color: '#1a1a1a',
        lineHeight: 1.4
      },
      h2: { 
        fontSize: 20, 
        bold: true, 
        margin: [0, 28, 0, 14], 
        color: '#2a2a2a',
        lineHeight: 1.3
      },
      h3: { 
        fontSize: 17, 
        bold: true, 
        margin: [0, 22, 0, 12], 
        color: '#333333',
        lineHeight: 1.3
      },
      h4: { 
        fontSize: 15, 
        bold: true, 
        margin: [0, 18, 0, 10], 
        color: '#444444' 
      },
      
      // Text styles
      paragraph: { 
        fontSize: 11.5, 
        lineHeight: 1.8, 
        alignment: 'justify', 
        margin: [0, 0, 0, 16], 
        color: '#2a2a2a' 
      },
      listItem: { 
        fontSize: 11.5, 
        lineHeight: 1.75, 
        margin: [0, 6, 0, 6], 
        color: '#2a2a2a' 
      },
      
      // Special elements
      codeBlock: { 
        font: 'Courier', 
        fontSize: 9.5, 
        margin: [15, 12, 15, 16], 
        color: '#2d3748',
        background: '#f7fafc'
      },
      blockquote: { 
        fontSize: 11, 
        italics: true, 
        margin: [25, 16, 0, 16], 
        color: '#4a5568',
        lineHeight: 1.7
      },
      
      // Table styles
      tableHeader: {
        fontSize: 11,
        bold: true,
        color: '#2a2a2a',
        fillColor: '#f7fafc'
      },
      tableCell: {
        fontSize: 10.5,
        color: '#2a2a2a',
        lineHeight: 1.4
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

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        const text = paragraphBuffer.join(' ').trim();
        if (text) content.push({ text: this.cleanText(text), style: 'paragraph' });
        paragraphBuffer = [];
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0 && tableHeaders.length > 0) {
        content.push({
          table: {
            headerRows: 1,
            widths: Array(tableHeaders.length).fill('*'),
            body: [
              tableHeaders.map(h => ({ 
                text: this.cleanText(h), 
                style: 'tableHeader', 
                fillColor: '#f7fafc' 
              })),
              ...tableRows.map(row => 
                row.map(cell => ({ 
                  text: this.cleanText(cell), 
                  style: 'tableCell' 
                }))
              )
            ]
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#cbd5e0',
            vLineColor: () => '#cbd5e0',
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6
          },
          margin: [0, 10, 0, 15]
        });
        tableRows = [];
        tableHeaders = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      if (!trimmed) {
        flushParagraph();
        flushTable();
        continue;
      }

      // Table detection
      if (trimmed.includes('|') && !inTable) {
        flushParagraph();
        const cells = trimmed.split('|').filter(c => c.trim()).map(c => c.trim());
        
        // Check if next line is separator
        const nextLine = lines[i + 1]?.trim() || '';
        if (nextLine.match(/^\|?[\s\-:]+\|/)) {
          tableHeaders = cells;
          inTable = true;
          i++; // Skip separator line
          continue;
        }
      }

      // Table row
      if (inTable && trimmed.includes('|')) {
        const cells = trimmed.split('|').filter(c => c.trim()).map(c => c.trim());
        if (cells.length === tableHeaders.length) {
          tableRows.push(cells);
          continue;
        } else {
          flushTable();
        }
      }

      // If we were in a table but this line isn't part of it
      if (inTable && !trimmed.includes('|')) {
        flushTable();
      }

      // Check if this is a module heading (# Module X:)
      const isModuleHeading = trimmed.startsWith('# ') && 
                              /^#\s+module\s+\d+/i.test(trimmed);

      if (trimmed.startsWith('# ')) {
        flushParagraph();
        const text = this.cleanText(trimmed.substring(2));
        this.tocItems.push({ title: text, level: 1 });
        
        if (isModuleHeading) {
          // Add page break BEFORE each module (except first)
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
          text: '• ' + this.cleanText(trimmed.replace(/^[-*+]\s+/, '')), 
          style: 'listItem' 
        });
      } else if (trimmed.match(/^\d+\.\s+/)) {
        flushParagraph();
        const num = trimmed.match(/^(\d+)\./)?.[1] || '';
        content.push({ 
          text: num + '. ' + this.cleanText(trimmed.replace(/^\d+\.\s+/, '')), 
          style: 'listItem' 
        });
      } else if (trimmed.startsWith('>')) {
        flushParagraph();
        content.push({ 
          text: this.cleanText(trimmed.substring(1).trim()), 
          style: 'blockquote' 
        });
      } else {
        const cleaned = this.cleanText(trimmed);
        if (cleaned) paragraphBuffer.push(cleaned);
      }
    }

    flushParagraph();
    flushTable();
    return content;
  }

  private createTableOfContents(): PDFContent[] {
    if (this.tocItems.length === 0) return [];
    
    return [
      { text: 'Table of Contents', style: 'tocTitle' },
      { 
        canvas: [{ 
          type: 'line', 
          x1: 0, y1: 0, 
          x2: 515, y2: 0, 
          lineWidth: 1.5, 
          lineColor: '#cbd5e0' 
        }], 
        margin: [0, 0, 0, 25] 
      },
      ...this.tocItems.map((item, i) => ({
        text: `${i + 1}. ${item.title}`,
        style: item.level === 1 ? 'tocH1' : 'tocH2'
      })),
      { text: '', pageBreak: 'after' }
    ];
  }

  private createCoverPage(title: string, metadata: { 
    words: number; 
    modules: number; 
    date: string;
    provider?: string;
    model?: string;
  }): PDFContent[] {
    return [
      // Title
      { text: title, style: 'coverTitle' },
      
      // Elegant divider
      {
        canvas: [{
          type: 'line',
          x1: 100, y1: 0,
          x2: 415, y2: 0,
          lineWidth: 0.5,
          lineColor: '#cbd5e0'
        }],
        margin: [0, 25, 0, 25]
      },
      
      // Metadata
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            stack: [
              { 
                text: `${metadata.words.toLocaleString()} words`, 
                style: 'coverSubtitle',
                margin: [0, 0, 0, 8]
              },
              { 
                text: `${metadata.modules} chapters`, 
                style: 'coverSubtitle',
                margin: [0, 0, 0, 8]
              },
              { 
                text: metadata.date, 
                style: 'coverSubtitle', 
                margin: [0, 10, 0, 0] 
              }
            ]
          },
          { width: '*', text: '' }
        ]
      },
      
      // AI Model info (if available)
      ...(metadata.provider && metadata.model ? [{
        text: `Generated by ${metadata.provider} (${metadata.model})`,
        style: { 
          fontSize: 9, 
          alignment: 'center', 
          color: '#999999', 
          margin: [0, 30, 0, 0],
          italics: true
        }
      }] : []),
      
      // Branding
      { text: 'Pustakam AI Book Engine', style: 'coverBrand' },
      { text: '', pageBreak: 'after' }
    ];
  }

  public async generate(project: BookProject, onProgress: (progress: number) => void): Promise<void> {
    console.log('🎨 Starting enhanced PDF generation for:', project.title);
    onProgress(10);
    
    const pdfMakeLib = await loadPdfMake();
    onProgress(25);

    const totalWords = project.modules.reduce((sum, m) => sum + m.wordCount, 0);
    
    // Get AI provider info
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
        fontSize: 11.5, 
        color: '#2a2a2a' 
      },
      pageSize: 'A4',
      pageMargins: [70, 85, 70, 75],
      
      // Enhanced header
      header: (currentPage: number) => {
        if (currentPage <= 2) return {}; // Skip cover and TOC
        
        return {
          columns: [
            { 
              text: project.title, 
              style: { 
                fontSize: 9, 
                color: '#718096', 
                italics: true 
              }, 
              margin: [70, 25, 0, 0], 
              width: '*' 
            },
            { 
              canvas: [{ 
                type: 'line', 
                x1: 0, y1: 0, 
                x2: 60, y2: 0, 
                lineWidth: 0.5, 
                lineColor: '#cbd5e0' 
              }], 
              margin: [0, 30, 70, 0], 
              width: 60 
            }
          ]
        };
      },
      
      // Enhanced footer
      footer: (currentPage: number, pageCount: number) => {
        if (currentPage <= 2) return {}; // Skip cover and TOC
        
        const pageNumber = currentPage - 2; // Start counting from content pages
        
        return {
          columns: [
            { 
              text: 'Pustakam AI', 
              style: { 
                fontSize: 8, 
                color: '#a0aec0' 
              }, 
              margin: [70, 0, 0, 0] 
            },
            { 
              text: `${pageNumber}`, 
              alignment: 'center', 
              style: { 
                fontSize: 10, 
                color: '#4a5568', 
                bold: true 
              } 
            },
            { 
              text: '', 
              margin: [0, 0, 70, 0] 
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
    console.log('📄 Creating PDF document...');

    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMakeLib.createPdf(docDefinition);
        const filename = `${project.title
          .replace(/[^a-z0-9\s-]/gi, '')
          .replace(/\s+/g, '_')
          .toLowerCase()
          .substring(0, 50)}_${new Date().toISOString().slice(0, 10)}.pdf`;
        
        // Show warning popup before download
        const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu.test(
          project.finalBook || ''
        );
        
        const hasComplexFormatting = (project.finalBook || '').includes('```') || 
                                     (project.finalBook || '').includes('~~');
        
        if (hasEmojis || hasComplexFormatting) {
          // Create custom warning popup
          const popup = document.createElement('div');
          popup.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in';
          popup.innerHTML = `
            <div class="bg-[#1F1F1F] border border-[#2A2A2A] rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-400">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-white">PDF Format Notice</h3>
              </div>
              
              <div class="space-y-3 mb-6">
                <p class="text-sm text-gray-300 leading-relaxed">
                  Your PDF is ready to download! Please note:
                </p>
                <ul class="space-y-2 text-sm text-gray-400">
                  ${hasEmojis ? '<li class="flex items-start gap-2"><span class="text-yellow-400 shrink-0">•</span><span>Emojis have been removed for PDF compatibility</span></li>' : ''}
                  ${hasComplexFormatting ? '<li class="flex items-start gap-2"><span class="text-yellow-400 shrink-0">•</span><span>Some advanced formatting may be simplified</span></li>' : ''}
                  <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Tables and basic formatting are preserved</span></li>
                  <li class="flex items-start gap-2"><span class="text-blue-400 shrink-0">💡</span><span>For complete content, download the .md version</span></li>
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
          
          // Handle buttons
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
              console.log('✅ PDF downloaded:', filename);
              onProgress(100);
              resolve();
            });
          });
        } else {
          // No warnings needed, download directly
          pdfDocGenerator.download(filename, () => {
            console.log('✅ PDF downloaded:', filename);
            onProgress(100);
            resolve();
          });
        }
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
      console.log('🎉 PDF generation completed successfully');
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
