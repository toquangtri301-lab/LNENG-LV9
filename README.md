# English Reflex Web A1-C2

Web luyện phản xạ tiếng Anh CEFR A1-C2, chạy tĩnh trên GitHub Pages.

## Quy mô data
- Từ vựng: 3300 mục
- Giao tiếp: 4700 câu

### Theo cấp
- A1: 300 từ, 400 câu
- A2: 400 từ, 500 câu
- B1: 500 từ, 700 câu
- B2: 600 từ, 900 câu
- C1: 700 từ, 1000 câu
- C2: 800 từ, 1200 câu

## Ghi chú
- Đây là bộ **CEFR-aligned practice set** để luyện phản xạ, không phải danh mục từ chính thức của một kỳ thi chuẩn hóa.
- Web giữ luồng: hiện nghĩa Việt -> đếm ngược 5 giây -> hiện tiếng Anh -> đọc 2 lần (1.0 rồi 0.8) -> tự chuyển câu nếu bật.
- Có tab riêng cho thiết lập giọng đọc.
- Nếu chưa cấu hình ElevenLabs, web sẽ dùng giọng đọc tiếng Anh của trình duyệt.
- Có cache audio phía trình duyệt cho ElevenLabs: cùng câu + cùng giọng + cùng model sẽ phát lại từ máy, giúp giảm số lần gọi API.

## Chạy trên GitHub Pages
1. Giải nén zip.
2. Tạo repo mới trên GitHub.
3. Upload toàn bộ file ở thư mục gốc.
4. Bật GitHub Pages từ branch `main`, thư mục `/root`.

## ElevenLabs
- Frontend tĩnh không nên chứa API key.
- Dùng thư mục `worker/` làm proxy serverless.

- Có thêm menu học theo chủ đề để lọc nội dung theo nhóm tình huống.
- Nghĩa tiếng Việt ở phần giao tiếp được làm lại theo hướng tự nhiên và phù hợp phản xạ.
