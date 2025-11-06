// src/services/pdfService.ts - FIXED VERSION WITH EMOJIS & HYPHENS
import { BookProject } from '../types';
let isGenerating = false;
let pdfMake: any = null;
let fontsLoaded = false;

async function loadPdfMake() {
  if (pdfMake && fontsLoaded) {
    return pdfMake;
  }
  try {
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

    // Auto-load Aptos-Mono fonts from /fonts/
    const basePath = '/fonts/';
    const aptosMonoFonts = [
      { name: 'Aptos-Mono.ttf', key: 'Aptos-Mono.ttf' },
      { name: 'Aptos-Mono-Bold.ttf', key: 'Aptos-Mono-Bold.ttf' },
      { name: 'Aptos-Mono-Bold-Italic.ttf', key: 'Aptos-Mono-Bold-Italic.ttf' }
    ];
    
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
        }
      } catch (error) {
        // Silent fail - will use fallback font
      }
    }
    
    const vfsKeys = Object.keys(vfs);
    if (vfsKeys.length === 0) {
      throw new Error('VFS_EMPTY');
    }

    // Check which fonts are available
    const aptosMonoInVfs = !!vfs['Aptos-Mono.ttf'] && !!vfs['Aptos-Mono-Bold.ttf'];
    
    // Configure fonts
    if (aptosMonoInVfs) {
      const hasBoldItalic = !!vfs['Aptos-Mono-Bold-Italic.ttf'];
      
      const isValidFont = (key: string) => {
        const data = vfs[key];
        return data && typeof data === 'string' && data.length > 1000;
      };
      
      if (isValidFont('Aptos-Mono.ttf') && isValidFont('Aptos-Mono-Bold.ttf')) {
        pdfMake.fonts = {
          'Aptos-Mono': {
            normal: 'Aptos-Mono.ttf',
            bold: 'Aptos-Mono-Bold.ttf',
            italics: (hasBoldItalic && isValidFont('Aptos-Mono-Bold-Italic.ttf')) ? 'Aptos-Mono-Bold-Italic.ttf' : 'Aptos-Mono.ttf',
            bolditalics: (hasBoldItalic && isValidFont('Aptos-Mono-Bold-Italic.ttf')) ? 'Aptos-Mono-Bold-Italic.ttf' : 'Aptos-Mono-Bold.ttf'
          }
        };
      } else {
        pdfMake.fonts = {
          Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-MediumItalic.ttf'
          }
        };
      }
    } else {
      pdfMake.fonts = {
        Roboto: {
          normal: 'Roboto-Regular.ttf',
          bold: 'Roboto-Medium.ttf',
          italics: 'Roboto-Italic.ttf',
          bolditalics: 'Roboto-MediumItalic.ttf'
        }
      };
    }
    
    fontsLoaded = true;
    return pdfMake;
  } catch (error) {
    console.error('[PDF] Loading failed:', error);
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
  font?: string;
  unbreakable?: boolean;
  dontBreakRows?: boolean;
  widths?: any;
}

class ProfessionalPdfGenerator {
  private content: PDFContent[] = [];
  private styles: any;
  private fontFamily: string;

  constructor() {
    this.fontFamily = 'Roboto';
    this.styles = {
      coverTitle: {
        fontSize: 28,
        bold: true,
        alignment: 'left',
        margin: [0, 0, 0, 8],
        color: '#1a1a1a',
        lineHeight: 1.1,
        characterSpacing: 0.5
      },
      coverSubtitle: {
        fontSize: 18,
        alignment: 'left',
        color: '#1a1a1a',
        bold: true,
        margin: [0, 0, 0, 4],
        lineHeight: 1.2
      },
      h1Module: {
        fontSize: 26,
        bold: true,
        margin: [0, 0, 0, 18],
        color: '#1a202c',
        lineHeight: 1.3,
        characterSpacing: 0.8,
        alignment: 'left'
      },
      h2: {
        fontSize: 18,
        bold: true,
        margin: [0, 22, 0, 11],
        color: '#2d3748',
        lineHeight: 1.3,
        alignment: 'left'
      },
      h3: {
        fontSize: 15,
        bold: true,
        margin: [0, 18, 0, 9],
        color: '#2d3748',
        lineHeight: 1.3,
        alignment: 'left'
      },
      h4: {
        fontSize: 13,
        bold: true,
        margin: [0, 15, 0, 8],
        color: '#4a5568',
        alignment: 'left'
      },
      paragraph: {
        fontSize: 10,
        lineHeight: 1.6,
        alignment: 'justify',
        margin: [0, 0, 0, 12],
        color: '#1a1a1a',
        characterSpacing: 0
      },
      listItem: {
        fontSize: 10,
        lineHeight: 1.5,
        margin: [0, 3, 0, 3],
        color: '#1a1a1a',
        alignment: 'left'
      },
      codeBlock: {
        fontSize: 9,
        margin: [0, 12, 0, 12],
        color: '#1e293b',
        background: '#f1f5f9',
        fillColor: '#f1f5f9',
        preserveLeadingSpaces: true,
        lineHeight: 1.5,
        alignment: 'left',
        characterSpacing: -0.5
      },
      blockquote: {
        fontSize: 10.5,
        italics: true,
        margin: [20, 10, 15, 10],
        color: '#4a5568',
        lineHeight: 1.6,
        alignment: 'justify'
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: '#000000',
        fillColor: '#d1d5db',
        alignment: 'left'
      },
      tableCell: {
        fontSize: 8.5,
        color: '#1f2937',
        lineHeight: 1.3,
        alignment: 'left'
      },
      disclaimerTitle: {
        fontSize: 24,
        bold: true,
        alignment: 'center',
        color: '#4a5568',
        margin: [0, 0, 0, 20]
      },
      disclaimerText: {
        fontSize: 10,
        lineHeight: 1.65,
        alignment: 'justify',
        color: '#2d3748',
        margin: [0, 0, 0, 12],
        characterSpacing: 0
      },
      disclaimerNote: {
        fontSize: 9,
        lineHeight: 1.5,
        alignment: 'justify',
        color: '#4a5568',
        margin: [0, 8, 0, 8]
      }
    };
  }

  // ✅ NEW: Normalize Unicode dashes to ASCII hyphens
  private normalizeDashes(text: string): string {
    return text
      // Convert all dash variants to ASCII hyphen
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
      // Convert smart quotes to straight quotes
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      // Convert ellipsis
      .replace(/[\u2026]/g, '...');
  }

  // ✅ NEW: Replace emojis with text-based emoticons
  private replaceEmojisWithText(text: string): string {
    const emojiMap: Record<string, string> = {
      // Smileys & Emotion
      '😀': ':D', '😃': ':D', '😄': ':D', '😁': ':D',
      '😆': 'XD', '😅': '^_^', '🤣': 'XD', '😂': 'XD',
      '😊': ':)', '😇': 'O:)', '🙂': ':)', '🙃': '(-:',
      '😉': ';)', '😌': ':)', '😍': '<3', '🥰': '<3',
      '😘': ':*', '😗': ':*', '😙': ':*', '😚': ':*',
      '🤗': '(>^_^)>', '🤩': '*_*', '🤔': ':-?', '🤨': ':-/',
      '😐': ':-|', '😑': '-_-', '😶': ':-X', '🙄': ':-/',
      '😏': ':->', '😣': '>_<', '😥': ":'(", '😮': ':O',
      '🤐': ':-X', '😯': ':O', '😪': '(-_-)zzz', '😫': 'X(',
      '🥱': '(-_-)zzz', '😴': 'zzz', '😌': ':)', '😛': ':P',
      '😜': ';P', '😝': 'XP', '🤑': '$_

  // ✅ UPDATED: Replace emojis with text emoticons, normalize dashes
  private cleanText(text: string): string {
    // First normalize dashes
    text = this.normalizeDashes(text);
    
    // Then replace emojis with text
    text = this.replaceEmojisWithText(text);
    
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

  // ✅ UPDATED: Parse inline markdown with dash normalization and emoji replacement
  private parseInlineMarkdown(text: string): any {
    // Normalize dashes first
    text = this.normalizeDashes(text);
    
    // Replace emojis with text
    text = this.replaceEmojisWithText(text);
    
    const parts: any[] = [];
    let lastIndex = 0;
    
    // Standard markdown regex (no emoji detection needed anymore)
    const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_|`(.+?)`|~~(.+?)~~)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index) });
      }
      
      if (match[2]) {
        parts.push({ text: match[2], bold: true, italics: true });
      } else if (match[3]) {
        parts.push({ text: match[3], bold: true });
      } else if (match[4]) {
        parts.push({ text: match[4], italics: true });
      } else if (match[5]) {
        parts.push({ text: match[5], bold: true });
      } else if (match[6]) {
        parts.push({ text: match[6], italics: true });
      } else if (match[7]) {
        parts.push({ text: match[7], font: this.fontFamily, background: '#f3f4f6' });
      } else if (match[8]) {
        parts.push({ text: match[8], decoration: 'lineThrough' });
      }
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex) });
    }
    
    return parts.length === 0 ? text : (parts.length === 1 && typeof parts[0] === 'string') ? parts[0] : parts;
  }

  // Split long code blocks across pages if needed
  private splitCodeBlock(code: string, maxLines: number = 40): string[] {
    const lines = code.split('\n');
    const chunks: string[] = [];
    
    for (let i = 0; i < lines.length; i += maxLines) {
      chunks.push(lines.slice(i, i + maxLines).join('\n'));
    }
    
    return chunks;
  }

  private parseMarkdownToContent(markdown: string): PDFContent[] {
    // ✅ Normalize dashes and replace emojis in the entire markdown first
    markdown = this.normalizeDashes(markdown);
    markdown = this.replaceEmojisWithText(markdown);
    
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
          const formattedText = this.parseInlineMarkdown(text);
          content.push({ 
            text: formattedText, 
            style: 'paragraph',
            alignment: 'justify'
          });
        }
        paragraphBuffer = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBuffer.length === 0 || skipToC) return;

      const fullCode = codeBuffer.join('\n');
      const fontSize = 8;
      const lineHeight = 1.4;
      const paddingTopBottom = 12;
      const paddingLeftRight = 12;
      
      const chunks = this.splitCodeBlock(fullCode, 40);
      
      chunks.forEach((chunk, chunkIndex) => {
        const lines = chunk.split('\n');
        const lineCount = lines.length;
        const textHeight = lineCount * fontSize * lineHeight;
        const blockHeight = textHeight + (paddingTopBottom * 2);
        const contentWidth = 515;
        
        if (chunkIndex > 0) {
          content.push({ text: '', pageBreak: 'before' });
        }
        
        content.push({
          table: {
            widths: [contentWidth],
            body: [
              [{
                text: chunk,
                font: this.fontFamily,
                fontSize: fontSize,
                color: '#0f172a',
                preserveLeadingSpaces: true,
                lineHeight: lineHeight,
                characterSpacing: -0.2,
                alignment: 'left',
                fillColor: '#f8fafc',
                margin: [paddingLeftRight, paddingTopBottom, paddingLeftRight, paddingTopBottom]
              }]
            ]
          },
          layout: {
            hLineWidth: () => 1.5,
            vLineWidth: () => 1.5,
            hLineColor: () => '#94a3b8',
            vLineColor: () => '#94a3b8',
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0
          },
          margin: [0, 12, 0, 12],
          unbreakable: blockHeight < 500
        });
        
        if (chunkIndex < chunks.length - 1) {
          content.push({
            text: '... (continued on next page)',
            fontSize: 7,
            color: '#64748b',
            italics: true,
            alignment: 'right',
            margin: [0, -8, 0, 8]
          });
        }
      });
      
      codeBuffer = [];
    };

    const flushTable = () => {
      if (tableRows.length > 0 && tableHeaders.length > 0 && !skipToC) {
        const colCount = tableHeaders.length;
        
        const calculateColumnWidths = () => {
          if (colCount <= 2) {
            return Array(colCount).fill('*');
          } else if (colCount === 3) {
            return ['*', '*', '*'];
          } else if (colCount === 4) {
            return Array(colCount).fill('*');
          } else {
            return Array(colCount).fill('auto');
          }
        };
        
        content.push({
          table: {
            headerRows: 1,
            widths: calculateColumnWidths(),
            body: [
              tableHeaders.map(h => ({
                text: this.parseInlineMarkdown(h),
                style: 'tableHeader',
                fillColor: '#d1d5db',
                margin: [4, 4, 4, 4],
                alignment: 'left',
                fontSize: 9
              })),
              ...tableRows.map(row =>
                row.map(cell => ({
                  text: this.parseInlineMarkdown(cell),
                  style: 'tableCell',
                  margin: [4, 3, 4, 3],
                  alignment: 'left',
                  fontSize: 8.5
                }))
              )
            ]
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: () => 0.5,
            hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? '#6b7280' : '#9ca3af',
            vLineColor: () => '#9ca3af',
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3
          },
          margin: [0, 8, 0, 12],
          dontBreakRows: false,
          widths: 'auto'
        });
        tableRows = [];
        tableHeaders = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
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
      if (trimmed === '---' || trimmed.match(/^-{3,}$/)) {
        flushParagraph();
        flushTable();
        content.push({
          canvas: [{
            type: 'line',
            x1: 0, y1: 0,
            x2: 515, y2: 0,
            lineWidth: 1.5,
            lineColor: '#cbd5e1'
          }],
          margin: [0, 15, 0, 20]
        });
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
      if (!trimmed || skipToC) {
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
      const isModuleHeading = trimmed.startsWith('# ') &&
                              /^#\s+module\s+\d+/i.test(trimmed);
      if (trimmed.startsWith('# ')) {
        flushParagraph();
        let text = trimmed.substring(2);
        text = this.capitalizeFirstLetter(text);
        const formattedText = this.parseInlineMarkdown(text);
        if (isModuleHeading) {
          if (!isFirstModule) {
            content.push({
              canvas: [{
                type: 'line',
                x1: 0, y1: 0,
                x2: 515, y2: 0,
                lineWidth: 2,
                lineColor: '#d1d5db'
              }],
              margin: [0, 20, 0, 30]
            });
          }
          isFirstModule = false;
          content.push({ text: formattedText, style: 'h1Module', alignment: 'left' });
        } else {
          content.push({ text: formattedText, style: 'h1Module', alignment: 'left' });
        }
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        let text = trimmed.substring(3);
        text = this.capitalizeFirstLetter(text);
        content.push({ text: this.parseInlineMarkdown(text), style: 'h2', alignment: 'left' });
      } else if (trimmed.startsWith('### ')) {
        flushParagraph();
        let text = trimmed.substring(4);
        text = this.capitalizeFirstLetter(text);
        content.push({ text: this.parseInlineMarkdown(text), style: 'h3', alignment: 'left' });
      } else if (trimmed.startsWith('#### ')) {
        flushParagraph();
        let text = trimmed.substring(5);
        text = this.capitalizeFirstLetter(text);
        content.push({ text: this.parseInlineMarkdown(text), style: 'h4', alignment: 'left' });
      } else if (trimmed.match(/^[-*+]\s+/)) {
        flushParagraph();
        const listText = trimmed.replace(/^[-*+]\s+/, '');
        const formattedText = this.parseInlineMarkdown(listText);
        content.push({
          text: Array.isArray(formattedText) ? [{ text: '• ' }, ...formattedText] : [{ text: '• ' }, formattedText],
          style: 'listItem',
          margin: [10, 3, 0, 3],
          alignment: 'left'
        });
      } else if (trimmed.match(/^\d+\.\s+/)) {
        flushParagraph();
        const num = trimmed.match(/^(\d+)\./)?.[1] || '';
        const listText = trimmed.replace(/^\d+\.\s+/, '');
        const formattedText = this.parseInlineMarkdown(listText);
        content.push({
          text: Array.isArray(formattedText) ? [{ text: num + '. ' }, ...formattedText] : [{ text: num + '. ' }, formattedText],
          style: 'listItem',
          margin: [10, 3, 0, 3],
          alignment: 'left'
        });
      } else if (trimmed.startsWith('>')) {
        flushParagraph();
        content.push({
          columns: [
            {
              width: 3,
              canvas: [{
                type: 'rect',
                x: 0, y: 0,
                w: 3, h: 20,
                color: '#667eea'
              }]
            },
            {
              width: '*',
              text: this.parseInlineMarkdown(trimmed.substring(1).trim()),
              style: 'blockquote',
              margin: [8, 0, 0, 0],
              alignment: 'justify'
            }
          ],
          margin: [15, 10, 15, 10]
        });
      } else {
        // ✅ Process regular paragraphs (emojis already replaced)
        const cleaned = trimmed.trim();
        if (cleaned) paragraphBuffer.push(cleaned);
      }
    }
    flushParagraph();
    flushCodeBlock();
    flushTable();
    return content;
  }

  private createDisclaimerPage(): PDFContent[] {
    return [
      { text: '', margin: [0, 60, 0, 0] },
      {
        text: 'IMPORTANT DISCLAIMER',
        style: 'disclaimerTitle'
      },
      {
        canvas: [{
          type: 'rect',
          x: 150,
          y: 0,
          w: 100,
          h: 2,
          color: '#4a5568'
        }],
        margin: [0, 0, 0, 30]
      },
      {
        text: 'AI-Generated Content Notice',
        fontSize: 12,
        bold: true,
        color: '#2d3748',
        margin: [0, 0, 0, 12],
        alignment: 'left'
      },
      {
        text: 'This document has been entirely generated by artificial intelligence technology through the Pustakam Injin platform. While significant effort has been made to ensure accuracy and coherence, readers should be aware of the following important considerations:',
        style: 'disclaimerText'
      },
      {
        ul: [
          'The content is produced by AI language models and may contain factual inaccuracies, outdated information, or logical inconsistencies.',
          'Information should be independently verified before being used for critical decisions, academic citations, or professional purposes.',
          'The AI may generate plausible-sounding but incorrect or fabricated information (known as "hallucinations").',
          'Views and opinions expressed do not necessarily reflect those of the creators, developers, or any affiliated organizations.',
          'This content should not be considered a substitute for professional advice in medical, legal, financial, or other specialized fields.'
        ],
        style: 'disclaimerNote',
        margin: [20, 10, 0, 20]
      },
      {
        text: 'Intellectual Property & Usage',
        fontSize: 12,
        bold: true,
        color: '#2d3748',
        margin: [0, 10, 0, 12],
        alignment: 'left'
      },
      {
        text: 'This document is provided "as-is" for informational and educational purposes. Users are encouraged to fact-check, cross-reference, and critically evaluate all content. The Pustakam Injin serves as a knowledge exploration tool and starting point for research, not as a definitive source of truth.',
        style: 'disclaimerText'
      },
      {
        text: 'Quality Assurance',
        fontSize: 12,
        bold: true,
        color: '#2d3748',
        margin: [0, 10, 0, 12],
        alignment: 'left'
      },
      {
        text: 'While the Pustakam Injin employs advanced AI models and formatting techniques to produce professional-quality documents, no warranty is made regarding completeness, reliability, or accuracy. Users assume full responsibility for how they use, interpret, and apply this content.',
        style: 'disclaimerText'
      },
      {
        text: [
          { text: 'Generated by: ', fontSize: 9, color: '#4a5568' },
          { text: 'Pustakam Injin\n', fontSize: 9, bold: true, color: '#2d3748' },
          { text: 'Date: ', fontSize: 9, color: '#4a5568' },
          { text: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }), fontSize: 9, color: '#2d3748' }
        ],
        margin: [0, 30, 0, 10],
        alignment: 'left'
      },
      {
        text: 'For questions or concerns about this content, please refer to the Pustakam Injin documentation or contact the platform administrator.',
        fontSize: 8,
        color: '#718096',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      }
    ];
  }

  private createCoverPage(title: string, metadata: {
    words: number;
    modules: number;
    date: string;
    provider?: string;
    model?: string;
  }): PDFContent[] {
    // ✅ Normalize dashes in title
    const normalizedTitle = this.normalizeDashes(title);
    
    return [
      { text: '', margin: [0, 80, 0, 0] },
      {
        text: normalizedTitle,
        style: 'coverTitle',
        margin: [0, 0, 0, 12]
      },
      {
        text: 'Generated by Pustakam Injin',
        fontSize: 11,
        color: '#666666',
        margin: [0, 0, 0, 40],
        alignment: 'left'
      },
      {
        text: 'Abstract',
        fontSize: 11,
        bold: true,
        color: '#1a1a1a',
        margin: [0, 0, 0, 8],
        alignment: 'left'
      },
      {
        text: `This comprehensive ${metadata.modules} chapter document contains ${metadata.words.toLocaleString()} words of AI-generated content. Each section has been carefully structured to provide in-depth coverage of the topic with clear explanations and practical insights.`,
        fontSize: 10,
        lineHeight: 1.6,
        alignment: 'justify',
        color: '#1a1a1a',
        margin: [0, 0, 0, 30]
      },
      {
        stack: [
          {
            text: 'Document Information',
            fontSize: 11,
            bold: true,
            color: '#1a1a1a',
            margin: [0, 0, 0, 8],
            alignment: 'left'
          },
          {
            columns: [
              { text: 'Word Count:', width: 80, fontSize: 9, color: '#666666' },
              { text: metadata.words.toLocaleString(), fontSize: 9, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 4]
          },
          {
            columns: [
              { text: 'Chapters:', width: 80, fontSize: 9, color: '#666666' },
              { text: metadata.modules.toString(), fontSize: 9, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 4]
          },
          {
            columns: [
              { text: 'Generated:', width: 80, fontSize: 9, color: '#666666' },
              { text: metadata.date, fontSize: 9, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 4]
          },
          ...(metadata.provider && metadata.model ? [{
            columns: [
              { text: 'AI Model:', width: 80, fontSize: 9, color: '#666666' },
              { text: `${metadata.provider} ${metadata.model}`, fontSize: 9, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 4]
          }] : [])
        ]
      },
      { text: '', margin: [0, 0, 0, 80] },
      {
        stack: [
          {
            canvas: [{
              type: 'line',
              x1: 0, y1: 0,
              x2: 100, y2: 0,
              lineWidth: 1,
              lineColor: '#1a1a1a'
            }],
            margin: [0, 0, 0, 12]
          },
          {
            text: 'Pustakam Injin',
            fontSize: 10,
            bold: true,
            color: '#1a1a1a',
            margin: [0, 0, 0, 4],
            alignment: 'left'
          },
          {
            text: 'AI-Powered Knowledge Creation',
            fontSize: 9,
            color: '#666666',
            margin: [0, 0, 0, 8],
            alignment: 'left'
          },
          {
            text: 'Tanmay Kalbande',
            fontSize: 9,
            color: '#1a1a1a',
            link: 'https://www.linkedin.com/in/tanmay-kalbande/',
            decoration: 'underline',
            decorationColor: '#1a1a1a',
            alignment: 'left'
          }
        ]
      },
      { text: '', pageBreak: 'after' }
    ];
  }

  private generateSafeFilename(title: string): string {
    const sanitized = title
      .replace(/[^a-z0-9\s-]/gi, '')
      .trim()
      .split(/\s+/)
      .map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('_')
      .substring(0, 50);
    
    const date = new Date().toISOString().slice(0, 10);
    return `${sanitized}_${date}.pdf`;
  }

  private capitalizeFirstLetter(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  public async generate(project: BookProject, onProgress: (progress: number) => void): Promise<void> {
    onProgress(10);
    const pdfMakeLib = await loadPdfMake();
    const hasAptosMono = Object.keys(pdfMakeLib.vfs).some(key => key.includes('Aptos-Mono'));
    this.fontFamily = hasAptosMono ? 'Aptos-Mono' : 'Roboto';
    
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
    onProgress(60);
    const disclaimerContent = this.createDisclaimerPage();
    onProgress(75);
    
    this.content = [...coverContent, ...mainContent, ...disclaimerContent];
    
    const docDefinition: any = {
      content: this.content,
      styles: this.styles,
      defaultStyle: {
        font: this.fontFamily,
        fontSize: 10,
        color: '#1a1a1a',
        lineHeight: 1.6,
        alignment: 'justify'
      },
      pageSize: 'A4',
      pageMargins: [50, 75, 50, 70],
      header: (currentPage: number) => {
        if (currentPage <= 1) return {};
        return {
          columns: [
            {
              text: this.normalizeDashes(project.title),
              fontSize: 8,
              color: '#666666',
              italics: true,
              width: '*'
            },
            {
              text: `Page ${currentPage - 1}`,
              fontSize: 8,
              color: '#666666',
              alignment: 'right',
              width: 'auto'
            }
          ],
          margin: [50, 22, 50, 0]
        };
      },
      footer: (currentPage: number) => {
        if (currentPage <= 1) return {};
        return {
          columns: [
            {
              text: 'Pustakam Injin',
              fontSize: 7,
              color: '#999999',
              margin: [50, 0, 0, 0],
              width: '*'
            },
            {
              text: 'https://www.linkedin.com/in/tanmay-kalbande/',
              fontSize: 7,
              color: '#999999',
              alignment: 'right',
              margin: [0, 0, 50, 0],
              width: '*'
            }
          ],
          margin: [0, 20, 0, 0]
        };
      },
      info: {
        title: this.normalizeDashes(project.title),
        author: 'Pustakam Injin - Tanmay Kalbande',
        creator: 'Pustakam Injin',
        subject: project.goal,
        keywords: 'AI, Knowledge, Education, Pustakam'
      }
    };
    
    onProgress(85);
    
    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMakeLib.createPdf(docDefinition);
        const filename = this.generateSafeFilename(project.title);
        
        const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu.test(
          project.finalBook || ''
        );
        const hasComplexFormatting = (project.finalBook || '').includes('```') ||
                                     (project.finalBook || '').includes('~~');
        
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
                Your document has been formatted with professional typography and perfect rendering.
              </p>
              <ul class="space-y-2 text-sm text-gray-400">
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Square-bordered code blocks with dynamic sizing</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Auto-split for long code (no overflow)</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>All dashes normalized (no ? marks)</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>${this.fontFamily} font for consistent style</span></li>
                ${hasEmojis ? '<li class="flex items-start gap-2"><span class="text-blue-400 shrink-0">•</span><span>Emojis converted to text emoticons :)</span></li>' : ''}
                ${hasComplexFormatting ? '<li class="flex items-start gap-2"><span class="text-blue-400 shrink-0">•</span><span>Advanced formatting optimized</span></li>' : ''}
              </ul>
            </div>
            <div class="flex gap-3">
              <button id="cancel-pdf" class="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white font-medium transition-all">
                Cancel
              </button>
              <button id="download-pdf" class="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-semibold transition-all shadow-lg">
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
            onProgress(100);
            resolve();
          });
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
      const generator = new ProfessionalPdfGenerator();
      await generator.generate(project, onProgress);
    } catch (error: any) {
      console.error('[PDF] Generation error:', error);
      alert('PDF generation failed. Please try:\n\n' +
            '1. Hard refresh the page (Ctrl+Shift+R)\n' +
            '2. Clear browser cache\n' +
            '3. Check console for errors\n' +
            '4. Download Markdown (.md) version instead\n\n' +
            'Error: ' + (error?.message || 'Unknown error'));
      onProgress(0);
    } finally {
      isGenerating = false;
    }
  }
};, '🤓': '8-)',
      '😎': '8)', '🥳': ':D', '😔': ':(', '😞': ':(',
      '😟': ':(', '😠': '>:(', '😡': '>:(', '🤬': '#$@!',
      '😱': 'D:', '😨': 'D:', '😰': '(-.-)/', '😢': ":'(",
      '😭': "T_T", '😤': '>:/', '😳': 'O_O', '🥺': ':(',
      '😖': 'X(', '😩': 'X(', '🤯': 'o_O', '😬': ':S',
      
      // Hand gestures
      '👍': '[thumbs up]', '👎': '[thumbs down]', '👌': '[OK]',
      '✌️': '[peace]', '🤞': '[fingers crossed]', '🤟': '[love]',
      '🤘': '[rock]', '👏': '[clap]', '🙌': '[praise]',
      '👐': '[open hands]', '🤲': '[palms up]', '🤝': '[handshake]',
      '🙏': '[pray]', '✍️': '[writing]', '💪': '[strong]',
      '🦾': '[strong]', '👊': '[fist]', '✊': '[fist]',
      '🤛': '[fist]', '🤜': '[fist]', '👋': '[wave]',
      '🤚': '[hand]', '🖐️': '[hand]', '✋': '[stop]',
      '🖖': '[vulcan]', '👆': '[point up]', '👇': '[point down]',
      '👉': '[point right]', '👈': '[point left]',
      
      // Hearts & Love
      '❤️': '<3', '🧡': '<3', '💛': '<3', '💚': '<3',
      '💙': '<3', '💜': '<3', '🖤': '</3', '🤍': '<3',
      '🤎': '<3', '💔': '</3>', '❣️': '<3!', '💕': '<3<3',
      '💞': '<3<3', '💓': '<3', '💗': '<3', '💖': '<3',
      '💘': '<3', '💝': '<3', '💟': '<3',
      
      // Symbols & Icons
      '✅': '[check]', '✔️': '[check]', '☑️': '[check]',
      '❌': '[X]', '✖️': '[X]', '❎': '[X]',
      '⚠️': '[warning]', '⚡': '[lightning]', '🔥': '[fire]',
      '💥': '[boom]', '✨': '[sparkles]', '⭐': '[star]',
      '🌟': '[star]', '💫': '[dizzy]', '🔆': '[bright]',
      '☀️': '[sun]', '🌙': '[moon]', '⛅': '[cloud]',
      '🌈': '[rainbow]', '☔': '[rain]', '⛄': '[snow]',
      '💧': '[drop]', '💦': '[sweat]', '☁️': '[cloud]',
      
      // Objects & Items
      '📱': '[phone]', '💻': '[laptop]', '⌨️': '[keyboard]',
      '🖥️': '[computer]', '🖨️': '[printer]', '🖱️': '[mouse]',
      '📷': '[camera]', '📹': '[video]', '🎥': '[movie]',
      '📺': '[TV]', '📻': '[radio]', '🎙️': '[mic]',
      '📡': '[satellite]', '🔋': '[battery]', '🔌': '[plug]',
      '💡': '[idea]', '🔦': '[flashlight]', '🕯️': '[candle]',
      '🪔': '[lamp]', '🔔': '[bell]', '🔕': '[no bell]',
      '📢': '[speaker]', '📣': '[megaphone]', '📯': '[horn]',
      '🎵': '[music]', '🎶': '[music]', '🎼': '[score]',
      '🎹': '[keyboard]', '🎸': '[guitar]', '🎺': '[trumpet]',
      '🎻': '[violin]', '🥁': '[drum]', '🎤': '[mic]',
      
      // Education & Work
      '📚': '[books]', '📖': '[book]', '📝': '[memo]',
      '📄': '[page]', '📃': '[document]', '📋': '[clipboard]',
      '📊': '[chart]', '📈': '[trending up]', '📉': '[trending down]',
      '🗂️': '[files]', '📁': '[folder]', '📂': '[open folder]',
      '🗃️': '[file box]', '📦': '[package]', '🏷️': '[label]',
      '💼': '[briefcase]', '🗄️': '[cabinet]', '🗳️': '[ballot]',
      '✏️': '[pencil]', '✒️': '[pen]', '🖊️': '[pen]',
      '🖋️': '[fountain pen]', '🖍️': '[crayon]', '📏': '[ruler]',
      '📐': '[triangle]', '✂️': '[scissors]', '🗑️': '[trash]',
      
      // Food & Drink
      '☕': '[coffee]', '🍵': '[tea]', '🥤': '[drink]',
      '🍺': '[beer]', '🍻': '[beers]', '🥂': '[cheers]',
      '🍷': '[wine]', '🍾': '[champagne]', '🍹': '[cocktail]',
      '🍔': '[burger]', '🍕': '[pizza]', '🌮': '[taco]',
      '🍩': '[donut]', '🍪': '[cookie]', '🎂': '[cake]',
      '🍰': '[cake]', '🍫': '[chocolate]', '🍬': '[candy]',
      '🍭': '[lollipop]', '🍯': '[honey]', '🍎': '[apple]',
      '🍌': '[banana]', '🍊': '[orange]', '🍇': '[grapes]',
      
      // Activities & Sports
      '⚽': '[soccer]', '🏀': '[basketball]', '🏈': '[football]',
      '⚾': '[baseball]', '🎾': '[tennis]', '🏐': '[volleyball]',
      '🏓': '[ping pong]', '🏸': '[badminton]', '🥊': '[boxing]',
      '🎯': '[target]', '🎮': '[game]', '🎲': '[dice]',
      '🎰': '[slot]', '🎳': '[bowling]', '🎪': '[circus]',
      '🎭': '[theater]', '🎨': '[art]', '🎬': '[movie]',
      
      // Travel & Places
      '✈️': '[plane]', '🚀': '[rocket]', '🛸': '[UFO]',
      '🚁': '[helicopter]', '🚂': '[train]', '🚃': '[train]',
      '🚄': '[bullet train]', '🚅': '[train]', '🚇': '[metro]',
      '🚌': '[bus]', '🚎': '[bus]', '🏎️': '[race car]',
      '🚗': '[car]', '🚕': '[taxi]', '🚙': '[car]',
      '🚐': '[van]', '🚛': '[truck]', '🚚': '[truck]',
      '🏠': '[home]', '🏡': '[house]', '🏢': '[office]',
      '🏣': '[post]', '🏤': '[post office]', '🏥': '[hospital]',
      '🏦': '[bank]', '🏨': '[hotel]', '🏪': '[store]',
      '🏫': '[school]', '🏬': '[mall]', '🏭': '[factory]',
      
      // Nature & Animals
      '🌍': '[earth]', '🌎': '[earth]', '🌏': '[earth]',
      '🌲': '[tree]', '🌳': '[tree]', '🌴': '[palm]',
      '🌵': '[cactus]', '🌷': '[tulip]', '🌸': '[flower]',
      '🌹': '[rose]', '🌺': '[flower]', '🌻': '[sunflower]',
      '🌼': '[flower]', '🌾': '[grain]', '🍀': '[clover]',
      '🍁': '[leaf]', '🍂': '[leaf]', '🍃': '[leaf]',
      '🐶': '[dog]', '🐱': '[cat]', '🐭': '[mouse]',
      '🐹': '[hamster]', '🐰': '[rabbit]', '🦊': '[fox]',
      '🐻': '[bear]', '🐼': '[panda]', '🐨': '[koala]',
      '🐯': '[tiger]', '🦁': '[lion]', '🐮': '[cow]',
      '🐷': '[pig]', '🐸': '[frog]', '🐵': '[monkey]',
      '🐔': '[chicken]', '🐧': '[penguin]', '🐦': '[bird]',
      '🦅': '[eagle]', '🦆': '[duck]', '🦉': '[owl]',
      
      // Celebration & Events
      '🎉': '[party]', '🎊': '[confetti]', '🎈': '[balloon]',
      '🎁': '[gift]', '🎀': '[ribbon]', '🎗️': '[ribbon]',
      '🏆': '[trophy]', '🥇': '[1st]', '🥈': '[2nd]',
      '🥉': '[3rd]', '🏅': '[medal]', '🎖️': '[medal]',
      '👑': '[crown]', '💎': '[gem]', '💍': '[ring]',
      
      // Other common emojis
      '🆕': '[NEW]', '🆒': '[COOL]', '🆓': '[FREE]',
      '🆗': '[OK]', '🔝': '[TOP]', '🔜': '[SOON]',
      '🔛': '[ON]', '🔚': '[END]', '🔙': '[BACK]',
      '🔄': '[refresh]', '🔃': '[reload]', '🔁': '[repeat]',
      '🔀': '[shuffle]', '➕': '[+]', '➖': '[-]',
      '✖️': '[x]', '➗': '[÷]', '🟰': '[=]',
      '♾️': '[infinity]', '‼️': '!!', '⁉️': '?!',
      '❓': '[?]', '❔': '[?]', '❕': '[!]',
      '❗': '[!]', '〰️': '[~]', '💯': '[100]',
      '🔰': '[beginner]', '⚜️': '[fleur]', '🔱': '[trident]',
      '📛': '[name badge]', '🔰': '[beginner]', '⭕': '[O]',
      '❌': '[X]', '💲': '[$]', '💱': '[exchange]',
      '™️': '[TM]', '©️': '[C]', '®️': '[R]'
    };

    let result = text;
    for (const [emoji, replacement] of Object.entries(emojiMap)) {
      result = result.replace(new RegExp(emoji, 'g'), replacement);
    }
    
    // Remove any remaining emojis that aren't in the map
    result = result.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    
    return result;
  }

  // ✅ UPDATED: Keep emojis, normalize dashes
  private cleanText(text: string): string {
    // First normalize dashes
    text = this.normalizeDashes(text);
    
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
      // ✅ KEEP EMOJIS - Don't remove them!
      .trim();
  }

  // ✅ UPDATED: Parse inline markdown with emoji support and dash normalization
  private parseInlineMarkdown(text: string): any {
    // Normalize dashes first
    text = this.normalizeDashes(text);
    
    const parts: any[] = [];
    let lastIndex = 0;
    
    // ✅ Combined regex: markdown formatting + emojis
    const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_|`(.+?)`|~~(.+?)~~|([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]))/gu;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index) });
      }
      
      // Check if it's an emoji (group 9)
      if (match[9]) {
        parts.push({ 
          text: match[9],
          fontSize: 11, // Slightly larger for visibility
          characterSpacing: 0.5 // Add spacing around emoji
        });
      }
      // Handle markdown formatting
      else if (match[2]) {
        parts.push({ text: match[2], bold: true, italics: true });
      } else if (match[3]) {
        parts.push({ text: match[3], bold: true });
      } else if (match[4]) {
        parts.push({ text: match[4], italics: true });
      } else if (match[5]) {
        parts.push({ text: match[5], bold: true });
      } else if (match[6]) {
        parts.push({ text: match[6], italics: true });
      } else if (match[7]) {
        parts.push({ text: match[7], font: this.fontFamily, background: '#f3f4f6' });
      } else if (match[8]) {
        parts.push({ text: match[8], decoration: 'lineThrough' });
      }
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex) });
    }
    
    return parts.length === 0 ? text : (parts.length === 1 && typeof parts[0] === 'string') ? parts[0] : parts;
  }

  // Split long code blocks across pages if needed
  private splitCodeBlock(code: string, maxLines: number = 40): string[] {
    const lines = code.split('\n');
    const chunks: string[] = [];
    
    for (let i = 0; i < lines.length; i += maxLines) {
      chunks.push(lines.slice(i, i + maxLines).join('\n'));
    }
    
    return chunks;
  }

  private parseMarkdownToContent(markdown: string): PDFContent[] {
    // ✅ Normalize dashes in the entire markdown first
    markdown = this.normalizeDashes(markdown);
    
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
          const formattedText = this.parseInlineMarkdown(text);
          content.push({ 
            text: formattedText, 
            style: 'paragraph',
            alignment: 'justify'
          });
        }
        paragraphBuffer = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBuffer.length === 0 || skipToC) return;

      const fullCode = codeBuffer.join('\n');
      const fontSize = 8;
      const lineHeight = 1.4;
      const paddingTopBottom = 12;
      const paddingLeftRight = 12;
      
      const chunks = this.splitCodeBlock(fullCode, 40);
      
      chunks.forEach((chunk, chunkIndex) => {
        const lines = chunk.split('\n');
        const lineCount = lines.length;
        const textHeight = lineCount * fontSize * lineHeight;
        const blockHeight = textHeight + (paddingTopBottom * 2);
        const contentWidth = 515;
        
        if (chunkIndex > 0) {
          content.push({ text: '', pageBreak: 'before' });
        }
        
        content.push({
          table: {
            widths: [contentWidth],
            body: [
              [{
                text: chunk,
                font: this.fontFamily,
                fontSize: fontSize,
                color: '#0f172a',
                preserveLeadingSpaces: true,
                lineHeight: lineHeight,
                characterSpacing: -0.2,
                alignment: 'left',
                fillColor: '#f8fafc',
                margin: [paddingLeftRight, paddingTopBottom, paddingLeftRight, paddingTopBottom]
              }]
            ]
          },
          layout: {
            hLineWidth: () => 1.5,
            vLineWidth: () => 1.5,
            hLineColor: () => '#94a3b8',
            vLineColor: () => '#94a3b8',
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0
          },
          margin: [0, 12, 0, 12],
          unbreakable: blockHeight < 500
        });
        
        if (chunkIndex < chunks.length - 1) {
          content.push({
            text: '... (continued on next page)',
            fontSize: 7,
            color: '#64748b',
            italics: true,
            alignment: 'right',
            margin: [0, -8, 0, 8]
          });
        }
      });
      
      codeBuffer = [];
    };

    const flushTable = () => {
      if (tableRows.length > 0 && tableHeaders.length > 0 && !skipToC) {
        const colCount = tableHeaders.length;
        
        const calculateColumnWidths = () => {
          if (colCount <= 2) {
            return Array(colCount).fill('*');
          } else if (colCount === 3) {
            return ['*', '*', '*'];
          } else if (colCount === 4) {
            return Array(colCount).fill('*');
          } else {
            return Array(colCount).fill('auto');
          }
        };
        
        content.push({
          table: {
            headerRows: 1,
            widths: calculateColumnWidths(),
            body: [
              tableHeaders.map(h => ({
                text: this.parseInlineMarkdown(h),
                style: 'tableHeader',
                fillColor: '#d1d5db',
                margin: [4, 4, 4, 4],
                alignment: 'left',
                fontSize: 9
              })),
              ...tableRows.map(row =>
                row.map(cell => ({
                  text: this.parseInlineMarkdown(cell),
                  style: 'tableCell',
                  margin: [4, 3, 4, 3],
                  alignment: 'left',
                  fontSize: 8.5
                }))
              )
            ]
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: () => 0.5,
            hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? '#6b7280' : '#9ca3af',
            vLineColor: () => '#9ca3af',
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3
          },
          margin: [0, 8, 0, 12],
          dontBreakRows: false,
          widths: 'auto'
        });
        tableRows = [];
        tableHeaders = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
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
      if (trimmed === '---' || trimmed.match(/^-{3,}$/)) {
        flushParagraph();
        flushTable();
        content.push({
          canvas: [{
            type: 'line',
            x1: 0, y1: 0,
            x2: 515, y2: 0,
            lineWidth: 1.5,
            lineColor: '#cbd5e1'
          }],
          margin: [0, 15, 0, 20]
        });
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
      if (!trimmed || skipToC) {
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
      const isModuleHeading = trimmed.startsWith('# ') &&
                              /^#\s+module\s+\d+/i.test(trimmed);
      if (trimmed.startsWith('# ')) {
        flushParagraph();
        let text = trimmed.substring(2);
        text = this.capitalizeFirstLetter(text);
        const formattedText = this.parseInlineMarkdown(text);
        if (isModuleHeading) {
          if (!isFirstModule) {
            content.push({
              canvas: [{
                type: 'line',
                x1: 0, y1: 0,
                x2: 515, y2: 0,
                lineWidth: 2,
                lineColor: '#d1d5db'
              }],
              margin: [0, 20, 0, 30]
            });
          }
          isFirstModule = false;
          content.push({ text: formattedText, style: 'h1Module', alignment: 'left' });
        } else {
          content.push({ text: formattedText, style: 'h1Module', alignment: 'left' });
        }
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        let text = trimmed.substring(3);
        text = this.capitalizeFirstLetter(text);
        content.push({ text: this.parseInlineMarkdown(text), style: 'h2', alignment: 'left' });
      } else if (trimmed.startsWith('### ')) {
        flushParagraph();
        let text = trimmed.substring(4);
        text = this.capitalizeFirstLetter(text);
        content.push({ text: this.parseInlineMarkdown(text), style: 'h3', alignment: 'left' });
      } else if (trimmed.startsWith('#### ')) {
        flushParagraph();
        let text = trimmed.substring(5);
        text = this.capitalizeFirstLetter(text);
        content.push({ text: this.parseInlineMarkdown(text), style: 'h4', alignment: 'left' });
      } else if (trimmed.match(/^[-*+]\s+/)) {
        flushParagraph();
        const listText = trimmed.replace(/^[-*+]\s+/, '');
        const formattedText = this.parseInlineMarkdown(listText);
        content.push({
          text: Array.isArray(formattedText) ? [{ text: '• ' }, ...formattedText] : [{ text: '• ' }, formattedText],
          style: 'listItem',
          margin: [10, 3, 0, 3],
          alignment: 'left'
        });
      } else if (trimmed.match(/^\d+\.\s+/)) {
        flushParagraph();
        const num = trimmed.match(/^(\d+)\./)?.[1] || '';
        const listText = trimmed.replace(/^\d+\.\s+/, '');
        const formattedText = this.parseInlineMarkdown(listText);
        content.push({
          text: Array.isArray(formattedText) ? [{ text: num + '. ' }, ...formattedText] : [{ text: num + '. ' }, formattedText],
          style: 'listItem',
          margin: [10, 3, 0, 3],
          alignment: 'left'
        });
      } else if (trimmed.startsWith('>')) {
        flushParagraph();
        content.push({
          columns: [
            {
              width: 3,
              canvas: [{
                type: 'rect',
                x: 0, y: 0,
                w: 3, h: 20,
                color: '#667eea'
              }]
            },
            {
              width: '*',
              text: this.parseInlineMarkdown(trimmed.substring(1).trim()),
              style: 'blockquote',
              margin: [8, 0, 0, 0],
              alignment: 'justify'
            }
          ],
          margin: [15, 10, 15, 10]
        });
      } else {
        // ✅ Keep emojis in paragraph text
        const cleaned = trimmed.trim();
        if (cleaned) paragraphBuffer.push(cleaned);
      }
    }
    flushParagraph();
    flushCodeBlock();
    flushTable();
    return content;
  }

  private createDisclaimerPage(): PDFContent[] {
    return [
      { text: '', margin: [0, 60, 0, 0] },
      {
        text: 'IMPORTANT DISCLAIMER',
        style: 'disclaimerTitle'
      },
      {
        canvas: [{
          type: 'rect',
          x: 150,
          y: 0,
          w: 100,
          h: 2,
          color: '#4a5568'
        }],
        margin: [0, 0, 0, 30]
      },
      {
        text: 'AI-Generated Content Notice',
        fontSize: 12,
        bold: true,
        color: '#2d3748',
        margin: [0, 0, 0, 12],
        alignment: 'left'
      },
      {
        text: 'This document has been entirely generated by artificial intelligence technology through the Pustakam Injin platform. While significant effort has been made to ensure accuracy and coherence, readers should be aware of the following important considerations:',
        style: 'disclaimerText'
      },
      {
        ul: [
          'The content is produced by AI language models and may contain factual inaccuracies, outdated information, or logical inconsistencies.',
          'Information should be independently verified before being used for critical decisions, academic citations, or professional purposes.',
          'The AI may generate plausible-sounding but incorrect or fabricated information (known as "hallucinations").',
          'Views and opinions expressed do not necessarily reflect those of the creators, developers, or any affiliated organizations.',
          'This content should not be considered a substitute for professional advice in medical, legal, financial, or other specialized fields.'
        ],
        style: 'disclaimerNote',
        margin: [20, 10, 0, 20]
      },
      {
        text: 'Intellectual Property & Usage',
        fontSize: 12,
        bold: true,
        color: '#2d3748',
        margin: [0, 10, 0, 12],
        alignment: 'left'
      },
      {
        text: 'This document is provided "as-is" for informational and educational purposes. Users are encouraged to fact-check, cross-reference, and critically evaluate all content. The Pustakam Injin serves as a knowledge exploration tool and starting point for research, not as a definitive source of truth.',
        style: 'disclaimerText'
      },
      {
        text: 'Quality Assurance',
        fontSize: 12,
        bold: true,
        color: '#2d3748',
        margin: [0, 10, 0, 12],
        alignment: 'left'
      },
      {
        text: 'While the Pustakam Injin employs advanced AI models and formatting techniques to produce professional-quality documents, no warranty is made regarding completeness, reliability, or accuracy. Users assume full responsibility for how they use, interpret, and apply this content.',
        style: 'disclaimerText'
      },
      {
        text: [
          { text: 'Generated by: ', fontSize: 9, color: '#4a5568' },
          { text: 'Pustakam Injin\n', fontSize: 9, bold: true, color: '#2d3748' },
          { text: 'Date: ', fontSize: 9, color: '#4a5568' },
          { text: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }), fontSize: 9, color: '#2d3748' }
        ],
        margin: [0, 30, 0, 10],
        alignment: 'left'
      },
      {
        text: 'For questions or concerns about this content, please refer to the Pustakam Injin documentation or contact the platform administrator.',
        fontSize: 8,
        color: '#718096',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      }
    ];
  }

  private createCoverPage(title: string, metadata: {
    words: number;
    modules: number;
    date: string;
    provider?: string;
    model?: string;
  }): PDFContent[] {
    // ✅ Normalize dashes in title
    const normalizedTitle = this.normalizeDashes(title);
    
    return [
      { text: '', margin: [0, 80, 0, 0] },
      {
        text: normalizedTitle,
        style: 'coverTitle',
        margin: [0, 0, 0, 12]
      },
      {
        text: 'Generated by Pustakam Injin',
        fontSize: 11,
        color: '#666666',
        margin: [0, 0, 0, 40],
        alignment: 'left'
      },
      {
        text: 'Abstract',
        fontSize: 11,
        bold: true,
        color: '#1a1a1a',
        margin: [0, 0, 0, 8],
        alignment: 'left'
      },
      {
        text: `This comprehensive ${metadata.modules} chapter document contains ${metadata.words.toLocaleString()} words of AI-generated content. Each section has been carefully structured to provide in-depth coverage of the topic with clear explanations and practical insights.`,
        fontSize: 10,
        lineHeight: 1.6,
        alignment: 'justify',
        color: '#1a1a1a',
        margin: [0, 0, 0, 30]
      },
      {
        stack: [
          {
            text: 'Document Information',
            fontSize: 11,
            bold: true,
            color: '#1a1a1a',
            margin: [0, 0, 0, 8],
            alignment: 'left'
          },
          {
            columns: [
              { text: 'Word Count:', width: 80, fontSize: 9, color: '#666666' },
              { text: metadata.words.toLocaleString(), fontSize: 9, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 4]
          },
          {
            columns: [
              { text: 'Chapters:', width: 80, fontSize: 9, color: '#666666' },
              { text: metadata.modules.toString(), fontSize: 9, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 4]
          },
          {
            columns: [
              { text: 'Generated:', width: 80, fontSize: 9, color: '#666666' },
              { text: metadata.date, fontSize: 9, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 4]
          },
          ...(metadata.provider && metadata.model ? [{
            columns: [
              { text: 'AI Model:', width: 80, fontSize: 9, color: '#666666' },
              { text: `${metadata.provider} ${metadata.model}`, fontSize: 9, color: '#1a1a1a' }
            ],
            margin: [0, 0, 0, 4]
          }] : [])
        ]
      },
      { text: '', margin: [0, 0, 0, 80] },
      {
        stack: [
          {
            canvas: [{
              type: 'line',
              x1: 0, y1: 0,
              x2: 100, y2: 0,
              lineWidth: 1,
              lineColor: '#1a1a1a'
            }],
            margin: [0, 0, 0, 12]
          },
          {
            text: 'Pustakam Injin',
            fontSize: 10,
            bold: true,
            color: '#1a1a1a',
            margin: [0, 0, 0, 4],
            alignment: 'left'
          },
          {
            text: 'AI-Powered Knowledge Creation',
            fontSize: 9,
            color: '#666666',
            margin: [0, 0, 0, 8],
            alignment: 'left'
          },
          {
            text: 'Tanmay Kalbande',
            fontSize: 9,
            color: '#1a1a1a',
            link: 'https://www.linkedin.com/in/tanmay-kalbande/',
            decoration: 'underline',
            decorationColor: '#1a1a1a',
            alignment: 'left'
          }
        ]
      },
      { text: '', pageBreak: 'after' }
    ];
  }

  private generateSafeFilename(title: string): string {
    const sanitized = title
      .replace(/[^a-z0-9\s-]/gi, '')
      .trim()
      .split(/\s+/)
      .map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('_')
      .substring(0, 50);
    
    const date = new Date().toISOString().slice(0, 10);
    return `${sanitized}_${date}.pdf`;
  }

  private capitalizeFirstLetter(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  public async generate(project: BookProject, onProgress: (progress: number) => void): Promise<void> {
    onProgress(10);
    const pdfMakeLib = await loadPdfMake();
    const hasAptosMono = Object.keys(pdfMakeLib.vfs).some(key => key.includes('Aptos-Mono'));
    this.fontFamily = hasAptosMono ? 'Aptos-Mono' : 'Roboto';
    
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
    onProgress(60);
    const disclaimerContent = this.createDisclaimerPage();
    onProgress(75);
    
    this.content = [...coverContent, ...mainContent, ...disclaimerContent];
    
    const docDefinition: any = {
      content: this.content,
      styles: this.styles,
      defaultStyle: {
        font: this.fontFamily,
        fontSize: 10,
        color: '#1a1a1a',
        lineHeight: 1.6,
        alignment: 'justify'
      },
      pageSize: 'A4',
      pageMargins: [50, 75, 50, 70],
      header: (currentPage: number) => {
        if (currentPage <= 1) return {};
        return {
          columns: [
            {
              text: this.normalizeDashes(project.title),
              fontSize: 8,
              color: '#666666',
              italics: true,
              width: '*'
            },
            {
              text: `Page ${currentPage - 1}`,
              fontSize: 8,
              color: '#666666',
              alignment: 'right',
              width: 'auto'
            }
          ],
          margin: [50, 22, 50, 0]
        };
      },
      footer: (currentPage: number) => {
        if (currentPage <= 1) return {};
        return {
          columns: [
            {
              text: 'Pustakam Injin',
              fontSize: 7,
              color: '#999999',
              margin: [50, 0, 0, 0],
              width: '*'
            },
            {
              text: 'https://www.linkedin.com/in/tanmay-kalbande/',
              fontSize: 7,
              color: '#999999',
              alignment: 'right',
              margin: [0, 0, 50, 0],
              width: '*'
            }
          ],
          margin: [0, 20, 0, 0]
        };
      },
      info: {
        title: this.normalizeDashes(project.title),
        author: 'Pustakam Injin - Tanmay Kalbande',
        creator: 'Pustakam Injin',
        subject: project.goal,
        keywords: 'AI, Knowledge, Education, Pustakam'
      }
    };
    
    onProgress(85);
    
    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMakeLib.createPdf(docDefinition);
        const filename = this.generateSafeFilename(project.title);
        
        const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu.test(
          project.finalBook || ''
        );
        const hasComplexFormatting = (project.finalBook || '').includes('```') ||
                                     (project.finalBook || '').includes('~~');
        
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
                Your document has been formatted with professional typography, emoji support, and perfect rendering.
              </p>
              <ul class="space-y-2 text-sm text-gray-400">
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Square-bordered code blocks with dynamic sizing</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Auto-split for long code (no overflow)</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>All dashes normalized (no ? marks)</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>${this.fontFamily} font for consistent style</span></li>
                ${hasEmojis ? '<li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Emojis preserved (copyable & searchable!)</span></li>' : ''}
                ${hasComplexFormatting ? '<li class="flex items-start gap-2"><span class="text-blue-400 shrink-0">•</span><span>Advanced formatting optimized</span></li>' : ''}
              </ul>
            </div>
            <div class="flex gap-3">
              <button id="cancel-pdf" class="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white font-medium transition-all">
                Cancel
              </button>
              <button id="download-pdf" class="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-semibold transition-all shadow-lg">
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
            onProgress(100);
            resolve();
          });
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
      const generator = new ProfessionalPdfGenerator();
      await generator.generate(project, onProgress);
    } catch (error: any) {
      console.error('[PDF] Generation error:', error);
      alert('PDF generation failed. Please try:\n\n' +
            '1. Hard refresh the page (Ctrl+Shift+R)\n' +
            '2. Clear browser cache\n' +
            '3. Check console for errors\n' +
            '4. Download Markdown (.md) version instead\n\n' +
            'Error: ' + (error?.message || 'Unknown error'));
      onProgress(0);
    } finally {
      isGenerating = false;
    }
  }
};
