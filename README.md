# Exam249 - Hệ Thống Thi Trực Tuyến & Chấm Điểm Tự Động Chống Gian Lận (Microservices)

Hệ thống thi trực tuyến, giám sát thời gian thực và chấm điểm tự động hoàn chỉnh, xây dựng trên kiến trúc **Microservices** với **ASP.NET Core Web API (.NET 8 LTS)**, **SignalR WebSockets**, Frontend **Angular 19 (Standalone Components, TailwindCSS, 100% Tiếng Việt)**, Cơ sở dữ liệu **Microsoft SQL Server**, xác thực **JWT + Refresh Token**, giao tiếp liên dịch vụ qua **YARP Gateway / REST (Internal Secret) / MassTransit Event Bus**, và hệ thống **Chống Gian Lận (Anti-Cheat) Đa Tầng**.

---

## 1. Kiến Trúc Hệ Thống (Architecture)

Hệ thống được chia nhỏ thành các Microservices độc lập theo nguyên lý Domain-Driven Design và Clean Architecture:

```
Exam249/
├── docker-compose.yml                      # File chạy Docker Compose toàn bộ hệ thống
├── Exam249.slnx                            # Solution .NET 8 (Services + BuildingBlocks + Tests)
├── scripts/                                # Scripts hỗ trợ chạy local tiện lợi
│   ├── run-all-local.ps1
│   └── stop-all-local.ps1
├── src/
│   ├── BuildingBlocks/                     # Thư viện dùng chung giữa các service
│   │   ├── Exam249.Shared.Contracts/       # DTOs, Enums, Shared Events
│   │   ├── Exam249.Shared.Common/          # BaseEntity, JWT + SignalR Auth, InternalSecurity, Text Normalizer
│   │   └── Exam249.Shared.EventBus/        # MassTransit Event Bus (RabbitMQ / InMemory)
│   ├── Services/                           # Danh sách các Microservices độc lập
│   │   ├── ApiGateway/ (Port 5000)         # YARP Reverse Proxy (REST + SignalR /hubs), CORS, chặn route nội bộ
│   │   ├── Identity/ (Port 5001)           # Xác thực, Đăng ký, JWT, Refresh Token, Phân quyền Role
│   │   ├── Classroom/ (Port 5002)          # Quản lý lớp học, môn học, mã tham gia lớp, kiểm tra ghi danh
│   │   ├── QuestionBank/ (Port 5003)       # Ngân hàng câu hỏi (Trắc nghiệm đơn, nhiều đáp án, điền từ)
│   │   ├── Exam/ (Port 5004)               # Quản lý đề thi, phòng thi, Autosave, Chấm điểm, Đình chỉ phiên thi
│   │   ├── AntiCheat/ (Port 5005)          # Giám sát vi phạm, SignalR ProctoringHub, Webcam Snapshots, Risk Score
│   │   └── Reporting/ (Port 5006)          # Tổng hợp Dashboard dữ liệu thực cho Admin, Giáo viên, Học sinh & Phổ điểm
│   └── Frontend/
│       └── exam249-web/ (Port 4200)        # Angular 19 SPA, TailwindCSS, SignalR Client, 100% Tiếng Việt
└── tests/
    └── Exam249.UnitTests/                  # Bộ kiểm thử tự động xUnit (45 unit tests)
```

---

## 2. Hệ Thống Chống Gian Lận Đa Tầng & Giám Sát Thời Gian Thực

Hệ thống kết hợp phòng vệ phía trình duyệt, xác thực phía server và giám sát trực tiếp qua SignalR:

### A. Tầng Client (Phòng Thi Trực Tuyến & Webcam Proctoring)

1. **Fullscreen Enforcer**: Bắt buộc chế độ toàn màn hình trước khi bắt đầu bài thi. Nếu thí sinh thoát Fullscreen, màn hình câu hỏi bị che phủ bởi lớp cảnh báo và yêu cầu quay lại toàn màn hình mới được tiếp tục.
2. **Tab Switch & Focus Detection**: Lắng nghe sự kiện `visibilitychange` và `window.blur`. Khi thí sinh chuyển sang tab khác hoặc thu nhỏ trình duyệt, vi phạm được ghi nhận và đẩy cảnh báo trực tiếp tới giám thị.
3. **Webcam Proctoring UI**:
   - Kiểm tra thiết bị camera và hiển thị preview trong màn hình quy chế (hỗ trợ cấu hình **Bắt buộc bật Webcam** `RequireWebcam` theo từng đề thi).
   - Hiển thị khung camera giám sát (`REC`) trong phòng thi, tự động chụp ảnh định kỳ mỗi 30 giây và chụp tức thì khi phát hiện `TabSwitch` / `FullscreenExit`.
   - Ảnh được lưu dưới dạng file tĩnh trên server (`Storage/Snapshots/{sessionId}`) và bảo vệ truy cập qua JWT cho vai trò `Teacher`/`Admin`.
4. **Chặn Phím Tắt & Thao Tác Nguy Hiểm**:
   - Vô hiệu hóa chuột phải (`contextmenu`), ngăn chặn bôi đen văn bản (`user-select: none`).
   - Chặn tổ hợp phím sao chép/dán (`Ctrl+C`, `Ctrl+V`, `Ctrl+X`, `Ctrl+A`, `Ctrl+P`).
   - Chặn phím mở Developer Tools (`F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, `Ctrl+U`).
5. **Đồng Hồ Đếm Ngược & Autosave Tự Động**: Đếm ngược thời gian thực (cảnh báo < 5 phút và < 1 phút), tự động lưu bài làm mỗi 15 giây, đồng bộ tiến độ câu hỏi qua SignalR và tự động nộp bài khi hết giờ.

### B. Tầng Server, Security Validation & SignalR Live Proctoring

1. **Bảo Mật Đề Thi & Endpoint Nội Bộ**:
   - `StudentExamViewDto` loại bỏ hoàn toàn `isCorrect`, `acceptedAnswers`, `explanation`.
   - API Gateway chặn mọi truy cập từ bên ngoài tới `/api/questions/batch-get` và tất cả route `/internal/` (trả về `403 Forbidden`), đồng thời tước bỏ header giả mạo `X-Internal-Secret`.
   - Kiểm tra ghi danh lớp học (`ClassroomClient`) trước khi cho phép thí sinh xem danh sách đề hoặc bắt đầu phiên thi.
2. **Giám Sát Trực Tiếp (SignalR `ProctoringHub` - `/hubs/anticheat`)**:
   - Giáo viên theo dõi trực tiếp danh sách thí sinh đang thi (`Online/Offline`), mã đề, tiến độ trả lời, điểm rủi ro theo thời gian thực, luồng cảnh báo vi phạm và ảnh webcam mới nhất.
   - Hỗ trợ **Đình chỉ phiên thi (`DisqualifySession`)**: Giáo viên có thể cưỡng bức dừng bài thi của thí sinh vi phạm nghiêm trọng, khóa ngay phòng thi qua SignalR (`ForceDisqualified`) và chặn mọi thao tác lưu/nộp bài sau đó.
3. **Phát Hiện Đa Thiết Bị (`MultipleSessions`)**: Kiểm tra `ClientInstanceId`, IP và User-Agent khi mở lại phiên `InProgress` để phát hiện thí sinh mở đề trên tab hoặc thiết bị thứ hai (+50 điểm rủi ro).
4. **Kiểm Tra Thời Gian & Đồng Bộ Risk Score**:
   - `DeadlineUtc` được kiểm soát ở database server (cộng 30 giây grace period cho độ trễ mạng).
   - Khi thí sinh nộp bài và khi giáo viên xem danh sách bài nộp, `ExamService` đồng bộ trực tiếp `TotalRiskScore`, `RiskLevel` và `ViolationsCount` từ `AntiCheatService`.
5. **Công Thức Tính Điểm Rủi Ro (Anti-Cheat Risk Score)**:
   - Trọng số vi phạm:
     - Thoát Fullscreen: **+20 điểm**
     - Đổi tab / Thu nhỏ trình duyệt: **+15 điểm**
     - Mất tiêu điểm cửa sổ (`BlurLoss`): **+10 điểm**
     - Cố tình Copy / Paste: **+15 điểm**
     - Bấm phím tắt DevTools: **+25 điểm**
     - Đăng nhập đồng thời nhiều thiết bị / trình duyệt (`MultipleSessions`): **+50 điểm**
     - Tốc độ trả lời bất thường (`RapidAnswer`): **+20 điểm**
   - Phân loại cấp độ rủi ro (tối đa 100 điểm):
     - **0 - 20 điểm: SAFE (An toàn - Xanh lá)**
     - **21 - 50 điểm: SUSPICIOUS (Nghi vấn - Vàng)**
     - **51 - 75 điểm: HIGH RISK (Rủi ro cao - Cam)**
     - **76 - 100 điểm: CRITICAL (Nghiêm trọng - Đỏ)**

---

## 3. Tài Khoản Demo Hệ Thống (Out-of-the-box Credentials)

Hệ thống đã nạp sẵn dữ liệu mẫu (Seed Data) cho cả 3 vai trò. Bạn có thể đăng nhập bằng form, đăng ký mới tài khoản Học sinh hoặc bấm **nút Đăng Nhập Nhanh 1-Click** tại trang đăng nhập:

| Vai Trò                           | Email Đăng Nhập       | Mật Khẩu         | Quyền Hạn & Chức Năng                                                                                                                                                                     |
| :--------------------------------- | :----------------------- | :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quản trị viên (Admin)** | `admin@exam249.com`    | `Admin@123456`   | Quản lý toàn bộ người dùng, kích hoạt/khóa tài khoản, quản lý danh mục môn học, xem báo cáo và nhật ký toàn hệ thống.                                                                |
| **Giáo viên (Teacher)**    | `teacher@exam249.com`  | `Teacher@123456` | Quản lý lớp học, cấp mã mời lớp, soạn/sửa ngân hàng câu hỏi (3 dạng), tạo/sửa đề thi, giám sát phòng thi trực tiếp (SignalR + Webcam), đình chỉ phiên thi và xem phổ điểm. |
| **Học sinh 1 (Student)**    | `student1@exam249.com` | `Student@123456` | Tham gia lớp bằng mã, vào phòng thi (fullscreen, webcam, countdown, autosave, anti-cheat), nộp bài và xem điểm/đáp án chi tiết.                                                       |
| **Học sinh 2 (Student)**    | `student2@exam249.com` | `Student@123456` | Tài khoản học sinh thứ 2 tham gia làm bài kiểm tra.                                                                                                                                       |

---

## 4. Hướng Dẫn Chạy Hệ Thống & Kiểm Thử

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

Yêu cầu: **.NET 8 SDK**, **Node.js >= 18.19** (Angular 19; script local tự động chuyển `nvm use 24.21.0` nếu có cài `nvm`), và **SQL Server** cục bộ.

#### Bước 1: Khởi chạy tự động bằng PowerShell Script

Mở PowerShell tại thư mục gốc dự án:

```powershell
.\scripts\run-all-local.ps1
```

Script sẽ khởi động lần lượt 6 Microservices, API Gateway và Frontend Angular trong các cửa sổ riêng biệt.

#### Bước 2: Dừng toàn bộ hệ thống khi không dùng

```powershell
.\scripts\stop-all-local.ps1
```

### Chạy Build & Kiểm Thử Tự Động

```powershell
# Build toàn bộ Solution .NET 8
dotnet build Exam249.slnx

# Chạy bộ Unit Tests (xUnit)
dotnet test Exam249.slnx

# Build Frontend Angular (với Node >= 18.19)
cd src/Frontend/exam249-web
npm run build
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

1. **Xác thực & Phân quyền 3 Role (RBAC)**: Đăng nhập, Đăng ký tài khoản Học sinh, JWT Token (hỗ trợ cả WebSocket SignalR), Refresh Token rotation.
2. **Hỗ trợ 3 Loại Câu Hỏi & CRUD Đầy Đủ**:
   - Trắc nghiệm 1 đáp án đúng (`SingleChoice`).
   - Trắc nghiệm nhiều đáp án đúng (`MultipleChoice`) tính điểm thành phần.
   - Câu hỏi điền từ (`FillInTheBlank`) với `VietnameseTextNormalizer` (chuẩn hóa khoảng trắng, dấu câu, bỏ dấu tiếng Việt, đối chiếu đa đáp án).
   - Tạo, sửa, xóa, lọc câu hỏi theo môn học, loại câu hỏi, độ khó và từ khóa.
3. **Quản lý Lớp học & Đề thi**:
   - Tạo lớp, cấp mã tham gia lớp, quản lý danh sách học sinh.
   - Tạo & chỉnh sửa đề thi: cấu hình khung giờ mở/đóng, điểm từng câu, xáo trộn câu hỏi/đáp án theo từng thí sinh, tùy chọn bắt buộc Webcam (`RequireWebcam`).
4. **Phòng Thi Trực Tuyến & Webcam Proctoring**:
   - Kiểm tra camera trước khi vào thi, preview camera trực tiếp và chụp ảnh giám sát định kỳ + khi vi phạm.
   - Đồng hồ đếm ngược, bảng Palette điều hướng, đánh dấu xem lại (Flag), Autosave mỗi 15 giây, tự nộp khi hết giờ.
5. **Giám Sát Thời Gian Thực (SignalR Live Proctoring)**:
   - Màn hình giám thị trực tiếp (`/teacher/exams/:examId/proctoring`) hiển thị trạng thái Online/Offline, tiến độ làm bài, điểm rủi ro, ảnh webcam mới nhất và cảnh báo vi phạm tức thì.
   - Nút **Đình chỉ thi** khóa ngay phòng thi của thí sinh qua SignalR; thư viện ảnh webcam & nhật ký vi phạm chi tiết cho từng bài nộp.
6. **Chấm Điểm Tự Động, Xem Lại Bài Làm & Báo Cáo Thực**:
   - Xuất bảng điểm, tỷ lệ %, xếp loại Đạt/Chưa đạt và đối chiếu từng lựa chọn A/B/C/D đúng/sai.
   - Dashboard tổng hợp dữ liệu thực cho Admin, Giáo viên, Học sinh và biểu đồ phân phối phổ điểm kỳ thi (`ExamAnalyticsDto`).
