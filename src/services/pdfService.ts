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

    // Auto-load Aptos-Mono fonts from /fonts/
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
        } else {
          console.log(`⚠ ${font.name} not found (HTTP ${response.status})`);
        }
      } catch (error) {
        console.log(`❌ Failed to load ${font.name}:`, error);
      }
    }
    const vfsKeys = Object.keys(vfs);
    if (vfsKeys.length === 0) {
      throw new Error('VFS_EMPTY');
    }
    console.log('✓ VFS loaded with', vfsKeys.length, 'files');

    // Check which fonts are actually available in VFS
    const aptosMonoInVfs = vfs['Aptos-Mono.ttf'] && vfs['Aptos-Mono-Bold.ttf'];
    const robotoInVfs = vfs['Roboto-Regular.ttf'] && vfs['Roboto-Medium.ttf'];
    
    console.log('🔍 Available fonts - Aptos-Mono:', aptosMonoInVfs, 'Roboto:', robotoInVfs);

    // Configure fonts based on what's actually available
    if (aptosMonoInVfs) {
      console.log('✓ Configuring Aptos-Mono fonts');
      pdfMake.fonts = {
        'Aptos-Mono': {
          normal: 'Aptos-Mono.ttf',
          bold: 'Aptos-Mono-Bold.ttf',
          italics: 'Aptos-Mono.ttf',
          bolditalics: 'Aptos-Mono-Bold.ttf'
        }
      };
    } else {
      console.log('✓ Configuring Roboto fonts (Aptos-Mono not available)');
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
        characterSpacing: 0.8
      },
      h2: {
        fontSize: 18,
        bold: true,
        margin: [0, 22, 0, 11],
        color: '#2d3748',
        lineHeight: 1.3
      },
      h3: {
        fontSize: 15,
        bold: true,
        margin: [0, 18, 0, 9],
        color: '#2d3748',
        lineHeight: 1.3
      },
      h4: {
        fontSize: 13,
        bold: true,
        margin: [0, 15, 0, 8],
        color: '#4a5568'
      },
      paragraph: {
        fontSize: 10,
        lineHeight: 1.5,
        alignment: 'justify',
        margin: [0, 0, 0, 10],
        color: '#1a1a1a'
      },
      listItem: {
        fontSize: 10,
        lineHeight: 1.4,
        margin: [0, 2, 0, 2],
        color: '#1a1a1a'
      },
      codeBlock: {
        fontSize: 9.5,
        margin: [12, 10, 12, 10],
        color: '#2d3748',
        background: '#f7fafc',
        fillColor: '#f7fafc',
        preserveLeadingSpaces: true,
        lineHeight: 1.4
      },
      blockquote: {
        fontSize: 10.5,
        italics: true,
        margin: [20, 10, 15, 10],
        color: '#4a5568',
        lineHeight: 1.6
      },
      tableHeader: {
        fontSize: 10.5,
        bold: true,
        color: '#000000',
        fillColor: '#d1d5db'
      },
      tableCell: {
        fontSize: 10,
        color: '#1f2937',
        lineHeight: 1.4
      },
      // Disclaimer page styles
      disclaimerTitle: {
        fontSize: 24,
        bold: true,
        alignment: 'center',
        color: '#4a5568',
        margin: [0, 0, 0, 20]
      },
      disclaimerText: {
        fontSize: 10,
        lineHeight: 1.6,
        alignment: 'justify',
        color: '#2d3748',
        margin: [0, 0, 0, 12]
      },
      disclaimerNote: {
        fontSize: 9,
        lineHeight: 1.5,
        alignment: 'left',
        color: '#4a5568',
        margin: [0, 8, 0, 8]
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
        if (text && !skipToC) content.push({ text: this.cleanText(text), style: 'paragraph' });
        paragraphBuffer = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBuffer.length > 0 && !skipToC) {
        content.push({
          text: codeBuffer.join('\n'),
          style: 'codeBlock',
          margin: [12, 10, 12, 10],
          fillColor: '#f7fafc'
        });
        codeBuffer = [];
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0 && tableHeaders.length > 0 && !skipToC) {
        const colCount = tableHeaders.length;
        const colWidths = Array(colCount).fill('*');
        content.push({
          table: {
            headerRows: 1,
            widths: colWidths,
            body: [
              tableHeaders.map(h => ({
                text: this.cleanText(h),
                style: 'tableHeader',
                fillColor: '#d1d5db',
                margin: [5, 5, 5, 5],
                alignment: 'left'
              })),
              ...tableRows.map(row =>
                row.map(cell => ({
                  text: this.cleanText(cell),
                  style: 'tableCell',
                  margin: [5, 4, 5, 4],
                  alignment: 'left'
                }))
              )
            ]
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: () => 0.5,
            hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? '#6b7280' : '#9ca3af',
            vLineColor: () => '#9ca3af',
            paddingLeft: () => 5,
            paddingRight: () => 5,
            paddingTop: () => 4,
            paddingBottom: () => 4
          },
          margin: [0, 8, 0, 12]
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
            x2: 465, y2: 0,
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
        let text = this.cleanText(trimmed.substring(2));
        text = this.capitalizeFirstLetter(text);
        if (isModuleHeading) {
          if (!isFirstModule) {
            content.push({
              canvas: [{
                type: 'line',
                x1: 0, y1: 0,
                x2: 465, y2: 0,
                lineWidth: 2,
                lineColor: '#d1d5db'
              }],
              margin: [0, 20, 0, 30]
            });
          }
          isFirstModule = false;
          content.push({ text, style: 'h1Module' });
        } else {
          content.push({ text, style: 'h1Module' });
        }
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        let text = this.cleanText(trimmed.substring(3));
        text = this.capitalizeFirstLetter(text);
        content.push({ text, style: 'h2' });
      } else if (trimmed.startsWith('### ')) {
        flushParagraph();
        let text = this.cleanText(trimmed.substring(4));
        text = this.capitalizeFirstLetter(text);
        content.push({ text, style: 'h3' });
      } else if (trimmed.startsWith('#### ')) {
        flushParagraph();
        let text = this.cleanText(trimmed.substring(5));
        text = this.capitalizeFirstLetter(text);
        content.push({ text, style: 'h4' });
      } else if (trimmed.match(/^[-*+]\s+/)) {
        flushParagraph();
        content.push({
          text: '• ' + this.cleanText(trimmed.replace(/^[-*+]\s+/, '')),
          style: 'listItem',
          margin: [10, 3, 0, 3]
        });
      } else if (trimmed.match(/^\d+\.\s+/)) {
        flushParagraph();
        const num = trimmed.match(/^(\d+)\./)?.[1] || '';
        content.push({
          text: num + '. ' + this.cleanText(trimmed.replace(/^\d+\.\s+/, '')),
          style: 'listItem',
          margin: [10, 3, 0, 3]
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
              text: this.cleanText(trimmed.substring(1).trim()),
              style: 'blockquote',
              margin: [8, 0, 0, 0]
            }
          ],
          margin: [15, 10, 15, 10]
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
        margin: [0, 0, 0, 12]
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
        margin: [0, 10, 0, 12]
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
        margin: [0, 10, 0, 12]
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
        margin: [0, 30, 0, 10]
      },
      {
        text: 'This document is generated using advanced AI models. Always cross-verify with trusted sources.',
        fontSize: 9,
        italics: true,
        color: '#718096',
        alignment: 'center',
        margin: [0, 0, 0, 20]
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
    return [
      { text: '', margin: [0, 80, 0, 0] },
      {
        text: title,
        style: 'coverTitle',
        margin: [0, 0, 0, 12]
      },
      {
        text: 'Generated by Pustakam Injin',
        fontSize: 11,
        color: '#666666',
        margin: [0, 0, 0, 40]
      },
      {
        text: 'Abstract',
        fontSize: 11,
        bold: true,
        color: '#1a1a1a',
        margin: [0, 0, 0, 8]
      },
      {
        text: `This comprehensive ${metadata.modules}-chapter document contains ${metadata.words.toLocaleString()} words of AI-generated content. Each section has been carefully structured to provide in-depth coverage of the topic with clear explanations and practical insights.`,
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
            margin: [0, 0, 0, 8]
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
            margin: [0, 0, 0, 4]
          },
          {
            text: 'AI-Powered Knowledge Creation',
            fontSize: 9,
            color: '#666666',
            margin: [0, 0, 0, 8]
          },
          {
            text: 'Tanmay Kalbande',
            fontSize: 9,
            color: '#1a1a1a',
            link: 'https://www.linkedin.com/in/tanmay-kalbande/',
            decoration: 'underline',
            decorationColor: '#1a1a1a'
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
      .map((word, index) => {
        // Capitalize first letter of each word, lowercase rest
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
    console.log('🎨 Starting professional PDF generation for:', project.title);
    onProgress(10);
    const pdfMakeLib = await loadPdfMake();
    const hasAptosMono = Object.keys(pdfMakeLib.vfs).some(key => key.includes('Aptos-Mono'));
    this.fontFamily = hasAptosMono ? 'Aptos-Mono' : 'Roboto';
    const totalWords = project.modules.reduce((sum, m) => sum + m.wordCount, 0);
    const providerMatch = project.finalBook?.match(/\*\*Provider:\*\* (.+?) $(.+?)$/);
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
        lineHeight: 1.5
      },
      pageSize: 'A4',
      pageMargins: [65, 75, 65, 70],
      header: (currentPage: number) => {
        if (currentPage <= 1) return {};
        return {
          columns: [
            {
              text: project.title,
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
          margin: [65, 22, 65, 0]
        };
      },
      footer: (currentPage: number, pageCount: number) => {
        if (currentPage <= 1) return {};
        return {
          columns: [
            {
              text: 'Pustakam Injin',
              fontSize: 7,
              color: '#999999',
              margin: [65, 0, 0, 0],
              width: '*'
            },
            {
              text: 'https://www.linkedin.com/in/tanmay-kalbande/',
              fontSize: 7,
              color: '#999999',
              alignment: 'right',
              margin: [0, 0, 65, 0],
              width: '*'
            }
          ],
          margin: [0, 20, 0, 0]
        };
      },
      info: {
        title: project.title,
        author: 'Pustakam Injin - Tanmay Kalbande',
        creator: 'Pustakam Injin',
        subject: project.goal,
        keywords: 'AI, Knowledge, Education, Pustakam'
      }
    };
    onProgress(85);
    console.log(`📄 Creating PDF with ${this.fontFamily} font throughout`);
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
                Your document has been formatted with professional typography and layout inspired by academic publications.
              </p>
              <ul class="space-y-2 text-sm text-gray-400">
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Clean, readable 10pt body text</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Professional cover page design</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>Justified text alignment</span></li>
                <li class="flex items-start gap-2"><span class="text-green-400 shrink-0">✓</span><span>${this.fontFamily} font for consistent monospaced style</span></li>
                ${hasEmojis ? '<li class="flex items-start gap-2"><span class="text-yellow-400 shrink-0">•</span><span>Emojis removed for compatibility</span></li>' : ''}
                ${hasComplexFormatting ? '<li class="flex items-start gap-2"><span class="text-yellow-400 shrink-0">•</span><span>Advanced formatting simplified</span></li>' : ''}
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
            console.log('✅ Professional PDF downloaded:', filename);
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
      console.log('🎉 Professional PDF generation completed successfully');
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
