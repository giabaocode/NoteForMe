window.ExportManager = {
  exportPDF() {
    if (!Editor.currentNoteId) {
      App.showToast('Vui lòng chọn ghi chú để xuất', 'error');
      return;
    }
    
    const title = document.getElementById('note-title-input').value || 'Ghi chú';
    const content = Editor.getContent();
    
    // Create print-friendly window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>${title} — Lesson Note</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', sans-serif;
            line-height: 1.8;
            color: #1a1a2e;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1.title {
            font-size: 2rem;
            margin-bottom: 8px;
            padding-bottom: 12px;
            border-bottom: 2px solid #eee;
          }
          .meta {
            font-size: 0.85rem;
            color: #888;
            margin-bottom: 32px;
          }
          h1 { font-size: 1.8rem; margin: 24px 0 12px; }
          h2 { font-size: 1.4rem; margin: 20px 0 10px; }
          h3 { font-size: 1.15rem; margin: 16px 0 8px; }
          p { margin: 8px 0; }
          ul, ol { padding-left: 24px; margin: 8px 0; }
          li { margin: 4px 0; }
          pre {
            background: #f5f5f5;
            border-radius: 8px;
            padding: 16px;
            overflow-x: auto;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            margin: 12px 0;
            border: 1px solid #e0e0e0;
          }
          code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9em;
          }
          blockquote {
            border-left: 3px solid #6C5CE7;
            padding: 8px 16px;
            margin: 12px 0;
            background: #f8f7ff;
            border-radius: 0 8px 8px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
          }
          th { background: #f5f5f5; font-weight: 600; }
          mark { background: #FFEAA7; padding: 1px 4px; border-radius: 2px; }
          img { max-width: 100%; border-radius: 8px; }
          .footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid #eee;
            font-size: 0.8rem;
            color: #aaa;
            text-align: center;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1 class="title">${title}</h1>
        <div class="meta">Xuất từ Lesson Note — ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div class="content">${content}</div>
        <div class="footer">Lesson Note 📝</div>
        <script>window.onload = () => { window.print(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
    
    App.closeAllModals();
    App.showToast('Đang xuất PDF...', 'info');
  },
  
  exportMarkdown() {
    if (!Editor.currentNoteId) {
      App.showToast('Vui lòng chọn ghi chú để xuất', 'error');
      return;
    }
    
    const title = document.getElementById('note-title-input').value || 'Ghi chú';
    const html = Editor.getContent();
    const markdown = this.htmlToMarkdown(html);
    
    const fullMd = `# ${title}\n\n${markdown}\n\n---\n*Xuất từ Lesson Note — ${new Date().toLocaleDateString('vi-VN')}*\n`;
    
    // Create and trigger download
    const blob = new Blob([fullMd], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, '').trim() || 'note'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    App.closeAllModals();
    App.showToast('Đã xuất Markdown', 'success');
  },
  
  copyHTML() {
    if (!Editor.currentNoteId) {
      App.showToast('Vui lòng chọn ghi chú để sao chép', 'error');
      return;
    }
    
    const content = Editor.getContent();
    
    // Copy as both HTML and plain text
    if (navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([content], { type: 'text/html' });
      const textBlob = new Blob([Editor.getPlainText()], { type: 'text/plain' });
      navigator.clipboard.write([
        new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
      ]);
    } else {
      // Fallback
      navigator.clipboard.writeText(Editor.getPlainText());
    }
    
    App.closeAllModals();
    App.showToast('Đã sao chép nội dung', 'success');
  },
  
  // Convert HTML to Markdown (basic converter)
  htmlToMarkdown(html) {
    if (!html) return '';
    
    let md = html;
    
    // Block elements
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');
    md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n');
    
    // Paragraphs & divs & line breaks
    md = md.replace(/<br\s*\/?>/gi, '\n');
    md = md.replace(/<\/p>/gi, '\n\n');
    md = md.replace(/<p[^>]*>/gi, '');
    md = md.replace(/<\/div>/gi, '\n');
    md = md.replace(/<div[^>]*>/gi, '');
    
    // Inline formatting
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, '__$1__');
    md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
    md = md.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');
    md = md.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
    md = md.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '==$1==');
    
    // Code
    md = md.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '\n```\n$1\n```\n');
    md = md.replace(/<pre[^>]*>(.*?)<\/pre>/gis, '\n```\n$1\n```\n');
    md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    
    // Links and images
    md = md.replace(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    md = md.replace(/<img[^>]*src="(.*?)"[^>]*alt="(.*?)"[^>]*\/?>/gi, '![$2]($1)');
    md = md.replace(/<img[^>]*src="(.*?)"[^>]*\/?>/gi, '![]($1)');
    
    // Lists - handle nested lists
    md = md.replace(/<ul[^>]*>/gi, '');
    md = md.replace(/<\/ul>/gi, '\n');
    md = md.replace(/<ol[^>]*>/gi, '');
    md = md.replace(/<\/ol>/gi, '\n');
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    
    // Blockquote
    md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (match, content) => {
      return content.split('\n').map(line => `> ${line.trim()}`).join('\n') + '\n';
    });
    
    // Horizontal rule
    md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n');
    
    // Tables (basic)
    md = md.replace(/<table[^>]*>/gi, '\n');
    md = md.replace(/<\/table>/gi, '\n');
    md = md.replace(/<thead[^>]*>/gi, '');
    md = md.replace(/<\/thead>/gi, '');
    md = md.replace(/<tbody[^>]*>/gi, '');
    md = md.replace(/<\/tbody>/gi, '');
    md = md.replace(/<tr[^>]*>(.*?)<\/tr>/gi, (match, content) => {
      const cells = content.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi) || [];
      return '| ' + cells.map(c => c.replace(/<\/?t[hd][^>]*>/gi, '').trim()).join(' | ') + ' |\n';
    });
    
    // Clean up remaining HTML tags
    md = md.replace(/<[^>]+>/g, '');
    
    // Decode HTML entities
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/&quot;/g, '"');
    md = md.replace(/&#39;/g, "'");
    md = md.replace(/&nbsp;/g, ' ');
    
    // Clean up excessive newlines
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.trim();
    
    return md;
  }
};
