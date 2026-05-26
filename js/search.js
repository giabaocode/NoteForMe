window.SearchManager = {
  debounceTimer: null,
  isSearching: false,
  
  init() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('btn-clear-search');
    
    input?.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      clearBtn.classList.toggle('hidden', !query);
      
      // Debounce search
      clearTimeout(this.debounceTimer);
      if (!query) {
        this.clearSearch();
        return;
      }
      this.debounceTimer = setTimeout(() => this.search(query), 250);
    });
    
    clearBtn?.addEventListener('click', () => {
      input.value = '';
      clearBtn.classList.add('hidden');
      this.clearSearch();
      input.focus();
    });
  },
  
  async search(query) {
    this.isSearching = true;
    App.state.isSearching = true;
    
    const results = await DB.searchNotes(query);
    
    // Update UI
    document.getElementById('note-list-title').textContent = `Kết quả: "${query}"`;
    
    // Render results in note list
    const list = document.getElementById('note-list');
    const empty = document.getElementById('note-list-empty');
    
    if (results.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      empty.querySelector('.empty-title').textContent = 'Không tìm thấy';
      empty.querySelector('.empty-desc').textContent = `Không có ghi chú nào khớp với "${query}"`;
      return;
    }
    
    empty.classList.add('hidden');
    
    // Render search results with highlighted matches
    list.innerHTML = results.map(note => {
      const title = this.highlightMatch(note.title || 'Ghi chú không tiêu đề', query);
      const preview = this.highlightMatch((note.plainText || '').substring(0, 120), query);
      const date = NoteManager.formatRelativeTime(note.updatedAt);
      const tags = (note.tags || []).map(t => `<span class="tag-badge">${t}</span>`).join('');
      
      return `
        <li class="note-card${note.id === NoteManager.selectedId ? ' active' : ''}" data-id="${note.id}">
          <div class="note-card-header">
            ${note.isPinned ? '<span class="note-card-pin">📌</span>' : ''}
            <span class="note-card-title">${title}</span>
            ${note.isBookmarked ? '<span class="note-card-bookmark">⭐</span>' : ''}
          </div>
          <div class="note-card-preview">${preview}</div>
          <div class="note-card-meta">
            <span class="note-card-date">${date}</span>
            <div class="note-card-tags">${tags}</div>
          </div>
        </li>
      `;
    }).join('');
    
    // Add click listeners
    list.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => NoteManager.selectNote(card.dataset.id));
    });
  },
  
  highlightMatch(text, query) {
    if (!query || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  },
  
  clearSearch() {
    this.isSearching = false;
    App.state.isSearching = false;
    
    // Reset empty state text
    const empty = document.getElementById('note-list-empty');
    if (empty) {
      const emptyTitle = empty.querySelector('.empty-title');
      const emptyDesc = empty.querySelector('.empty-desc');
      if (emptyTitle) emptyTitle.textContent = 'Chưa có ghi chú nào';
      if (emptyDesc) emptyDesc.textContent = 'Nhấn nút bên trên để tạo ghi chú đầu tiên';
    }
    
    // Reload current view
    NoteManager.loadNotes(App.state.currentView, App.state.currentSubjectId);
  }
};
