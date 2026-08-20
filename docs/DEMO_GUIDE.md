# SettleFlow — Demo Guide

> **Thời gian chạy thử:** ~5 phút  
> **URL dev:** `http://localhost:3000`  
> **Mạng:** Arc Testnet (Chain ID `5042002`, USDC native)

---

## Tổng quan quy trình

```
Owner tạo Payout
    └─→ Contributor nộp Deliverable (+ GitHub PR / Loom / Figma link)
            └─→ Reviewer kiểm tra & Approve hoặc Reject
                    └─→ Owner Release USDC on Arc Testnet
                            └─→ Hệ thống gửi Discord Webhook + tạo Settlement Proof
```

---

## Vai trò trong demo

| Vai trò | Hành động chính | Cách chọn |
|---|---|---|
| **Owner** | Tạo payout, kích hoạt, release USDC | Role Switcher → `Owner` |
| **Contributor** | Nộp bài kèm deliverable | Role Switcher → `Contributor` |
| **Reviewer** | Duyệt Approve / Reject milestone | Role Switcher → `Reviewer` |

> **Lưu ý:** Role Switcher nằm ở góc phải trên cùng của màn hình (header). Bấm để chuyển nhanh giữa các vai trò.

---

## Bước 0 — Kết nối Ví & Thiết lập Arc Testnet

1. Mở `http://localhost:3000/` → Bấm **"Get Started"** hoặc **"Connect Wallet"**
2. Trong modal **Auth**, chọn **tab Web3** → Bấm **"Add / Switch Arc Testnet in MetaMask"**
3. MetaMask sẽ prompt thêm mạng → **Chấp nhận**
4. Bấm **"Connect MetaMask / Rabby"** để đăng nhập (hoặc chọn tab **Web2** để dùng Google)
5. Xác nhận Network Badge ở header hiển thị **"Arc Testnet"**

> **Lấy USDC Testnet:** Nếu số dư bằng 0, bấm badge USDC ở header → Bấm **"Request Testnet USDC from Faucet"**

---

## Bước 1 — Tạo Payout Agreement (vai trò: Owner)

**URL:** `/payouts/new`

1. Chuyển Role Switcher sang **Owner**
2. Điền form:
   - **Payout title:** `Q3 Frontend Bounty — SettleFlow UI`
   - **Contributor:** Chọn contributor từ danh sách
   - **Target wallet:** Paste địa chỉ ví nhận USDC (Arc Testnet)
   - **Description:** Tùy ý
3. Thêm milestones:
   - Milestone 1: `Design System & Core Components` — `500 USDC`
   - Milestone 2: `Payout Detail UI & Release Flow` — `750 USDC`
   - Milestone 3: `Dashboard KPIs & Activity Feed` — `250 USDC`
4. Bấm **"Create Payout"**
5. Khi payout được tạo, bấm **"Activate Payout"** để chuyển từ draft → active

---

## Bước 2 — Nộp Deliverable (vai trò: Contributor)

**URL:** `/payouts/[id]` → mở payout vừa tạo

1. Chuyển Role Switcher sang **Contributor**
2. Trong milestone đầu tiên, bấm **"Submit milestone"**
3. Modal **Deliverable Submission** mở ra:
   - **Work Summary:** `Implemented complete design system with 12 base components, dark mode tokens, and responsive layout system.`
   - **Proof / Artifact URL:** `https://github.com/org/settleflow-ui/pull/42`
   - **Artifact Type:** Chọn `GitHub Pull Request`
   - **Notes for Reviewer:** `Test on Chrome & Safari. Figma tokens link in PR description.`
4. Bấm **"Submit for Review"**
5. Trạng thái milestone chuyển sang `submitted` — hệ thống tự động gửi Discord notification (nếu đã cấu hình webhook)

---

## Bước 3 — Review & Approve (vai trò: Reviewer)

**URL:** `/payouts/[id]` — cùng payout

1. Chuyển Role Switcher sang **Reviewer**
2. Trong milestone vừa được nộp, xem phần **"Review needed"**
3. Bấm **"View Submitted Artifact"** để kiểm tra GitHub PR
4. Chọn một trong hai hành động:

   **✅ Approve:**
   - Bấm **"Approve"** trong Review Controls
   - Milestone chuyển sang `approved` — hệ thống gửi Discord notification

   **⚠️ Reject (optional):**
   - Bấm **"Reject"**
   - Nhập feedback: `Please add unit tests for the Button component and fix mobile layout on iOS Safari.`
   - Milestone về trạng thái `rejected` → Contributor nhận thông báo và có thể **Resubmit**

---

## Bước 4 — Release USDC on Arc Testnet (vai trò: Owner)

**URL:** `/payouts/[id]` — panel bên phải

1. Chuyển Role Switcher sang **Owner**
2. Panel bên phải hiển thị milestone đã được Approve và nút **"Release Milestone"**
3. Kiểm tra số tiền: `500 USDC` → địa chỉ ví contributor
4. Bấm **"Release Milestone"** → MetaMask / Rabby sẽ popup yêu cầu ký giao dịch USDC
5. Ký giao dịch → Đợi xác nhận (~5-15 giây trên Arc Testnet)
6. Trạng thái chuyển sang `released` — hệ thống gửi Discord notification kèm địa chỉ ví và số tiền

---

## Bước 5 — Xem Settlement Proof & Export Receipt

**URL:** `/payouts/[id]`

1. Sau khi Release thành công, bấm **"View Settlement Proof"** trong panel
2. Modal Receipt hiển thị:
   - Tên payout và milestone đã release
   - Số USDC đã chuyển
   - Transaction Hash
   - Link Arcscan: xác minh giao dịch on-chain
   - Timestamp xác nhận
3. Tùy chọn:
   - **"Print Receipt"** — in hoặc lưu PDF
   - **"Download JSON"** — tải raw settlement proof

---

## Bước 6 — Kiểm tra Settings & Webhook (Optional)

**URL:** `/settings`

1. Dán Discord Webhook URL vào ô **"Webhook URL"**
2. Bấm **"Send Test Webhook"** → Kiểm tra Discord nhận thông báo test
3. Bật/tắt từng loại notification:
   - ✅ Milestone Submitted
   - ✅ Milestone Approved
   - ✅ USDC Released
4. Bấm **"Test Node Health"** → Kiểm tra Arc Testnet RPC latency

---

## Bước 7 — Xem Activity Feed & Dashboard

| URL | Nội dung |
|---|---|
| `/dashboard` | KPI tổng hợp, danh sách payout active, pending approvals, recent releases |
| `/activity` | Log toàn bộ sự kiện theo thời gian: submitted, approved, rejected, released |
| `/contributors` | Danh sách contributor, số payout, tổng USDC nhận |

---

## Luồng hoàn chỉnh trong 5 phút

```
00:00  Mở localhost:3000 → Giải thích vấn đề & giải pháp (Landing Page)
00:45  Kết nối ví MetaMask / Login Google → vào Dashboard
01:15  Tạo payout Q3 bounty với 3 milestones (Owner)
01:50  Submit Milestone 1 kèm GitHub PR link (Contributor)
02:20  Reviewer Approve Milestone 1
02:40  Owner Release 500 USDC on Arc Testnet → Ký MetaMask
03:10  Xem Settlement Proof + link Arcscan
03:30  Discord nhận notification tự động
04:00  Activity Feed hiển thị toàn bộ lịch sử
04:30  Q&A / Wrap-up
```

---

## Tips Demo

- **Chạy 2 tab song song:** Tab 1 = Contributor, Tab 2 = Reviewer để chuyển role nhanh hơn
- **Chuẩn bị sẵn USDC Testnet** từ faucet trước demo (~5 phút để confirm)
- **Discord Webhook:** Cài đặt trước ở `/settings` để audience thấy real-time notification ngay lúc demo
- **Không cần seed database:** Hệ thống có sẵn dữ liệu mẫu từ Prisma seed

---

## Troubleshooting nhanh

| Vấn đề | Cách xử lý |
|---|---|
| MetaMask không thấy Arc Testnet | Settings → **"Add to MetaMask"** hoặc vào `/settings` |
| Số dư USDC = 0 | Header → Badge USDC → **"Request from Faucet"** |
| Không thấy nút Approve | Đảm bảo Role Switcher đang ở **Reviewer** |
| Giao dịch pending quá lâu | Tăng gas fee trong MetaMask hoặc dùng **"Speed Up"** |
| Discord không nhận webhook | Kiểm tra URL tại `/settings` → **"Send Test Webhook"** |

---

*Tài liệu này phản ánh trạng thái hiện tại: Arc Testnet với USDC native, toàn bộ state machine được backed bởi Prisma/PostgreSQL, và webhook notification tự động.*
