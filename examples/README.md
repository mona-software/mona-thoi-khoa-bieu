# Dữ liệu mẫu

Đây là **số liệu mẫu**, không phải dữ liệu của một trường thật hay phân phối chương trình chính thức. Tên giáo viên chỉ dùng để minh họa.

## THCS: 12 lớp, 20 giáo viên

`thcs/input.json` gồm các lớp 6A1–9A3, 29 tiết/lớp/tuần (348 tiết), trong khung 30 ô từ thứ 2 đến thứ 7, mỗi sáng 5 tiết. Một ô còn trống mỗi lớp là chủ ý.

Nhóm môn mô phỏng cách tổ chức GDPT 2018: Toán, Ngữ văn, Tiếng Anh, Khoa học tự nhiên, Lịch sử và Địa lí, Tin học, Công nghệ, Giáo dục công dân, Giáo dục thể chất, Nghệ thuật, Hoạt động trải nghiệm và Giáo dục địa phương. Toán/Văn 4 tiết, Anh 3 tiết, KHTN 4 tiết, Lịch sử và Địa lí 3 tiết; các môn còn lại dùng phân bổ minh họa. Hoạt động trải nghiệm gồm 1 tiết hoạt động, 1 Chào cờ, 1 Sinh hoạt lớp. Phân bổ này được dùng giống nhau cho bốn khối để dễ thử engine; trường cần thay bằng kế hoạch giáo dục thực tế đã duyệt, nhất là các nội dung phân bổ theo năm/chủ đề.

Mỗi GV có một ô bận. Chào cờ cố định thứ 2 tiết 1 và Sinh hoạt lớp thứ 7 tiết 5. Mười hai GV chủ nhiệm khác nhau được gắn vào các tiết cố định để không trùng giáo viên.

Ba CSV `lop.csv`, `phan-cong.csv`, `ban.csv` dùng cùng phân công và lịch bận. Định dạng ba CSV cơ bản không chứa lịch tùy chỉnh hay tiết cố định: dùng JSON khi cần hai phần này. Mã môn trong JSON là mã ngắn; CSV dùng tên môn tiếng Việt để minh họa Unicode.

## Trung tâm ngoại ngữ

`trung-tam/input.json`: ba lớp, hai GV, 14 tiết trong ba ca tối mỗi ngày. Lớp Starters chỉ học thứ 2/4/6, ca 1–2; có một tiết cố định. Ca 17:30, 18:30, 19:30 là nhãn mẫu; engine tính xung đột bằng mã ca, không tính độ dài theo phút.

Tạo lại dữ liệu mẫu có tính xác định:

```sh
node scripts/generate-examples.mjs
```
