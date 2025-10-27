// src/services/pdfService.ts - RELIABLE PDF GENERATION
import jsPDF from 'jspdf';
import { BookProject } from '../types';

let isGenerating = false;

interface TextBlock {
  type: 'title' | 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'code' | 'list-item';
  content: string;
  level?: number;
}

class SimplePdfGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private contentWidth: number;
  private y: number;
  private pageNumber: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 25;
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.y = this.margin;
    this.pageNumber = 1;
  }

  private addNewPage() {
    this.doc.addPage();
    this.y = this.margin;
    this.pageNumber++;
  }

  private checkSpace(needed: number) {
    if (this.y + needed > this.pageHeight - 25) {
      this.addNewPage();
    }
  }

  private cleanText(text: string): string {
    return text
      // Remove markdown formatting
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1') // bold italic
      .replace(/\*\*(.+?)\*\*/g, '$1') // bold
      .replace(/\*(.+?)\*/g, '$1') // italic
      .replace(/__(.+?)__/g, '$1') // underline
      .replace(/_(.+?)_/g, '$1') // italic
      .replace(/~~(.+?)~~/g, '$1') // strikethrough
      .replace(/`(.+?)`/g, '$1') // inline code
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
      .replace(/!\[.*?\]\(.+?\)/g, '[Image]') // images
      .replace(/^\s*#{1,6}\s+/gm, '') // heading markers
      .replace(/^\s*[-*+]\s+/gm, '• ') // list markers
      .replace(/^\s*\d+\.\s+/gm, '') // numbered lists
      .replace(/^\s*>\s+/gm, '') // blockquotes
      .replace(/```[\s\S]*?```/g, '[Code Block]') // code blocks
      .replace(/---+/g, '') // horizontal rules
      .trim();
  }

  private parseMarkdown(markdown: string): TextBlock[] {
    const blocks: TextBlock[] = [];
    const lines = markdown.split('\n');
    let inCodeBlock = false;
    let codeContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Code block handling
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          blocks.push({
            type: 'code',
            content: codeContent.join('\n')
          });
          codeContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Skip empty lines
      if (!trimmed) continue;

      // Headings
      if (trimmed.startsWith('# ')) {
        blocks.push({ type: 'heading1', content: this.cleanText(trimmed.substring(2)) });
      } else if (trimmed.startsWith('## ')) {
        blocks.push({ type: 'heading2', content: this.cleanText(trimmed.substring(3)) });
      } else if (trimmed.startsWith('### ')) {
        blocks.push({ type: 'heading3', content: this.cleanText(trimmed.substring(4)) });
      }
      // List items
      else if (trimmed.match(/^[-*+]\s+/) || trimmed.match(/^\d+\.\s+/)) {
        blocks.push({ type: 'list-item', content: this.cleanText(trimmed) });
      }
      // Regular paragraph
      else if (trimmed.length > 0) {
        blocks.push({ type: 'paragraph', content: this.cleanText(trimmed) });
      }
    }

    return blocks;
  }

  private writeText(text: string, fontSize: number, isBold: boolean = false, lineHeight: number = 7) {
    this.doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(0, 0, 0);

    const lines = this.doc.splitTextToSize(text, this.contentWidth);
    const totalHeight = lines.length * lineHeight;

    this.checkSpace(totalHeight + 5);

    lines.forEach((line: string) => {
      this.doc.text(line, this.margin, this.y);
      this.y += lineHeight;
    });
  }

  public addCoverPage(title: string, metadata: { words: number; modules: number; date: string }) {
    // Title
    this.y = this.pageHeight / 3;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(28);
    this.doc.setTextColor(0, 0, 0);
    
    const titleLines = this.doc.splitTextToSize(title, this.contentWidth - 20);
    titleLines.forEach((line: string) => {
      const lineWidth = this.doc.getTextWidth(line);
      const x = (this.pageWidth - lineWidth) / 2;
      this.doc.text(line, x, this.y);
      this.y += 12;
    });

    // Metadata
    this.y += 20;
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);

    const metaLines = [
      `${metadata.words.toLocaleString()} words • ${metadata.modules} chapters`,
      `Generated on ${metadata.date}`,
      '',
      'Powered by Pustakam AI'
    ];

    metaLines.forEach(line => {
      const lineWidth = this.doc.getTextWidth(line);
      const x = (this.pageWidth - lineWidth) / 2;
      this.doc.text(line, x, this.y);
      this.y += 7;
    });

    this.addNewPage();
  }

  public addContent(blocks: TextBlock[]) {
    blocks.forEach(block => {
      switch (block.type) {
        case 'heading1':
          this.y += 10;
          this.writeText(block.content, 20, true, 10);
          this.y += 5;
          // Underline
          this.doc.setDrawColor(0, 0, 0);
          this.doc.setLineWidth(0.5);
          this.doc.line(this.margin, this.y, this.margin + this.contentWidth, this.y);
          this.y += 8;
          break;

        case 'heading2':
          this.y += 8;
          this.writeText(block.content, 16, true, 8);
          this.y += 5;
          break;

        case 'heading3':
          this.y += 6;
          this.writeText(block.content, 14, true, 7);
          this.y += 4;
          break;

        case 'code':
          this.checkSpace(30);
          this.doc.setFillColor(245, 245, 245);
          const codeHeight = Math.min(block.content.split('\n').length * 5 + 10, 40);
          this.doc.rect(this.margin, this.y - 3, this.contentWidth, codeHeight, 'F');
          
          this.doc.setFont('courier', 'normal');
          this.doc.setFontSize(9);
          const codeLines = this.doc.splitTextToSize(block.content, this.contentWidth - 10);
          codeLines.slice(0, 6).forEach((line: string) => {
            this.doc.text(line, this.margin + 5, this.y);
            this.y += 5;
          });
          this.y += 8;
          break;

        case 'list-item':
          this.writeText(block.content, 11, false, 6);
          this.y += 2;
          break;

        case 'paragraph':
          this.writeText(block.content, 11, false, 6);
          this.y += 4;
          break;
      }
    });
  }

  public addFooters() {
    const totalPages = this.doc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(9);
      this.doc.setTextColor(150, 150, 150);
      this.doc.setFont('helvetica', 'normal');

      this.doc.text('Generated by Pustakam AI', this.margin, this.pageHeight - 10);
      
      const pageText = `Page ${i} of ${totalPages}`;
      const textWidth = this.doc.getTextWidth(pageText);
      this.doc.text(pageText, this.pageWidth - this.margin - textWidth, this.pageHeight - 10);
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
    onProgress(10);

    try {
      const generator = new SimplePdfGenerator();
      onProgress(20);

      // Add cover page
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
      onProgress(40);

      // Parse and add content
      const blocks = generator['parseMarkdown'](project.finalBook);
      onProgress(60);

      generator.addContent(blocks);
      onProgress(80);

      // Add footers
      generator.addFooters();
      onProgress(90);

      // Save
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
