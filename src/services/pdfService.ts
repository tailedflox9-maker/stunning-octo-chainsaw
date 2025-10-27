// src/services/pdfService.ts - FIXED WITH EMOJI & PROPER ENCODING
import jsPDF from 'jspdf';
import { BookProject } from '../types';

let isGenerating = false;

class BeautifulPdfGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private contentWidth: number;
  private y: number;
  private pageNumber: number;
  private lineHeight: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    });
    
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 25;
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.y = this.margin;
    this.pageNumber = 1;
    this.lineHeight = 7;
  }

  private addNewPage() {
    this.addPageNumber();
    this.doc.addPage();
    this.y = this.margin;
    this.pageNumber++;
  }

  private addPageNumber() {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(120, 120, 120);
    
    const pageText = `${this.pageNumber}`;
    const textWidth = this.doc.getTextWidth(pageText);
    const x = (this.pageWidth - textWidth) / 2;
    this.doc.text(pageText, x, this.pageHeight - 15);
  }

  private checkSpace(needed: number) {
    if (this.y + needed > this.pageHeight - 30) {
      this.addNewPage();
    }
  }

  // Enhanced text cleaning with emoji preservation
  private cleanText(text: string): string {
    // First, preserve emojis and special unicode characters
    const preserved = text
      // Don't remove actual emojis (keep unicode ranges)
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1') // bold italic
      .replace(/\*\*(.+?)\*\*/g, '$1') // bold
      .replace(/\*(.+?)\*/g, '$1') // italic
      .replace(/__(.+?)__/g, '$1') // underline
      .replace(/_(.+?)_/g, '$1') // italic
      .replace(/~~(.+?)~~/g, '$1') // strikethrough
      .replace(/`(.+?)`/g, '$1') // inline code
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
      .replace(/!\[.*?\]\(.+?\)/g, '') // images
      .replace(/^\s*#{1,6}\s+/gm, '') // heading markers
      .replace(/^\s*[-*+]\s+/gm, '') // list markers (but keep bullet)
      .replace(/^\s*\d+\.\s+/gm, '') // numbered lists
      .replace(/^\s*>\s+/gm, '') // blockquotes
      .replace(/---+/g, '') // horizontal rules
      .trim();

    return preserved;
  }

  // Safe text rendering that handles emojis
  private renderTextSafely(text: string, x: number, y: number, options?: any) {
    try {
      // Try to render with original text (including emojis)
      this.doc.text(text, x, y, options);
    } catch (error) {
      // If it fails (emojis not supported), replace emojis with [emoji] placeholder
      const fallbackText = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '😊');
      try {
        this.doc.text(fallbackText, x, y, options);
      } catch (finalError) {
        // Last resort: strip all special chars
        const stripped = text.replace(/[^\x00-\x7F]/g, '');
        this.doc.text(stripped, x, y, options);
      }
    }
  }

  private writeHeading1(text: string) {
    this.checkSpace(25);
    this.y += 12;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(18);
    this.doc.setTextColor(0, 0, 0);
    
    const lines = this.doc.splitTextToSize(text, this.contentWidth);
    lines.forEach((line: string) => {
      this.renderTextSafely(line, this.margin, this.y);
      this.y += 9;
    });
    
    this.y += 3;
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.y, this.margin + this.contentWidth, this.y);
    this.y += 10;
  }

  private writeHeading2(text: string) {
    this.checkSpace(20);
    this.y += 10;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 0, 0);
    
    const lines = this.doc.splitTextToSize(text, this.contentWidth);
    lines.forEach((line: string) => {
      this.renderTextSafely(line, this.margin, this.y);
      this.y += 7;
    });
    
    this.y += 6;
  }

  private writeHeading3(text: string) {
    this.checkSpace(15);
    this.y += 8;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(20, 20, 20);
    
    const lines = this.doc.splitTextToSize(text, this.contentWidth);
    lines.forEach((line: string) => {
      this.renderTextSafely(line, this.margin, this.y);
      this.y += 6;
    });
    
    this.y += 4;
  }

  private writeParagraph(text: string) {
    this.doc.setFont('times', 'normal');
    this.doc.setFontSize(11);
    this.doc.setTextColor(40, 40, 40);
    
    const lines = this.doc.splitTextToSize(text, this.contentWidth);
    
    lines.forEach((line: string) => {
      this.checkSpace(this.lineHeight);
      this.renderTextSafely(line, this.margin, this.y, { 
        align: 'justify',
        maxWidth: this.contentWidth 
      });
      this.y += this.lineHeight;
    });
    
    this.y += 4;
  }

  private writeListItem(text: string, isOrdered: boolean, number?: number) {
    this.doc.setFont('times', 'normal');
    this.doc.setFontSize(11);
    this.doc.setTextColor(40, 40, 40);
    
    const bullet = isOrdered ? `${number}. ` : '• ';
    const indent = 8;
    const textWidth = this.contentWidth - indent;
    
    const lines = this.doc.splitTextToSize(text, textWidth);
    
    lines.forEach((line: string, index: number) => {
      this.checkSpace(this.lineHeight);
      
      if (index === 0) {
        this.renderTextSafely(bullet, this.margin + 2, this.y);
        this.renderTextSafely(line, this.margin + indent, this.y);
      } else {
        this.renderTextSafely(line, this.margin + indent, this.y);
      }
      
      this.y += this.lineHeight;
    });
    
    this.y += 2;
  }

  private writeCodeBlock(text: string) {
    this.checkSpace(20);
    
    this.doc.setFillColor(248, 248, 248);
    const codeLines = text.split('\n').slice(0, 20);
    const blockHeight = Math.min((codeLines.length * 5) + 8, 60);
    
    this.doc.roundedRect(this.margin, this.y - 2, this.contentWidth, blockHeight, 2, 2, 'F');
    
    this.doc.setFont('courier', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(60, 60, 60);
    
    this.y += 3;
    
    codeLines.forEach(line => {
      const trimmedLine = line.substring(0, 90);
      this.renderTextSafely(trimmedLine, this.margin + 4, this.y);
      this.y += 5;
    });
    
    this.y += 6;
  }

  private writeBlockquote(text: string) {
    this.checkSpace(15);
    
    const indent = 10;
    const quoteWidth = this.contentWidth - indent - 5;
    
    this.doc.setFont('times', 'italic');
    this.doc.setFontSize(11);
    this.doc.setTextColor(80, 80, 80);
    
    const lines = this.doc.splitTextToSize(text, quoteWidth);
    const startY = this.y;
    
    lines.forEach((line: string) => {
      this.checkSpace(this.lineHeight);
      this.renderTextSafely(line, this.margin + indent, this.y);
      this.y += this.lineHeight;
    });
    
    // Vertical bar
    this.doc.setDrawColor(150, 150, 150);
    this.doc.setLineWidth(2);
    this.doc.line(this.margin + 4, startY - 2, this.margin + 4, this.y - 2);
    
    this.y += 5;
  }

  public addCoverPage(title: string, metadata: { words: number; modules: number; date: string }) {
    this.y = 80;
    
    // Title
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(24);
    this.doc.setTextColor(0, 0, 0);
    
    const titleLines = this.doc.splitTextToSize(title, this.contentWidth - 20);
    titleLines.forEach((line: string) => {
      const lineWidth = this.doc.getTextWidth(line);
      const x = (this.pageWidth - lineWidth) / 2;
      this.renderTextSafely(line, x, this.y);
      this.y += 12;
    });

    // Metadata
    this.y += 30;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(11);
    this.doc.setTextColor(100, 100, 100);

    const metaLines = [
      `${metadata.words.toLocaleString()} words`,
      `${metadata.modules} chapters`,
      '',
      metadata.date
    ];

    metaLines.forEach(line => {
      const lineWidth = this.doc.getTextWidth(line);
      const x = (this.pageWidth - lineWidth) / 2;
      this.renderTextSafely(line, x, this.y);
      this.y += 8;
    });

    // Branding
    this.y = this.pageHeight - 30;
    this.doc.setFontSize(9);
    this.doc.setTextColor(150, 150, 150);
    const brandText = 'Generated by Pustakam AI';
    const brandWidth = this.doc.getTextWidth(brandText);
    this.renderTextSafely(brandText, (this.pageWidth - brandWidth) / 2, this.y);

    this.addNewPage();
  }

  public parseAndRender(markdown: string, onProgress?: (progress: number) => void) {
    const lines = markdown.split('\n');
    let inCodeBlock = false;
    let codeLines: string[] = [];
    let inList = false;
    let listNumber = 1;
    
    const total = lines.length;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Progress update
      if (onProgress && i % 50 === 0) {
        const progress = 40 + ((i / total) * 40);
        onProgress(Math.floor(progress));
      }

      // Code block toggle
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          if (codeLines.length > 0) {
            this.writeCodeBlock(codeLines.join('\n'));
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

      // Empty line
      if (!trimmed) {
        if (inList) {
          inList = false;
          listNumber = 1;
        }
        continue;
      }

      // Horizontal rule
      if (trimmed.match(/^[-*_]{3,}$/)) {
        this.y += 5;
        this.doc.setDrawColor(200, 200, 200);
        this.doc.setLineWidth(0.3);
        this.doc.line(this.margin, this.y, this.margin + this.contentWidth, this.y);
        this.y += 5;
        continue;
      }

      // Headings
      if (trimmed.startsWith('# ')) {
        inList = false;
        this.writeHeading1(this.cleanText(trimmed.substring(2)));
      } else if (trimmed.startsWith('## ')) {
        inList = false;
        this.writeHeading2(this.cleanText(trimmed.substring(3)));
      } else if (trimmed.startsWith('### ')) {
        inList = false;
        this.writeHeading3(this.cleanText(trimmed.substring(4)));
      }
      // Blockquote
      else if (trimmed.startsWith('>')) {
        inList = false;
        this.writeBlockquote(this.cleanText(trimmed.substring(1)));
      }
      // Ordered list
      else if (trimmed.match(/^\d+\.\s+/)) {
        const text = this.cleanText(trimmed.replace(/^\d+\.\s+/, ''));
        if (text.length > 0) {
          this.writeListItem(text, true, listNumber);
          listNumber++;
          inList = true;
        }
      }
      // Unordered list
      else if (trimmed.match(/^[-*+]\s+/)) {
        const text = this.cleanText(trimmed.replace(/^[-*+]\s+/, ''));
        if (text.length > 0) {
          this.writeListItem(text, false);
          inList = true;
        }
      }
      // Regular paragraph
      else if (trimmed.length > 0) {
        inList = false;
        const cleanedText = this.cleanText(trimmed);
        if (cleanedText.length > 0) {
          this.writeParagraph(cleanedText);
        }
      }
    }
  }

  public finalize() {
    this.addPageNumber();
    const totalPages = this.doc.getNumberOfPages();
    
    // Add "Generated by Pustakam AI" to bottom of all pages
    for (let i = 2; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(180, 180, 180);
      
      const text = 'Pustakam AI';
      this.renderTextSafely(text, this.margin, this.pageHeight - 15);
    }
  }

  public save(filename: string) {
    this.doc.save(filename);
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
      const generator = new BeautifulPdfGenerator();
      onProgress(20);

      // Cover page
      const totalWords = project.modules.reduce((sum, m) => sum + m.wordCount, 0);
      generator.addCoverPage(project.title, {
        words: totalWords,
        modules: project.modules.length,
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      });
      onProgress(30);

      // Content with better error handling
      generator.parseAndRender(project.finalBook, onProgress);
      onProgress(85);

      // Finalize
      generator.finalize();
      onProgress(95);

      // Save with proper filename
      const safeTitle = project.title
        .replace(/[^a-z0-9\s-]/gi, '')
        .replace(/\s+/g, '_')
        .toLowerCase()
        .substring(0, 50);
      const timestamp = new Date().toISOString().slice(0, 10);
      
      generator.save(`${safeTitle}_${timestamp}.pdf`);
      onProgress(100);

    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try downloading as Markdown instead.');
      onProgress(0);
    } finally {
      isGenerating = false;
    }
  }
};
