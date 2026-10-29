# SettleFlow — Demo Guide

> **Mục tiêu:** trình bày payout workflow Web2-first trên Arc Testnet.
> **Thời lượng:** 5–7 phút. **Deployment:** `https://settleflow-dev.vercel.app`.

## Kịch bản trình bày

```text
Owner (Google) tạo contributor và payout
  → Contributor nhận link mời, đăng nhập Google, submit work
  → Owner review, approve, và xác nhận thanh toán Circle
  → Arc Testnet xác nhận USDC; SettleFlow hiển thị Paid và proof
```

Owner và Contributor là hai role hoạt động trong MVP. Owner tạo payout, review,
approve và thanh toán. Contributor chỉ thấy công việc được giao và submit/resubmit.
Không dùng Role Switcher, Reviewer, dữ liệu mock, hay simulated payment trong buổi demo.

## Chuẩn bị trước khi trình bày

1. Xác nhận deployment `main` và CI xanh.
2. Chuẩn bị hai tài khoản Google riêng: **Owner** và **Contributor**.
3. Với Owner, mở Settings và hoàn tất **Set up payment account** (Circle User-controlled).
4. Nạp test USDC vào payment account của Owner trên Arc Testnet; dùng một khoản nhỏ,
   ví dụ `0.1 USDC`.
5. Kiểm tra môi trường deployment được cho phép thanh toán Arc Testnet. Nếu payment
   bị chặn bởi authorization gate, dừng tại trạng thái Approved — không đổi cấu hình
   ngay trước buổi demo.
6. Dùng một cửa sổ bình thường cho Owner và cửa sổ Incognito/Browser Profile khác cho
   Contributor để hai session không lẫn nhau.

## Luồng demo

### 1. Owner tạo contributor và link mời

1. Đăng nhập Google bằng Owner.
2. Mở **Contributors** → **Add Contributor**.
3. Điền tên và email của Contributor. Ví nhận có thể để trống lúc này.
4. Tạo contributor, mở menu invitation của người đó, rồi copy link mời.

Điểm cần nói: Contributor không cần browser wallet hay recovery phrase để vào workspace
và làm việc.

### 2. Contributor nhận workspace

1. Mở link ở cửa sổ Contributor.
2. Đăng nhập Google đúng email đã được mời.
3. Xác nhận màn hình **Join [workspace]**, rồi chọn **Accept & Join**.
4. Ứng dụng đi thẳng về dashboard Contributor, không đi qua Settings.

Điểm cần nói: link mời mới là quyền gia nhập workspace; Google sign-in chỉ xác minh
tài khoản, không tự cấp quyền vào workspace khác.

### 3. Owner tạo payout

1. Quay lại cửa sổ Owner → **New Payout**.
2. Chọn Contributor vừa tạo.
3. Tạo một milestone duy nhất, ví dụ:
   - title: `Draft campaign concepts`
   - amount: `0.1 USDC`
   - description: `Create three visual directions for review.`
4. Lưu draft rồi **Activate payout**.

### 4. Contributor submit work

1. Ở cửa sổ Contributor, mở payout được giao.
2. Chọn **Submit work for review**.
3. Thêm work summary và một proof URL.
4. Submit; trạng thái trở thành **Awaiting review**.

Điểm cần nói: Contributor không thấy nút tạo payout, approve hoặc pay.

### 5. Owner review và approve

1. Owner mở dashboard hoặc payout detail.
2. Chọn **Review work**, kiểm tra summary/proof.
3. Chọn **Approve work**.

Điểm cần nói: approval và payment là hai bước riêng, có audit trail rõ ràng.

### 6. Thanh toán Arc Testnet

1. Trước payment, thêm ví nhận hợp lệ cho Contributor nếu chưa có.
2. Owner chọn **Pay 0.1 USDC**.
3. Màn hình review phải thể hiện amount, milestone, tên Contributor và địa chỉ ví nhận.
4. Chọn **Confirm** và hoàn tất Circle confirmation khi được yêu cầu.
5. Chờ SettleFlow cập nhật trạng thái. Không sign/retry lần hai khi đang processing.
6. Khi thành công, modal hiển thị **Payment confirmed**; payout detail hiển thị **Paid**
   và payment details/proof.

Điểm cần nói: mọi chi tiết blockchain là progressive disclosure; người dùng chỉ cần
xác nhận ai nhận tiền và bao nhiêu. Transaction/proof vẫn có thể xem khi cần.

## Tiêu chí pass rehearsal

- Owner và Contributor nhìn thấy navigation/hành động khác nhau đúng role.
- Link mời email-bound chặn sai tài khoản Google.
- Contributor không thể create payout, approve hay pay.
- Owner không thể mở payment signing khi Contributor chưa có ví nhận.
- Một payment Arc Testnet nhỏ đạt `Paid` và có transaction proof/explorer link.
- Refresh trang vẫn giữ trạng thái payout/payment chính xác.

## Phương án dự phòng

- Nếu Circle payment account chưa ready: trình bày đến approval, giải thích payment
  account được thiết lập một lần trong Settings.
- Nếu Arc confirmation chậm: giữ nguyên trạng thái processing, không retry; chuyển sang
  một payout đã hoàn tất để trình bày payment proof.
- Nếu link mời hết hạn/revoked: Owner tạo link mới trong Settings hoặc Contributors.

## Không trình bày trong scope này

- Browser-wallet payment, reviewer/ops roles, mock/simulated payments, webhook/push,
  multi-sig, bridge, escrow và production settlement.
- Không công bố API keys, CRON secrets, private keys, Circle user tokens hay link mời
  trên slide công khai.
