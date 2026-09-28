# Exam249 - Hệ Thống Thi Trực Tuyến & Chấm Điểm Tự Động Chống Gian Lận (Microservices)

Hệ thống thi trực tuyến và chấm điểm tự động hoàn chỉnh, đạt chuẩn **Production-Ready**, xây dựng trên kiến trúc **Microservices** tiên tiến với **ASP.NET Core Web API (.NET 8 LTS)**, Frontend **Angular 19 (Standalone Components, TailwindCSS, 100% Tiếng Việt)**, Cơ sở dữ liệu **Microsoft SQL Server**, cơ chế xác thực **JWT + Refresh Token**, giao tiếp liên dịch vụ qua **YARP Gateway / REST / MassTransit Event Bus**, và hệ thống **Chống Gian Lận (Anti-Cheat) Đa Tầng**.

---

## 1. Kiến Trúc Hệ Thống (Architecture)

Hệ thống được chia nhỏ thành các Microservices độc lập theo nguyên lý Domain-Driven Design và Clean Architecture:

```
Exam249/
├── docker-compose.yml                      # File chạy Docker Compose toàn bộ hệ thống
├── scripts/                               # Scripts hỗ trợ chạy local tiện lợi
│   ├── run-all-local.ps1
│   └── stop-all-local.ps1
├── src/
│   ├── BuildingBlocks/                     # Thư viện dùng chung giữa các service
│   │   ├── Exam249.Shared.Contracts/       # DTOs, Enums, Shared Events
│   │   ├── Exam249.Shared.Common/          # BaseEntity, JWT Service, Hash, Text Normalizer
│   │   └── Exam249.Shared.EventBus/        # MassTransit Event Bus (RabbitMQ / InMemory)
│   ├── Services/                           # Danh sách các Microservices độc lập
│   │   ├── ApiGateway/ (Port 5000)         # YARP Reverse Proxy, CORS, Rate Limit
│   │   ├── Identity/ (Port 5001)           # Xác thực, JWT, Refresh Token, Phân quyền Role
│   │   ├── Classroom/ (Port 5002)          # Quản lý lớp học, môn học, mã tham gia lớp
│   │   ├── QuestionBank/ (Port 5003)       # Ngân hàng câu hỏi (Trắc nghiệm đơn, nhiều đáp án, điền từ)
│   │   ├── Exam/ (Port 5004)               # Quản lý đề thi, phòng thi, Autosave, Chấm điểm tự động
│   │   ├── AntiCheat/ (Port 5005)          # Giám sát vi phạm, tính toán Risk Score, Audit Trail
│   │   └── Reporting/ (Port 5006)          # Thống kê Dashboard cho Admin, Giáo viên, Học sinh
│   └── Frontend/
│       └── exam249-web/ (Port 4200)        # Angular 19 SPA, TailwindCSS, 100% Tiếng Việt
```

---

## 2. Hệ Thống Chống Gian Lận Đa Tầng (Anti-Cheat Multi-Layer)

Hệ thống thiết kế cơ chế bảo vệ bài thi nhiều lớp chặt chẽ:

### A. Tầng Client (Trình Duyệt & Giao Diện Phòng Thi)

1. **Fullscreen Enforcer**: Bắt buộc chế độ toàn màn hình trước khi bắt đầu bài thi. Nếu người dùng thoát Fullscreen, màn hình câu hỏi bị che phủ bởi cảnh báo và yêu cầu quay lại toàn màn hình mới được tiếp tục.
2. **Tab Switch & Focus Detection**: Lắng nghe sự kiện `visibilitychange` và `window.blur`. Khi thí sinh đổi sang tab khác hoặc thu nhỏ trình duyệt, vi phạm lập tức được gửi về server.
3. **Chặn Phím Tắt & Thao Tác Nguy Hiểm**:
   - Vô hiệu hóa chuột phải (`contextmenu`).
   - Ngăn chặn bôi đen văn bản (`user-select: none`).
   - Chặn tổ hợp phím sao chép/dán (`Ctrl+C`, `Ctrl+V`, `Ctrl+X`, `Ctrl+A`).
   - Chặn phím mở Developer Tools (`F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+U`).
4. **Đồng Hồ Đếm Ngược Đồng Bộ**: Đếm ngược thời gian thực, cảnh báo màu sắc khi còn < 5 phút (Vàng) và < 1 phút (Đỏ). Tự động submit khi hết giờ.
5. **Autosave Tự Động**: Lưu định kỳ bài làm ngầm mỗi 15 giây và tức thì khi chọn đáp án, không làm ngắt quãng thao tác.
6. **Extension Point Proctoring**: Có sẵn hook webcam snapshot định kỳ chụp khung hình thí sinh gửi về backend phục vụ xác thực khuôn mặt.

		

### B. Tầng Server & Security Validation

1. **Tuyệt Đối Không Gửi Đáp Án Đúng Xuống Client**: Payload gửi cho học sinh trong phòng thi (`StudentExamViewDto`) đã bị strip hoàn toàn các trường `isCorrect`, `acceptedAnswers`, `explanation`. Thí sinh soi Network Tab / DevTools không thể thấy đáp án.
2. **Kiểm Tra Thời Gian Phía Server**: Thời gian bắt đầu và kết thúc (`DeadlineUtc`) được lưu ở database server. Thí sinh không thể can thiệp đồng hồ máy tính cá nhân để gian lận thêm giờ.
3. **Công Thức Tính Điểm Rủi Ro (Anti-Cheat Risk Score)**:
   - Điểm vi phạm được cộng dồn theo trọng số:
     - Thoát Fullscreen: **+20 điểm**
     - Đổi tab / Thu nhỏ trình duyệt: **+15 điểm**
     - Cố tình Copy / Paste: **+15 điểm**
     - Bấm phím tắt DevTools: **+25 điểm**
     - Đăng nhập đồng thời nhiều thiết bị: **+50 điểm**
     - Tốc độ trả lời bất thường (< 1 giây): **+20 điểm**
   - Phân loại cấp độ rủi ro:
     - **0 - 20 điểm: SAFE (An toàn - Xanh lá)**
     - **21 - 50 điểm: SUSPICIOUS (Nghi vấn - Vàng)**
     - **51 - 75 điểm: HIGH RISK (Rủi ro cao - Cam)**
     - **76 - 100 điểm: CRITICAL (Nghiêm trọng - Đỏ)**
   - Không tự động hủy bài ngay khi chỉ có 1 vi phạm vô ý, mà lưu vết kiểm toán (Audit Trail) để giáo viên thẩm tra và đối chất.

---

## 3. Tài Khoản Demo Hệ Thống (Out-of-the-box Credentials)

Hệ thống đã nạp sẵn dữ liệu mẫu (Seed Data) cho cả 3 vai trò. Bạn có thể đăng nhập bằng form hoặc bấm **nút Đăng Nhập Nhanh 1-Click** tại trang đăng nhập:

| Vai Trò                           | Email Đăng Nhập       | Mật Khẩu         | Quyền Hạn & Chức Năng                                                                                                                                                               |
| :--------------------------------- | :----------------------- | :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quản trị viên (Admin)** | `admin@exam249.com`    | `Admin@123456`   | Quản lý toàn bộ người dùng, kích hoạt/khóa tài khoản, quản lý danh mục môn học, xem báo cáo toàn trường.                                                          |
| **Giáo viên (Teacher)**    | `teacher@exam249.com`  | `Teacher@123456` | Quản lý lớp học, cấp mã mời lớp, ngân hàng câu hỏi (3 dạng), tạo đề thi, cấu hình xáo trộn, xem danh sách bài nộp và kiểm tra chỉ số gian lận (Risk Score). |
| **Học sinh 1 (Student)**    | `student1@exam249.com` | `Student@123456` | Tham gia lớp bằng mã, vào phòng thi (bật fullscreen, countdown, autosave, anti-cheat), nộp bài và xem điểm thi/đáp án chi tiết.                                          |
| **Học sinh 2 (Student)**    | `student2@exam249.com` | `Student@123456` | Tài khoản học sinh thứ 2 tham gia làm bài kiểm tra.                                                                                                                              |

---

## 4. Hướng Dẫn Chạy Hệ Thống

### Cách 1: Khởi chạy bằng Docker Compose (Khuyên dùng cho Production/DevOps)

Yêu cầu máy đã cài Docker và Docker Desktop.

```bash
# 1. Di chuyển vào thư mục gốc dự án
cd d:\cs-Projects\Exam249

# 2. Khởi chạy toàn bộ hệ thống bằng 1 lệnh duy nhất
docker compose up --build -d

# 3. Kiểm tra trạng thái các container
docker compose ps
```

Khi khởi chạy thành công:

- **Giao diện Web (Angular)**: [http://localhost:4200](http://localhost:4200)
- **API Gateway (YARP)**: [http://localhost:5000](http://localhost:5000)
- **RabbitMQ Management**: [http://localhost:15672](http://localhost:15672) (User: `guest`, Pass: `guest`)
- **SQL Server 2022**: `localhost,1433` (User: `sa`, Pass: `Test_MatKhau_2026!Aa`)

---

### Cách 2: Khởi chạy Trực Tiếp Local (.NET + Node.js)

Dành cho trường hợp máy đã cài sẵn .NET 8/10 SDK, Node.js và dịch vụ SQL Server cục bộ (hoặc LocalDB).

#### Bước 1: Khởi chạy tự động bằng PowerShell Script

Mở PowerShell tại thư mục gốc dự án:

```powershell
.\scripts\run-all-local.ps1
```

Script sẽ tự động khởi động lần lượt 6 Microservices, API Gateway và Frontend Angular trong các cửa sổ riêng biệt.

#### Bước 2: Dừng toàn bộ hệ thống khi không dùng

```powershell
.\scripts\stop-all-local.ps1
```

---

## 5. Danh Mục Swagger API Documentation

Khi các service hoạt động, bạn có thể truy cập tài liệu Swagger OpenAPI của từng dịch vụ:

- **Identity Service**: [http://localhost:5001/swagger](http://localhost:5001/swagger)
- **Classroom Service**: [http://localhost:5002/swagger](http://localhost:5002/swagger)
- **Question Bank Service**: [http://localhost:5003/swagger](http://localhost:5003/swagger)
- **Exam & Grading Service**: [http://localhost:5004/swagger](http://localhost:5004/swagger)
- **Anti-Cheat Service**: [http://localhost:5005/swagger](http://localhost:5005/swagger)
- **Reporting Service**: [http://localhost:5006/swagger](http://localhost:5006/swagger)

---

## 6. Các Tính Năng Đã Được Hiện Thực Hóa Đầy Đủ

1. **Phân quyền 3 Role (RBAC)**: Admin, Teacher, Student với JWT Token và Refresh Token rotation.
2. **Hỗ trợ 3 Loại Câu Hỏi**:
   - Trắc nghiệm 1 đáp án đúng (Single Choice).
   - Trắc nghiệm nhiều đáp án đúng (Multiple Choice) có tính điểm thành phần.
   - Câu hỏi điền từ (Fill-in-the-blank) với bộ xử lý chuẩn hóa tiếng Việt (`VietnameseTextNormalizer` loại bỏ khoảng trắng thừa, case-folding, kiểm tra đa đáp án chấp nhận).
3. **Quản lý Lớp học & Ngân hàng đề thi**:
   - Tham gia lớp bằng mã code ngắn gọn.
   - Tạo đề thi chọn câu hỏi từ ngân hàng, hỗ trợ random thứ tự câu hỏi và random thứ tự đáp án theo từng thí sinh.
4. **Phòng Thi Trực Tuyến Chuyên Nghiệp**:
   - Đồng hồ đếm ngược đồng bộ.
   - Bảng Palette điều hướng câu hỏi trực quan.
   - Đánh dấu câu hỏi cần xem lại (Flag).
   - Tự động lưu bài làm (Autosave).
   - Tự động nộp bài khi hết giờ.
5. **Chống Gian Lận (Anti-Cheat) Đa Tầng**:
   - Bắt buộc toàn màn hình, chặn thoát fullscreen.
   - Phát hiện chuyển tab/ứng dụng khác.
   - Khóa copy/paste, chuột phải, phím tắt F12/DevTools.
   - Thuật toán tính điểm rủi ro Risk Score và lưu nhật ký vi phạm cho giáo viên kiểm tra.
6. **Chấm Điểm Tự Động Tức Thì**:
   - Xuất kết quả kèm bảng điểm, tỷ lệ %, xếp loại Đạt/Chưa đạt.
   - Xem lại bài làm chi tiết đối chiếu đáp án đúng và lời giải (nếu giáo viên cấp quyền).
