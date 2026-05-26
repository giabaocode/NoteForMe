// ============================================================
// Lesson Note — Database Layer (Supabase REST API)
// Thay thế IndexedDB bằng fetch() gọi Supabase REST API
// ============================================================

window.DB = {

  // ─── Helper: build common headers ────────────────────────
  async _headers(extra = {}) {
    const token = await AuthManager.getAccessToken();
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...extra
    };
  },

  // ─── Helper: REST fetch wrapper ──────────────────────────
  async _fetch(path, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    const headers = await this._headers(options.headers || {});

    const res = await fetch(url, {
      ...options,
      headers
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errData = await res.json();
        errMsg = errData.message || errData.hint || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    // 204 No Content → return null
    if (res.status === 204) return null;

    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  },

  // ─── Init (test connection) ───────────────────────────────
  async init() {
    // Kiểm tra kết nối bằng cách lấy 1 subject (có thể trả về [])
    await this._fetch('subjects?limit=1');
    console.log('✓ Supabase connected');
  },

  // ─── Helper: get current user_id ─────────────────────────
  _userId() {
    return AuthManager.currentUser?.id;
  },

  // ─── Generate UUID (fallback cho client side) ─────────────
  _generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  // ─── Convert timestamp to ISO string ────────────────────
  _toISO(ts) {
    if (!ts) return null;
    if (typeof ts === 'string') return ts;
    return new Date(ts).toISOString();
  },

  // ─── Convert ISO string to timestamp ────────────────────
  _fromISO(iso) {
    if (!iso) return null;
    return new Date(iso).getTime();
  },

  // ─── Map DB row to app format ─────────────────────────────
  _mapSubject(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name || '',
      icon: row.icon || '📚',
      color: row.color || '#6C5CE7',
      order: row.order ?? 0,
      createdAt: this._fromISO(row.created_at),
      updatedAt: this._fromISO(row.updated_at)
    };
  },

  _mapNote(row) {
    if (!row) return null;
    return {
      id: row.id,
      subjectId: row.subject_id || null,
      title: row.title || '',
      content: row.content || '',
      plainText: row.plain_text || '',
      tags: row.tags || [],
      isPinned: row.is_pinned || false,
      isBookmarked: row.is_bookmarked || false,
      isDeleted: row.is_deleted || false,
      deletedAt: this._fromISO(row.deleted_at),
      createdAt: this._fromISO(row.created_at),
      updatedAt: this._fromISO(row.updated_at)
    };
  },

  _mapTag(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name || '',
      color: row.color || '#6C5CE7',
      createdAt: this._fromISO(row.created_at)
    };
  },

  // ============================================================
  // SUBJECTS CRUD
  // ============================================================

  async addSubject({ name, icon, color }) {
    const allSubjects = await this.getAllSubjects();
    const order = allSubjects.length;

    const rows = await this._fetch('subjects', {
      method: 'POST',
      body: JSON.stringify({
        name: name || '',
        icon: icon || '📚',
        color: color || '#6C5CE7',
        order,
        user_id: this._userId()
      })
    });

    return this._mapSubject(Array.isArray(rows) ? rows[0] : rows);
  },

  async getSubject(id) {
    if (!id) return null;
    const rows = await this._fetch(`subjects?id=eq.${id}&limit=1`);
    return this._mapSubject(rows?.[0] || null);
  },

  async getAllSubjects() {
    const rows = await this._fetch('subjects?order=order.asc,created_at.asc');
    return (rows || []).map(r => this._mapSubject(r));
  },

  async updateSubject(id, data) {
    const body = {};
    if (data.name !== undefined)  body.name  = data.name;
    if (data.icon !== undefined)  body.icon  = data.icon;
    if (data.color !== undefined) body.color = data.color;
    if (data.order !== undefined) body.order = data.order;

    const rows = await this._fetch(`subjects?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });

    return this._mapSubject(Array.isArray(rows) ? rows[0] : rows);
  },

  async deleteSubject(id) {
    // Xóa tất cả notes thuộc subject này (soft delete → hard delete từ Supabase)
    // Vì subject_id có ON DELETE SET NULL, notes sẽ không bị xóa
    // Nhưng ta muốn xóa notes → hard delete
    await this._fetch(`notes?subject_id=eq.${id}`, {
      method: 'DELETE'
    });

    // Xóa subject
    await this._fetch(`subjects?id=eq.${id}`, {
      method: 'DELETE'
    });
  },

  // ============================================================
  // NOTES CRUD
  // ============================================================

  async addNote({ subjectId, title, content, plainText, tags, template }) {
    const rows = await this._fetch('notes', {
      method: 'POST',
      body: JSON.stringify({
        subject_id: subjectId || null,
        title: title || '',
        content: content || '',
        plain_text: plainText || '',
        tags: tags || [],
        template: template || null,
        is_pinned: false,
        is_bookmarked: false,
        is_deleted: false,
        deleted_at: null,
        user_id: this._userId()
      })
    });

    return this._mapNote(Array.isArray(rows) ? rows[0] : rows);
  },

  async getNote(id) {
    if (!id) return null;
    const rows = await this._fetch(`notes?id=eq.${id}&limit=1`);
    return this._mapNote(rows?.[0] || null);
  },

  async getAllNotes() {
    const rows = await this._fetch('notes?is_deleted=eq.false&order=updated_at.desc');
    return (rows || []).map(r => this._mapNote(r));
  },

  async _getAllNotesRaw() {
    const rows = await this._fetch('notes?order=updated_at.desc');
    return (rows || []).map(r => this._mapNote(r));
  },

  async getNotesBySubject(subjectId) {
    const rows = await this._fetch(
      `notes?subject_id=eq.${subjectId}&is_deleted=eq.false&order=updated_at.desc`
    );
    return (rows || []).map(r => this._mapNote(r));
  },

  async getDeletedNotes() {
    const rows = await this._fetch('notes?is_deleted=eq.true&order=deleted_at.desc');
    return (rows || []).map(r => this._mapNote(r));
  },

  async getBookmarkedNotes() {
    const rows = await this._fetch('notes?is_bookmarked=eq.true&is_deleted=eq.false&order=updated_at.desc');
    return (rows || []).map(r => this._mapNote(r));
  },

  async updateNote(id, data) {
    const body = {};
    if (data.title       !== undefined) body.title        = data.title;
    if (data.content     !== undefined) body.content      = data.content;
    if (data.plainText   !== undefined) body.plain_text   = data.plainText;
    if (data.tags        !== undefined) body.tags         = data.tags;
    if (data.isPinned    !== undefined) body.is_pinned    = data.isPinned;
    if (data.isBookmarked!== undefined) body.is_bookmarked= data.isBookmarked;
    if (data.isDeleted   !== undefined) body.is_deleted   = data.isDeleted;
    if (data.deletedAt   !== undefined) body.deleted_at   = this._toISO(data.deletedAt);
    if (data.subjectId   !== undefined) body.subject_id   = data.subjectId;

    // Auto extract plainText from content if not provided
    if (data.content !== undefined && data.plainText === undefined) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = data.content;
      body.plain_text = tempDiv.innerText || tempDiv.textContent || '';
    }

    const rows = await this._fetch(`notes?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });

    return this._mapNote(Array.isArray(rows) ? rows[0] : rows);
  },

  async deleteNote(id) {
    // Soft delete
    return this.updateNote(id, {
      isDeleted: true,
      deletedAt: Date.now()
    });
  },

  async restoreNote(id) {
    return this.updateNote(id, {
      isDeleted: false,
      deletedAt: null
    });
  },

  async permanentDeleteNote(id) {
    await this._fetch(`notes?id=eq.${id}`, {
      method: 'DELETE'
    });
  },

  async duplicateNote(id) {
    const note = await this.getNote(id);
    if (!note) return null;

    const rows = await this._fetch('notes', {
      method: 'POST',
      body: JSON.stringify({
        subject_id: note.subjectId || null,
        title: (note.title || 'Ghi chú không tiêu đề') + ' (Copy)',
        content: note.content || '',
        plain_text: note.plainText || '',
        tags: note.tags || [],
        is_pinned: false,
        is_bookmarked: false,
        is_deleted: false,
        deleted_at: null,
        user_id: this._userId()
      })
    });

    return this._mapNote(Array.isArray(rows) ? rows[0] : rows);
  },

  async searchNotes(query) {
    if (!query || !query.trim()) return [];

    const q = encodeURIComponent(`%${query.trim()}%`);
    // Tìm theo title hoặc plain_text (case-insensitive)
    const rows = await this._fetch(
      `notes?is_deleted=eq.false&or=(title.ilike.${q},plain_text.ilike.${q})&order=updated_at.desc`
    );
    return (rows || []).map(r => this._mapNote(r));
  },

  async getNotesCount(subjectId) {
    let path = '';
    if (subjectId) {
      path = `notes?subject_id=eq.${subjectId}&is_deleted=eq.false&select=id`;
    } else {
      path = `notes?is_deleted=eq.false&select=id`;
    }

    // Use HEAD request with Count header to get count efficiently
    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    const token = await AuthManager.getAccessToken();
    const res = await fetch(url, {
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'count=exact'
      }
    });

    const countHeader = res.headers.get('content-range');
    if (countHeader) {
      const match = countHeader.match(/\/(\d+)$/);
      if (match) return parseInt(match[1], 10);
    }

    // Fallback: fetch and count
    const rows = await this._fetch(path);
    return (rows || []).length;
  },

  // ============================================================
  // TAGS
  // ============================================================

  async addTag({ name, color }) {
    const rows = await this._fetch('tags', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation,resolution=ignore-duplicates' },
      body: JSON.stringify({
        name: name || '',
        color: color || '#6C5CE7',
        user_id: this._userId()
      })
    });

    return this._mapTag(Array.isArray(rows) ? rows[0] : rows);
  },

  async getAllTags() {
    const rows = await this._fetch('tags?order=name.asc');
    return (rows || []).map(r => this._mapTag(r));
  },

  async deleteTag(id) {
    await this._fetch(`tags?id=eq.${id}`, {
      method: 'DELETE'
    });
  },

  // ============================================================
  // SETTINGS
  // ============================================================

  async getSetting(key) {
    const rows = await this._fetch(`settings?key=eq.${encodeURIComponent(key)}&limit=1`);
    return rows?.[0]?.value ?? null;
  },

  async setSetting(key, value) {
    await this._fetch('settings', {
      method: 'POST',
      headers: {
        'Prefer': 'return=representation,resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key,
        value: String(value),
        user_id: this._userId()
      })
    });
  },

  // ============================================================
  // BULK OPERATIONS (for backup/restore)
  // ============================================================

  async bulkInsertSubjects(subjects) {
    if (!subjects || subjects.length === 0) return;
    const rows = subjects.map(s => ({
      id: s.id,
      name: s.name || '',
      icon: s.icon || '📚',
      color: s.color || '#6C5CE7',
      order: s.order ?? 0,
      user_id: this._userId(),
      created_at: this._toISO(s.createdAt) || new Date().toISOString(),
      updated_at: this._toISO(s.updatedAt) || new Date().toISOString()
    }));

    await this._fetch('subjects', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal,resolution=merge-duplicates' },
      body: JSON.stringify(rows)
    });
  },

  async bulkInsertNotes(notes) {
    if (!notes || notes.length === 0) return;
    const rows = notes.map(n => ({
      id: n.id,
      subject_id: n.subjectId || null,
      title: n.title || '',
      content: n.content || '',
      plain_text: n.plainText || '',
      tags: n.tags || [],
      is_pinned: n.isPinned || false,
      is_bookmarked: n.isBookmarked || false,
      is_deleted: n.isDeleted || false,
      deleted_at: this._toISO(n.deletedAt),
      user_id: this._userId(),
      created_at: this._toISO(n.createdAt) || new Date().toISOString(),
      updated_at: this._toISO(n.updatedAt) || new Date().toISOString()
    }));

    await this._fetch('notes', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal,resolution=merge-duplicates' },
      body: JSON.stringify(rows)
    });
  },

  async bulkInsertTags(tags) {
    if (!tags || tags.length === 0) return;
    const rows = tags.map(t => ({
      id: t.id,
      name: t.name || '',
      color: t.color || '#6C5CE7',
      user_id: this._userId(),
      created_at: this._toISO(t.createdAt) || new Date().toISOString()
    }));

    await this._fetch('tags', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal,resolution=merge-duplicates' },
      body: JSON.stringify(rows)
    });
  },

  async deleteAllUserData() {
    // Delete in order (foreign keys)
    await this._fetch('notes?user_id=eq.' + this._userId(), { method: 'DELETE' });
    await this._fetch('subjects?user_id=eq.' + this._userId(), { method: 'DELETE' });
    await this._fetch('tags?user_id=eq.' + this._userId(), { method: 'DELETE' });
    await this._fetch('settings?user_id=eq.' + this._userId(), { method: 'DELETE' });
  }
};
