// src/services/pdfService.ts - ROBUST NATIVE PDF GENERATION WITH PROPER FORMATTING
import jsPDF from 'jspdf';
import { marked } from 'marked';
import { BookProject } from '../types';

let isGenerating = false;

// Enhanced PDF renderer with robust text handling
class PdfRenderer {
    doc: jsPDF;
    pageWidth: number;
    pageHeight: number;
    margin: number;
    contentWidth: number;
    contentHeight: number;
    y: number;
    lineHeight: number;
    currentPage: number;

    constructor() {
        this.doc = new jsPDF({ 
            orientation: 'p', 
            unit: 'mm', 
            format: 'a4', 
            compress: true,
            putOnlyUsedFonts: true
        });
        this.pageWidth = this.doc.internal.pageSize.getWidth();
        this.pageHeight = this.doc.internal.pageSize.getHeight();
        this.margin = 20; // Increased margin for safety
        this.contentWidth = this.pageWidth - (this.margin * 2);
        this.contentHeight = this.pageHeight - (this.margin * 2) - 15; // Reserve space for footer
        this.y = this.margin;
        this.lineHeight = 7; // Standard line height in mm
        this.currentPage = 1;
    }

    // Smart page break with safety margins
    checkPageBreak(neededHeight: number, forceBreak: boolean = false) {
        const bottomMargin = this.margin + 15; // Extra space for footer
        if (forceBreak || this.y + neededHeight > this.pageHeight - bottomMargin) {
            this.doc.addPage();
            this.y = this.margin;
            this.currentPage++;
            return true;
        }
        return false;
    }

    // Calculate accurate text height
    getTextHeight(text: string, fontSize: number, lineSpacing: number = 1.2): number {
        return fontSize * 0.352778 * lineSpacing; // Convert points to mm
    }

    // Render with progress tracking
    async render(tokens: marked.Token[], onProgress?: (progress: number) => void) {
        const totalTokens = tokens.length;
        let processedTokens = 0;

        for (const token of tokens) {
            try {
                switch (token.type) {
                    case 'heading':
                        this.renderHeading(token as marked.Tokens.Heading);
                        break;
                    case 'paragraph':
                        this.renderParagraph(token as marked.Tokens.Paragraph);
                        break;
                    case 'code':
                        this.renderCode(token as marked.Tokens.Code);
                        break;
                    case 'list':
                        this.renderList(token as marked.Tokens.List);
                        break;
                    case 'blockquote':
                        this.renderBlockquote(token as marked.Tokens.Blockquote);
                        break;
                    case 'hr':
                        this.renderHorizontalRule();
                        break;
                    case 'space':
                        this.y += 5;
                        break;
                    case 'table':
                        this.renderTable(token as marked.Tokens.Table);
                        break;
                }

                processedTokens++;
                if (onProgress && processedTokens % 10 === 0) {
                    const progress = 50 + (processedTokens / totalTokens) * 40;
                    onProgress(Math.floor(progress));
                }
            } catch (error) {
                console.error('Error rendering token:', error);
                // Continue with next token instead of crashing
            }

            // Small buffer between elements
            this.y += 2;
        }
    }

    renderHeading(token: marked.Tokens.Heading) {
        const fontSizes = [26, 22, 18, 16, 14, 12];
        const fontSize = fontSizes[token.depth - 1] || 12;
        const lineSpacing = token.depth <= 2 ? 1.3 : 1.2;
        
        // Add extra space before heading
        const spaceBefore = token.depth === 1 ? 15 : token.depth === 2 ? 12 : 8;
        this.y += spaceBefore;
        
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(fontSize);
        this.doc.setTextColor(0, 0, 0);
        
        // Split text properly to fit width
        const cleanText = this.cleanText(token.text);
        const lines = this.doc.splitTextToSize(cleanText, this.contentWidth);
        const textHeight = this.getTextHeight(cleanText, fontSize, lineSpacing);
        const totalHeight = lines.length * textHeight;
        
        // Check if we need a page break
        this.checkPageBreak(totalHeight + 15);
        
        // Render heading
        lines.forEach((line: string, index: number) => {
            this.doc.text(line, this.margin, this.y);
            this.y += textHeight;
        });

        // Add underline for h1 and h2
        if (token.depth <= 2) {
            this.y += 2;
            this.doc.setDrawColor(200, 200, 200);
            this.doc.setLineWidth(0.5);
            this.doc.line(this.margin, this.y, this.margin + this.contentWidth, this.y);
            this.y += 4;
        }
        
        // Space after heading
        this.y += 3;
    }

    renderParagraph(token: marked.Tokens.Paragraph) {
        this.doc.setFont('times', 'normal');
        this.doc.setFontSize(11);
        this.doc.setTextColor(30, 30, 30);
        
        const cleanText = this.cleanText(token.text);
        const lines = this.doc.splitTextToSize(cleanText, this.contentWidth);
        const lineHeight = this.getTextHeight(cleanText, 11, 1.5);
        const totalHeight = lines.length * lineHeight;
        
        // Smart page break - avoid orphaned lines
        if (lines.length > 2 && this.y + lineHeight * 2 > this.pageHeight - this.margin - 15) {
            this.checkPageBreak(totalHeight, true);
        } else {
            this.checkPageBreak(totalHeight);
        }
        
        lines.forEach((line: string) => {
            this.doc.text(line, this.margin, this.y, { 
                align: 'left',
                maxWidth: this.contentWidth 
            });
            this.y += lineHeight;
        });
        
        this.y += 3; // Paragraph spacing
    }

    renderCode(token: marked.Tokens.Code) {
        this.doc.setFont('courier', 'normal');
        this.doc.setFontSize(9);
        this.doc.setTextColor(50, 50, 50);
        
        const cleanText = this.cleanText(token.text);
        const codeWidth = this.contentWidth - 10;
        const lines = this.doc.splitTextToSize(cleanText, codeWidth);
        const lineHeight = 4.5;
        const padding = 4;
        const totalHeight = (lines.length * lineHeight) + (padding * 2);
        
        this.checkPageBreak(totalHeight + 5);
        
        // Background box
        this.doc.setFillColor(245, 245, 245);
        this.doc.roundedRect(this.margin, this.y - padding, this.contentWidth, totalHeight, 2, 2, 'F');
        
        // Render code lines
        lines.forEach((line: string) => {
            this.doc.text(line, this.margin + 5, this.y);
            this.y += lineHeight;
        });
        
        this.y += padding + 2;
        this.doc.setTextColor(0, 0, 0);
    }

    renderList(token: marked.Tokens.List) {
        this.doc.setFont('times', 'normal');
        this.doc.setFontSize(11);
        this.doc.setTextColor(30, 30, 30);
        
        const indent = 8;
        const lineHeight = this.getTextHeight('', 11, 1.4);

        token.items.forEach((item, index) => {
            const prefix = token.ordered ? `${index + 1}. ` : '• ';
            const cleanText = this.cleanText(item.text);
            const itemWidth = this.contentWidth - indent - 5;
            const lines = this.doc.splitTextToSize(cleanText, itemWidth);
            const totalHeight = lines.length * lineHeight;
            
            this.checkPageBreak(totalHeight + 2);
            
            // Render prefix
            this.doc.text(prefix, this.margin + indent, this.y);
            
            // Render text lines
            lines.forEach((line: string, lineIndex: number) => {
                const xPos = lineIndex === 0 
                    ? this.margin + indent + 7 
                    : this.margin + indent + 7;
                this.doc.text(line, xPos, this.y);
                this.y += lineHeight;
            });
            
            this.y += 1; // Small gap between items
        });
        
        this.y += 2;
    }

    renderBlockquote(token: marked.Tokens.Blockquote) {
        this.doc.setFont('times', 'italic');
        this.doc.setFontSize(11);
        this.doc.setTextColor(80, 80, 80);
        
        const indent = 10;
        const cleanText = this.cleanText(token.text);
        const quoteWidth = this.contentWidth - indent - 5;
        const lines = this.doc.splitTextToSize(cleanText, quoteWidth);
        const lineHeight = this.getTextHeight('', 11, 1.4);
        const totalHeight = lines.length * lineHeight + 6;
        
        this.checkPageBreak(totalHeight);
        
        const startY = this.y;
        
        // Vertical accent line
        this.doc.setDrawColor(180, 180, 180);
        this.doc.setLineWidth(2);
        this.doc.line(this.margin + 3, startY - 2, this.margin + 3, this.y + totalHeight - 4);
        
        // Render text
        lines.forEach((line: string) => {
            this.doc.text(line, this.margin + indent, this.y);
            this.y += lineHeight;
        });
        
        this.y += 4;
        this.doc.setTextColor(0, 0, 0);
    }

    renderHorizontalRule() {
        this.y += 6;
        this.checkPageBreak(5);
        this.doc.setDrawColor(200, 200, 200);
        this.doc.setLineWidth(0.5);
        this.doc.line(this.margin, this.y, this.margin + this.contentWidth, this.y);
        this.y += 6;
    }

    renderTable(token: marked.Tokens.Table) {
        // Simple table rendering
        this.doc.setFont('times', 'normal');
        this.doc.setFontSize(10);
        
        const colWidth = this.contentWidth / (token.header.length || 1);
        const rowHeight = 7;
        
        // Header
        this.checkPageBreak(rowHeight * (token.rows.length + 2));
        this.doc.setFont('times', 'bold');
        this.doc.setFillColor(240, 240, 240);
        this.doc.rect(this.margin, this.y, this.contentWidth, rowHeight, 'F');
        
        token.header.forEach((cell, i) => {
            const text = this.cleanText(cell.text);
            this.doc.text(text, this.margin + (i * colWidth) + 2, this.y + 5);
        });
        this.y += rowHeight;
        
        // Rows
        this.doc.setFont('times', 'normal');
        token.rows.forEach((row) => {
            row.forEach((cell, i) => {
                const text = this.cleanText(cell.text);
                this.doc.text(text, this.margin + (i * colWidth) + 2, this.y + 5);
            });
            this.y += rowHeight;
        });
        
        this.y += 4;
    }

    // Clean markdown formatting from text
    cleanText(text: string): string {
        return text
            .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
            .replace(/\*(.*?)\*/g, '$1') // Italic
            .replace(/`(.*?)`/g, '$1') // Inline code
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
            .replace(/#{1,6}\s/g, '') // Headings
            .trim();
    }

    // Add page numbers and branding
    addFooters() {
        const totalPages = this.doc.getNumberOfPages();
        
        for (let i = 1; i <= totalPages; i++) {
            this.doc.setPage(i);
            this.doc.setFontSize(9);
            this.doc.setTextColor(150, 150, 150);
            this.doc.setFont('helvetica', 'normal');
            
            // Branding on left
            this.doc.text('Generated by Pustakam AI', this.margin, this.pageHeight - 10);
            
            // Page number on right
            const pageText = `Page ${i} of ${totalPages}`;
            const textWidth = this.doc.getTextWidth(pageText);
            this.doc.text(pageText, this.pageWidth - this.margin - textWidth, this.pageHeight - 10);
        }
    }

    // Add cover page
    addCoverPage(title: string, metadata: { words: number; modules: number; date: string }) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(32);
        this.doc.setTextColor(0, 0, 0);
        
        const titleLines = this.doc.splitTextToSize(title, this.contentWidth - 20);
        const titleY = this.pageHeight / 3;
        
        titleLines.forEach((line: string, index: number) => {
            const lineWidth = this.doc.getTextWidth(line);
            this.doc.text(line, (this.pageWidth - lineWidth) / 2, titleY + (index * 15));
        });
        
        // Metadata
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(100, 100, 100);
        
        const metadataY = titleY + (titleLines.length * 15) + 30;
        const metadataLines = [
            `${metadata.words.toLocaleString()} words • ${metadata.modules} chapters`,
            `Generated on ${metadata.date}`,
            '',
            'Powered by Pustakam AI'
        ];
        
        metadataLines.forEach((line, index) => {
            const lineWidth = this.doc.getTextWidth(line);
            this.doc.text(line, (this.pageWidth - lineWidth) / 2, metadataY + (index * 8));
        });
        
        this.doc.addPage();
        this.y = this.margin;
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
        // Parse Markdown
        const tokens = marked.lexer(project.finalBook);
        onProgress(20);

        // Initialize renderer
        const renderer = new PdfRenderer();
        onProgress(30);

        // Add cover page
        const totalWords = project.modules.reduce((sum, m) => sum + m.wordCount, 0);
        renderer.addCoverPage(project.title, {
            words: totalWords,
            modules: project.modules.length,
            date: new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })
        });
        onProgress(40);

        // Render content with progress
        await renderer.render(tokens, onProgress);
        onProgress(85);
        
        // Add footers
        renderer.addFooters();
        onProgress(95);

        // Save PDF
        const safeTitle = project.title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').toLowerCase();
        const timestamp = new Date().toISOString().slice(0, 10);
        renderer.doc.save(`${safeTitle}_${timestamp}.pdf`);

        onProgress(100);

    } catch (error) {
        console.error('Failed to generate PDF:', error);
        alert('An error occurred while generating the PDF. Please try again.');
        onProgress(0);
    } finally {
        isGenerating = false;
    }
  }
};
