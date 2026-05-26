// Rich text editor controller
window.Editor = {
  contentEl: null,  // #editor-content
  titleEl: null,    // #note-title-input
  toolbar: null,    // #editor-toolbar
  currentNoteId: null,

  init() {
    // Cache DOM elements
    this.contentEl = document.getElementById('editor-content');
    this.titleEl = document.getElementById('note-title-input');
    this.toolbar = document.getElementById('editor-toolbar');

    if (!this.contentEl || !this.titleEl || !this.toolbar) {
      console.warn('Editor: Some DOM elements not found.');
      return;
    }

    // Setup toolbar click handlers (event delegation on toolbar)
    this.toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.toolbar-btn');
      if (!btn) return;

      e.preventDefault();
      const command = btn.dataset.command;
      if (command) {
        this.execCommand(command);
      }
    });

    // Setup heading-select change handler
    const headingSelect = document.getElementById('heading-select');
    if (headingSelect) {
      headingSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value) {
          this.execCommand(value);
          e.target.value = ''; // Reset select
        }
      });
    }

    // Setup contenteditable input events for auto-save
    this.contentEl.addEventListener('input', () => {
      this.updateWordCount();
      this.updateToolbarState();
      App.scheduleAutoSave();
      // Update save status to indicate unsaved
      const saveStatus = document.getElementById('save-status');
      if (saveStatus) {
        saveStatus.textContent = 'Đang lưu...';
        saveStatus.classList.add('saving');
      }
    });

    // Setup title input events for auto-save
    this.titleEl.addEventListener('input', () => {
      App.scheduleAutoSave();
      const saveStatus = document.getElementById('save-status');
      if (saveStatus) {
        saveStatus.textContent = 'Đang lưu...';
        saveStatus.classList.add('saving');
      }
    });

    // Setup tag input (Enter to add tag)
    const tagInput = document.getElementById('tag-input');
    if (tagInput) {
      tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const tagName = tagInput.value.trim();
          if (tagName) {
            this.addTag(tagName);
            tagInput.value = '';
          }
        }
      });
    }

    // Setup paste handler (clean HTML on paste)
    this.contentEl.addEventListener('paste', (e) => this.handlePaste(e));

    // Handle keyboard shortcuts within editor
    this.contentEl.addEventListener('keydown', (e) => {
      // Ctrl+B, Ctrl+I, Ctrl+U are handled natively
      // Ctrl+S → save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveCurrentNote();
      }
    });

    // Track selection changes for toolbar state
    document.addEventListener('selectionchange', () => {
      if (document.activeElement === this.contentEl) {
        this.updateToolbarState();
      }
    });

    // Update heading select on click within editor
    this.contentEl.addEventListener('mouseup', () => this.updateToolbarState());
  },

  loadNote(note) {
    if (!note) return;

    this.currentNoteId = note.id;

    // Set title input value
    if (this.titleEl) {
      this.titleEl.value = note.title || '';
    }

    // Set editor content innerHTML
    if (this.contentEl) {
      this.contentEl.innerHTML = note.content || '';
    }

    // Load tags into #note-tags
    const noteTags = document.getElementById('note-tags');
    if (noteTags) {
      // Clear existing tags (except the input)
      const tagInput = document.getElementById('tag-input');
      noteTags.innerHTML = '';
      if (tagInput) noteTags.appendChild(tagInput);

      // Add tag badges
      const tags = note.tags || [];
      tags.forEach((tag) => this._createTagBadge(tag, noteTags));
    }

    // Show editor, hide #editor-empty
    const editorEmpty = document.getElementById('editor-empty');
    const editorPanel = document.getElementById('editor-panel');

    if (editorEmpty) editorEmpty.classList.add('hidden');

    // Show editor elements
    if (this.toolbar) this.toolbar.classList.remove('hidden');
    if (this.titleEl) this.titleEl.classList.remove('hidden');
    if (this.contentEl) this.contentEl.classList.remove('hidden');

    const noteTagsContainer = document.getElementById('note-tags');
    if (noteTagsContainer) noteTagsContainer.classList.remove('hidden');

    const statusBar = this.contentEl?.parentElement?.querySelector('.editor-status');
    if (statusBar) statusBar.classList.remove('hidden');

    // Show all editor sub-elements
    document.querySelectorAll('#editor-panel > *:not(#editor-empty)').forEach((el) => {
      el.classList.remove('hidden');
    });

    // Update word count & reading time
    this.updateWordCount();

    // Update save status
    const saveStatus = document.getElementById('save-status');
    if (saveStatus) {
      saveStatus.textContent = '✓ Đã lưu';
      saveStatus.classList.remove('saving');
    }

    // Focus content area
    if (this.contentEl) {
      this.contentEl.focus();
    }
  },

  clear() {
    // Clear title and content
    if (this.titleEl) this.titleEl.value = '';
    if (this.contentEl) this.contentEl.innerHTML = '';

    // Clear tags
    const noteTags = document.getElementById('note-tags');
    if (noteTags) {
      const tagInput = document.getElementById('tag-input');
      noteTags.innerHTML = '';
      if (tagInput) noteTags.appendChild(tagInput);
    }

    // Show #editor-empty, hide editor toolbar/title/content/status
    const editorEmpty = document.getElementById('editor-empty');
    if (editorEmpty) editorEmpty.classList.remove('hidden');

    if (this.toolbar) this.toolbar.classList.add('hidden');
    if (this.titleEl) this.titleEl.classList.add('hidden');
    if (this.contentEl) this.contentEl.classList.add('hidden');

    const noteTagsContainer = document.getElementById('note-tags');
    if (noteTagsContainer) noteTagsContainer.classList.add('hidden');

    // Hide status bar
    const statusBar = document.querySelector('#editor-panel .editor-status');
    if (statusBar) statusBar.classList.add('hidden');

    // Set currentNoteId to null
    this.currentNoteId = null;
  },

  getContent() {
    return this.contentEl ? this.contentEl.innerHTML : '';
  },

  getPlainText() {
    return this.contentEl ? (this.contentEl.innerText || this.contentEl.textContent || '') : '';
  },

  execCommand(command, value = null) {
    // Ensure focus is in the contenteditable
    if (this.contentEl && document.activeElement !== this.contentEl) {
      this.contentEl.focus();
    }

    switch (command) {
      case 'code': {
        // Toggle code block: wrap selection in <pre><code> or remove it
        const selection = window.getSelection();
        if (!selection.rangeCount) break;

        const range = selection.getRangeAt(0);
        const parentPre = this._findParentTag(range.commonAncestorContainer, 'PRE');

        if (parentPre) {
          // Remove pre/code wrapping
          const textContent = parentPre.textContent;
          const textNode = document.createTextNode(textContent);
          parentPre.parentNode.replaceChild(textNode, parentPre);
        } else {
          // Wrap in pre/code
          const selectedText = range.toString() || 'code here';
          const pre = document.createElement('pre');
          const code = document.createElement('code');
          code.textContent = selectedText;
          pre.appendChild(code);
          range.deleteContents();
          range.insertNode(pre);
        }
        break;
      }

      case 'highlight': {
        document.execCommand('hiliteColor', false, '#FFEAA7');
        break;
      }

      case 'createLink': {
        const url = prompt('Nhập URL:', 'https://');
        if (url && url !== 'https://') {
          document.execCommand('createLink', false, url);
          // Make link open in new tab
          const selection = window.getSelection();
          if (selection.rangeCount) {
            const anchor = this._findParentTag(selection.anchorNode, 'A');
            if (anchor) {
              anchor.setAttribute('target', '_blank');
              anchor.setAttribute('rel', 'noopener noreferrer');
            }
          }
        }
        break;
      }

      case 'insertImage': {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (ev) => {
            // Focus editor and insert image
            this.contentEl.focus();
            document.execCommand('insertHTML', false,
              `<img src="${ev.target.result}" alt="${file.name}" style="max-width:100%;height:auto;border-radius:8px;margin:8px 0;">`
            );
            App.scheduleAutoSave();
          };
          reader.readAsDataURL(file);

          // Clean up
          document.body.removeChild(fileInput);
        });

        document.body.appendChild(fileInput);
        fileInput.click();
        break;
      }

      case 'insertChecklist': {
        const checklistHtml = `
          <div class="checklist-item" style="display:flex;align-items:center;gap:8px;margin:4px 0;">
            <input type="checkbox" style="width:18px;height:18px;cursor:pointer;">
            <span contenteditable="true" style="flex:1;">Mục mới</span>
          </div>
        `;
        document.execCommand('insertHTML', false, checklistHtml);
        break;
      }

      case 'h1':
      case 'h2':
      case 'h3':
      case 'p': {
        document.execCommand('formatBlock', false, `<${command}>`);
        break;
      }

      case 'insertUnorderedList':
      case 'insertOrderedList':
      case 'bold':
      case 'italic':
      case 'underline':
      case 'strikeThrough':
      case 'justifyLeft':
      case 'justifyCenter':
      case 'justifyRight':
      case 'indent':
      case 'outdent':
      case 'removeFormat':
      case 'undo':
      case 'redo': {
        document.execCommand(command, false, value);
        break;
      }

      default: {
        document.execCommand(command, false, value);
        break;
      }
    }

    // After command: update toolbar active states, trigger auto-save
    this.updateToolbarState();
    App.scheduleAutoSave();
  },

  updateToolbarState() {
    if (!this.toolbar) return;

    // Commands to check
    const commandStates = ['bold', 'italic', 'underline', 'strikeThrough'];

    commandStates.forEach((cmd) => {
      const btn = this.toolbar.querySelector(`.toolbar-btn[data-command="${cmd}"]`);
      if (btn) {
        try {
          if (document.queryCommandState(cmd)) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        } catch (e) {
          // queryCommandState can throw for some commands
        }
      }
    });

    // Update heading select value
    const headingSelect = document.getElementById('heading-select');
    if (headingSelect) {
      try {
        const block = document.queryCommandValue('formatBlock');
        if (block) {
          const tag = block.toLowerCase().replace(/[<>]/g, '');
          if (['h1', 'h2', 'h3', 'p'].includes(tag)) {
            headingSelect.value = tag;
          } else {
            headingSelect.value = '';
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
  },

  updateWordCount() {
    const plainText = this.getPlainText().trim();

    // Count words
    const words = plainText ? plainText.split(/\s+/).filter((w) => w.length > 0).length : 0;
    const chars = plainText.length;
    const readingMinutes = Math.max(1, Math.ceil(words / 200));

    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');
    const readingTimeEl = document.getElementById('reading-time');

    if (wordCountEl) wordCountEl.textContent = `${words} từ`;
    if (charCountEl) charCountEl.textContent = `${chars} ký tự`;
    if (readingTimeEl) readingTimeEl.textContent = `~${readingMinutes} phút đọc`;
  },

  // Tag management within editor
  addTag(tagName) {
    if (!tagName || !tagName.trim()) return;

    const normalizedTag = tagName.trim();

    // Check if tag already exists
    const existingTags = this.getCurrentTags();
    if (existingTags.includes(normalizedTag)) {
      App.showToast('Tag đã tồn tại', 'error');
      return;
    }

    const noteTags = document.getElementById('note-tags');
    if (!noteTags) return;

    this._createTagBadge(normalizedTag, noteTags);

    // Save to current note
    App.scheduleAutoSave();
  },

  _createTagBadge(tagName, container) {
    const tagInput = document.getElementById('tag-input');

    const badge = document.createElement('span');
    badge.className = 'tag-badge';
    badge.dataset.tag = tagName;
    badge.innerHTML = `${this._escapeHtml(tagName)}<button class="tag-remove" title="Xóa tag">×</button>`;

    // Remove handler
    badge.querySelector('.tag-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeTag(tagName);
    });

    // Insert before the tag input
    if (tagInput && container.contains(tagInput)) {
      container.insertBefore(badge, tagInput);
    } else {
      container.appendChild(badge);
    }
  },

  removeTag(tagName) {
    const noteTags = document.getElementById('note-tags');
    if (!noteTags) return;

    const badge = noteTags.querySelector(`.tag-badge[data-tag="${tagName}"]`);
    if (badge) badge.remove();

    // Save to current note
    App.scheduleAutoSave();
  },

  getCurrentTags() {
    const noteTags = document.getElementById('note-tags');
    if (!noteTags) return [];

    const badges = noteTags.querySelectorAll('.tag-badge');
    return Array.from(badges).map((b) => b.dataset.tag).filter(Boolean);
  },

  setContent(html) {
    if (this.contentEl) {
      this.contentEl.innerHTML = html;
      this.updateWordCount();
    }
  },

  applyTemplate(templateHtml) {
    this.setContent(templateHtml);
    App.scheduleAutoSave();
  },

  setFocusMode(enabled) {
    // Additional editor-specific focus mode adjustments
    if (this.contentEl) {
      if (enabled) {
        this.contentEl.style.maxWidth = '800px';
        this.contentEl.style.margin = '0 auto';
      } else {
        this.contentEl.style.maxWidth = '';
        this.contentEl.style.margin = '';
      }
    }
  },

  // Clean pasted HTML
  handlePaste(e) {
    e.preventDefault();

    let pastedData = '';

    // Try to get HTML content first
    if (e.clipboardData && e.clipboardData.getData) {
      const htmlData = e.clipboardData.getData('text/html');
      const textData = e.clipboardData.getData('text/plain');

      if (htmlData) {
        pastedData = this._cleanHtml(htmlData);
      } else if (textData) {
        // Convert plain text to HTML (preserve line breaks)
        pastedData = textData
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
      }
    }

    if (pastedData) {
      document.execCommand('insertHTML', false, pastedData);
    }
  },

  _cleanHtml(html) {
    // Remove dangerous tags
    const dangerousTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'];
    let cleaned = html;

    dangerousTags.forEach((tag) => {
      const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
      cleaned = cleaned.replace(regex, '');
      // Also remove self-closing versions
      const selfClosing = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
      cleaned = cleaned.replace(selfClosing, '');
    });

    // Remove on* event handlers
    cleaned = cleaned.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');

    // Remove javascript: URLs
    cleaned = cleaned.replace(/javascript\s*:/gi, '');

    return cleaned;
  },

  // Save current note state
  async saveCurrentNote() {
    if (!this.currentNoteId) return;

    try {
      const content = this.getContent();
      const plainText = this.getPlainText();
      const title = this.titleEl?.value || 'Ghi chú không tiêu đề';
      const tags = this.getCurrentTags();

      await DB.updateNote(this.currentNoteId, { title, content, plainText, tags });

      // Update save status
      const saveStatus = document.getElementById('save-status');
      if (saveStatus) {
        saveStatus.textContent = '✓ Đã lưu';
        saveStatus.classList.remove('saving');
      }

      // Update note card in list
      NoteManager.updateNoteCard(this.currentNoteId, { title, plainText, tags });
    } catch (err) {
      console.error('Error saving note:', err);
      const saveStatus = document.getElementById('save-status');
      if (saveStatus) {
        saveStatus.textContent = '✗ Lỗi lưu';
        saveStatus.classList.remove('saving');
      }
    }
  },

  // Helper: find parent element with a specific tag name
  _findParentTag(node, tagName) {
    let current = node;
    while (current && current !== this.contentEl) {
      if (current.nodeName === tagName) return current;
      current = current.parentNode;
    }
    return null;
  },

  // Helper: escape HTML
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
