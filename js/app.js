// Main application controller
window.App = {
  state: {
    currentView: 'all', // 'all' | 'bookmarks' | 'trash' | 'subject'
    currentSubjectId: null,
    currentNoteId: null,
    focusMode: false,
    isSearching: false,
    autoSaveTimer: null,
    isSaving: false
  },

  async init() {
    try {
      // 1. Check auth state
      const isLoggedIn = await AuthManager.init();

      if (!isLoggedIn) {
        // Show login screen
        AuthManager.renderAuthScreen();
        return;
      }

      // 2. Initialize the app
      await this.initAfterAuth();

    } catch (err) {
      console.error('App initialization failed:', err);
      this.showToast('Lỗi khởi tạo ứng dụng', 'error');
    }
  },

  async initAfterAuth() {
    try {
      // Show loading state
      this._showLoading(true);

      // 1. Initialize DB (test Supabase connection)
      await DB.init();
      console.log('✓ Database initialized');

      // 2. Initialize Theme
      if (typeof ThemeManager !== 'undefined' && ThemeManager.init) {
        await ThemeManager.init();
        console.log('✓ Theme initialized');
      }

      // 3. Initialize Subjects
      if (typeof SubjectManager !== 'undefined' && SubjectManager.init) {
        await SubjectManager.init();
        console.log('✓ Subjects initialized');
      }

      // 4. Initialize Notes - load 'all' view
      if (typeof NoteManager !== 'undefined' && NoteManager.loadNotes) {
        await NoteManager.loadNotes('all');
        console.log('✓ Notes initialized');
      }

      // 5. Initialize Editor
      if (typeof Editor !== 'undefined' && Editor.init) {
        Editor.init();
        console.log('✓ Editor initialized');
      }

      // 6. Initialize Search
      if (typeof SearchManager !== 'undefined' && SearchManager.init) {
        SearchManager.init();
        console.log('✓ Search initialized');
      }

      // 7. Initialize Shortcuts
      if (typeof ShortcutManager !== 'undefined' && ShortcutManager.init) {
        ShortcutManager.init();
        console.log('✓ Shortcuts initialized');
      }

      // 8. Initialize Templates
      if (typeof TemplateManager !== 'undefined' && TemplateManager.init) {
        TemplateManager.init();
        console.log('✓ Templates initialized');
      }

      // 9. Setup global event listeners
      this.setupEventListeners();
      console.log('✓ Event listeners ready');

      // 10. Update counts
      await this.updateCounts();

      // 11. Update user info display
      this._updateUserInfo();

      // 12. Hide loading
      this._showLoading(false);

      // 13. Show toast
      this.showToast('Lesson Note sẵn sàng! 📝', 'success');
      console.log('✓ App fully initialized');
    } catch (err) {
      console.error('App initialization failed:', err);
      this._showLoading(false);
      this.showToast('Lỗi khởi tạo: ' + (err.message || 'Unknown error'), 'error');
    }
  },

  _showLoading(show) {
    const loader = document.getElementById('app-loader');
    if (loader) loader.classList.toggle('hidden', !show);
    const app = document.getElementById('app');
    if (app) app.classList.toggle('hidden', show);
  },

  _updateUserInfo() {
    const user = AuthManager.currentUser;
    if (!user) return;
    const el = document.getElementById('user-email-display');
    if (el) el.textContent = user.email || '';
  },

  setupEventListeners() {
    // btn-all-notes click → switchView('all')
    document.getElementById('btn-all-notes')?.addEventListener('click', () => {
      this.switchView('all');
    });

    // btn-bookmarks click → switchView('bookmarks')
    document.getElementById('btn-bookmarks')?.addEventListener('click', () => {
      this.switchView('bookmarks');
    });

    // btn-trash click → switchView('trash')
    document.getElementById('btn-trash')?.addEventListener('click', () => {
      this.switchView('trash');
    });

    // btn-new-note click → NoteManager.createNote()
    document.getElementById('btn-new-note')?.addEventListener('click', () => {
      NoteManager.createNote();
    });

    // btn-create-first-note click → NoteManager.createNote()
    document.getElementById('btn-create-first-note')?.addEventListener('click', () => {
      NoteManager.createNote();
    });

    // btn-add-subject click → SubjectManager.showCreateModal()
    document.getElementById('btn-add-subject')?.addEventListener('click', () => {
      SubjectManager.showCreateModal();
    });

    // btn-template click → showModal('modal-template')
    document.getElementById('btn-template')?.addEventListener('click', () => {
      this.showModal('modal-template');
    });

    // btn-focus-mode click → toggleFocusMode()
    document.getElementById('btn-focus-mode')?.addEventListener('click', () => {
      this.toggleFocusMode();
    });

    // btn-export click → showModal('modal-export')
    document.getElementById('btn-export')?.addEventListener('click', () => {
      this.showModal('modal-export');
    });

    // btn-backup click → showModal('modal-backup') & update stats
    document.getElementById('btn-backup')?.addEventListener('click', () => {
      this.showModal('modal-backup');
      if (typeof BackupManager !== 'undefined' && BackupManager.updateStats) {
        BackupManager.updateStats();
      }
    });

    // btn-backup-export click → BackupManager.exportBackup()
    document.getElementById('btn-backup-export')?.addEventListener('click', () => {
      if (typeof BackupManager !== 'undefined' && BackupManager.exportBackup) {
        BackupManager.exportBackup();
      }
    });

    // btn-backup-import-trigger click → open hidden file input
    document.getElementById('btn-backup-import-trigger')?.addEventListener('click', () => {
      document.getElementById('input-backup-file')?.click();
    });

    // input-backup-file change → BackupManager.importBackup(file)
    document.getElementById('input-backup-file')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && typeof BackupManager !== 'undefined' && BackupManager.importBackup) {
        BackupManager.importBackup(file);
        e.target.value = ''; // Reset input
      }
    });

    // btn-export-pdf click → ExportManager.exportPDF()
    document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
      if (typeof ExportManager !== 'undefined' && ExportManager.exportPDF) {
        ExportManager.exportPDF();
      }
    });

    // btn-export-md click → ExportManager.exportMarkdown()
    document.getElementById('btn-export-md')?.addEventListener('click', () => {
      if (typeof ExportManager !== 'undefined' && ExportManager.exportMarkdown) {
        ExportManager.exportMarkdown();
      }
    });

    // btn-copy-html click → ExportManager.copyHTML()
    document.getElementById('btn-copy-html')?.addEventListener('click', () => {
      if (typeof ExportManager !== 'undefined' && ExportManager.copyHTML) {
        ExportManager.copyHTML();
      }
    });

    // modal-overlay click → close if clicking overlay
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') {
        this.closeAllModals();
      }
    });

    // [data-close-modal] click → closeAllModals()
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    // note-sort change → NoteManager.sortNotes(value)
    document.getElementById('note-sort')?.addEventListener('change', (e) => {
      NoteManager.sortNotes(e.target.value);
    });

    // Handle click outside context menu to close it
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu')) {
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) existingMenu.remove();
      }
    });

    // Sign out button
    document.getElementById('btn-sign-out')?.addEventListener('click', async () => {
      App.showConfirm('Bạn có muốn đăng xuất không?', async () => {
        await AuthManager.signOut();
        // Clear editor and reset state
        if (typeof Editor !== 'undefined') Editor.clear();
        // Reload page to reset all state
        window.location.reload();
      });
    });
  },

  async switchView(view, subjectId = null) {
    // Update state
    this.state.currentView = view;
    this.state.currentSubjectId = subjectId;

    // Update nav active states
    document.getElementById('btn-all-notes')?.classList.toggle('active', view === 'all');
    document.getElementById('btn-bookmarks')?.classList.toggle('active', view === 'bookmarks');
    document.getElementById('btn-trash')?.classList.toggle('active', view === 'trash');

    // Deselect subjects if not in subject view
    if (view !== 'subject') {
      SubjectManager.selectedId = null;
      document.querySelectorAll('.subject-item').forEach((el) => el.classList.remove('active'));
    }

    // Update note-list-title text
    const titleEl = document.getElementById('note-list-title');
    if (titleEl) {
      switch (view) {
        case 'all':
          titleEl.textContent = 'Tất cả ghi chú';
          break;
        case 'bookmarks':
          titleEl.textContent = 'Đánh dấu';
          break;
        case 'trash':
          titleEl.textContent = 'Thùng rác';
          break;
        case 'subject': {
          const subject = SubjectManager.subjects.find((s) => s.id === subjectId);
          titleEl.textContent = subject ? `${subject.icon} ${subject.name}` : 'Môn học';
          break;
        }
        default:
          titleEl.textContent = 'Ghi chú';
      }
    }

    // Show/hide new note button based on view
    const newNoteBtn = document.getElementById('btn-new-note');
    if (newNoteBtn) {
      newNoteBtn.style.display = view === 'trash' ? 'none' : '';
    }

    // Load appropriate notes
    await NoteManager.loadNotes(view, subjectId);

    // Clear editor if current note not in current view
    if (typeof Editor !== 'undefined' && Editor.currentNoteId) {
      const noteStillVisible = NoteManager.notes.some((n) => n.id === Editor.currentNoteId);
      if (!noteStillVisible) {
        Editor.clear();
      }
    }
  },

  toggleFocusMode() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    this.state.focusMode = !this.state.focusMode;
    appEl.classList.toggle('focus-mode', this.state.focusMode);

    if (typeof Editor !== 'undefined' && Editor.setFocusMode) {
      Editor.setFocusMode(this.state.focusMode);
    }

    this.showToast(
      this.state.focusMode ? 'Chế độ tập trung bật' : 'Chế độ tập trung tắt',
      'info'
    );
  },

  // ─── Modal Management ────────────────────────────────

  showModal(modalId) {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('active');

    const allModals = [
      'modal-subject',
      'modal-confirm',
      'modal-template',
      'modal-export',
      'modal-shortcuts',
      'modal-backup'
    ];
    allModals.forEach((id) => {
      const modal = document.getElementById(id);
      if (modal) modal.classList.remove('active');
    });

    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeAllModals() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('active');

    const allModals = [
      'modal-subject',
      'modal-confirm',
      'modal-template',
      'modal-export',
      'modal-shortcuts',
      'modal-backup'
    ];
    allModals.forEach((id) => {
      const modal = document.getElementById(id);
      if (modal) modal.classList.remove('active');
    });

    const subjectNameInput = document.getElementById('subject-name-input');
    if (subjectNameInput) subjectNameInput.value = '';
  },

  showConfirm(message, onConfirm) {
    const messageEl = document.getElementById('confirm-message');
    if (messageEl) messageEl.textContent = message;

    const confirmBtn = document.getElementById('btn-confirm-action');
    if (confirmBtn) {
      const newBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

      newBtn.addEventListener('click', async () => {
        this.closeAllModals();
        if (typeof onConfirm === 'function') {
          await onConfirm();
        }
      });
    }

    this.showModal('modal-confirm');
  },

  // ─── Toast Notifications ─────────────────────────────

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) {
      console.log(`Toast [${type}]: ${message}`);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${message}</span>`;
    toast.style.animation = 'toast-in 0.3s ease-out';
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toast-out 0.3s ease-in forwards';
      toast.addEventListener('animationend', () => {
        if (toast.parentNode) toast.remove();
      });
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 400);
    }, 3000);
  },

  // ─── Auto-save (debounced, with isSaving lock) ────────

  scheduleAutoSave() {
    if (this.state.autoSaveTimer) {
      clearTimeout(this.state.autoSaveTimer);
    }

    this.state.autoSaveTimer = setTimeout(async () => {
      if (Editor.currentNoteId && !this.state.isSaving) {
        this.state.isSaving = true;
        try {
          await Editor.saveCurrentNote();
        } finally {
          this.state.isSaving = false;
        }
      }
    }, 800);
  },

  // ─── Update Counts ──────────────────────────────────

  async updateCounts() {
    try {
      const allCount = await DB.getNotesCount();
      const allCountEl = document.getElementById('all-notes-count');
      if (allCountEl) allCountEl.textContent = allCount;

      const bookmarkedNotes = await DB.getBookmarkedNotes();
      const bookmarksCountEl = document.getElementById('bookmarks-count');
      if (bookmarksCountEl) bookmarksCountEl.textContent = bookmarkedNotes.length;

      const deletedNotes = await DB.getDeletedNotes();
      const trashCountEl = document.getElementById('trash-count');
      if (trashCountEl) trashCountEl.textContent = deletedNotes.length;

      if (typeof SubjectManager !== 'undefined') {
        SubjectManager.subjects.forEach(async (subject) => {
          const count = await DB.getNotesCount(subject.id);
          const countEl = document.querySelector(`[data-subject-count="${subject.id}"]`);
          if (countEl) countEl.textContent = count;
        });
      }
    } catch (err) {
      console.error('Error updating counts:', err);
    }
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
