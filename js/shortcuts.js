window.ShortcutManager = {
  shortcuts: [
    // Define all shortcuts
    { category: 'Chung', items: [
      { keys: ['Ctrl', 'N'], desc: 'Tạo ghi chú mới', action: () => NoteManager.createNote() },
      { keys: ['Ctrl', 'F'], desc: 'Tìm kiếm', action: () => document.getElementById('search-input').focus() },
      { keys: ['Ctrl', 'Shift', 'F'], desc: 'Focus Mode', action: () => App.toggleFocusMode() },
      { keys: ['Ctrl', '/'], desc: 'Hiện phím tắt', action: () => ShortcutManager.showHelp() },
      { keys: ['Escape'], desc: 'Đóng modal / Thoát focus mode', action: () => {
        if (App.state.focusMode) App.toggleFocusMode();
        else App.closeAllModals();
      }}
    ]},
    { category: 'Editor', items: [
      { keys: ['Ctrl', 'B'], desc: 'In đậm' },
      { keys: ['Ctrl', 'I'], desc: 'In nghiêng' },
      { keys: ['Ctrl', 'U'], desc: 'Gạch chân' },
      { keys: ['Ctrl', 'Shift', 'S'], desc: 'Gạch ngang' },
      { keys: ['Ctrl', 'Shift', 'H'], desc: 'Highlight' },
      { keys: ['Ctrl', 'K'], desc: 'Chèn link' },
      { keys: ['Ctrl', '`'], desc: 'Code block' }
    ]},
    { category: 'Xuất file', items: [
      { keys: ['Ctrl', 'P'], desc: 'Xuất PDF' },
      { keys: ['Ctrl', 'Shift', 'M'], desc: 'Xuất Markdown' }
    ]}
  ],
  
  init() {
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    document.getElementById('btn-shortcuts-help')?.addEventListener('click', () => this.showHelp());
  },
  
  handleKeydown(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const key = e.key.toLowerCase();
    
    // Global shortcuts (not editor-specific)
    if (ctrl && !shift && key === 'n') { e.preventDefault(); NoteManager.createNote(); }
    if (ctrl && !shift && key === 'f') { e.preventDefault(); document.getElementById('search-input').focus(); }
    if (ctrl && shift && key === 'f') { e.preventDefault(); App.toggleFocusMode(); }
    if (ctrl && !shift && key === '/') { e.preventDefault(); this.showHelp(); }
    if (key === 'escape') {
      if (App.state.focusMode) App.toggleFocusMode();
      App.closeAllModals();
      document.querySelector('.context-menu')?.remove();
    }
    if (ctrl && !shift && key === 'p') { e.preventDefault(); ExportManager.exportPDF(); }
    if (ctrl && shift && key === 'm') { e.preventDefault(); ExportManager.exportMarkdown(); }
    
    // Editor-specific shortcuts (only when editor is focused)
    if (document.activeElement?.id === 'editor-content' || document.getElementById('editor-content')?.contains(document.activeElement)) {
      if (ctrl && shift && key === 's') { e.preventDefault(); Editor.execCommand('strikeThrough'); }
      if (ctrl && shift && key === 'h') { e.preventDefault(); Editor.execCommand('highlight'); }
      if (ctrl && !shift && key === 'k') { e.preventDefault(); Editor.execCommand('createLink'); }
      if (ctrl && !shift && key === '`') { e.preventDefault(); Editor.execCommand('code'); }
    }
  },
  
  showHelp() {
    const listEl = document.getElementById('shortcuts-list');
    if (!listEl) return;
    
    listEl.innerHTML = this.shortcuts.map(cat => `
      <div class="shortcut-category">
        <h4>${cat.category}</h4>
        ${cat.items.map(item => `
          <div class="shortcut-item">
            <span class="shortcut-desc">${item.desc}</span>
            <span class="shortcut-keys">
              ${item.keys.map(k => `<kbd>${k}</kbd>`).join('')}
            </span>
          </div>
        `).join('')}
      </div>
    `).join('');
    
    App.showModal('modal-shortcuts');
  }
};
