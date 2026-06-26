# SunTalent — Requirement v2

> Bản v2 kế thừa [requirement.md](requirement.md), gộp các chức năng trùng lặp về một
> **Matching Engine** lõi, bổ sung phần nhập liệu / pháp lý / phi chức năng còn thiếu,
> và phân tách rõ phạm vi **MVP** với **các giai đoạn sau**.

---

## 1. Tổng Quan

### Mục tiêu
Xây dựng nền tảng giúp công ty tuyển dụng và headhunt **quản lý, khai thác và tái sử dụng**
nguồn ứng viên hiện có một cách hiệu quả thông qua phân tích dữ liệu và AI.

Khác biệt cốt lõi so với ATS truyền thống: thay vì chỉ *lưu trữ* CV, hệ thống chủ động
*tìm và xếp hạng* ứng viên phù hợp nhất cho từng vị trí dựa trên toàn bộ dữ liệu đã tích lũy.

### Giá trị mang lại
- Giảm thời gian tìm kiếm ứng viên (mục tiêu ≥ 50%).
- Tăng tỷ lệ tái sử dụng dữ liệu ứng viên cũ.
- Giảm phụ thuộc vào nguồn ứng viên bên ngoài.
- Tăng tỷ lệ tuyển dụng thành công và năng suất recruiter.

---

## 2. Đối Tượng Sử Dụng & Phân Quyền (RBAC)

| Vai trò | Quyền chính | Phạm vi dữ liệu |
|---|---|---|
| **Recruiter** | Tìm kiếm, quản lý ứng viên, theo dõi pipeline | *Cần làm rõ:* chỉ thấy ứng viên mình phụ trách hay toàn bộ DB? |
| **Team Leader / Manager** | Theo dõi hiệu suất, quản lý dữ liệu tuyển dụng, đánh giá khai thác nguồn | Toàn bộ dữ liệu của team |
| **Administrator** | Quản lý hệ thống, phân quyền, cấu hình | Toàn hệ thống |

> ⚠️ **Quyết định cần chốt:** mô hình chia sẻ dữ liệu ứng viên giữa các recruiter
> (chung kho vs. sở hữu riêng) ảnh hưởng lớn tới thiết kế quyền và trải nghiệm.

---

## 3. Chức Năng Cốt Lõi

### 3.1 Data Ingestion & CV Parsing  *(MỚI — nền tảng của toàn hệ thống)*
Đây là gốc rễ: không có dữ liệu chuẩn hóa thì matching không thể hoạt động.
- **Nguồn nhập:** upload PDF/Word, import hàng loạt (Excel/CSV), forward email, (giai đoạn sau: scrape/đồng bộ LinkedIn, job boards).
- **CV Parsing:** tự động trích xuất họ tên, liên hệ, kỹ năng, kinh nghiệm, học vấn → chuẩn hóa vào schema thống nhất.
- **Phát hiện trùng lặp (de-duplication):** nhận diện 1 ứng viên có nhiều CV qua nhiều năm và hợp nhất hồ sơ.
- **Đa ngôn ngữ:** xử lý CV tiếng Việt và tiếng Anh.

### 3.2 Talent Database
- **Hồ sơ ứng viên:** tạo / cập nhật / lưu CV gốc; quản lý kỹ năng, kinh nghiệm, liên hệ.
- **Lịch sử ứng viên:** vị trí đã ứng tuyển, công ty đã được giới thiệu, kết quả phỏng vấn, ghi chú & lịch sử trao đổi của recruiter.

### 3.3 Search & Filter  *(MỚI — bổ trợ cho AI)*
Recruiter cần tìm kiếm/lọc trực tiếp song song với đề xuất tự động:
- Lọc theo kỹ năng, địa điểm, mức lương kỳ vọng, số năm kinh nghiệm, trạng thái tìm việc, nguồn...
- Tìm kiếm full-text trên nội dung CV.

### 3.4 Matching Engine  *(GỘP từ 3.2 + 3.3 + 3.4 bản gốc)*
Một engine lõi duy nhất "tìm ứng viên phù hợp ↔ tìm job phù hợp", với các use case khác nhau là **bộ lọc/ngữ cảnh kích hoạt** trên cùng engine đó:

- **Job → Candidate:** từ một vị trí, đề xuất danh sách ứng viên kèm: mức độ phù hợp (%), kỹ năng đáp ứng, **điểm còn thiếu**.
- **Candidate → Job:** từ một hồ sơ, đề xuất vị trí & khách hàng phù hợp.
- **Talent Rediscovery** *(use case)*: tự động chạy Job→Candidate khi tạo vị trí mới, quét toàn bộ DB.
- **Hidden Talent Discovery** *(use case = Rediscovery + bộ lọc)*: chỉ hiện ứng viên **phù hợp nhưng chưa từng được giới thiệu / bị bỏ sót** ở các đợt trước.

**Yêu cầu về AI (cần chốt hướng):**
- Phương pháp matching: skill taxonomy/ontology + semantic matching (embeddings) hay rule-based — hay kết hợp.
- **Explainability:** mỗi điểm số phải giải thích được (vì sao 85%?) để recruiter tin tưởng và ra quyết định.

### 3.5 Recruitment Pipeline
Theo dõi trạng thái ứng viên qua các bước: *Mới tiếp nhận → Đang sàng lọc → Phỏng vấn nội bộ → Phỏng vấn khách hàng → Đề nghị nhận việc → Đã nhận việc / Không phù hợp.*
- Lưu toàn bộ lịch sử xử lý.
- *Cần làm rõ:* trạng thái cố định hay cho phép tùy biến theo từng khách hàng.

### 3.6 Candidate Relationship Management
- Lần liên hệ gần nhất, lịch sử trao đổi, mức độ tương tác, trạng thái tìm việc hiện tại.
- *Cần làm rõ:* "mức độ tương tác" được tính từ dữ liệu nào (số lần liên hệ, phản hồi, thời gian gần nhất...).

### 3.7 Job Management
Quản lý vị trí tuyển dụng, khách hàng, người phụ trách, trạng thái & tiến độ tuyển dụng.

### 3.8 Notifications & Integrations  *(MỚI)*
- Alert khi có ứng viên mới khớp với job đang mở (hoặc job mới khớp ứng viên đang theo dõi).
- Tích hợp email & calendar (đặt lịch phỏng vấn, nhắc việc).

### 3.9 Talent Insights Dashboard
- Số lượng ứng viên theo kỹ năng, nguồn ứng viên, kỹ năng được tìm nhiều.
- Tỷ lệ tuyển dụng thành công, time-to-hire.
- **Hiệu suất recruiter** — *cần định nghĩa chỉ số:* số ứng viên xử lý, tỷ lệ chuyển đổi qua các bước pipeline, time-to-hire.

---

## 4. Yêu Cầu Phi Chức Năng (Non-functional)  *(MỚI)*

- **Quy mô:** xác định số hồ sơ dự kiến (10K? 1 triệu?) — quyết định kiến trúc lưu trữ & cách triển khai matching/embeddings.
- **Hiệu năng:** mục tiêu trả kết quả matching "trong vài giây" cần định lượng (vd: < 3s cho DB N hồ sơ).
- **Bảo mật & phân quyền:** RBAC chi tiết; mã hóa dữ liệu nhạy cảm.
- **Quyền riêng tư & pháp lý** *(bắt buộc với dữ liệu cá nhân):*
  - Sự đồng ý của ứng viên (consent), thời hạn lưu trữ, quyền yêu cầu xóa — tuân thủ Nghị định 13/2023/NĐ-CP (VN) và GDPR nếu có dữ liệu EU.
  - **Audit log:** ghi nhận ai xem/sửa/xuất hồ sơ nào.
- **Khả dụng:** sao lưu dữ liệu, khôi phục.

---

## 5. Phân Giai Đoạn (MVP vs. Sau)

### MVP — tập trung chứng minh giá trị lõi
1. Data Ingestion & CV Parsing (3.1) — upload + parse + de-dup cơ bản
2. Talent Database (3.2)
3. Search & Filter (3.3)
4. Matching Engine (3.4) — Job→Candidate + Rediscovery, có explainability cơ bản
5. Recruitment Pipeline (3.5)
6. Job Management (3.7)
7. Phân quyền + audit log cơ bản (mục 4)

### Giai đoạn 2
- Candidate → Job & Hidden Talent Discovery (3.4)
- Candidate Relationship Management (3.6)
- Notifications & Integrations (3.8)
- Talent Insights Dashboard đầy đủ (3.9)
- Tích hợp nguồn ngoài (LinkedIn, job boards)

---

## 6. Điểm Khác Biệt Của Sản Phẩm
Khác với ATS truyền thống chỉ lưu trữ, nền tảng tập trung vào: tái sử dụng nguồn ứng viên hiện có,
tự động tìm ứng viên phù hợp, phát hiện ứng viên bị bỏ sót, giảm thời gian tuyển dụng,
tăng hiệu quả khai thác dữ liệu.

---

## 7. Tiêu Chí Thành Công
- Giảm ≥ 50% thời gian tìm kiếm ứng viên.
- Tăng tỷ lệ tái sử dụng ứng viên trong DB.
- Tăng tỷ lệ tuyển dụng thành công.
- Giảm phụ thuộc vào nguồn bên ngoài.
- Nâng cao năng suất recruiter.

---

## 8. Câu Hỏi Cần Chốt Trước Khi Triển Khai
1. Quy mô dữ liệu ứng viên dự kiến?
2. Mô hình chia sẻ dữ liệu giữa các recruiter (chung vs. riêng)?
3. Hướng tiếp cận AI matching (semantic/embeddings vs. rule-based)?
4. Nguồn nhập CV chính ở giai đoạn đầu?
5. Yêu cầu tuân thủ pháp lý theo thị trường nào (VN, EU...)?
6. Pipeline cố định hay tùy biến theo khách hàng?
