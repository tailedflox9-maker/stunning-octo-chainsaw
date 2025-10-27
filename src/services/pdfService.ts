// src/services/pdfService.ts - FINAL WORKING VERSION
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
    
    console.log('📚 Font module structure:', {
      hasPdfMake: !!fonts?.pdfMake,
      hasVfs: !!fonts?.vfs,
      directVfs: !!fonts?.pdfMake?.vfs
    });
    
    // Try all access patterns
    if (fonts?.pdfMake?.vfs) {
      pdfMake.vfs = fonts.pdfMake.vfs;
      console.log('✓ Loaded fonts via: fonts.pdfMake.vfs');
    } else if (fonts?.vfs) {
      pdfMake.vfs = fonts.vfs;
      console.log('✓ Loaded fonts via: fonts.vfs');
    } else {
      console.error('❌ No VFS found in fonts module');
      throw new Error('FONT_VFS_NOT_FOUND');
    }
    
    // Verify VFS has content
    if (!pdfMake.vfs || Object.keys(pdfMake.vfs).length === 0) {
      console.error('❌ VFS is empty');
      throw new Error('VFS_EMPTY');
    }
    
    console.log('✓ VFS loaded with', Object.keys(pdfMake.vfs).length, 'files');
    
    // CRITICAL FIX: Override default fonts to use only what's available
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
    
    console.log('✓ Font definitions set');
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
  private tocItems: { title: string; level: number }[] = [];
  private hasEmojis = false;

  constructor() {
    this.styles = {
      coverTitle: { fontSize: 34, bold: true, alignment: 'center', margin: [0, 150, 0, 25], color: '#1a1a1a' },
      coverSubtitle: { fontSize: 14, alignment: 'center', color: '#555555', margin: [0, 0, 0, 10] },
      coverBrand: { fontSize: 11, alignment: 'center', color: '#888888', margin: [0, 80, 0, 0], italics: true },
      tocTitle: { fontSize: 24, bold: true, margin: [0, 40, 0, 30], color: '#1a1a1a' },
      tocH1: { fontSize: 13, bold: true, margin: [0, 12, 0, 6], color: '#2a2a2a' },
      tocH2: { fontSize: 11, margin: [20, 6, 0, 4], color: '#4a5568' },
      h1: { fontSize: 26, bold: true, margin: [0, 30, 0, 15], color: '#1a1a1a' },
      h2: { fontSize: 19, bold: true, margin: [0, 24, 0, 12], color: '#2a2a2a' },
      h3: { fontSize: 16, bold: true, margin: [0, 18, 0, 10], color: '#333333' },
      h4: { fontSize: 14, bold: true, margin: [0, 15, 0, 8], color: '#444444' },
      paragraph: { fontSize: 11, lineHeight: 1.8, alignment: 'justify', margin: [0, 0, 0, 14], color: '#2a2a2a' },
      listItem: { fontSize: 11, lineHeight: 1.7, margin: [0, 5, 0, 5], color: '#2a2a2a' },
      codeBlock: { font: 'Courier', fontSize: 9, margin: [0, 10, 0, 15], color: '#2d3748' },
      blockquote: { fontSize: 11, italics: true, margin: [20, 15, 0, 15], color: '#4a5568' },
      warning: { fontSize: 10, color: '#d97706', margin: [0, 20, 0, 10], italics: true }
    };
  }

  private cleanText(text: string): string {
    if (/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu.test(text)) {
      this.hasEmojis = true;
    }

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

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        const text = paragraphBuffer.join(' ').trim();
        if (text) content.push({ text: this.cleanText(text), style: 'paragraph' });
        paragraphBuffer = [];
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        continue;
      }

      if (trimmed.startsWith('# ')) {
        flushParagraph();
        const text = this.cleanText(trimmed.substring(2));
        this.tocItems.push({ title: text, level: 1 });
        content.push({ text, style: 'h1' });
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
        content.push({ text: '• ' + this.cleanText(trimmed.replace(/^[-*+]\s+/, '')), style: 'listItem' });
      } else if (trimmed.match(/^\d+\.\s+/)) {
        flushParagraph();
        const num = trimmed.match(/^(\d+)\./)?.[1] || '';
        content.push({ text: num + '. ' + this.cleanText(trimmed.replace(/^\d+\.\s+/, '')), style: 'listItem' });
      } else {
        const cleaned = this.cleanText(trimmed);
        if (cleaned) paragraphBuffer.push(cleaned);
      }
    }

    flushParagraph();
    return content;
  }

  private createTableOfContents(): PDFContent[] {
    if (this.tocItems.length === 0) return [];
    return [
      { text: 'Table of Contents', style: 'tocTitle' },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#cbd5e0' }], margin: [0, 0, 0, 20] },
      ...this.tocItems.map((item, i) => ({ text: `${i + 1}. ${item.title}`, style: item.level === 1 ? 'tocH1' : 'tocH2' })),
      { text: '', pageBreak: 'after' }
    ];
  }

  private createCoverPage(title: string, metadata: { words: number; modules: number; date: string }): PDFContent[] {
    return [
      { canvas: [{ type: 'rect', x: 180, y: 0, w: 155, h: 5, color: '#2563eb' }], margin: [0, 100, 0, 0] },
      { text: title, style: 'coverTitle' },
      { canvas: [{ type: 'line', x1: 120, y1: 0, x2: 395, y2: 0, lineWidth: 1, lineColor: '#cbd5e0' }], margin: [0, 20, 0, 20] },
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            stack: [
              { text: `${metadata.words.toLocaleString()} words`, style: 'coverSubtitle' },
              { text: `${metadata.modules} chapters`, style: 'coverSubtitle' },
              { text: metadata.date, style: 'coverSubtitle', margin: [0, 10, 0, 0] }
            ]
          },
          { width: '*', text: '' }
        ]
      },
      { text: 'Generated by Pustakam AI', style: 'coverBrand' },
      { text: '', pageBreak: 'after' }
    ];
  }

  private createWarningPage(): PDFContent[] {
    if (!this.hasEmojis) return [];
    return [
      { text: 'PDF Notice', style: 'tocTitle', margin: [0, 40, 0, 20] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#fbbf24' }], margin: [0, 0, 0, 20] },
      { text: '• Emojis removed for PDF compatibility. Download .md for full content.', style: 'warning', margin: [0, 0, 0, 15] },
      { text: 'Recommendation: Use Markdown (.md) for complete content.', style: 'warning', margin: [0, 20, 0, 0], bold: true },
      { text: '', pageBreak: 'after' }
    ];
  }

  public async generate(project: BookProject, onProgress: (progress: number) => void): Promise<void> {
    console.log('🎨 Starting PDF generation for:', project.title);
    onProgress(10);
    
    const pdfMakeLib = await loadPdfMake();
    onProgress(25);

    const totalWords = project.modules.reduce((sum, m) => sum + m.wordCount, 0);
    const coverContent = this.createCoverPage(project.title, {
      words: totalWords,
      modules: project.modules.length,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    });
    
    onProgress(40);
    const mainContent = this.parseMarkdownToContent(project.finalBook || '');
    
    onProgress(60);
    const tocContent = this.createTableOfContents();
    const warningContent = this.createWarningPage();
    
    onProgress(75);
    this.content = [...coverContent, ...warningContent, ...tocContent, ...mainContent];

    const docDefinition: any = {
      content: this.content,
      styles: this.styles,
      defaultStyle: { font: 'Roboto', fontSize: 11, color: '#2a2a2a' },
      pageSize: 'A4',
      pageMargins: [65, 80, 65, 70],
      header: (currentPage: number) => currentPage <= 3 ? {} : {
        columns: [
          { text: project.title, style: { fontSize: 9, color: '#718096', italics: true }, margin: [65, 20, 0, 0], width: '*' },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 60, y2: 0, lineWidth: 0.5, lineColor: '#cbd5e0' }], margin: [0, 25, 65, 0], width: 60 }
        ]
      },
      footer: (currentPage: number) => currentPage <= 3 ? {} : {
        columns: [
          { text: 'Pustakam AI', style: { fontSize: 8, color: '#a0aec0' }, margin: [65, 0, 0, 0] },
          { text: `${currentPage - 3}`, alignment: 'center', style: { fontSize: 10, color: '#4a5568', bold: true } },
          { text: '', margin: [0, 0, 65, 0] }
        ],
        margin: [0, 20, 0, 0]
      },
      info: { title: project.title, author: 'Pustakam AI', creator: 'Pustakam Book Generator' }
    };

    onProgress(85);
    console.log('📄 Creating PDF document...');

    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMakeLib.createPdf(docDefinition);
        const filename = `${project.title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').toLowerCase().substring(0, 50)}_${new Date().toISOString().slice(0, 10)}.pdf`;
        
        pdfDocGenerator.download(filename, () => {
          console.log('✅ PDF downloaded:', filename);
          onProgress(100);
          resolve();
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
      console.log('🎉 PDF generation completed successfully');
    } catch (error: any) {
      console.error('💥 PDF generation error:', error);
      
      alert('⚠️ PDF Export Issue\n\n' +
            '✓ Please download the Markdown (.md) version instead.\n' +
            '✓ It contains the complete book content.\n\n' +
            'The .md file works in any text editor or markdown viewer.\n\n' +
            'If you need PDF specifically:\n' +
            '1. Hard refresh the page (Ctrl+Shift+R)\n' +
            '2. Clear browser cache\n' +
            '3. Try again');
      
      onProgress(0);
    } finally {
      isGenerating = false;
    }
  }
};
