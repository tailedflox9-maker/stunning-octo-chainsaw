// src/services/pdfService.ts - ENHANCED PROFESSIONAL VERSION
// Refined with beautiful tables, subtle effects, and polished typography

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
    
    // Load Aptos-Mono fonts
    const basePath = '/fonts/';
    const aptosMonoFonts = [
      { name: 'Aptos-Mono.ttf', key: 'Aptos-Mono.ttf' },
      { name: 'Aptos-Mono-Bold.ttf', key: 'Aptos-Mono-Bold.ttf' }
    ];
    
    let hasAptosMono = false;
    console.log('🔍 Checking for Aptos-Mono fonts in', basePath);
    
    for (const font of aptosMonoFonts) {
      try {
        const response = await fetch(`${basePath}${font.name}`);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );
          pdfMake.vfs[font.key] = base64;
          console.log(`✓ Loaded ${font.name}`);
          hasAptosMono = true;
        }
      } catch (error) {
        console.log(`⚠ Failed to load ${font.name}`);
      }
    }
    
    const vfsKeys = Object.keys(vfs);
    if (vfsKeys.length === 0) {
      throw new Error('VFS_EMPTY');
    }
    
    console.log('✓ VFS loaded with', vfsKeys.length, 'files');
    
    const mainFontFamily = hasAptosMono ? 'Aptos-Mono' : 'Roboto';
    
    pdfMake.fonts = {
      [mainFontFamily]: {
        normal: `${mainFontFamily}.ttf`,
        bold: `${mainFontFamily}-Bold.ttf`,
        italics: `${mainFontFamily}.ttf`,
        bolditalics: `${mainFontFamily}-Bold.ttf`
      },
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      }
    };
    
    console.log(`✓ Using main font: ${mainFontFamily}`);
    
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
  private fontFamily: string;

  constructor() {
    this.fontFamily = 'Roboto';
    this.styles = {
      // Cover page - Elegant and refined
      coverTitle: { 
        fontSize: 32, 
        bold: true, 
        alignment: 'left', 
        margin: [0, 0, 0, 10], 
        color: '#0f172a',
        lineHeight: 1.15,
        characterSpacing: 0.3
      },
      coverSubtitle: { 
        fontSize: 16, 
        alignment: 'left', 
        color: '#475569',
        margin: [0, 0, 0, 6],
        lineHeight: 1.4
      },
      
      // Headers with subtle hierarchy
      h1Module: { 
        fontSize: 24, 
        bold: true, 
        margin: [0, 0, 0, 16], 
        color: '#0f172a',
        lineHeight: 1.3,
        characterSpacing: 0.5
      },
      h2: { 
        fontSize: 16, 
        bold: true, 
        margin: [0, 20, 0, 10], 
        color: '#1e293b',
        lineHeight: 1.35
      },
      h3: { 
        fontSize: 13.5, 
        bold: true, 
        margin: [0, 16, 0, 8], 
        color: '#334155',
        lineHeight: 1.4
      },
      h4: { 
        fontSize: 12, 
        bold: true, 
        margin: [0, 12, 0, 6], 
        color: '#475569' 
      },
      
      // Body text - Comfortable reading
      paragraph: { 
        fontSize: 10.5, 
        lineHeight: 1.65,
        alignment: 'justify', 
        margin: [0, 0, 0, 11], 
        color: '#1e293b'
      },
      listItem: { 
        fontSize: 10.5, 
        lineHeight: 1.55,
        margin: [0, 3, 0, 3], 
        color: '#1e293b'
      },
      
      // Special elements with subtle backgrounds
      codeBlock: { 
        fontSize: 9, 
        margin: [15, 12, 15, 12], 
        color: '#334155',
        background: '#f8fafc',
        fillColor: '#f8fafc',
        preserveLeadingSpaces: true,
        lineHeight: 1.5
      },
      blockquote: { 
        fontSize: 10.5, 
        italics: true, 
        margin: [20, 12, 15, 12], 
        color: '#475569',
        lineHeight: 1.7
      },
      
      // Enhanced table styles
      tableHeader: {
        fontSize: 10,
        bold: true,
        color: '#0f172a',
        fillColor: '#e0e7ff',
        alignment: 'left'
      },
      tableCell: {
        fontSize: 10,
        color: '#334155',
        lineHeight: 1.5,
        alignment: 'left'
      },
      tableCellAlt: {
        fontSize: 10,
        color: '#334155',
        lineHeight: 1.5,
        fillColor: '#f8fafc',
        alignment: 'left'
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
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let skipToC = false;
    let tocDepth = 0;

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        const text = paragraphBuffer.join(' ').trim();
        if (text && !skipToC) {
          content.push({ text: this.cleanText(text), style: 'paragraph' });
        }
        paragraphBuffer = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBuffer.length > 0 && !skipToC) {
        // Enhanced code block with subtle border
        content.push({
          stack: [
            {
              canvas: [{
                type: 'rect',
                x: 0, y: 0,
                w: 505, h: codeBuffer.length * 12 + 24,
                r: 4,
                color: '#f1f5f9',
                lineColor: '#cbd5e1',
                lineWidth: 0.5
              }]
            },
            {
              text: codeBuffer.join('\n'),
              style: 'codeBlock',
              margin: [15, -codeBuffer.length * 12 - 12, 15, 12],
              preserveLeadingSpaces: true
            }
          ],
          margin: [0, 10, 0, 14]
        });
        codeBuffer = [];
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0 && tableHeaders.length > 0 && !skipToC) {
        const colCount = tableHeaders.length;
        const colWidths = Array(colCount).fill('*');
        
        // Create enhanced table with alternating row colors
        const tableBody = [
          // Header row
          tableHeaders.map(h => ({ 
            text: this.cleanText(h), 
            style: 'tableHeader',
            margin: [8, 6, 8, 6]
          })),
          // Data rows with alternating colors
          ...tableRows.map((row, idx) => 
            row.map(cell => ({ 
              text: this.cleanText(cell), 
              style: idx % 2 === 0 ? 'tableCell' : 'tableCellAlt',
              margin: [8, 5, 8, 5]
            }))
          )
        ];
        
        content.push({
          table: {
            headerRows: 1,
            widths: colWidths,
            body: tableBody
          },
          layout: {
            hLineWidth: (i: number, node: any) => {
              if (i === 0) return 0; // No line above table
              if (i === 1) return 1.5; // Thick line after header
              if (i === node.table.body.length) return 1; // Line below table
              return 0; // No lines between rows
            },
            vLineWidth: () => 0, // No vertical lines for cleaner look
            hLineColor: (i: number) => i === 1 ? '#818cf8' : '#cbd5e1',
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0
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

      // Skip Table of Contents
      if (trimmed.match(/^#{1,2}\s+(table of contents|contents)/i)) {
        skipToC = true;
        tocDepth = (trimmed.match(/^#+/) || [''])[0].length;
        continue;
      }

      if (skipToC && trimmed.match(/^#{1,2}\s+/)) {
        const currentDepth = (trimmed.match(/^#+/) || [''])[0].length;
        if (currentDepth <= tocDepth) {
          skipToC = false;
        }
      }

      // Code blocks
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

      if (!trimmed || skipToC) {
        flushParagraph();
        flushTable();
        continue;
      }

      // Table detection
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

      // Headers with page breaks for modules
      const isModuleHeading = trimmed.startsWith('# ') && 
                              /^#\s+module\s+\d+/i.test(trimmed);

      if (trimmed.startsWith('# ')) {
        flushParagraph();
        const text = this.cleanText(trimmed.substring(2));
        
        if (isModuleHeading) {
          if (!isFirstModule) {
            content.push({ text: '', pageBreak: 'before' });
          }
          isFirstModule = false;
          // Add decorative line before module title
          content.push({
            canvas: [{
              type: 'line',
              x1: 0, y1: 0,
              x2: 60, y2: 0,
              lineWidth: 2,
              lineColor: '#818cf8'
            }],
            margin: [0, 0, 0, 10]
          });
          content.push({ text, style: 'h1Module' });
        } else {
          content.push({ text, style: 'h1Module' });
        }
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        content.push({ 
          text: this.cleanText(trimmed.substring(3)), 
          style: 'h2' 
        });
      } else if (trimmed.startsWith('### ')) {
        flushParagraph();
        content.push({ 
          text: this.cleanText(trimmed.substring(4)), 
          style: 'h3' 
        });
      } else if (trimmed.startsWith('#### ')) {
        flushParagraph();
        content.push({ 
          text: this.cleanText(trimmed.substring(5)), 
          style: 'h4' 
        });
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
        // Enhanced blockquote with gradient-like effect
        content.push({
          columns: [
            {
              width: 4,
              canvas: [{
                type: 'rect',
                x: 0, y: 0,
                w: 4, h: 'auto',
                color: '#818cf8',
                r: 2
              }]
            },
            {
              width: '*',
              text: this.cleanText(trimmed.substring(1).trim()),
              style: 'blockquote',
              margin: [12, 0, 0, 0]
            }
          ],
          margin: [18, 12, 15, 12]
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
      { text: '', margin: [0, 60, 0, 0] },
      
      // Decorative top accent
      {
        canvas: [{
          type: 'rect',
          x: 0, y: 0,
          w: 80, h: 4,
          r: 2,
          color: '#818cf8'
        }],
        margin: [0, 0, 0, 20]
      },
      
      { 
        text: title, 
        style: 'coverTitle',
        margin: [0, 0, 0, 8]
      },
      
      {
        text: 'AI-Powered Knowledge Creation',
        fontSize: 12,
        color: '#64748b',
        margin: [0, 0, 0, 50]
      },
      
      // Abstract section with subtle background
      {
        stack: [
          {
            text: 'Abstract',
            fontSize: 12,
            bold: true,
            color: '#0f172a',
            margin: [0, 0, 0, 10]
          },
          {
            text: `This comprehensive ${metadata.modules}-module document contains ${metadata.words.toLocaleString()} words of professionally structured content. Each section provides detailed coverage with clear explanations, practical insights, and academic rigor.`,
            fontSize: 10.5,
            lineHeight: 1.7,
            alignment: 'justify',
            color: '#334155',
            margin: [0, 0, 0, 0]
          }
        ],
        margin: [0, 0, 0, 40]
      },
      
      // Document metadata with refined styling
      {
        stack: [
          {
            text: 'Document Metadata',
            fontSize: 11,
            bold: true,
            color: '#0f172a',
            margin: [0, 0, 0, 12]
          },
          {
            columns: [
              { text: 'Total Words:', width: 90, fontSize: 9.5, color: '#64748b', bold: true },
              { text: metadata.words.toLocaleString(), fontSize: 9.5, color: '#1e293b' }
            ],
            margin: [0, 0, 0, 6]
          },
          {
            columns: [
              { text: 'Modules:', width: 90, fontSize: 9.5, color: '#64748b', bold: true },
              { text: metadata.modules.toString(), fontSize: 9.5, color: '#1e293b' }
            ],
            margin: [0, 0, 0, 6]
          },
          {
            columns: [
              { text: 'Generated:', width: 90, fontSize: 9.5, color: '#64748b', bold: true },
              { text: metadata.date, fontSize: 9.5, color: '#1e293b' }
            ],
            margin: [0, 0, 0, 6]
          },
          ...(metadata.provider && metadata.model ? [{
            columns: [
              { text: 'AI Engine:', width: 90, fontSize: 9.5, color: '#64748b', bold: true },
              { text: `${metadata.provider} ${metadata.model}`, fontSize: 9.5, color: '#1e293b' }
            ],
            margin: [0, 0, 0, 6]
          }] : []),
          {
            columns: [
              { text: 'Typography:', width: 90, fontSize: 9.5, color: '#64748b', bold: true },
              { text: `${this.fontFamily} (Professional Monospace)`, fontSize: 9.5, color: '#1e293b' }
            ],
            margin: [0, 0, 0, 6]
          }
        ]
      },
      
      { text: '', margin: [0, 0, 0, 90] },
      
      // Footer with refined branding
      {
        stack: [
          {
            canvas: [{
              type: 'line',
              x1: 0, y1: 0,
              x2: 120, y2: 0,
              lineWidth: 1.5,
              lineColor: '#cbd5e1'
            }],
            margin: [0, 0, 0, 16]
          },
          {
            text: 'Pustakam Engine',
            fontSize: 11,
            bold: true,
            color: '#0f172a',
            margin: [0, 0, 0, 6]
          },
          {
            text: 'Advanced AI Content Generation Platform',
            fontSize: 9,
            color: '#64748b',
            margin: [0, 0, 0, 10]
          },
          {
            text: 'Created by Tanmay Kalbande',
            fontSize: 9,
            color: '#475569',
            margin: [0, 0, 0, 4]
          },
          {
            text: 'linkedin.com/in/tanmay-kalbande',
            fontSize: 8.5,
            color: '#818cf8',
            link: 'https://www.linkedin.com/in/tanmay-kalbande/',
            decoration: 'underline',
            decorationColor: '#818cf8'
          }
        ]
      },
      
      { text: '', pageBreak: 'after' }
    ];
  }

  public async generate(project: BookProject, onProgress: (progress: number) => void): Promise<void> {
    console.log('🎨 Generating enhanced professional PDF');
    onProgress(10);
    
    const pdfMakeLib = await loadPdfMake();
    
    const hasAptosMono = Object.keys(pdfMakeLib.vfs).some(key => key.includes('Aptos-Mono'));
    this.fontFamily = hasAptosMono ? 'Aptos-Mono' : 'Roboto';
    
    onProgress(25);

    const totalWords = project.modules.reduce((sum, m) => sum + m.wordCount, 0);
    
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
    
    onProgress(75);
    this.content = [...coverContent, ...mainContent];

    const docDefinition: any = {
      content: this.content,
      styles: this.styles,
      defaultStyle: { 
        font: this.fontFamily,
        fontSize: 10.5, 
        color: '#1e293b',
        lineHeight: 1.6
      },
      pageSize: 'A4',
      pageMargins: [70, 80, 70, 75],
      
      header: (currentPage: number) => {
        if (currentPage <= 1) return {};
        
        return {
          stack: [
            {
              columns: [
                {
                  text: project.title,
                  fontSize: 8.5,
                  color: '#64748b',
                  italics: true,
                  width: '*'
                },
                {
                  text: `${currentPage - 1}`,
                  fontSize: 8.5,
                  color: '#64748b',
                  alignment: 'right',
                  width: 'auto'
                }
              ],
              margin: [70, 30, 70, 0]
            },
            {
              canvas: [{
                type: 'line',
                x1: 70, y1: 8,
                x2: 525, y2: 8,
                lineWidth: 0.5,
                lineColor: '#e2e8f0'
              }]
            }
          ]
        };
      },
      
      footer: (currentPage: number, pageCount: number) => {
        if (currentPage <= 1) return {};
        
        return {
          columns: [
            { 
              text: 'Pustakam Engine', 
              fontSize: 7.5,
              color: '#94a3b8',
              margin: [70, 0, 0, 0],
              width: '*'
            },
            { 
              text: 'linkedin.com/in/tanmay-kalbande', 
              fontSize: 7.5,
              color: '#94a3b8',
              alignment: 'right',
              margin: [0, 0, 70, 0],
              width: '*'
            }
          ],
          margin: [0, 25, 0, 0]
        };
      },
      
      info: { 
        title: project.title, 
        author: 'Pustakam Engine - Tanmay Kalbande', 
        creator: 'Pustakam Engine',
        subject: project.goal,
        keywords: 'AI, Knowledge, Education, Pustakam, Professional'
      }
    };

    onProgress(85);
    console.log(`📄 Creating enhanced PDF with ${this.fontFamily}`);

    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMakeLib.createPdf(docDefinition);
        const filename = `${project.title
          .replace(/[^a-z0-9\s-]/gi, '')
          .replace(/\s+/g, '_')
          .toLowerCase()
          .substring(0, 50)}_${new Date().toISOString().slice(0, 10)}.pdf`;
        
        // Enhanced download popup
        const popup = document.createElement('div');
        popup.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in';
        popup.innerHTML = `
          <div class="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-fade-in-up">
            <div class="flex items-center gap-4 mb-6">
              <div class="w-14 h-14 rounded-xl bg-indigo-500/20 flex items-center justify-center ring-2 ring-indigo-400/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-bold text-white mb-1">Enhanced PDF Ready</h3>
                <p class="text-sm text-gray-400">Professional academic formatting applied</p>
              </div>
            </div>
            
            <div class="bg-gray-800/50 rounded-xl p-5 mb-6 border border-gray-700/50">
              <p class="text-sm text-gray-300 leading-relaxed mb-4">
                Your document has been beautifully formatted with refined typography, elegant tables, and subtle design effects for maximum readability.
              </p>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex items-start gap-2">
                  <span class="text-emerald-400 shrink-0 mt-0.5">✓</span>
                  <span class="text-xs text-gray-300">Enhanced table styling</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-emerald-400 shrink-0 mt-0.5">✓</span>
                  <span class="text-xs text-gray-300">Refined typography</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-emerald-400 shrink-0 mt-0.5">✓</span>
                  <span class="text-xs text-gray-300">Subtle visual accents</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-emerald-400 shrink-0 mt-0.5">✓</span>
                  <span class="text-xs text-gray-300">Professional cover</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-emerald-400 shrink-0 mt-0.5">✓</span>
                  <span class="text-xs text-gray-300">${this.fontFamily} monospace</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-emerald-400 shrink-0 mt-0.5">✓</span>
                  <span class="text-xs text-gray-300">Optimized spacing</span>
                </div>
              </div>
            </div>
            
            <div class="flex gap-3">
              <button id="cancel-pdf" class="flex-1 px-5 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-700 hover:text-white font-medium transition-all duration-200">
                Cancel
              </button>
              <button id="download-pdf" class="flex-1 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl text-white font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/25">
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
            console.log('✅ Enhanced professional PDF downloaded:', filename);
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
      console.log('🎉 Enhanced PDF generation completed successfully');
    } catch (error: any) {
      console.error('💥 PDF generation error:', error);
      
      alert('PDF generation failed. Please try:\n\n' +
            '1. Hard refresh the page (Ctrl+Shift+R)\n' +
            '2. Clear browser cache\n' +
            '3. Check console for font loading errors\n' +
            '4. Download Markdown (.md) version instead\n\n' +
            'The .md file contains complete content.');
      
      onProgress(0);
    } finally {
      isGenerating = false;
    }
  }
};
