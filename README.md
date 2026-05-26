# 📝 Lesson Note

> Ứng dụng ghi chú bài học hiện đại, đẹp mắt với rich text editor, quản lý môn học, tags, sao lưu — chạy hoàn toàn trên browser, dữ liệu lưu trên Supabase.

🌐 **Live demo:** `https://YOUR_USERNAME.github.io/lesson-note/` (sau khi bạn deploy)

---

## ✨ Tính năng

- 🔐 **Đăng ký / đăng nhập** bằng email + mật khẩu (Supabase Auth)
- 📚 **Quản lý môn học** với icon & màu sắc tùy chỉnh
- ✍️ **Rich text editor** — heading, bold, italic, list, checklist, link, ảnh, code, highlight
- 🏷️ **Tags** linh hoạt cho từng note
- 🔍 **Tìm kiếm** nhanh + sort theo nhiều tiêu chí
- ⭐ **Đánh dấu bookmark**, 📌 ghim note quan trọng
- 🗑️ **Thùng rác** (soft-delete + khôi phục)
- 📋 **Templates**: Cornell, Outline, Q&A, trang trắng
- 📤 **Xuất** PDF / Markdown / HTML
- 💾 **Sao lưu & khôi phục** dưới dạng JSON
- ⌨️ **Phím tắt** (Ctrl+N, Ctrl+F, Ctrl+S, …)
- 🌗 **Dark / Light theme** với glassmorphism + gradient
- 🎯 **Focus mode** ẩn sidebar khi viết tập trung
- 📱 **Responsive** trên mobile & tablet

---

## 🛠️ Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend | Vanilla HTML5 + CSS3 + JavaScript (không framework) |
| Backend | [Supabase](https://supabase.com) (PostgreSQL + Auth + REST API) |
| API | Supabase REST (PostgREST) — không dùng SDK, fetch trực tiếp |
| Deploy | GitHub Pages + GitHub Actions |

---

## 🚀 Hướng dẫn cài đặt từ A → Z

### Bước 1 — Tạo Supabase project

1. Truy cập **https://supabase.com** và đăng ký tài khoản (miễn phí)
2. Nhấn **New project**
3. Điền thông tin:
   - **Name**: `lesson-note` (hoặc tên bạn muốn)
   - **Database Password**: tạo password mạnh và **LƯU LẠI**
   - **Region**: chọn `Southeast Asia (Singapore)` cho nhanh nhất ở VN
4. Đợi ~2 phút để project khởi tạo

### Bước 2 — Chạy schema SQL

1. Trong Supabase Dashboard, vào **SQL Editor** (icon thanh bên trái)
2. Nhấn **New query**
3. Mở file [`supabase/schema.sql`](./supabase/schema.sql) trong project, copy toàn bộ nội dung
4. Paste vào SQL Editor và nhấn **Run** (Ctrl+Enter)
5. Kiểm tra: vào **Table Editor**, bạn sẽ thấy 4 bảng: `subjects`, `notes`, `tags`, `settings`

### Bước 3 — Lấy URL và API Key

1. Vào **Project Settings** (icon bánh răng) → **API**
2. Copy 2 giá trị:
   - **Project URL** (dạng `https://xxxxx.supabase.co`)
   - **anon public** key (dài, bắt đầu bằng `eyJ...`)

### Bước 4 — Cấu hình email auth

1. Vào **Authentication** → **Providers** → **Email**
2. Bật **Enable Email provider**
3. (Tùy chọn) Tắt **Confirm email** nếu muốn đăng ký không cần xác nhận email (tiện cho dev)

### Bước 5 — Điền config vào project

Mở file [`js/config.js`](./js/config.js) và thay 2 dòng:

```javascript
window.SUPABASE_URL = 'https://xxxxx.supabase.co';        // ← URL của bạn
window.SUPABASE_ANON_KEY = 'eyJhbGciOi...';              // ← anon key của bạn
```

> ⚠️ **Lưu ý:** `anon key` là PUBLIC key, an toàn để commit lên GitHub vì dữ liệu được bảo vệ bằng Row Level Security (RLS).

### Bước 6 — Chạy thử local

Chỉ cần mở [`index.html`](./index.html) bằng browser, **hoặc** dùng một local server:

```bash
# Python (đã có sẵn trên Windows/Mac)
python -m http.server 8000

# Hoặc Node.js (nếu có)
npx serve .
```

Mở `http://localhost:8000` → đăng ký account → bắt đầu ghi chú!

---

## 🌐 Deploy lên GitHub Pages

### Bước 1 — Đẩy code lên GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/lesson-note.git
git push -u origin main
```

### Bước 2 — Bật GitHub Pages

1. Vào repo trên GitHub → **Settings** → **Pages**
2. Tại **Source**, chọn: **GitHub Actions**
3. Workflow [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) sẽ tự động chạy mỗi khi bạn push vào `main`
4. Sau ~1 phút, site sẽ live tại: `https://YOUR_USERNAME.github.io/lesson-note/`

### Bước 3 — Cập nhật redirect URL trong Supabase (quan trọng!)

1. Vào Supabase Dashboard → **Authentication** → **URL Configuration**
2. Thêm vào **Site URL**: `https://YOUR_USERNAME.github.io/lesson-note`
3. Thêm vào **Redirect URLs**: `https://YOUR_USERNAME.github.io/lesson-note/**`
4. **Save**

Bây giờ link reset password và verify email sẽ trỏ đúng về site của bạn.

---

## 📂 Cấu trúc project

```
lesson-note/
├── index.html              # Entry point
├── css/
│   ├── variables.css       # Design tokens (màu, font, spacing)
│   ├── base.css            # Reset + typography
│   ├── animations.css      # Keyframes & utility classes
│   ├── layout.css          # Sidebar / note list / editor
│   ├── components.css      # Buttons, modals, cards, toast
│   └── editor.css          # Rich text editor styles
├── js/
│   ├── config.js           # Supabase URL + anon key (BẠN ĐIỀN VÀO)
│   ├── auth.js             # Đăng nhập / đăng ký / reset password
│   ├── db.js               # CRUD qua Supabase REST API
│   ├── app.js              # App initialization & routing
│   ├── theme.js            # Dark/light theme toggle
│   ├── subjects.js         # Quản lý môn học
│   ├── notes.js            # Quản lý ghi chú
│   ├── editor.js           # Rich text editor logic
│   ├── search.js           # Tìm kiếm
│   ├── shortcuts.js        # Phím tắt
│   ├── export.js           # Xuất PDF / Markdown
│   ├── templates.js        # Cornell, Outline, Q&A templates
│   └── backup.js           # Sao lưu / khôi phục JSON
├── supabase/
│   └── schema.sql          # SQL chạy lần đầu để tạo tables + RLS
├── .github/workflows/
│   └── deploy.yml          # Auto-deploy lên GitHub Pages
└── README.md
```

---

## 🔒 Bảo mật

- **Row Level Security (RLS)** được bật trên tất cả bảng → mỗi user chỉ thấy được dữ liệu của mình
- **Password** được Supabase hash (bcrypt) trước khi lưu — server không lưu plaintext
- **JWT token** lưu trong `localStorage`, auto-refresh khi gần hết hạn
- **anon key** chỉ có quyền theo policy — không thể bypass RLS

---

## 🐛 Troubleshooting

**Đăng nhập báo "Email not confirmed"?**
→ Vào Supabase → Authentication → Users, mở user và bật `Email Confirmed`. Hoặc tắt yêu cầu xác nhận email ở Bước 4.

**Site live nhưng không load được data?**
→ Mở DevTools (F12) → Console. Nếu thấy lỗi CORS, kiểm tra `SUPABASE_URL` trong [`js/config.js`](./js/config.js) đúng chưa.

**GitHub Action chạy nhưng site 404?**
→ Đợi 1-2 phút sau khi action chạy xong. Kiểm tra Settings → Pages → Source phải là **GitHub Actions** (không phải Branch).

**Mất dữ liệu khi reload trang?**
→ Kiểm tra session: DevTools → Application → LocalStorage → key `lesson_note_session`. Nếu rỗng, đăng nhập lại.

---

## 📜 License

MIT — tự do dùng cho mục đích cá nhân và thương mại.

---

Made with ❤️ — Học vui hơn với note đẹp 📚
