# HỌC VĂN CÙNG AI – AI thật

## Chạy trên máy
1. Cài Node.js 18+.
2. Mở thư mục dự án trong Terminal.
3. Chạy: `npm install`
4. Đổi tên `.env.example` thành `.env`.
5. Mở `.env` và thay `THAY_API_KEY_CUA_BAN_O_DAY` bằng API key OpenAI của bạn.
6. Chạy: `npm start`
7. Mở trình duyệt tại `http://localhost:3000`.

## Quan trọng
- Không đưa API key vào `public/index.html`.
- API key chỉ nằm ở `.env` trên máy chủ.
- Điểm AI là phản hồi luyện tập; giáo viên vẫn là người đánh giá chính thức khi cần.
- Quy trình website cố ý không đưa đáp án hoàn chỉnh ở vòng gợi ý.
