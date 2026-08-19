# SettleFlow – Hybrid Web2 & Web3 Onboarding / Wallet Connection Plan

> **Mục tiêu:** Xây dựng luồng kết nối ví & đăng nhập tối ưu (Hybrid Web2.5 UX) phục vụ cho cả người dùng Web2 (Email / Social / Smart Account) và người dùng Web3 (MetaMask, Rabby, WalletConnect), áp dụng mô hình **Explore First (Inline Gate)** trong Dashboard.

---

## 📌 Tổng Quan Kiến Trúc & UX Flow

```
[ Khách truy cập vào SettleFlow ]
              │
              ▼
   [ / (Landing Page) ] ── (Bấm "Launch App")
              │
              ▼
   [ /dashboard hoặc /(app)/* ] (Layout: Sidebar + Header)
              │
              ├──────────────────────────────────────────────────────┐
              ▼                                                      ▼
   ┌───────────────────────────┐                        ┌───────────────────────────┐
   │ 1. Chưa kết nối (Guest)    │                        │ 2. Đã kết nối / Đăng nhập │
   │ ───────────────────────── │                        │ ───────────────────────── │
   │ • Xem dashboard ở chế độ  │                        │ • Mở khóa tạo Escrow      │
   │   Demo / Read-only        │                        │ • Thao tác nạp USDC       │
   │ • Card Inline Gate thông  │                        │ • Ký milestone, duyệt tiền│
   │   báo mời kết nối/đăng nhập│                       │ • Header: Địa chỉ ví/Email│
   │ • Header: Nút "Đăng nhập" │                        │   & số dư USDC            │
   └─────────────┬─────────────┘                        └───────────────────────────┘
                 │
                 ▼ (Bấm "Đăng nhập" hoặc Bấm "Tạo Escrow")
   ┌───────────────────────────────────────────────────────────┐
   │            [ Modal Đăng Nhập Kép (Dual-Login) ]            │
   │                                                           │
   │   🔵 Web2: "Continue with Google" / "Continue with Email" │
   │      -> Tạo Embedded Smart Wallet ngầm (0x...)           │
   │                                                           │
   │   🦊 Web3: "MetaMask", "Rabby", "WalletConnect"           │
   │      -> Kết nối ví có sẵn trên mạng Arc Testnet           │
   └───────────────────────────────────────────────────────────┘
```

---

## 🗺️ Kế Hoạch Triển Khai Từng Bước (Phase Roadmap)

### 🚀 Phase 1: Xây dựng UI Component & Trạng thái Mockup (Giai đoạn hiện tại)
- [ ] **1.1. Tạo Auth/Wallet Context State Manager (`lib/context/wallet-context.tsx`)**
  - Quản lý trạng thái: `isConnected`, `address`, `authType` (`web2_email` | `web3_wallet` | `guest`), `isConnecting`, `network`.
  - Hỗ trợ mock switch state để review UI nhanh.
- [ ] **1.2. Tạo Component Modal Đăng Nhập Kép (`components/shared/auth-modal.tsx`)**
  - Phần 1 (Web2 Friendly): Nút Google, Email input nhận OTP/Magic link.
  - Phân cách "Or connect with Web3 wallet".
  - Phần 2 (Web3 Native): Danh sách ví MetaMask, Rabby, WalletConnect, Coinbase.
  - Chú thích giải thích thân thiện cho người mới (không dùng từ ngữ quá hàn lâm).
- [ ] **1.3. Tạo Component Inline Dashboard Gate (`components/dashboard/wallet-gate.tsx`)**
  - Hiển thị ở phần Main Content của Dashboard khi chưa đăng nhập.
  - Thiết kế Dark mode glow cyan/emerald chuẩn phong cách SettleFlow.
  - Nút kích hoạt mở Auth Modal.
- [ ] **1.4. Tinh chỉnh Header (`components/shared/app-header.tsx`)**
  - Trạng thái Chưa kết nối: Nút "Đăng nhập / Bắt đầu" (Sign In) nổi bật.
  - Trạng thái Đã kết nối: Hiển thị avatar/email hoặc địa chỉ ví rút gọn + Network status + Nút Logout / Disconnect.

---

### ⚙️ Phase 2: Tích hợp Thư viện Web2.5 & Web3 Provider Thật
- [ ] **2.1. Lựa chọn & Cài đặt Provider**
  - *Phương án A (Khuyên dùng cho Web2.5 trọn gói):* **Privy** hoặc **Dynamic.xyz** (hỗ trợ cả Email/Google login tự sinh Embedded Wallet lẫn MetaMask/WalletConnect 1-click).
  - *Phương án B (Web3 thuần chuẩn công nghiệp):* **Wagmi v2 + Viem + RainbowKit / AppKit**.
- [ ] **2.2. Cấu hình Mạng Arc Testnet**
  - RPC URL, Chain ID, Currency Symbol (USDC/ARC), Block Explorer.
  - Auto-prompt switch chain nếu người dùng ở sai mạng.

---

### 🛡️ Phase 3: Bảo vệ Luồng Nghiệp Vụ (Action Guards & Permissions)
- [ ] **3.1. Action Interceptor**
  - Khi user ở chế độ Guest bấm "Tạo hợp đồng Escrow mới" hoặc "Nạp tiền" $\rightarrow$ tự động mở Auth Modal.
  - Sau khi đăng nhập thành công $\rightarrow$ tiếp tục mở form hành động mà không làm mất dữ liệu người dùng đang nhập.
- [ ] **3.2. Hiển thị Faucet Onboarding**
  - Người dùng mới sau khi tạo ví/kết nối ví sẽ có tooltip/banner nhỏ hướng dẫn nhận Test USDC (với link faucet Circle/Arc).

---

### 🧪 Phase 4: Kiểm thử, Tối ưu & Hoàn thiện
- [ ] **4.1. Responsive & Dark Mode Test** (Kiểm tra trên Mobile, Tablet, Desktop).
- [ ] **4.2. Error Handling UX** (Xử lý khi người dùng từ chối ký ví, mất mạng, popup bị chặn).
- [ ] **4.3. Production Build & Clean Lint**.

---

## 📊 Trạng Thái Tiến Độ (Progress Log)

| Ngày | Bước thực hiện | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| *2026-08-19* | Phân tích & Lập kế hoạch chi tiết Hybrid Web2/Web3 | 🟢 Hoàn thành | Lưu vào `docs/WALLET_ONBOARDING_PLAN.md` |
| *Tiếp theo* | Phase 1.1: Tạo Wallet Context & State Manager | ⏳ Chuẩn bị làm | |
| *Tiếp theo* | Phase 1.2: Tạo Dual-Login Auth Modal Component | ⏳ Chuẩn bị làm | |
| *Tiếp theo* | Phase 1.3: Tạo Inline Dashboard Gate Component | ⏳ Chuẩn bị làm | |
| *Tiếp theo* | Phase 1.4: Cập nhật App Header hiển thị động | ⏳ Chuẩn bị làm | |
