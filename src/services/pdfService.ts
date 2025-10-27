// src/services/pdfService.ts - SAFE VERSION WITH DYNAMIC IMPORTS
import { BookProject } from '../types';

let isGenerating = false;

// Dynamic imports to prevent build issues
let pdfMake: any = null;

async function loadPdfMake() {
  if (pdfMake) return pdfMake;
  
  try {
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
    
    pdfMake = pdfMakeModule.default;
    pdfMake.vfs = pdfFontsModule.default.pdfMake.vfs;
    
    return pdfMake;
  } catch (error) {
    console.error('Failed to load pdfmake:', error);
    throw new Error('PDF library could not be loaded. Please refresh the page and try again.');
  }
}

interface PDFContent {
  text?: string;
  style?: string | string[];
  margin?: number[];
  alignment?: string;
  pageBreak?: string;
  ul?: any[];
  ol?: any[];
  table?: any;
  canvas?: any;
}

class PdfMakeGenerator {
  private content: PDFContent[] = [];
  private styles: any;

  constructor() {
    this.styles = {
      cover: {
        fontSize: 28,
        bold: true,
        alignment: 'center',
        margin: [0, 100, 0, 20]
      },
      coverMeta: {
        fontSize: 12,
        alignment: 'center',
        color: '#666666',
        margin: [0, 5, 0, 5]
      },
      coverBrand: {
        fontSize: 10,
        alignment: 'center',
        color: '#999999',
        margin: [0, 50, 0, 0]
      },
      h1: {
        fontSize: 20,
        bold: true,
        margin: [0, 20, 0, 10],
        color: '#000000'
      },
      h1Line: {
        margin: [0, 0, 0, 15]
      },
      h2: {
        fontSize: 16,
        bold: true,
        margin: [0, 15, 0, 8],
        color: '#111111'
      },
      h3: {
        fontSize: 14,
        bold: true,
        margin: [0, 12, 0, 6],
        color: '#222222'
      },
      h4: {
        fontSize: 12,
        bold: true,
        margin: [0, 10, 0, 5],
        color: '#333333'
      },
      paragraph: {
        fontSize: 11,
        lineHeight: 1.6,
        alignment: 'justify',
        margin: [0, 0, 0, 10],
        color: '#2a2a2a'
      },
      listItem: {
        fontSize: 11,
        lineHeight: 1.5,
        margin: [0, 3, 0, 3],
        color: '#2a2a2a'
      },
      code: {
        font: 'Courier',
        fontSize: 9,
        background: '#f5f5f5',
        margin: [0, 5, 0, 10],
        color: '#3c3c3c'
      },
      blockquote: {
        fontSize: 11,
        italics: true,
        margin: [15, 10, 0, 10],
        color: '#505050'
      }
    };
  }

  private parseMarkdownToContent(markdown: string): PDFContent[] {
    const content: PDFContent[] = [];
    const lines = markdown.split('\n');
    let inCodeBlock = false;
    let codeLines: string[] = [];
    let listItems: string[] = [];
    let currentListType: 'ul' | 'ol' | null = null;

    const flushList = () => {
      if (listItems.length > 0 && currentListType) {
        content.push({
          [currentListType]: listItems.map(item => ({
            text: item,
            style: 'listItem'
          })),
          margin: [0, 5, 0, 10]
        });
        listItems = [];
        currentListType = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Code blocks
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          if (codeLines.length > 0) {
            content.push({
              table: {
                widths: ['*'],
                body: [[{
                  text: codeLines.join('\n'),
                  style: 'code'
                }]]
              },
              layout: {
                fillColor: '#f8f8f8',
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                paddingLeft: () => 10,
                paddingRight: () => 10,
                paddingTop: () => 8,
                paddingBottom: () => 8
              }
            });
          }
          codeLines = [];
          inCodeBlock = false;
        } else {
          flushList();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      if (!trimmed) {
        flushList();
        continue;
      }

      // Horizontal rule
      if (trimmed.match(/^[-*_]{3,}$/)) {
        flushList();
        content.push({
          canvas: [{
            type: 'line',
            x1: 0, y1: 0,
            x2: 515, y2: 0,
            lineWidth: 0.5,
            lineColor: '#cccccc'
          }],
          margin: [0, 10, 0, 10]
        });
        continue;
      }

      // Headings
      if (trimmed.startsWith('# ')) {
        flushList();
        const text = this.cleanText(trimmed.substring(2));
        content.push({ text, style: 'h1' });
        content.push({
          canvas: [{
            type: 'line',
            x1: 0, y1: 0,
            x2: 515, y2: 0,
            lineWidth: 1,
            lineColor: '#000000'
          }],
          style: 'h1Line'
        });
      } else if (trimmed.startsWith('## ')) {
        flushList();
        content.push({ text: this.cleanText(trimmed.substring(3)), style: 'h2' });
      } else if (trimmed.startsWith('### ')) {
        flushList();
        content.push({ text: this.cleanText(trimmed.substring(4)), style: 'h3' });
      } else if (trimmed.startsWith('#### ')) {
        flushList();
        content.push({ text: this.cleanText(trimmed.substring(5)), style: 'h4' });
      }
      // Blockquote
      else if (trimmed.startsWith('>')) {
        flushList();
        const quoteText = this.cleanText(trimmed.substring(1));
        content.push({
          table: {
            widths: [5, '*'],
            body: [[
              { text: '', fillColor: '#999999' },
              { text: quoteText, border: [false, false, false, false], style: 'blockquote' }
            ]]
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: (i: number) => i === 1 ? 2 : 0,
            vLineColor: () => '#999999',
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 5,
            paddingBottom: () => 5
          }
        });
      }
      // Lists
      else if (trimmed.match(/^[-*+]\s+/)) {
        if (currentListType !== 'ul') {
          flushList();
          currentListType = 'ul';
        }
        listItems.push(this.cleanText(trimmed.replace(/^[-*+]\s+/, '')));
      } else if (trimmed.match(/^\d+\.\s+/)) {
        if (currentListType !== 'ol') {
          flushList();
          currentListType = 'ol';
        }
        listItems.push(this.cleanText(trimmed.replace(/^\d+\.\s+/, '')));
      }
      // Paragraph
      else {
        flushList();
        const cleanedText = this.cleanText(trimmed);
        if (cleanedText.length > 0) {
          content.push({ text: cleanedText, style: 'paragraph' });
        }
      }
    }

    flushList();
    return content;
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
      .trim();
  }

  private createCoverPage(title: string, metadata: { words: number; modules: number; date: string }): PDFContent[] {
    return [
      { text: title, style: 'cover' },
      { text: `${metadata.words.toLocaleString()} words`, style: 'coverMeta' },
      { text: `${metadata.modules} chapters`, style: 'coverMeta' },
      { text: '', style: 'coverMeta' },
      { text: metadata.date, style: 'coverMeta' },
      { text: 'Generated by Pustakam AI', style: 'coverBrand' },
      { text: '', pageBreak: 'after' }
    ];
  }

  public async generate(project: BookProject, onProgress: (progress: number) => void): Promise<void> {
    onProgress(10);

    const pdfMakeLib = await loadPdfMake();
    
    const totalWords = project.modules.reduce((sum, m) => sum + m.wordCount, 0);
    const coverContent = this.createCoverPage(project.title, {
      words: totalWords,
      modules: project.modules.length,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    });
    onProgress(30);

    const mainContent = this.parseMarkdownToContent(project.finalBook);
    onProgress(70);

    this.content = [...coverContent, ...mainContent];

    const docDefinition: any = {
      content: this.content,
      styles: this.styles,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 11
      },
      pageSize: 'A4',
      pageMargins: [60, 60, 60, 60],
      footer: (currentPage: number, pageCount: number) => {
        return {
          columns: [
            { text: 'Pustakam AI', style: { fontSize: 8, color: '#b4b4b4' }, margin: [60, 0, 0, 0] },
            { text: `${currentPage}`, alignment: 'center', style: { fontSize: 9, color: '#787878' } },
            { text: '', margin: [0, 0, 60, 0] }
          ],
          margin: [0, 10, 0, 10]
        };
      }
    };

    onProgress(85);

    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMakeLib.createPdf(docDefinition);
        
        const safeTitle = project.title
          .replace(/[^a-z0-9\s-]/gi, '')
          .replace(/\s+/g, '_')
          .toLowerCase()
          .substring(0, 50);
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `${safeTitle}_${timestamp}.pdf`;

        pdfDocGenerator.download(filename, () => {
          onProgress(100);
          resolve();
        });
      } catch (error) {
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
      const generator = new PdfMakeGenerator();
      await generator.generate(project, onProgress);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try downloading as Markdown instead.');
      onProgress(0);
    } finally {
      isGenerating = false;
    }
  }
};
