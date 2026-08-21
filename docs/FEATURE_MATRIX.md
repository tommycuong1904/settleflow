# SettleFlow — Feature Matrix & Functional Specifications

> **Tài liệu Chi tiết Tính năng Hệ thống (Functional Feature Matrix)**
> 
> Tài liệu này liệt kê toàn bộ các tính năng **nghiệp vụ, logic xử lý, dữ liệu, bảo mật và blockchain** của SettleFlow (tập trung 100% vào năng lực cốt lõi và kiến trúc chức năng, không bao gồm các chi tiết visual layout/CSS UI).

---

## 📊 Bảng Tổng Quan Trạng Thái Tính Năng

| Nhóm Tính Năng | Tổng số tính năng | ✅ Đã hoàn thành | ⏳ Đang hoàn thiện | 📋 Chưa làm / Kế hoạch |
| :--- | :---: | :---: | :---: | :---: |
| **1. Xác thực & Quản lý Ví (Auth & Wallet Core)** | 7 | 6 | 1 | 0 |
| **2. Quản lý Thỏa thuận Payout (Payout Agreement Core)** | 6 | 5 | 1 | 0 |
| **3. Vòng đời Milestone (Milestone State Machine)** | 5 | 5 | 0 | 0 |
| **4. Giải ngân Blockchain & Bằng chứng (Release & Settlement)** | 7 | 4 | 2 | 1 |
| **5. Quản lý Contributor (Contributor Registry)** | 5 | 3 | 1 | 1 |
| **6. Phân quyền & Vai trò (RBAC & Policy Engine)** | 4 | 4 | 0 | 0 |
| **7. Nhật ký hoạt động & Báo cáo (Audit & Reporting)** | 5 | 3 | 1 | 1 |
| **8. Tích hợp & Tự động hóa (Webhooks & Notifications)** | 4 | 1 | 1 | 2 |
| **TỔNG CỘNG** | **43** | **31 (72%)** | **7 (16%)** | **5 (12%)** |

---

## 1. Xác thực, Danh tính & Quản lý Ví (Auth & Account Architecture)

| Mã | Tên Tính năng | Mô tả Nghiệp vụ & Kỹ thuật | Trạng thái |
| :--- | :--- | :--- | :---: |
| `AUTH-01` | **Google OAuth 2.0 Identity Services (GIS)** | Đăng nhập bằng tài khoản Google thật qua Google Identity Services SDK, lấy profile (email, name, avatar, sub ID). | ✅ **Đã làm** |
| `AUTH-02` | **Email Magic/Social Onboarding** | Xác thực người dùng bằng email định danh Web2 mà không bắt buộc có ví Web3 từ trước. | ✅ **Đã làm** |
| `AUTH-03` | **Tự động sinh Smart Account (Arc Testnet)** | Sử dụng thuật toán xác định (deterministic secp256k1) thông qua `viem` để tạo địa chỉ ví EVM duy nhất cho từng tài khoản Google/Email ngay khi đăng nhập. | ✅ **Đã làm** |
| `AUTH-04` | **Xuất Private Key (Self-Custody Export)** | Cho phép người dùng Web2 xuất khóa bí mật ECDSA để import vào MetaMask/Rabby khi cần tự quản lý tài sản. Có bảo mật ẩn/hiện và cảnh báo rủi ro. | ✅ **Đã làm** |
| `AUTH-05` | **Kết nối Ví Web3 Trực tiếp (Browser EOA)** | Kết nối trực tiếp ví trình duyệt (MetaMask, Rabby, Rainbow, Coinbase Wallet) qua `window.ethereum`. | ✅ **Đã làm** |
| `AUTH-06` | **Tự động Cấu hình Mạng Arc Testnet** | Tự động gọi RPC `wallet_addEthereumChain` / `wallet_switchEthereumChain` để thêm mạng Arc Testnet (Chain ID `5042002`) vào ví người dùng với 1-click. | ✅ **Đã làm** |
| `AUTH-07` | **WebAuthn / Passkey Native Signer** | Đăng ký và ký giao dịch bằng FaceID / TouchID / Windows Hello thông qua WebAuthn API trực tiếp. | ⏳ **Đang làm** |

---

## 2. Quản lý Thỏa thuận Thanh toán (Payout Agreement Engine)

| Mã | Tên Tính năng | Mô tả Nghiệp vụ & Kỹ thuật | Trạng thái |
| :--- | :--- | :--- | :---: |
| `PAY-01` | **Tạo Thỏa thuận Payout Mới (Draft & Setup)** | Khởi tạo hợp đồng thỏa thuận thanh toán bao gồm: Tiêu đề, Contributor nhận tiền, Tổng ngân sách USDC, Danh sách Milestone và Hạn chót. Lưu trữ qua Prisma ORM vào PostgreSQL. | ✅ **Đã làm** |
| `PAY-02` | **Kích hoạt Thỏa thuận (Payout Activation)** | Chuyển trạng thái thỏa thuận từ `DRAFT` sang `ACTIVE`, khóa các điều khoản và bắt đầu theo dõi tiến độ công việc. | ✅ **Đã làm** |
| `PAY-03` | **Phân chia Đa Milestone (Milestone Slicing)** | Hỗ trợ cấu hình nhiều mốc giải ngân theo tỷ lệ % hoặc số lượng USDC cố định. Tự động kiểm tra tổng số tiền các milestone phải khớp 100% tổng ngân sách. | ✅ **Đã làm** |
| `PAY-04` | **Phân trang & Lọc Dữ liệu Payout** | Hỗ trợ phân trang (Pagination), tìm kiếm theo tên/mô tả và lọc theo trạng thái (`ACTIVE`, `COMPLETED`, `DRAFT`, `PAUSED`). | ✅ **Đã làm** |
| `PAY-05` | **Hủy / Tạm dừng Thỏa thuận (Pause/Cancel)** | Tạm dừng tiến trình thanh toán khi có tranh chấp hoặc hủy thỏa thuận chưa phát sinh giải ngân. | ✅ **Đã làm** |
| `PAY-06` | **Ký quỹ Escrow Onchain (Smart Contract Escrow)** | Khóa trực tiếp toàn bộ số tiền USDC vào Smart Contract Escrow trên Arc Testnet ngay khi kích hoạt thỏa thuận. | ⏳ **Đang làm** |

---

## 3. Máy Trạng Thái Milestone (Milestone State Machine)

| Mã | Tên Tính năng | Mô tả Nghiệp vụ & Kỹ thuật | Trạng thái |
| :--- | :--- | :--- | :---: |
| `MS-01` | **Nộp Bằng chứng Hoàn thành (Milestone Submission)** | Contributor nộp link sản phẩm, PR GitHub, tài liệu chứng minh và ghi chú hoàn thành công việc. Chuyển trạng thái sang `SUBMITTED`. | ✅ **Đã làm** |
| `MS-02` | **Phê duyệt Milestone (Milestone Approval)** | Owner/Approver kiểm tra kết quả và phê duyệt milestone. Chuyển trạng thái sang `APPROVED`, mở khóa quyền giải ngân. | ✅ **Đã làm** |
| `MS-03` | **Từ chối Milestone kèm Lý do (Milestone Rejection)** | Approver từ chối và gửi phản hồi lý do cần chỉnh sửa. Chuyển trạng thái về `CHANGES_REQUESTED` để contributor làm lại. | ✅ **Đã làm** |
| `MS-04` | **Khóa Trình tự Tuần tự (Sequential Locking)** | Quy tắc nghiệp vụ bắt buộc: Milestone N chỉ được giải ngân sau khi Milestone N-1 đã hoàn tất (hoặc cho phép giải ngân song song theo cấu hình). | ✅ **Đã làm** |
| `MS-05` | **Tự động Tính toán Tiến độ Payout** | Tự động tính toán tỷ lệ % hoàn thành và số dư USDC đã giải ngân / còn lại theo thời gian thực dựa trên trạng thái các milestone. | ✅ **Đã làm** |

---

## 4. Giải ngân Blockchain & Bằng chứng Thanh toán (Release & Settlement)

| Mã | Tên Tính năng | Mô tả Nghiệp vụ & Kỹ thuật | Trạng thái |
| :--- | :--- | :--- | :---: |
| `REL-01` | **Ký Giải ngân Trực tiếp qua Ví Web3 (MetaMask/Rabby)** | Gửi giao dịch `transfer(to, amount)` gọi trực tiếp Smart Contract USDC trên mạng Arc Testnet thông qua `viem` / `ethers`. | ✅ **Đã làm** |
| `REL-02` | **Tạo Bằng chứng Thanh toán Tức thì (Settlement Proof)** | Lưu trữ Transaction Hash, Block Number, Timestamp, Địa chỉ gửi, Địa chỉ nhận và số tiền USDC vào bảng `Release` và `SettlementProof`. | ✅ **Đã làm** |
| `REL-03` | **Xác thực Trạng thái Giao dịch Onchain (Proof Verification)** | Tự động truy vấn RPC Arc Testnet để kiểm tra giao dịch đã được xác nhận (Confirmed) hay chưa qua `eth_getTransactionReceipt`. | ✅ **Đã làm** |
| `REL-04` | **Tự động Cập nhật Số dư USDC (Live Balance Sync)** | Đọc số dư token ERC-20 USDC trực tiếp từ RPC Arc Testnet theo địa chỉ ví đang kết nối. | ✅ **Đã làm** |
| `REL-05` | **Cơ chế Thử lại Giao dịch lỗi (Release Retry)** | Xử lý các trường hợp giao dịch bị nghẽn (nonce conflict / dropped transaction) cho phép thử lại với gas price mới. | ⏳ **Đang làm** |
| `REL-06` | **Giải ngân Tự động qua Smart Account (Relayer/Paymaster)** | Tự động ký và gửi giao dịch giải ngân cho các tài khoản Web2 mà không bắt người nhận phải có đồng native token để trả gas. | ⏳ **Đang làm** |
| `REL-07` | **Hỗ trợ Đa chuỗi (Multi-chain Bridge Settlement)** | Giải ngân USDC trên Arc và tự động bridge sang các mạng EVM khác (Ethereum, Arbitrum, Base) qua Circle CCTP. | 📋 **Chưa làm** |

---

## 5. Quản trị Danh mục Contributor (Contributor Registry)

| Mã | Tên Tính năng | Mô tả Nghiệp vụ & Kỹ thuật | Trạng thái |
| :--- | :--- | :--- | :---: |
| `CONTRIB-01` | **Lưu trữ Hồ sơ Contributor (Profile & Wallet Mapping)** | Quản lý thông tin: Tên, Email, Địa chỉ ví nhận tiền chính, GitHub handle, Vai trò và Thẻ kỹ năng. | ✅ **Đã làm** |
| `CONTRIB-02` | **Tra cứu Contributor Hoạt động (Active Registry Query)** | API `/api/v1/contributors` lọc và cung cấp danh sách contributor khả dụng cho quá trình tạo Payout. | ✅ **Đã làm** |
| `CONTRIB-03` | **Lịch sử Thu nhập & Thống kê Tích lũy** | Tính toán tổng số tiền USDC đã nhận, số lượng milestone hoàn thành và số thỏa thuận đang tham gia của từng contributor. | ✅ **Đã làm** |
| `CONTRIB-04` | **Thêm & Chỉnh sửa Contributor (CRUD Management)** | Thêm mới contributor từ dashboard, cập nhật địa chỉ ví nhận tiền và đổi trạng thái (`ACTIVE`, `INACTIVE`, `SUSPENDED`). | ⏳ **Đang làm** |
| `CONTRIB-05` | **Xác minh Danh tính / Onchain KYC (KYC/KYB Attestation)** | Tích hợp xác thực danh tính contributor qua chứng chỉ số EAS (Ethereum Attestation Service) hoặc Gitcoin Passport. | 📋 **Chưa làm** |

---

## 6. Phân quyền & Vai trò Nghiệp vụ (RBAC & Policy Engine)

| Mã | Tên Tính năng | Mô tả Nghiệp vụ & Kỹ thuật | Trạng thái |
| :--- | :--- | :--- | :---: |
| `RBAC-01` | **Phân quyền Theo 3 Vai trò Cốt lõi (Owner / Contributor / Approver)** | Phân định chặt chẽ quyền hạn: Owner (toàn quyền), Approver (duyệt/từ chối), Contributor (chỉ nộp bài & xem payout của mình). | ✅ **Đã làm** |
| `RBAC-02` | **Bảo vệ Route & Chuyển hướng An toàn (Client/Server Policy Guard)** | Ngăn chặn truy cập trái phép vào các trang nhạy cảm (như `/settings`) với cơ chế redirect không xung đột React Lifecycle. | ✅ **Đã làm** |
| `RBAC-03` | **Chuyển đổi Vai trò Runtime (Actor Switcher)** | Cho phép chuyển đổi vai trò linh hoạt để kiểm tra và giả lập các luồng làm việc khác nhau trong môi trường test/staging. | ✅ **Đã làm** |
| `RBAC-04` | **Chữ ký Kép / Đa Phê Duyệt (Multi-Sig Approval Threshold)** | Yêu cầu M-of-N người duyệt (Multi-Approver) cùng chấp thuận trước khi mở khóa quỹ giải ngân. | 📋 **Chưa làm** |

---

## 7. Nhật ký Hoạt động, Đối soát & Báo cáo (Audit & Reporting)

| Mã | Tên Tính năng | Mô tả Nghiệp vụ & Kỹ thuật | Trạng thái |
| :--- | :--- | :--- | :---: |
| `AUDIT-01` | **Nhật ký Hoạt động Giao dịch (Activity Ledger)** | Tự động ghi lại mọi sự kiện: Tạo thỏa thuận, Nộp bài, Duyệt bài, Từ chối, Giải ngân, Thất bại kèm Actor ID và Timestamp. | ✅ **Đã làm** |
| `AUDIT-02` | **Bộ lọc & Phân trang Nhật ký (Activity Filtering & Pagination)** | Truy vấn nhật ký theo danh mục sự kiện, khoảng thời gian và phân trang 10 dòng/trang. | ✅ **Đã làm** |
| `AUDIT-03` | **Truy xuất Biên nhận Onchain (Explorer Deep-linking)** | Tạo liên kết trực tiếp đến Transaction Hash trên Arc Explorer (`testnet.arcscan.io`). | ✅ **Đã làm** |
| `AUDIT-04` | **Xuất Dữ liệu Báo cáo Kế toán (CSV/JSON Export)** | Xuất toàn bộ bảng kê thanh toán và đối soát thuế/kế toán ra định dạng CSV/JSON chuẩn. | ⏳ **Đang làm** |
| `AUDIT-05` | **Xuất Biên lai PDF Bằng chứng Giải ngân (PDF Receipt Generator)** | Tạo file PDF chứa chữ ký số và băm giao dịch chứng minh nguồn tiền đã được thanh toán minh bạch. | 📋 **Chưa làm** |

---

## 8. Tích hợp & Tự động hóa (Webhooks & External Integrations)

| Mã | Tên Tính năng | Mô tả Nghiệp vụ & Kỹ thuật | Trạng thái |
| :--- | :--- | :--- | :---: |
| `INT-01` | **Cấu hình Webhook Thông báo (Discord / Slack Endpoint)** | Lưu cấu hình Webhook URL trong Settings để chuẩn bị bắn dữ liệu sự kiện. | ✅ **Đã làm** |
| `INT-02` | **Bắn Sự kiện Tự động (Event Webhook Dispatcher)** | Gửi HTTP POST payload khi có sự kiện `milestone.submitted`, `milestone.approved`, `release.confirmed`. | ⏳ **Đang làm** |
| `INT-03` | **Đồng bộ PR GitHub Tự động (GitHub Bot Integration)** | Tự động đánh dấu Milestone hoàn thành khi Pull Request tương ứng trên GitHub được Merge. | 📋 **Chưa làm** |
| `INT-04` | **Thông báo Email Tự động (Resend/SendGrid)** | Gửi email thông báo cho Contributor khi nhận được tiền USDC giải ngân vào ví. | 📋 **Chưa làm** |

---

## 🎯 Gợi ý Lộ trình Thực hiện Tiếp theo (Recommended Next Sprints)

1. **Sprint 1 (Khép kín cốt lõi Blockchain)**:
   - Hoàn thiện `REL-06`: Giải ngân tự động cho ví Smart Account.
   - Hoàn thiện `PAY-06`: Escrow Onchain Lock.

2. **Sprint 2 (Quản trị & Đối soát Kế toán)**:
   - Hoàn thiện `CONTRIB-04`: Thêm/Sửa Contributor trực tiếp từ giao diện.
   - Hoàn thiện `AUDIT-04`: Xuất báo cáo CSV/JSON Payouts.

3. **Sprint 3 (Tự động hóa & Tích hợp)**:
   - Kích hoạt `INT-02`: Bắn Webhook Discord/Slack khi có giao dịch giải ngân thật.
