// src/services/pdfService.ts - PREMIUM QUALITY VERSION
import { BookProject } from '../types';

let isGenerating = false;
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
    throw new Error('PDF library could not be loaded. Please refresh and try again.');
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
  pageOrientation?: string;
}

class PremiumPdfGenerator {
  private content: PDFContent[] = [];
  private styles: any;
  private tableOfContents: { title: string; page: number; level: number }[] = [];

  constructor() {
    this.styles = {
      // Cover Page Styles
      coverTitle: {
        fontSize: 32,
        bold: true,
        alignment: 'center',
        margin: [0, 120, 0, 20],
        color: '#1a1a1a'
      },
      coverSubtitle: {
        fontSize: 14,
        alignment: 'center',
        color: '#555555',
        margin: [0, 0, 0, 8]
      },
      coverDivider: {
        margin: [100, 15, 100, 15]
      },
      coverBrand: {
        fontSize: 11,
        alignment: 'center',
        color: '#888888',
        margin: [0, 60, 0, 0],
        italics: true
      },
      
      // Heading Styles - Enhanced
      h1: {
        fontSize: 24,
        bold: true,
        margin: [0, 25, 0, 12],
        color: '#1a1a1a',
        lineHeight: 1.3
      },
      h2: {
        fontSize: 18,
        bold: true,
        margin: [0, 20, 0, 10],
        color: '#2a2a2a',
        lineHeight: 1.3
      },
      h3: {
        fontSize: 15,
        bold: true,
        margin: [0, 16, 0, 8],
        color: '#333333',
        lineHeight: 1.3
      },
      h4: {
        fontSize: 13,
        bold: true,
        margin: [0, 14, 0, 7],
        color: '#444444',
        lineHeight: 1.3
      },
      
      // Body Text - Premium Typography
      paragraph: {
        fontSize: 11,
        lineHeight: 1.7,
        alignment: 'justify',
        margin: [0, 0, 0, 12],
        color: '#2a2a2a'
      },
      
      // List Styles
      listItem: {
        fontSize: 11,
        lineHeight: 1.6,
        margin: [0, 4, 0, 4],
        color: '#2a2a2a'
      },
      
      // Code Block - Professional
      codeBlock: {
        font: 'Courier',
        fontSize: 9,
        margin: [0, 8, 0, 12],
        color: '#2d3748',
        lineHeight: 1.5
      },
      
      // Blockquote - Elegant
      blockquote: {
        fontSize: 11,
        italics: true,
        margin: [20, 12, 0, 12],
        color: '#4a5568',
        lineHeight: 1.6
      },
      
      // Table of Contents
      tocTitle: {
        fontSize: 22,
        bold: true,
        margin: [0, 0, 0, 20],
        color: '#1a1a1a'
      },
      tocItem: {
        fontSize: 11,
        margin: [0, 3, 0, 3],
        color: '#2a2a2a'
      },
      
      // Special Elements
      emphasis: {
        bold: true,
        color: '#1a1a1a'
      },
      link: {
        color: '#2563eb',
        decoration: 'underline'
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
    let paragraphBuffer: string[] = [];

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        const text = paragraphBuffer.join(' ').trim();
        if (text.length > 0) {
          content.push({ 
            text: this.parseInlineFormatting(text), 
            style: 'paragraph' 
          });
        }
        paragraphBuffer = [];
      }
    };

    const flushList = () => {
      if (listItems.length > 0 && currentListType) {
        content.push({
          [currentListType]: listItems.map(item => ({
            text: this.parseInlineFormatting(item),
            style: 'listItem'
          })),
          margin: [0, 8, 0, 12]
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
        flushParagraph();
        flushList();
        
        if (inCodeBlock) {
          if (codeLines.length > 0) {
            content.push({
              table: {
                widths: ['*'],
                body: [[{
                  text: codeLines.join('\n'),
                  style: 'codeBlock'
                }]]
              },
              layout: {
                fillColor: '#f7fafc',
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#e2e8f0',
                vLineColor: () => '#e2e8f0',
                paddingLeft: () => 12,
                paddingRight: () => 12,
                paddingTop: () => 10,
                paddingBottom: () => 10
              }
            });
          }
          codeLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      if (!trimmed) {
        flushParagraph();
        continue;
      }

      // Horizontal rule - Enhanced
      if (trimmed.match(/^[-*_]{3,}$/)) {
        flushParagraph();
        flushList();
        content.push({
          canvas: [{
            type: 'line',
            x1: 50, y1: 0,
            x2: 465, y2: 0,
            lineWidth: 0.5,
            lineColor: '#cbd5e0'
          }],
          margin: [0, 15, 0, 15]
        });
        continue;
      }

      // Headings - with decorative lines
      if (trimmed.startsWith('# ')) {
        flushParagraph();
        flushList();
        const text = this.cleanText(trimmed.substring(2));
        
        // Main heading with underline
        content.push({ text, style: 'h1' });
        content.push({
          canvas: [{
            type: 'line',
            x1: 0, y1: 0,
            x2: 515, y2: 0,
            lineWidth: 2,
            lineColor: '#2d3748'
          }],
          margin: [0, 0, 0, 20]
        });
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        flushList();
        const text = this.cleanText(trimmed.substring(3));
        content.push({ text, style: 'h2' });
        content.push({
          canvas: [{
            type: 'line',
            x1: 0, y1: 0,
            x2: 100, y2: 0,
            lineWidth: 1.5,
            lineColor: '#4a5568'
          }],
          margin: [0, 0, 0, 12]
        });
      } else if (trimmed.startsWith('### ')) {
        flushParagraph();
        flushList();
        content.push({ text: this.cleanText(trimmed.substring(4)), style: 'h3' });
      } else if (trimmed.startsWith('#### ')) {
        flushParagraph();
        flushList();
        content.push({ text: this.cleanText(trimmed.substring(5)), style: 'h4' });
      }
      // Enhanced Blockquote
      else if (trimmed.startsWith('>')) {
        flushParagraph();
        flushList();
        const quoteText = this.cleanText(trimmed.substring(1));
        content.push({
          table: {
            widths: [4, '*'],
            body: [[
              { text: '', fillColor: '#4299e1', border: [false, false, false, false] },
              { 
                text: this.parseInlineFormatting(quoteText), 
                border: [false, false, false, false], 
                style: 'blockquote',
                fillColor: '#f7fafc'
              }
            ]]
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: (i: number) => i === 0 ? 0 : 15,
            paddingRight: () => 15,
            paddingTop: () => 10,
            paddingBottom: () => 10
          },
          margin: [0, 8, 0, 12]
        });
      }
      // Lists
      else if (trimmed.match(/^[-*+]\s+/)) {
        flushParagraph();
        if (currentListType !== 'ul') {
          flushList();
          currentListType = 'ul';
        }
        listItems.push(this.cleanText(trimmed.replace(/^[-*+]\s+/, '')));
      } else if (trimmed.match(/^\d+\.\s+/)) {
        flushParagraph();
        if (currentListType !== 'ol') {
          flushList();
          currentListType = 'ol';
        }
        listItems.push(this.cleanText(trimmed.replace(/^\d+\.\s+/, '')));
      }
      // Paragraph accumulation for better text flow
      else {
        flushList();
        const cleanedText = this.cleanText(trimmed);
        if (cleanedText.length > 0) {
          paragraphBuffer.push(cleanedText);
        }
      }
    }

    flushParagraph();
    flushList();
    return content;
  }

  private parseInlineFormatting(text: string): any {
    // Handle bold, italic, and code inline
    const parts: any[] = [];
    let current = text;
    
    // Simple parser for inline markdown
    const boldRegex = /\*\*(.+?)\*\*/g;
    const italicRegex = /\*(.+?)\*/g;
    const codeRegex = /`(.+?)`/g;
    
    // For simplicity, just clean it - you can enhance this with actual formatting
    return this.cleanText(text);
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

  private createPremiumCoverPage(
    title: string, 
    metadata: { words: number; modules: number; date: string; provider?: string }
  ): PDFContent[] {
    return [
      // Top decorative element
      {
        canvas: [{
          type: 'rect',
          x: 200,
          y: 0,
          w: 115,
          h: 4,
          color: '#2563eb'
        }],
        margin: [0, 80, 0, 0]
      },
      
      // Main title
      { text: title, style: 'coverTitle' },
      
      // Decorative divider
      {
        canvas: [{
          type: 'line',
          x1: 150, y1: 0,
          x2: 365, y2: 0,
          lineWidth: 1,
          lineColor: '#cbd5e0'
        }],
        style: 'coverDivider'
      },
      
      // Metadata section
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            stack: [
              { text: `${metadata.words.toLocaleString()} words`, style: 'coverSubtitle' },
              { text: `${metadata.modules} chapters`, style: 'coverSubtitle' },
              { text: metadata.date, style: 'coverSubtitle', margin: [0, 8, 0, 0] }
            ]
          },
          { width: '*', text: '' }
        ]
      },
      
      // Bottom branding
      { text: 'Generated by Pustakam AI', style: 'coverBrand' },
      {
        text: metadata.provider || 'Powered by Advanced AI',
        style: 'coverBrand',
        fontSize: 9,
        margin: [0, 5, 0, 0]
      },
      
      // Page break
      { text: '', pageBreak: 'after' }
    ];
  }

  public async generate(
    project: BookProject, 
    onProgress: (progress: number) => void
  ): Promise<void> {
    onProgress(10);

    const pdfMakeLib = await loadPdfMake();
    
    const totalWords = project.modules.reduce((sum, m) => sum + m.wordCount, 0);
    const coverContent = this.createPremiumCoverPage(project.title, {
      words: totalWords,
      modules: project.modules.length,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    });
    onProgress(30);

    const mainContent = this.parseMarkdownToContent(project.finalBook || '');
    onProgress(70);

    this.content = [...coverContent, ...mainContent];

    const docDefinition: any = {
      content: this.content,
      styles: this.styles,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 11,
        color: '#2a2a2a'
      },
      pageSize: 'A4',
      pageMargins: [60, 70, 60, 65],
      
      // Enhanced header
      header: (currentPage: number) => {
        if (currentPage === 1) return {}; // No header on cover
        return {
          columns: [
            { 
              text: project.title, 
              style: { fontSize: 9, color: '#718096', italics: true },
              margin: [60, 15, 0, 0],
              width: '*'
            },
            {
              canvas: [{
                type: 'line',
                x1: 0, y1: 0,
                x2: 50, y2: 0,
                lineWidth: 0.5,
                lineColor: '#cbd5e0'
              }],
              margin: [0, 20, 60, 0],
              width: 50
            }
          ]
        };
      },
      
      // Enhanced footer
      footer: (currentPage: number, pageCount: number) => {
        if (currentPage === 1) return {}; // No footer on cover
        return {
          columns: [
            { 
              text: 'Pustakam AI', 
              style: { fontSize: 8, color: '#a0aec0' }, 
              margin: [60, 0, 0, 0] 
            },
            { 
              text: `${currentPage - 1}`, // Adjust for cover page
              alignment: 'center', 
              style: { fontSize: 9, color: '#4a5568' } 
            },
            { 
              text: '', 
              margin: [0, 0, 60, 0] 
            }
          ],
          margin: [0, 15, 0, 0]
        };
      },
      
      // Document info
      info: {
        title: project.title,
        author: 'Pustakam AI',
        subject: project.goal || 'AI Generated Book',
        keywords: 'AI, Book, Learning',
        creator: 'Pustakam Book Generator',
        producer: 'Pustakam AI Engine'
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
  async generatePdf(
    project: BookProject, 
    onProgress: (progress: number) => void
  ): Promise<void> {
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
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try downloading as Markdown instead.');
      onProgress(0);
    } finally {
      isGenerating = false;
    }
  }
};
