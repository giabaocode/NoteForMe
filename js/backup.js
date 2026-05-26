// Backup and Restore Manager (Supabase version)
window.BackupManager = {
  async exportBackup() {
    try {
      App.showToast('Đang tạo bản sao lưu...', 'info');

      const subjects = await DB.getAllSubjects();
      const notes = await DB._getAllNotesRaw();
      const tags = await DB.getAllTags();

      // Get settings
      const themeVal = await DB.getSetting('theme');
      const settings = themeVal ? [{ key: 'theme', value: themeVal }] : [];

      const backupData = {
        version: 2,
        timestamp: Date.now(),
        data: {
          subjects,
          notes,
          tags,
          settings
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      const link = document.createElement('a');
      link.href = url;
      link.download = `lesson-note-backup-${dateString}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      App.showToast(`Đã tải bản sao lưu! (${notes.length} ghi chú, ${subjects.length} môn học) 💾`, 'success');
    } catch (err) {
      console.error('Backup export failed:', err);
      App.showToast('Lỗi khi tạo bản sao lưu: ' + err.message, 'error');
    }
  },

  async importBackup(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const backupObj = JSON.parse(text);

        this.validateBackupData(backupObj);

        App.showConfirm(
          `Hành động này sẽ thay thế hoàn toàn dữ liệu hiện tại của bạn (${backupObj.data.notes?.length || 0} ghi chú, ${backupObj.data.subjects?.length || 0} môn học). Bạn có muốn tiếp tục?`,
          async () => {
            try {
              App.showToast('Đang xóa dữ liệu cũ...', 'info');

              // 1. Delete all existing user data
              await DB.deleteAllUserData();

              App.showToast('Đang nhập dữ liệu mới...', 'info');

              const { subjects, notes, tags, settings } = backupObj.data;

              // 2. Import subjects first (notes reference subjects)
              if (subjects && subjects.length > 0) {
                await DB.bulkInsertSubjects(subjects);
              }

              // 3. Import notes
              if (notes && notes.length > 0) {
                await DB.bulkInsertNotes(notes);
              }

              // 4. Import tags
              if (tags && tags.length > 0) {
                await DB.bulkInsertTags(tags);
              }

              // 5. Import settings
              if (settings && settings.length > 0) {
                for (const s of settings) {
                  if (s.key && s.value !== undefined) {
                    await DB.setSetting(s.key, s.value);
                  }
                }
              }

              // 6. Close Backup modal
              App.closeAllModals();

              // 7. Refresh UI
              if (typeof ThemeManager !== 'undefined') {
                const savedTheme = await DB.getSetting('theme') || 'dark';
                ThemeManager.theme = savedTheme;
                ThemeManager.apply();
              }

              if (typeof SubjectManager !== 'undefined') {
                SubjectManager.subjects = await DB.getAllSubjects();
                SubjectManager.render();
              }

              if (typeof NoteManager !== 'undefined') {
                NoteManager.selectedId = null;
              }
              if (typeof Editor !== 'undefined') {
                Editor.clear();
              }

              App.state.currentView = 'all';
              App.state.currentSubjectId = null;
              await App.switchView('all');
              await App.updateCounts();

              App.showToast('Khôi phục dữ liệu thành công! 🎉', 'success');
            } catch (err) {
              console.error('Data restoration failed:', err);
              App.showToast('Lỗi khi khôi phục: ' + err.message, 'error');
            }
          }
        );
      } catch (err) {
        console.error('Import validation failed:', err);
        App.showToast(err.message || 'Lỗi đọc file hoặc file không đúng định dạng', 'error');
      }
    };
    reader.readAsText(file);
  },

  validateBackupData(obj) {
    if (!obj || typeof obj !== 'object') {
      throw new Error('Định dạng file không hợp lệ (không phải JSON object)');
    }
    if (!obj.data || typeof obj.data !== 'object') {
      throw new Error('Không tìm thấy dữ liệu sao lưu hợp lệ trong file');
    }

    const d = obj.data;
    if (d.subjects && !Array.isArray(d.subjects)) {
      throw new Error('Dữ liệu môn học bị lỗi hoặc không phải danh sách');
    }
    if (d.notes && !Array.isArray(d.notes)) {
      throw new Error('Dữ liệu ghi chú bị lỗi hoặc không phải danh sách');
    }
    if (d.tags && !Array.isArray(d.tags)) {
      throw new Error('Dữ liệu tag bị lỗi hoặc không phải danh sách');
    }
    if (d.settings && !Array.isArray(d.settings)) {
      throw new Error('Dữ liệu cài đặt bị lỗi hoặc không phải danh sách');
    }
  },

  async updateStats() {
    try {
      const subjects = await DB.getAllSubjects();
      const notes = await DB._getAllNotesRaw();
      const tags = await DB.getAllTags();

      const statSubjectsEl = document.getElementById('backup-stat-subjects');
      const statNotesEl = document.getElementById('backup-stat-notes');
      const statTagsEl = document.getElementById('backup-stat-tags');

      if (statSubjectsEl) statSubjectsEl.textContent = subjects.length;
      if (statNotesEl) statNotesEl.textContent = notes.length;
      if (statTagsEl) statTagsEl.textContent = tags.length;
    } catch (err) {
      console.error('Error updating backup stats:', err);
    }
  }
};
