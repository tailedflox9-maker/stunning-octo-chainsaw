// src/services/pdfService.ts - NATIVE TEXT-BASED PDF GENERATION
import jsPDF from 'jspdf';
import { marked } from 'marked';
import { BookProject } from '../types';

let isGenerating = false;

// A class to manage the state and rendering of the PDF document
class PdfRenderer {
    doc: jsPDF;
    pageWidth: number;
    pageHeight: number;
    margin: number;
    contentWidth: number;
    contentHeight: number;
    y: number; // Current Y position on the page

    constructor() {
        this.doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
        this.pageWidth = this.doc.internal.pageSize.getWidth();
        this.pageHeight = this.doc.internal.pageSize.getHeight();
        this.margin = 15;
        this.contentWidth = this.pageWidth - (this.margin * 2);
        this.contentHeight = this.pageHeight - (this.margin * 2);
        this.y = this.margin; // Start drawing at the top margin
    }

    // The core layout function: checks if content will fit, adds a new page if not.
    checkPageBreak(neededHeight: number) {
        if (this.y + neededHeight > this.pageHeight - this.margin) {
            this.doc.addPage();
            this.y = this.margin;
        }
    }

    // Renders the entire book by looping through Markdown tokens
    async render(tokens: marked.Token[]) {
        for (const token of tokens) {
            switch (token.type) {
                case 'heading':
                    this.renderHeading(token);
                    break;
                case 'paragraph':
                    this.renderParagraph(token);
                    break;
                case 'code':
                    this.renderCode(token);
                    break;
                case 'list':
                    this.renderList(token);
                    break;
                case 'blockquote':
                    this.renderBlockquote(token);
                    break;
                case 'space':
                    this.y += 5; // Add some space between elements
                    break;
                // Other token types (like 'table', 'hr') can be added here
            }
            // Add a small buffer after each element
            this.y += 2;
        }
    }

    renderHeading(token: marked.Tokens.Heading) {
        const sizes = [24, 20, 18, 16, 14, 12];
        const fontSize = sizes[token.depth - 1] || 12;
        
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(fontSize);
        
        const lines = this.doc.splitTextToSize(token.text, this.contentWidth);
        const neededHeight = lines.length * (fontSize * 0.35); // Calculate height
        
        this.checkPageBreak(neededHeight + 10); // +10 for margin below
        
        this.y += 8; // Margin above heading
        this.doc.text(lines, this.margin, this.y);
        this.y += neededHeight;

        // Draw a subtle line under h1 and h2
        if (token.depth <= 2) {
            this.y += 2;
            this.doc.setDrawColor('#cccccc');
            this.doc.line(this.margin, this.y, this.margin + this.contentWidth, this.y);
            this.y += 4;
        }
    }

    renderParagraph(token: marked.Tokens.Paragraph) {
        this.doc.setFont('times', 'normal');
        this.doc.setFontSize(12);
        
        const lines = this.doc.splitTextToSize(token.text, this.contentWidth);
        const neededHeight = lines.length * 5; // Approx. height
        
        this.checkPageBreak(neededHeight);
        
        this.doc.text(lines, this.margin, this.y, { align: 'justify' });
        this.y += neededHeight;
    }

    renderCode(token: marked.Tokens.Code) {
        this.doc.setFont('courier', 'normal');
        this.doc.setFontSize(9);
        this.doc.setTextColor('#333333');
        
        const lines = this.doc.splitTextToSize(token.text, this.contentWidth - 10);
        const neededHeight = (lines.length * 4) + 8; // +8 for padding
        
        this.checkPageBreak(neededHeight);
        
        // Draw background rectangle
        this.doc.setFillColor('#f5f5f5');
        this.doc.rect(this.margin, this.y - 2, this.contentWidth, neededHeight, 'F');
        
        this.doc.text(lines, this.margin + 5, this.y + 4);
        this.y += neededHeight;
        
        this.doc.setTextColor('#000000'); // Reset text color
    }
    
    renderList(token: marked.Tokens.List) {
        this.doc.setFont('times', 'normal');
        this.doc.setFontSize(12);

        token.items.forEach((item, index) => {
            const prefix = token.ordered ? `${index + 1}. ` : '•  ';
            const lines = this.doc.splitTextToSize(item.text, this.contentWidth - 8);
            const neededHeight = lines.length * 5;
            
            this.checkPageBreak(neededHeight);
            
            this.doc.text(prefix + lines[0], this.margin + 4, this.y);
            if (lines.length > 1) {
                this.doc.text(lines.slice(1), this.margin + 8, this.y + 5);
            }
            this.y += neededHeight;
        });
    }

    renderBlockquote(token: marked.Tokens.Blockquote) {
        this.doc.setFont('times', 'italic');
        this.doc.setFontSize(11);
        this.doc.setTextColor('#555555');

        const lines = this.doc.splitTextToSize(token.text, this.contentWidth - 10);
        const neededHeight = lines.length * 5 + 4;
        
        this.checkPageBreak(neededHeight);

        // Draw the vertical accent line
        this.doc.setDrawColor('#cccccc');
        this.doc.setLineWidth(1);
        this.doc.line(this.margin, this.y - 2, this.margin, this.y + neededHeight - 4);

        this.doc.text(lines, this.margin + 5, this.y);
        this.y += neededHeight;

        this.doc.setTextColor('#000000'); // Reset text color
    }

    // Final step: Add correctly numbered footers to every page
    addFooters() {
        const totalPages = this.doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            this.doc.setPage(i);
            const brandingText = 'Generated by Pustakam AI';
            const pageNumText = `Page ${i} of ${totalPages}`;

            this.doc.setFontSize(9);
            this.doc.setTextColor('#a0a0a0');
            this.doc.text(brandingText, this.margin, this.pageHeight - 10);

            const textWidth = this.doc.getStringUnitWidth(pageNumText) * this.doc.getFontSize() / this.doc.internal.scaleFactor;
            this.doc.text(pageNumText, this.pageWidth - this.margin - textWidth, this.pageHeight - 10);
        }
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
        // 1. Parse Markdown into tokens
        const tokens = marked.lexer(project.finalBook);
        onProgress(30);

        // 2. Initialize our custom renderer
        const renderer = new PdfRenderer();
        onProgress(50);

        // 3. Render the tokens into the PDF document
        await renderer.render(tokens);
        onProgress(90);
        
        // 4. Add the correctly numbered footers as a final step
        renderer.addFooters();
        onProgress(95);

        // 5. Save the PDF
        const safeTitle = project.title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').toLowerCase();
        renderer.doc.save(`${safeTitle}_by_pustakam.pdf`);

        onProgress(100);

    } catch (error) {
        console.error('Failed to generate PDF:', error);
        alert('An error occurred while generating the native PDF. Please check the console for details.');
        onProgress(0);
    } finally {
        isGenerating = false;
    }
  }
};
