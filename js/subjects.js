// Subject management
window.SubjectManager = {
  subjects: [],
  selectedId: null,
  editingId: null, // for edit mode

  async init() {
    this.subjects = await DB.getAllSubjects();
    this.setupIconPicker();
    this.setupColorPicker();
    this.render();
  },

  render() {
    const list = document.getElementById('subject-list');
    if (!list) return;

    list.innerHTML = '';

    this.subjects.forEach((subject) => {
      const li = document.createElement('li');
      li.className = 'subject-item' + (this.selectedId === subject.id ? ' active' : '');
      li.dataset.id = subject.id;
      const subjColor = subject.color || '#6C5CE7';
      li.style.setProperty('--subject-color', subjColor);
      li.style.setProperty('--subject-color-bg', this._hexToRgba(subjColor, 0.12));

      // Get note count for this subject (async, update later)
      li.innerHTML = `
        <span class="subject-icon">${subject.icon || '📚'}</span>
        <span class="subject-name">${this._escapeHtml(subject.name)}</span>
        <span class="subject-count" data-subject-count="${subject.id}">0</span>
        <div class="subject-actions">
          <button class="btn-icon-sm btn-edit-subject" title="Sửa">✏️</button>
          <button class="btn-icon-sm btn-delete-subject" title="Xóa">🗑️</button>
        </div>
      `;

      // Click on item to select subject
      li.addEventListener('click', (e) => {
        // Don't select if clicking action buttons
        if (e.target.closest('.subject-actions')) return;
        this.selectSubject(subject.id);
      });

      // Edit button
      const editBtn = li.querySelector('.btn-edit-subject');
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showEditModal(subject.id);
      });

      // Delete button
      const deleteBtn = li.querySelector('.btn-delete-subject');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.confirmDelete(subject.id);
      });

      list.appendChild(li);

      // Update count asynchronously
      DB.getNotesCount(subject.id).then((count) => {
        const countEl = li.querySelector(`[data-subject-count="${subject.id}"]`);
        if (countEl) countEl.textContent = count;
      });
    });
  },

  async selectSubject(id) {
    this.selectedId = id;

    // Update active class on subject items
    document.querySelectorAll('.subject-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.id === id);
    });

    // Remove active from nav items
    document.getElementById('btn-all-notes')?.classList.remove('active');
    document.getElementById('btn-bookmarks')?.classList.remove('active');
    document.getElementById('btn-trash')?.classList.remove('active');

    // Switch view to subject
    App.switchView('subject', id);
  },

  showCreateModal() {
    this.editingId = null;

    // Set modal title
    const titleEl = document.getElementById('modal-subject-title');
    if (titleEl) titleEl.textContent = 'Thêm môn học';

    // Clear form inputs
    const nameInput = document.getElementById('subject-name-input');
    if (nameInput) nameInput.value = '';

    // Select first icon and first color by default
    const iconPicker = document.getElementById('icon-picker');
    if (iconPicker) {
      iconPicker.querySelectorAll('.icon-option').forEach((b) => b.classList.remove('selected'));
      const firstIcon = iconPicker.querySelector('.icon-option');
      if (firstIcon) firstIcon.classList.add('selected');
    }

    const colorPicker = document.getElementById('color-picker');
    if (colorPicker) {
      colorPicker.querySelectorAll('.color-option').forEach((b) => b.classList.remove('selected'));
      const firstColor = colorPicker.querySelector('.color-option');
      if (firstColor) firstColor.classList.add('selected');
    }

    App.showModal('modal-subject');
  },

  showEditModal(id) {
    this.editingId = id;
    const subject = this.subjects.find((s) => s.id === id);
    if (!subject) return;

    // Set modal title
    const titleEl = document.getElementById('modal-subject-title');
    if (titleEl) titleEl.textContent = 'Sửa môn học';

    // Fill form with existing data
    const nameInput = document.getElementById('subject-name-input');
    if (nameInput) nameInput.value = subject.name;

    // Select current icon
    const iconPicker = document.getElementById('icon-picker');
    if (iconPicker) {
      iconPicker.querySelectorAll('.icon-option').forEach((b) => {
        b.classList.toggle('selected', b.dataset.icon === subject.icon || b.textContent === subject.icon);
      });
    }

    // Select current color
    const colorPicker = document.getElementById('color-picker');
    if (colorPicker) {
      colorPicker.querySelectorAll('.color-option').forEach((b) => {
        b.classList.toggle('selected', b.dataset.color === subject.color);
      });
    }

    App.showModal('modal-subject');
  },

  async saveSubject() {
    const name = document.getElementById('subject-name-input')?.value.trim();
    if (!name) {
      App.showToast('Vui lòng nhập tên môn học', 'error');
      return;
    }

    const icon = document.querySelector('#icon-picker .selected')?.textContent || '📚';
    const color = document.querySelector('#color-picker .selected')?.dataset.color || '#6C5CE7';

    try {
      if (this.editingId) {
        await DB.updateSubject(this.editingId, { name, icon, color });
        App.showToast('Đã cập nhật môn học', 'success');
      } else {
        await DB.addSubject({ name, icon, color });
        App.showToast('Đã thêm môn học mới', 'success');
      }

      this.subjects = await DB.getAllSubjects();
      this.render();
      App.closeAllModals();
      App.updateCounts();
    } catch (err) {
      console.error('Error saving subject:', err);
      App.showToast('Lỗi khi lưu môn học', 'error');
    }
  },

  async confirmDelete(id) {
    const subject = this.subjects.find((s) => s.id === id);
    if (!subject) return;

    App.showConfirm(
      `Xóa môn học "${subject.name}"? Tất cả ghi chú trong môn này cũng sẽ bị xóa.`,
      async () => {
        try {
          await DB.deleteSubject(id);
          this.subjects = await DB.getAllSubjects();
          this.render();

          if (this.selectedId === id) {
            this.selectedId = null;
            App.switchView('all');
          }

          App.showToast('Đã xóa môn học', 'success');
          App.updateCounts();
        } catch (err) {
          console.error('Error deleting subject:', err);
          App.showToast('Lỗi khi xóa môn học', 'error');
        }
      }
    );
  },

  // Setup pickers in modal
  setupIconPicker() {
    const icons = ['📐', '📊', '🔬', '💻', '📚', '🎨', '🌍', '🧪', '📈', '💰', '🏛️', '🎵', '⚽', '🧠', '📖', '✏️', '🔢', '🌱', '⚖️', '🏥'];
    const picker = document.getElementById('icon-picker');
    if (!picker) return;

    picker.innerHTML = icons
      .map(
        (icon) =>
          `<button type="button" class="icon-option" data-icon="${icon}">${icon}</button>`
      )
      .join('');

    picker.addEventListener('click', (e) => {
      const btn = e.target.closest('.icon-option');
      if (!btn) return;
      picker.querySelectorAll('.icon-option').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  },

  setupColorPicker() {
    const colors = [
      '#6C5CE7', '#0984E3', '#00B894', '#FDCB6E', '#E17055', '#D63031', '#E84393',
      '#A29BFE', '#74B9FF', '#55EFC4', '#FFEAA7', '#FAB1A0', '#FF7675', '#FD79A8'
    ];
    const picker = document.getElementById('color-picker');
    if (!picker) return;

    picker.innerHTML = colors
      .map(
        (color) =>
          `<button type="button" class="color-option" data-color="${color}" style="background-color:${color}"></button>`
      )
      .join('');

    picker.addEventListener('click', (e) => {
      const btn = e.target.closest('.color-option');
      if (!btn) return;
      picker.querySelectorAll('.color-option').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  },

  // Helper: escape HTML to prevent XSS
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Helper: convert hex (#RRGGBB) → rgba string with given alpha
  _hexToRgba(hex, alpha) {
    if (!hex || !hex.startsWith('#')) return `rgba(108,92,231,${alpha})`;
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
};

// Wire save button
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-save-subject')?.addEventListener('click', () =>
    SubjectManager.saveSubject()
  );
});
