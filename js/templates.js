window.TemplateManager = {
  templates: {
    cornell: {
      name: 'Cornell Notes',
      html: `
        <h2>📋 Cornell Notes</h2>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="width:35%;border:1px solid;padding:12px;text-align:left;background:var(--bg-tertiary);">📝 Cue / Câu hỏi</th>
              <th style="width:65%;border:1px solid;padding:12px;text-align:left;background:var(--bg-tertiary);">📖 Notes / Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid;padding:12px;vertical-align:top;">Từ khóa 1?</td>
              <td style="border:1px solid;padding:12px;vertical-align:top;">Ghi chú chi tiết ở đây...</td>
            </tr>
            <tr>
              <td style="border:1px solid;padding:12px;vertical-align:top;">Từ khóa 2?</td>
              <td style="border:1px solid;padding:12px;vertical-align:top;">Giải thích thêm...</td>
            </tr>
            <tr>
              <td style="border:1px solid;padding:12px;vertical-align:top;">Từ khóa 3?</td>
              <td style="border:1px solid;padding:12px;vertical-align:top;">Nội dung...</td>
            </tr>
          </tbody>
        </table>
        <br>
        <h3>📌 Tóm tắt</h3>
        <p>Viết tóm tắt ngắn gọn nội dung bài học ở đây (2-3 câu)...</p>
      `
    },
    outline: {
      name: 'Outline',
      html: `
        <h2>📑 Dàn ý bài học</h2>
        <h3>I. Mục tiêu bài học</h3>
        <ul>
          <li>Mục tiêu 1: ...</li>
          <li>Mục tiêu 2: ...</li>
        </ul>
        <h3>II. Nội dung chính</h3>
        <ul>
          <li><strong>Phần A:</strong> ...
            <ul>
              <li>Chi tiết 1</li>
              <li>Chi tiết 2</li>
            </ul>
          </li>
          <li><strong>Phần B:</strong> ...
            <ul>
              <li>Chi tiết 1</li>
              <li>Chi tiết 2</li>
            </ul>
          </li>
        </ul>
        <h3>III. Ví dụ & Bài tập</h3>
        <ul>
          <li>Ví dụ 1: ...</li>
          <li>Ví dụ 2: ...</li>
        </ul>
        <h3>IV. Kết luận</h3>
        <p>Tóm tắt những điểm chính...</p>
        <h3>V. Câu hỏi cần tìm hiểu thêm</h3>
        <ul>
          <li>❓ ...</li>
          <li>❓ ...</li>
        </ul>
      `
    },
    qa: {
      name: 'Hỏi & Đáp',
      html: `
        <h2>❓ Hỏi & Đáp</h2>
        <blockquote><strong>Câu 1:</strong> [Viết câu hỏi ở đây]</blockquote>
        <p><strong>Trả lời:</strong> [Viết câu trả lời ở đây]</p>
        <br>
        <blockquote><strong>Câu 2:</strong> [Viết câu hỏi ở đây]</blockquote>
        <p><strong>Trả lời:</strong> [Viết câu trả lời ở đây]</p>
        <br>
        <blockquote><strong>Câu 3:</strong> [Viết câu hỏi ở đây]</blockquote>
        <p><strong>Trả lời:</strong> [Viết câu trả lời ở đây]</p>
        <br>
        <hr>
        <h3>📝 Ghi chú thêm</h3>
        <p>...</p>
      `
    },
    blank: {
      name: 'Trang trắng',
      html: ''
    }
  },
  
  init() {
    // Setup template card click listeners
    document.querySelectorAll('.template-card[data-template]').forEach(card => {
      card.addEventListener('click', () => {
        const templateType = card.dataset.template;
        this.handleTemplateClick(templateType);
      });
    });
  },
  
  getTemplate(type) {
    return this.templates[type]?.html || '';
  },

  async handleTemplateClick(type) {
    if (!Editor.currentNoteId) {
      // Create a new note first, then apply template
      await NoteManager.createNote();
      // Small delay to ensure editor is ready
      setTimeout(() => this.applyTemplate(type), 100);
    } else {
      this.applyTemplate(type);
    }
  },
  
  applyTemplate(type) {
    const template = this.templates[type];
    if (!template && type !== 'blank') return;
    
    if (type === 'blank') {
      Editor.setContent('');
    } else {
      Editor.applyTemplate(template.html);
    }
    
    App.closeAllModals();
    App.showToast(`Đã áp dụng mẫu: ${template?.name || 'Trang trắng'}`, 'success');
  }
};
