// Note management
window.NoteManager = {
  notes: [],
  selectedId: null,
  sortBy: 'updatedAt',

  async loadNotes(view, subjectId = null) {
    try {
      switch (view) {
        case 'all':
          this.notes = await DB.getAllNotes();
          break;
        case 'bookmarks':
          this.notes = await DB.getBookmarkedNotes();
          break;
        case 'trash':
          this.notes = await DB.getDeletedNotes();
          break;
        case 'subject':
          this.notes = subjectId ? await DB.getNotesBySubject(subjectId) : [];
          break;
        default:
          this.notes = await DB.getAllNotes();
      }
    } catch (err) {
      console.error('Error loading notes:', err);
      this.notes = [];
    }

    this.render();
  },

  sortNotes(sortBy) {
    this.sortBy = sortBy;
    this.render();
  },

  _sortedNotes() {
    const notes = [...this.notes];

    notes.sort((a, b) => {
      // Pinned notes first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Then sort by selected field
      switch (this.sortBy) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '', 'vi');
        case 'createdAt':
          return (b.createdAt || 0) - (a.createdAt || 0);
        case 'updatedAt':
        default:
          return (b.updatedAt || 0) - (a.updatedAt || 0);
      }
    });

    return notes;
  },

  render() {
    const list = document.getElementById('note-list');
    const empty = document.getElementById('note-list-empty');
    if (!list) return;

    const sorted = this._sortedNotes();

    if (sorted.length === 0) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }

    if (empty) empty.classList.add('hidden');

    list.innerHTML = '';

    sorted.forEach((note) => {
      const li = document.createElement('li');
      li.className = 'note-card' + (this.selectedId === note.id ? ' active' : '');
      li.dataset.id = note.id;

      const title = note.title || 'Ghi chú không tiêu đề';
      const preview = (note.plainText || '').substring(0, 100);
      const dateStr = this.formatRelativeTime(note.updatedAt || note.createdAt);
      const tags = note.tags || [];

      li.innerHTML = `
        <div class="note-card-header">
          <span class="note-card-pin" ${!note.isPinned ? 'style="display:none"' : ''}>📌</span>
          <span class="note-card-title">${this._escapeHtml(title)}</span>
          <span class="note-card-bookmark" ${!note.isBookmarked ? 'style="display:none"' : ''}>⭐</span>
        </div>
        <div class="note-card-preview">${this._escapeHtml(preview)}</div>
        <div class="note-card-meta">
          <span class="note-card-date">${dateStr}</span>
          <div class="note-card-tags">${tags.map((t) => `<span class="tag-badge">${this._escapeHtml(t)}</span>`).join('')}</div>
        </div>
      `;

      // Click → selectNote(id)
      li.addEventListener('click', () => this.selectNote(note.id));

      // Right-click → showContextMenu(e, id)
      li.addEventListener('contextmenu', (e) => this.showContextMenu(e, note.id));

      list.appendChild(li);
    });
  },

  async selectNote(id) {
    this.selectedId = id;

    // Update active class on note cards
    document.querySelectorAll('.note-card').forEach((card) => {
      card.classList.toggle('active', card.dataset.id === id);
    });

    try {
      const note = await DB.getNote(id);
      if (note) {
        Editor.loadNote(note);
      }
    } catch (err) {
      console.error('Error selecting note:', err);
    }
  },

  async createNote(subjectId = null) {
    // Use current subject or the passed one
    const sid = subjectId || App.state.currentSubjectId;

    try {
      const note = await DB.addNote({
        subjectId: sid,
        title: '',
        content: '',
        plainText: '',
        tags: [],
        template: null
      });

      // Reload notes
      await this.loadNotes(App.state.currentView, App.state.currentSubjectId);

      // Select the new note
      await this.selectNote(note.id);

      // Focus title input
      const titleInput = document.getElementById('note-title-input');
      if (titleInput) titleInput.focus();

      App.showToast('Đã tạo ghi chú mới', 'success');
      App.updateCounts();
    } catch (err) {
      console.error('Error creating note:', err);
      App.showToast('Lỗi khi tạo ghi chú', 'error');
    }
  },

  async deleteNote(id) {
    if (App.state.currentView === 'trash') {
      // Permanent delete
      App.showConfirm('Xóa vĩnh viễn ghi chú này?', async () => {
        try {
          await DB.permanentDeleteNote(id);
          if (this.selectedId === id) Editor.clear();
          await this.loadNotes('trash');
          App.showToast('Đã xóa vĩnh viễn', 'success');
          App.updateCounts();
        } catch (err) {
          console.error('Error permanently deleting note:', err);
          App.showToast('Lỗi khi xóa ghi chú', 'error');
        }
      });
    } else {
      // Soft delete
      try {
        await DB.deleteNote(id);
        if (this.selectedId === id) Editor.clear();
        await this.loadNotes(App.state.currentView, App.state.currentSubjectId);
        App.showToast('Đã chuyển vào thùng rác', 'success');
        App.updateCounts();
      } catch (err) {
        console.error('Error deleting note:', err);
        App.showToast('Lỗi khi xóa ghi chú', 'error');
      }
    }
  },

  async restoreNote(id) {
    try {
      await DB.restoreNote(id);
      await this.loadNotes('trash');
      App.showToast('Đã khôi phục ghi chú', 'success');
      App.updateCounts();
    } catch (err) {
      console.error('Error restoring note:', err);
      App.showToast('Lỗi khi khôi phục ghi chú', 'error');
    }
  },

  async togglePin(id) {
    try {
      const note = await DB.getNote(id);
      if (!note) return;
      await DB.updateNote(id, { isPinned: !note.isPinned });
      await this.loadNotes(App.state.currentView, App.state.currentSubjectId);
      App.showToast(note.isPinned ? 'Đã bỏ ghim' : 'Đã ghim ghi chú', 'success');
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  },

  async toggleBookmark(id) {
    try {
      const note = await DB.getNote(id);
      if (!note) return;
      await DB.updateNote(id, { isBookmarked: !note.isBookmarked });
      await this.loadNotes(App.state.currentView, App.state.currentSubjectId);
      App.showToast(note.isBookmarked ? 'Đã bỏ đánh dấu' : 'Đã đánh dấu', 'success');
      App.updateCounts();
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  },

  async duplicateNote(id) {
    try {
      await DB.duplicateNote(id);
      await this.loadNotes(App.state.currentView, App.state.currentSubjectId);
      App.showToast('Đã sao chép ghi chú', 'success');
      App.updateCounts();
    } catch (err) {
      console.error('Error duplicating note:', err);
      App.showToast('Lỗi khi sao chép ghi chú', 'error');
    }
  },

  // Update a single note card without re-rendering all (for auto-save visual update)
  updateNoteCard(id, { title, plainText, tags }) {
    const card = document.querySelector(`.note-card[data-id="${id}"]`);
    if (!card) return;

    const titleEl = card.querySelector('.note-card-title');
    const previewEl = card.querySelector('.note-card-preview');

    if (titleEl) titleEl.textContent = title || 'Ghi chú không tiêu đề';
    if (previewEl) previewEl.textContent = (plainText || '').substring(0, 100);

    // Update tags if provided
    const tagsContainer = card.querySelector('.note-card-tags');
    if (tagsContainer && tags) {
      tagsContainer.innerHTML = tags
        .map((t) => `<span class="tag-badge">${this._escapeHtml(t)}</span>`)
        .join('');
    }
  },

  // Context menu
  showContextMenu(e, noteId) {
    e.preventDefault();

    // Remove existing context menu
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) existingMenu.remove();

    const isTrash = App.state.currentView === 'trash';
    const note = this.notes.find((n) => n.id === noteId);

    let items = [];
    if (isTrash) {
      items = [
        { icon: '♻️', text: 'Khôi phục', action: () => this.restoreNote(noteId) },
        { type: 'divider' },
        { icon: '🗑️', text: 'Xóa vĩnh viễn', action: () => this.deleteNote(noteId), danger: true }
      ];
    } else {
      items = [
        {
          icon: '📌',
          text: note?.isPinned ? 'Bỏ ghim' : 'Ghim',
          action: () => this.togglePin(noteId)
        },
        {
          icon: '⭐',
          text: note?.isBookmarked ? 'Bỏ đánh dấu' : 'Đánh dấu',
          action: () => this.toggleBookmark(noteId)
        },
        { icon: '📋', text: 'Sao chép', action: () => this.duplicateNote(noteId) },
        { type: 'divider' },
        { icon: '🗑️', text: 'Xóa', action: () => this.deleteNote(noteId), danger: true }
      ];
    }

    // Create menu DOM
    const menu = document.createElement('div');
    menu.className = 'context-menu';

    items.forEach((item) => {
      if (item.type === 'divider') {
        const divider = document.createElement('div');
        divider.className = 'context-menu-divider';
        menu.appendChild(divider);
        return;
      }
      const btn = document.createElement('button');
      btn.className = 'context-menu-item' + (item.danger ? ' danger' : '');
      btn.innerHTML = `<span>${item.icon}</span><span>${item.text}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        item.action();
        menu.remove();
      });
      menu.appendChild(btn);
    });

    // Position menu at cursor
    menu.style.position = 'fixed';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.zIndex = '10000';
    document.body.appendChild(menu);

    // Adjust if off-screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 8}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 8}px`;
    }

    // Close on click outside
    setTimeout(() => {
      document.addEventListener(
        'click',
        function closeMenu() {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        },
        { once: true }
      );
    }, 0);
  },

  // Relative time formatting
  formatRelativeTime(timestamp) {
    if (!timestamp) return '';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return new Date(timestamp).toLocaleDateString('vi-VN');
  },

  // Helper: escape HTML to prevent XSS
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
