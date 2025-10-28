// src/services/pdfService.ts - FIXED PROFESSIONAL VERSION
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
}

class ProfessionalPdfGenerator {
  private content: PDFContent[] = [];
  private styles: any;

  constructor() {
    this.styles = {
      coverTitle: {
        fontSize: 32,
        bold: true,
        alignment: 'left',
        margin: [0, 0, 0, 12],
        color: '#1a1a1a',
        lineHeight: 1.2,
        characterSpacing: 0.5
      },
      coverSubtitle: {
        fontSize: 13,
        alignment: 'left',
        color: '#666666',
        margin: [0, 0, 0, 50],
        lineHeight: 1.3
      },

      h1Module: {
        fontSize: 24,
        bold: true,
        margin: [0, 0, 0, 16],
        color: '#1a202c',
        lineHeight: 1.3,
        characterSpacing: 0.3
      },
      h2: {
        fontSize: 16,
        bold: true,
        margin: [0, 20, 0, 10],
        color: '#2d3748',
        lineHeight: 1.3
      },
      h3: {
        fontSize: 14,
        bold: true,
        margin: [0, 16, 0, 8],
        color: '#2d3748',
        lineHeight: 1.3
      },
      h4: {
        fontSize: 12,
        bold: true,
        margin: [0, 14, 0, 7],
        color: '#4a5568'
      },

      paragraph: {
        fontSize: 10.5,
        lineHeight: 1.65,
        alignment: 'justify',
        margin: [0, 0, 0, 11],
        color: '#1a1a1a'
      },
      listItem: {
        fontSize: 10.5,
        lineHeight: 1.6,
        margin: [0, 3, 0, 3],
        color: '#1a1a1a'
      },

      codeBlock: {
        fontSize: 9,
        margin: [15, 12, 15, 12],
        color: '#2d3748',
        background: '#f7fafc',
        preserveLeadingSpaces: true,
        lineHeight: 1.5,
        font: 'Courier'
      },
      blockquote: {
        fontSize: 10.5,
        italics: true,
        margin: [20, 12, 15, 12],
        color: '#4a5568',
        lineHeight: 1.65
      },

      tableHeader: {
        fontSize: 10,
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
    markdown = markdown.replace(/Of course\.\s+Here is.*?(?=\n#)/gs, '');
    markdown = markdown.replace(/\*\*\*\n+/g, '');

    const lines = markdown.split('\n');
    let paragraphBuffer: string[] = [];
    let isFirstModule = true;
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeaders: string[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let skipSection = false;

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        const text = paragraphBuffer.join(' ').trim();
        if (text && !skipSection) content.push({ text: this.cleanText(text), style: 'paragraph' });
        paragraphBuffer = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBuffer.length > 0 && !skipSection) {
        content.push({
          stack: [
            {
              text: codeBuffer.join('\n'),
              style: 'codeBlock',
              background: '#f7fafc'
            }
          ],
          background: '#f7fafc',
          margin: [15, 12, 15, 12]
        });
        codeBuffer = [];
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0 && tableHeaders.length > 0 && !skipSection) {
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
                margin: [6, 5, 6, 5],
                alignment: 'left'
              })),
              ...tableRows.map(row =>
                row.map(cell => ({
                  text: this.cleanText(cell),
                  style: 'tableCell',
                  margin: [6, 4, 6, 4],
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

      if (trimmed.match(/^#{1,3}\s+(table of contents|contents|summary)$/i)) {
        skipSection = true;
        continue;
      }

      if (skipSection && trimmed.match(/^#{1,2}\s+(?!table of contents|contents|summary)/i)) {
        skipSection = false;
      }

      if (trimmed.match(/^(-{3,}|\*{3,})$/) || trimmed === '***') {
        flushParagraph();
        if (!skipSection) {
          content.push({
            canvas: [{
              type: 'line',
              x1: 0, y1: 0,
              x2: 515, y2: 0,
              lineWidth: 0.5,
              lineColor: '#cbd5e0'
            }],
            margin: [0, 16, 0, 16]
          });
        }
        continue;
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

      if (!trimmed || skipSection) {
        flushParagraph();
        flushTable();
        continue;
      }

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

      const isModuleHeading = trimmed.match(/^#\s+module\s+\d+/i);
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
          text: '• ' + this.cleanText(trimmed.replace(/^[-*+]\s+/, '')),
          style: 'listItem',
          margin: [12, 3, 0, 3]
        });
      } else if (trimmed.match(/^\d+\.\s+/)) {
        flushParagraph();
        const num = trimmed.match(/^(\d+)\./)?.[1] || '';
        content.push({
          text: num + '. ' + this.cleanText(trimmed.replace(/^\d+\.\s+/, '')),
          style: 'listItem',
          margin: [12, 3, 0, 3]
        });
      } else if (trimmed.startsWith('>')) {
        flushParagraph();
        content.push({
          columns: [
            {
              width: 4,
              canvas: [{
                type: 'rect',
                x: 0, y: 0,
                w: 4, h: '100%',
                color: '#667eea'
              }]
            },
            {
              width: '*',
              text: this.cleanText(trimmed.substring(1).trim()),
              style: 'blockquote',
              margin: [10, 0, 0, 0]
            }
          ],
          margin: [15, 12, 15, 12]
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
      { text: '', margin: [0, 100, 0, 0] },
      { text: title, style: 'coverTitle' },
      { text: 'Generated by Pustakam Engine', style: 'coverSubtitle' },
      {
        text: 'Abstract',
        fontSize: 12,
        bold: true,
        color: '#1a1a1a',
        margin: [0, 0, 0, 10]
      },
      {
        text: `This comprehensive ${metadata.modules}-chapter document contains ${metadata.words.toLocaleString()} words of AI-generated content. Each section has been carefully structured to provide in-depth coverage of the topic with clear explanations and practical insights.`,
        fontSize: 10.5,
        lineHeight: 1.65,
        alignment: 'justify',
        color: '#2d3748',
        margin: [0, 0, 0, 40]
      },
      {
        stack: [
          {
            text: 'Document Information',
            fontSize: 12,
            bold: true,
            color: '#1a1a1a',
            margin: [0, 0, 0, 12]
          },
          {
            columns: [
              { text: 'Word Count:', width: 100, fontSize: 10, color: '#666666', bold: true },
              { text: metadata.words.toLocaleString(), fontSize: 10, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 6]
          },
          {
            columns: [
              { text: 'Chapters:', width: 100, fontSize: 10, color: '#666666', bold: true },
              { text: metadata.modules.toString(), fontSize: 10, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 6]
          },
          {
            columns: [
              { text: 'Generated:', width: 100, fontSize: 10, color: '#666666', bold: true },
              { text: metadata.date, fontSize: 10, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 6]
          },
          ...(metadata.provider && metadata.model ? [{
            columns: [
              { text: 'AI Model:', width: 100, fontSize: 10, color: '#666666', bold: true },
              { text: `${metadata.provider} ${metadata.model}`, fontSize: 10, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 6]
          }] : [])
        ]
      },
      { text: '', margin: [0, 0, 0, 100] },
      {
        stack: [
          {
            canvas: [{
              type: 'line',
              x1: 0, y1: 0,
              x2: 120, y2: 0,
              lineWidth: 1.5,
              lineColor: '#1a1a1a'
            }],
            margin: [0, 0, 0, 15]
          },
          {
            text: 'Pustakam Engine',
            fontSize: 11,
            bold: true,
            color: '#1a1a1a',
            margin: [0, 0, 0, 5]
          },
          {
            text: 'AI-Powered Knowledge Creation',
            fontSize: 9.5,
            color: '#666666',
            margin: [0, 0, 0, 10]
          },
          {
            text: 'Tanmay Kalbande',
            fontSize: 9.5,
            color: '#1a1a1a',
            link: 'https://www.linkedin.com/in/tanmay-kalbande/',
            decoration: 'underline',
            decorationColor: '#667eea'
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
    onProgress(25);
    const totalWords = project.modules.reduce((sum, m) => sum + m.wordCount, 0);

    const providerMatch = project.finalBook?.match(/\*\*Provider:\*\* (.+?) $(.+?)$/);
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
        fontSize: 10.5,
        color: '#1a1a1a',
        lineHeight: 1.65
      },
      pageSize: 'A4',
      pageMargins: [70, 75, 70, 70],

      header: (currentPage: number) => {
        if (currentPage <= 1) return {};
        return {
          columns: [
            {
              text: project.title,
              fontSize: 8.5,
              color: '#666666',
              italics: true,
              width: '*'
            },
            {
              text: `Page ${currentPage - 1}`,
              fontSize: 8.5,
              color: '#666666',
              alignment: 'right',
              width: 'auto'
            }
          ],
          margin: [70, 25, 70, 0]
        };
      },

      footer: (currentPage: number) => {
        if (currentPage <= 1) return {};
        return {
          columns: [
            {
              text: 'Pustakam Engine',
              fontSize: 7.5,
              color: '#999999',
              margin: [70, 0, 0, 0],
              width: '*'
            },
            {
              text: 'https://www.linkedin.com/in/tanmay-kalbande/',
              fontSize: 7.5,
              color: '#999999',
              alignment: 'right',
              margin: [0, 0, 70, 0],
              width: '*'
            }
          ],
          margin: [0, 22, 0, 0]
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
        const filename = `\${project.title
          .replace(/[^a-z0-9\s-]/gi, '')
          .replace(/\s+/g, '_')
          .toLowerCase()
          .substring(0, 50)}_\${new Date().toISOString().slice(0, 10)}.pdf`;

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
                Your document has been formatted with professional typography inspired by academic publications.
              </p>
              <ul class="space-y-2 text-sm text-gray-400">
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Clean 10.5pt body text with optimal readability</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Professional cover page design</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Justified text with proper spacing</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>AI preambles removed</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Enhanced code blocks and tables</span></li>
              </ul>
            </div>

            <div class="flex gap-3">
              <button id="cancel-pdf" class="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover\:bg-white/10 hover\:text-white font-medium transition-all">
                Cancel
              </button>
              <button id="download-pdf" class="flex-1 px-4 py-2.5 bg-blue-500 hover\:bg-blue-600 rounded-lg text-white font-semibold transition-all shadow-lg">
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
