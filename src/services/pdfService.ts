// src/services/pdfService.ts - PROFESSIONAL PDF WITH HTML RENDERING
import { BookProject } from '../types';
import { marked } from 'marked';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

let isGenerating = false;

// Configure marked for better output
marked.setOptions({
  breaks: true,
  gfm: true,
});

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
      // Convert markdown to HTML
      const htmlContent = marked.parse(project.finalBook);
      onProgress(15);

      // Create a temporary container
      const container = document.createElement('div');
      container.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: 210mm;
        padding: 20mm;
        background: white;
        font-family: 'Georgia', serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #000;
      `;

      // Add styled content
      container.innerHTML = `
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Georgia, serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
          }

          /* Cover Page */
          .cover {
            text-align: center;
            padding: 100px 40px;
            page-break-after: always;
          }
          
          .cover h1 {
            font-size: 32pt;
            font-weight: bold;
            margin-bottom: 40px;
            color: #000;
            line-height: 1.2;
          }
          
          .cover .metadata {
            font-size: 11pt;
            color: #666;
            margin-top: 60px;
            line-height: 1.8;
          }
          
          .cover .branding {
            margin-top: 40px;
            font-size: 10pt;
            color: #999;
          }

          /* Content Styling */
          h1 {
            font-size: 24pt;
            font-weight: bold;
            margin: 30px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #333;
            color: #000;
            page-break-after: avoid;
            line-height: 1.3;
          }

          h2 {
            font-size: 20pt;
            font-weight: bold;
            margin: 25px 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid #666;
            color: #111;
            page-break-after: avoid;
            line-height: 1.3;
          }

          h3 {
            font-size: 16pt;
            font-weight: bold;
            margin: 20px 0 12px 0;
            color: #222;
            page-break-after: avoid;
            line-height: 1.3;
          }

          h4 {
            font-size: 14pt;
            font-weight: bold;
            margin: 18px 0 10px 0;
            color: #333;
            page-break-after: avoid;
          }

          h5, h6 {
            font-size: 12pt;
            font-weight: bold;
            margin: 15px 0 8px 0;
            color: #444;
            page-break-after: avoid;
          }

          p {
            margin: 12px 0;
            text-align: justify;
            orphans: 3;
            widows: 3;
          }

          strong {
            font-weight: bold;
            color: #000;
          }

          em {
            font-style: italic;
          }

          ul, ol {
            margin: 12px 0 12px 20px;
            padding-left: 20px;
          }

          li {
            margin: 6px 0;
            line-height: 1.5;
          }

          ul li {
            list-style-type: disc;
          }

          ol li {
            list-style-type: decimal;
          }

          blockquote {
            margin: 20px 0;
            padding: 15px 20px;
            background: #f5f5f5;
            border-left: 4px solid #666;
            font-style: italic;
            color: #333;
            page-break-inside: avoid;
          }

          code {
            font-family: 'Courier New', monospace;
            font-size: 10pt;
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            color: #c7254e;
          }

          pre {
            margin: 15px 0;
            padding: 15px;
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow-x: auto;
            page-break-inside: avoid;
          }

          pre code {
            background: none;
            padding: 0;
            font-size: 9pt;
            color: #333;
            display: block;
            line-height: 1.4;
          }

          table {
            width: 100%;
            margin: 15px 0;
            border-collapse: collapse;
            page-break-inside: avoid;
          }

          th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
          }

          th {
            background: #f5f5f5;
            font-weight: bold;
          }

          hr {
            margin: 25px 0;
            border: none;
            border-top: 1px solid #ccc;
          }

          a {
            color: #0066cc;
            text-decoration: none;
          }

          img {
            max-width: 100%;
            height: auto;
            margin: 15px 0;
            page-break-inside: avoid;
          }

          /* Page break helpers */
          .page-break {
            page-break-before: always;
          }

          /* Print specific */
          @media print {
            .cover {
              page-break-after: always;
            }
            
            h1, h2, h3, h4, h5, h6 {
              page-break-after: avoid;
            }
            
            pre, blockquote, table {
              page-break-inside: avoid;
            }
          }
        </style>

        <!-- Cover Page -->
        <div class="cover">
          <h1>${this.escapeHtml(project.title)}</h1>
          <div class="metadata">
            <div>${project.modules.reduce((sum, m) => sum + m.wordCount, 0).toLocaleString()} words</div>
            <div>${project.modules.length} chapters</div>
            <div>Generated on ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
          </div>
          <div class="branding">Powered by Pustakam AI</div>
        </div>

        <!-- Book Content -->
        <div class="content">
          ${htmlContent}
        </div>
      `;

      document.body.appendChild(container);
      onProgress(30);

      // Initialize PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      // Page dimensions
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);

      // Get all sections (split by h1 or logical breaks)
      const sections = this.splitIntoPages(container);
      onProgress(40);

      let currentPage = 0;
      const totalSections = sections.length;

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        try {
          // Render section to canvas
          const canvas = await html2canvas(section, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: section.scrollWidth,
            height: section.scrollHeight,
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.85);
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // Handle multi-page sections
          let heightLeft = imgHeight;
          let position = 0;

          while (heightLeft > 0) {
            if (currentPage > 0) {
              pdf.addPage();
            }

            pdf.addImage(
              imgData,
              'JPEG',
              margin,
              margin - position,
              imgWidth,
              imgHeight,
              undefined,
              'FAST'
            );

            heightLeft -= contentHeight;
            position += contentHeight;
            currentPage++;

            // Add footer
            pdf.setFontSize(9);
            pdf.setTextColor(150, 150, 150);
            pdf.text('Generated by Pustakam AI', margin, pageHeight - 10);
            const pageText = `Page ${currentPage}`;
            const pageTextWidth = pdf.getTextWidth(pageText);
            pdf.text(pageText, pageWidth - margin - pageTextWidth, pageHeight - 10);
          }

          // Update progress
          const progress = 40 + ((i + 1) / totalSections) * 50;
          onProgress(Math.floor(progress));

        } catch (error) {
          console.error('Error rendering section:', error);
        }
      }

      // Remove temporary container
      document.body.removeChild(container);
      onProgress(95);

      // Save PDF
      const safeTitle = project.title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').toLowerCase();
      const timestamp = new Date().toISOString().slice(0, 10);
      pdf.save(`${safeTitle}_${timestamp}.pdf`);

      onProgress(100);

    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again or download as Markdown instead.');
      onProgress(0);
    } finally {
      isGenerating = false;
    }
  },

  // Split content into manageable sections
  splitIntoPages(container: HTMLElement): HTMLElement[] {
    const sections: HTMLElement[] = [];
    const content = container.querySelector('.content');
    
    if (!content) return [container];

    // Split by major headings or every ~2 pages worth of content
    const children = Array.from(content.children);
    let currentSection = document.createElement('div');
    currentSection.style.cssText = container.style.cssText;
    let currentHeight = 0;
    const maxHeight = 2000; // Approximate pixels per section

    children.forEach((child) => {
      const childHeight = (child as HTMLElement).offsetHeight || 200;
      
      // Start new section on h1 or when too tall
      if ((child.tagName === 'H1' && currentSection.children.length > 0) || 
          (currentHeight + childHeight > maxHeight && currentSection.children.length > 0)) {
        sections.push(currentSection);
        currentSection = document.createElement('div');
        currentSection.style.cssText = container.style.cssText;
        currentHeight = 0;
      }

      currentSection.appendChild(child.cloneNode(true));
      currentHeight += childHeight;
    });

    if (currentSection.children.length > 0) {
      sections.push(currentSection);
    }

    // Add cover separately
    const cover = container.querySelector('.cover');
    if (cover) {
      const coverSection = document.createElement('div');
      coverSection.style.cssText = container.style.cssText;
      coverSection.appendChild(cover.cloneNode(true));
      sections.unshift(coverSection);
    }

    return sections.length > 0 ? sections : [container];
  },

  // Escape HTML special characters
  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
