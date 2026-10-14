# 🚀 GitSubmit Pro - Hướng Dẫn Nộp Bài (Mỗi File Là 1 Link Riêng Biệt)

Ứng dụng **GitSubmit Pro** được tối ưu hóa đặc biệt cho nhu cầu: **"Mỗi 1 file bài tập (Bai1, Bai2, BTTH...) là 1 repository và 1 link nộp riêng biệt"**!

---

## 📸 Kết quả xuất ra y hệt yêu cầu của bạn:
```text
https://github.com/Qtrung474/Bai1_Session2_IT206.git
https://github.com/Qtrung474/Bai2_Session2_IT206.git
https://github.com/Qtrung474/BTTH_Session2_IT206.git
```

---

## ⚡ Cách Nộp Hàng Loạt Cực Nhanh (Chỉ 1 Cú Click)

### Bước 1: Mở ứng dụng
- Truy cập vào **[http://localhost:3000](http://localhost:3000)** trên trình duyệt (hoặc mở trực tiếp file `index.html`).

### Bước 2: Nhập thông tin môn học & Session
- **Mã Môn:** `IT206`
- **Session:** `Session2`

### Bước 3: Chọn các file bài tập cùng một lúc
- Bấm nút **"Chọn Các File Bài Tập"** hoặc **kéo thả** tất cả các file (ví dụ: `Bai1.cpp`, `Bai2.cpp`, `BTTH.cpp`...) vào ô kéo thả.
- Hệ thống sẽ tự động phát hiện và lên danh sách các repository sẽ tạo:
  - File `Bai1.cpp` ➔ Repo: `Bai1_Session2_IT206`
  - File `Bai2.cpp` ➔ Repo: `Bai2_Session2_IT206`
  - File `BTTH.cpp` ➔ Repo: `BTTH_Session2_IT206`
  *(Bạn có thể chỉnh sửa lại tên trên bảng nếu muốn)*.

### Bước 4: Bấm nút "🚀 Tự Động Tạo Hàng Loạt Tất Cả Repo & Lấy Link"
- Mặc định hệ thống đã **TẮT hoàn toàn file README.md và .gitignore**, đảm bảo Repo trên GitHub **chỉ chứa DUY NHẤT file bài tập của bạn** (như `bai2.docx`, `bai1.cpp`) với 1 Commit duy nhất sạch sẽ!
- Hệ thống tự động tạo repo và đẩy file lên GitHub trực tiếp.

### Bước 5: Lấy kết quả
- Bấm nút **"Copy Tất Cả Link (.git)"** để sao chép toàn bộ danh sách link:
  ```text
  https://github.com/Qtrung474/Bai1_Session2_IT206.git
  https://github.com/Qtrung474/Bai2_Session2_IT206.git
  https://github.com/Qtrung474/BTTH_Session2_IT206.git
  ```
- Hoặc bấm **"Sao chép tin nhắn nộp bài"** để có ngay đoạn văn mẫu gửi Thầy/Cô.

---

## 💻 Cách Thủ Công (Bằng lệnh Git Terminal)
Nếu bạn có 3 thư mục `Bai1`, `Bai2`, `BTTH` trên máy và muốn dùng Terminal:

**Cho Bài 1:**
```bash
cd Bai1
git init && git add . && git commit -m "Submit Bai1" && git branch -M main
git remote add origin https://github.com/Qtrung474/Bai1_Session2_IT206.git
git push -u origin main
```

**Cho Bài 2:**
```bash
cd ../Bai2
git init && git add . && git commit -m "Submit Bai2" && git branch -M main
git remote add origin https://github.com/Qtrung474/Bai2_Session2_IT206.git
git push -u origin main
```

**Cho BTTH:**
```bash
cd ../BTTH
git init && git add . && git commit -m "Submit BTTH" && git branch -M main
git remote add origin https://github.com/Qtrung474/BTTH_Session2_IT206.git
git push -u origin main
```
*(Dùng ứng dụng Web GitSubmit Pro ở trên sẽ tự động làm toàn bộ các bước này trong 5 giây mà bạn không cần phải tạo repo thủ công trên GitHub hay gõ từng lệnh).*
