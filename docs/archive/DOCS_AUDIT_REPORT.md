> **Historical / Superseded — not current SSoT.**

# Báo cáo Audit: Kiến trúc tài liệu SettleFlow & Thiết kế an toàn / tổ chức

> **Loại tài liệu**: Audit report (phân tích + thiết kế) — **không kèm chỉnh sửa code/doc**.
> **Ngày**: 2026-08-30
> **Trạng thái**: Hoàn thành giai đoạn phân tích. Chờ duyệt trước khi thực thi lộ trình Batch A–D.
> **SSoT tham chiếu**: `prisma/schema.prisma`, `lib/runtime/product-context.ts`, `lib/runtime/product-policy.ts`, `lib/auth/session-mapping.ts`, `lib/runtime/role-utils.ts`, route thực tế `app/(app)/…`.

---

## 1. Tổng quan hiện trạng (đã xác minh từ code + docs)

**Danh mục tài liệu** (từ `/tmp/doc_inventory.txt`):

| Tầng | Số file | Danh sách |
|---|---|---|
| Root `.md` | 3 | `AGENTS.md` (156), `CONTEXT.md` (62), `README.md` (238) |
| `docs/` (đang hoạt động) | 16 | README, PROJECT, ARCHITECTURE, CONVENTIONS, CURRENT_STATE, PROJECT_MAP, DOMAIN_MODEL, WORKFLOW_STATE_MACHINE, FEATURE_MATRIX, KNOWN_ISSUES, REAL_PRODUCT_ROADMAP, HANDOFF, DEMO_GUIDE, GOOGLE_OAUTH_SETUP |
| `docs/archive/` | 15 | API_PLAN, DB_SCHEMA, IMPLEMENTATION_PLAN, MERGE_PREP/PR_BODY_AUTH_BOUNDARY_V1, WALLET_ONBOARDING_PLAN, architecture, checkpoint-2-* (×3), core-release-wedge-progress, mvp-scope, progress-summary-checkpoint-2, project-status, workboard |
| Ngoài docs | 10 | `workflows/*` (8, có README), `local-artifacts/*` (2) |

**Điểm mạnh đã có:**
- `docs/README.md` (35 dòng) là bộ định tuyến tốt: Entry point → Canonical → Supporting → Archive, kèm luật giải quyết xung đột ("prefer canonical", "trust CURRENT_STATE cho live numbers").
- `CURRENT_STATE.md` tự khai báo là **single source of truth cho live numbers** và có legend "Fact vs Assumption".
- `AGENTS.md` định tuyến tải doc theo loại task (bug/ui/feature/...).
- Archive đã được tách khỏi `docs/` và `docs/README.md` liệt kê rõ các file archive là "không phải current truth".

---

## 2. Các mâu thuẫn / rủi ro tìm thấy

### ⚠️ R1 — Mô hình vai trò không nhất quán giữa docs và code (an toàn/nghiêm trọng nhất)
Ba nguồn mô tả vai trò khác nhau:
- **DB** (`prisma/schema.prisma`): `WorkspaceMemberRole = { owner, ops, reviewer, contributor }` — **4 giá trị**.
- **Runtime** (`lib/runtime/product-context.ts`): `ProductActor = "owner" | "reviewer" | "contributor"` — **3 giá trị, không có `ops`**.
- **Mapper** (`lib/auth/session-mapping.ts`): `ops` được **gấp về `owner`** ("owner/ops → owner").
- **Docs** (`docs/DOMAIN_MODEL.md` §WorkspaceMember "Allowed roles"): liệt kê 4 vai trò `owner/ops/reviewer/contributor` **mà không giải thích** sự gấp `ops→owner` ở tầng policy.

→ Độc giả (con người hoặc agent) đọc docs sẽ hiểu sai mô hình phân quyền thực tế. Đây là mâu thuẫn docs-vs-code trực tiếp về bảo mật.

### ⚠️ R2 — `DOMAIN_MODEL.md` và `WORKFLOW_STATE_MACHINE.md` tự xưng là "đề xuất" nhưng thực tế đã được hiện thực
- `DOMAIN_MODEL.md` (dòng 3–15): "defines the **proposed** persistent domain model… **does not assume a specific database or ORM**" — nhưng schema đã tồn tại ở `prisma/schema.prisma` (SSoT thực). Thậm chí ngay trong file, mục `User` đã viết "Auth (Phase 4) is implemented", **tự mâu thuẫn** với header "proposed".
- `WORKFLOW_STATE_MACHINE.md` (dòng 3–6): "defines **proposed** state transitions" — nhưng phần "Current Confirmed Statuses From Code" khớp 100% với enum trong `schema.prisma` (PayoutStatus, MilestoneStatus, TransactionProofStatus…).

→ Định vị sai: nên chuyển từ "proposal" sang "approved/spec" trỏ về SSoT, nếu không người đọc cứ nghĩ đây là thiết kế chưa build.

### ⚠️ R3 — Trùng lặp nội dung giữa nhiều docs (nhiều "nguồn sự thật" cạnh tranh)
- `PROJECT.md` có mục "Current Routes / Current State / Out of Scope for the Current Repository State" → đúng chức năng của `CURRENT_STATE.md`. Hai file có thể lệch pha.
- `README.md` (root) và `PROJECT.md` đều mô tả Problem/Solution/Core workflow.
- `ARCHITECTURE.md` và `PROJECT_MAP.md` đều liệt kê route + cấu trúc thư mục.
- `FEATURE_MATRIX.md`, `REAL_PRODUCT_ROADMAP.md`, `CURRENT_STATE.md` cùng phủ trạng thái tính năng/phase → vi phạm nguyên tắc "một nguồn cho live numbers" mà chính `CURRENT_STATE.md` tuyên bố.

### ⚠️ R4 — `ARCHITECTURE.md` có đường dẫn route cũ (docs–code drift)
`ARCHITECTURE.md` §Main Layers liệt kê `app/dashboard/page.tsx`, `app/payouts/new/page.tsx`, `app/payouts/[id]/page.tsx` — nhưng thực tế các route nằm trong route group `app/(app)/…` (xác nhận bởi `CURRENT_STATE.md` và cấu trúc thư mục thực tế). Mâu thuẫn trực tiếp giữa hai docs, một trong hai sai so với code.

### ⚠️ R5 — Vệ sinh archive không nhất quán
- `API_PLAN.md` (654 dòng) và `DB_SCHEMA.md` (602 dòng) tự nhận là "planning artifact/proposal" — nhưng **đã được hiện thực** (`app/api/v1/*` + `schema.prisma`). Vì ở trong `archive/` và không gắn nhãn "implemented-by", người đọc dễ tưởng chưa build.
- Trộn ngôn ngữ: `WALLET_ONBOARDING_PLAN.md`, `project-status.md`, `workboard.md` viết **tiếng Việt** giữa các tài liệu tiếng Anh.
- Dữ liệu lịch sử lỗi thời: `core-release-wedge-progress.md` nhắc branch `feature/core-release-wedge`, cổng `3001`, chế độ `demo-safe`/`real-safe` — đã không còn đúng.
- Chỉ `IMPLEMENTATION_PLAN.md` có nhãn "Historical plan — superseded" rõ ràng; số còn lại thiếu nhãn thống nhất.

### ⚠️ R6 — Thiếu tài liệu so với kiến trúc đích
| Doc mục tiêu | Trạng thái | Ghi chú |
|---|---|---|
| `AGENTS.md` | ✅ có | |
| `README.md` (root) | ✅ có | |
| `docs/PRODUCT_SPEC.md` | ⚠️ gần nhất = `PROJECT.md` | chưa tách bạch spec vs status |
| `docs/AUTHORIZATION.md` | ❌ **thiếu** | logic phân quyền nằm rải rác: `product-policy.ts` (13 hàm assert…), `session-mapping.ts`, `role-utils.ts`; không có spec nào tập trung |
| `docs/PAYOUT_WORKFLOW.md` | ⚠️ gần nhất = `WORKFLOW_STATE_MACHINE.md` | nhưng ở trạng thái "proposed" (R2) |
| `docs/DATA_MODEL.md` | ⚠️ gần nhất = `DOMAIN_MODEL.md` | SSoT thực là `schema.prisma` |
| `docs/SECURITY_INVARIANTS.md` | ❌ **thiếu** | bất biến an toàn (role gate, actor alignment, cookie/session, env secret, EVM-address validate, duplicate-wallet guard) tồn tại trong code nhưng không được tài liệu hóa tập trung |

---

## 3. Thiết kế kiến trúc tài liệu đề xuất

### 3.1 Mô hình phân tầng "Source-of-Truth"

```
TẦNG 1 — Điều hướng / Định tuyến        (mỏng, thay đổi hiếm)
  AGENTS.md          → quy tắc routing theo loại task
  CONTEXT.md         → cheat-sheet một trang (stack, lệnh, bản đồ doc)
  docs/README.md     → bảng chỉ mục tài liệu + luật ưu tiên
  README.md (root)   → onboarding cho con người / bên ngoài repo

TẦNG 2 — Spec bất biến (SSoT, phải khớp code, gắn "verified against <path>")
  docs/PRODUCT_SPEC.md      ← làm mới từ PROJECT.md (why/what)
  docs/AUTHORIZATION.md     ← MỚI: ProductActor, bảng map role→actor (gồm ops→owner),
                              danh sách 13 policy + code 403, actor alignment
  docs/PAYOUT_WORKFLOW.md   ← chuyển WORKFLOW_STATE_MACHINE từ "proposed" → spec,
                              trỏ enum chuẩn từ schema.prisma
  docs/DATA_MODEL.md        ← chuyển DOMAIN_MODEL từ "proposed" → spec,
                              SSoT = prisma/schema.prisma
  docs/SECURITY_INVARIANTS.md ← MỚI: các bất biến bảo mật hiện hữu trong code

TẦNG 3 — Tham chiếu vận hành          (đọc khi cần làm việc cụ thể)
  ARCHITECTURE.md, CONVENTIONS.md, DEMO_GUIDE.md,
  GOOGLE_OAUTH_SETUP.md, HANDOFF.md

TẦNG 4 — Trạng thái / theo dõi         (có timestamp, một SSoT duy nhất cho số liệu)
  CURRENT_STATE.md      → số liệu live (test count, phase, commit) — ĐỊNH NGHĨA là SSoT
  FEATURE_MATRIX.md     → bảng trạng thái tính năng (không lặp số liệu CURRENT_STATE)
  REAL_PRODUCT_ROADMAP.md → kế hoạch tương lai (không phải "đã xong")

TẦNG 5 — Lưu trữ / archive            (chỉ lịch sử, có nhãn trạng thái)
  docs/archive/*        → phân loại rõ: implemented-by | superseded-by | historical
```

**Nguyên tắc bổ sung:**
1. **Mỗi file Tầng 2 phải gắn thẻ "SSoT"** ở header: `SSoT: prisma/schema.prisma` hoặc `SSoT: lib/runtime/product-policy.ts`, kèm `Last verified: <date>`. Khi SSoT (code) đổi mà chưa cập nhật doc → doc được đánh dấu stale.
2. **Quy tắc một-nguồn:** nội dung trạng thái chỉ nằm ở Tầng 4; `PROJECT.md`/`README.md` chỉ giữ phần tĩnh (why/what), không nhắc phase/route/out-of-scope động (cắt các mục "Current State/Current Routes" khỏi `PROJECT.md`).
3. **Các file "proposed" cũ:** hoặc nâng lên Tầng 2 (đánh dấu approved, trỏ SSoT code), hoặc hạ xuống Tầng 5. Không giữ trạng thái "proposed" cho thứ đã build.

### 3.2 Thiết kế an toàn tài liệu (safety design)

1. **Chuẩn header mỗi doc** (block 3 dòng đầu):
   ```
   Status: current | proposed | superseded
   SSoT: <đường dẫn file code làm gốc>   (bỏ trống nếu tự thân là gốc)
   Last verified: YYYY-MM  |  Owner: <người/team>
   ```
2. **Giải quyết triệt để R1 (vai trò):** tạo `docs/AUTHORIZATION.md` với bảng chuyển đổi rõ `WorkspaceMemberRole(4) → ProductActor(3)`, ghi chú `ops→owner`, liệt kê từng `assertCanX` trong `product-policy.ts` + `403` code + tham chiếu `role-utils.ts` (thứ tự quyền: contributor < reviewer < owner). Chọn 1 trong 2 hướng và ghi rõ vào doc: (a) giữ nguyên `ops→owner` (khuyến nghị, ít đổi code), hoặc (b) mở rộng `ProductActor` thành 4 giá trị — nhưng đó là thay đổi code, thuộc task khác.
3. **Luật cập nhật:** khi sửa enum/role trong code → bắt buộc chạm `DATA_MODEL.md`/`AUTHORIZATION.md`; khi đổi route group/số test → chạm `CURRENT_STATE.md`; nghiêm cấm sửa số liệu ở hai nơi.
4. **Chống tái phát drift (R4):** thêm bước "verify doc" vào `AGENTS.md` cho `review`/`release` workflow — grep nhanh các path cụ thể (ví dụ `app/(app)` thay vì `app/dashboard`) và enum so với `schema.prisma`.
5. **Vệ sinh archive (R5):** gắn nhãn thống nhất:
   - `API_PLAN.md`, `DB_SCHEMA.md` → `implemented-by: app/api/v1/*`, `implemented-by: prisma/schema.prisma`
   - `mvp-scope.md`, `WALLET_ONBOARDING_PLAN.md`, `checkpoint-2-*`, `MERGE_PREP/PR_BODY_*` → `superseded-by: docs/PROJECT.md`, `docs/ARCHITECTURE.md`
   - `project-status.md`, `workboard.md`, `core-release-wedge-progress.md`, `progress-summary-checkpoint-2.md` → `historical`
   - Cân nhắc dịch/ghi chú ngôn ngữ cho 3 file tiếng Việt để tránh lẫn lộn.
6. **Khung bất biến bảo mật (R6):** `docs/SECURITY_INVARIANTS.md` liệt kê các bất biến **đã tồn tại trong code**: anonymous mutation bị chặn `401 AUTH_REQUIRED`; actor alignment `assertActorUserAlignment`; `EVM-address` validation + duplicate-wallet guard trong `updateContributor`; workspace-scope check; `ARC_SERVER_PRIVATE_KEY` server-only ("never NEXT_PUBLIC_"); `browser_wallet` fail-explicit ở server. Đồng thời liệt kê **gap** hiện hữu (từ `KNOWN_ISSUES.md`): chưa có route-level integration/E2E cho auth, `sendUsdcOnArc` vẫn trả kết quả giả trong `mock`/`demo`, `lib/data/` còn mock cũ.

---

## 4. Lộ trình thực thi đề xuất (cho task sửa tài liệu sau này — chưa làm bây giờ)

1. **Batch A — thêm mới (an toàn nhất, không phá gì):** tạo `docs/AUTHORIZATION.md` + `docs/SECURITY_INVARIANTS.md`; thêm block chuẩn "Status/SSoT/Last verified" vào header các doc hiện có.
2. **Batch B — chuyển đổi trạng thái:** `DOMAIN_MODEL.md` + `WORKFLOW_STATE_MACHINE.md` đổi "proposed" → "spec" và gắn SSoT.
3. **Batch C — cắt trùng lặp:** bỏ phần "Current State/Routes/Out of Scope" khỏi `PROJECT.md` (chuyển vào `CURRENT_STATE.md`); sửa đường dẫn route cũ trong `ARCHITECTURE.md` sang `app/(app)/…`.
4. **Batch D — vệ sinh archive:** thêm nhãn `implemented-by`/`superseded-by`/`historical`; cập nhật `docs/README.md` để phản ánh Tầng 1–5.

---

## Phụ lục A — Bằng chứng đã xác minh từ code

| Chủ đề | File code (SSoT thực tế) | Khớp/không khớp với docs |
|---|---|---|
| 4 role DB | `prisma/schema.prisma` (`WorkspaceMemberRole`) | `DOMAIN_MODEL.md` liệt kê 4 role nhưng **không** giải thích gấp `ops→owner` (R1) |
| 3 actor runtime | `lib/runtime/product-context.ts` (`ProductActor`) | thiếu spec tập trung (R6) |
| Map role→actor | `lib/auth/session-mapping.ts` (`mapMembershipRoleToActor`) | thiếu spec tập trung (R6) |
| 13 policy hàm | `lib/runtime/product-policy.ts` (`assertCanX`) | thiếu spec tập trung (R6) |
| Thứ tự quyền | `lib/runtime/role-utils.ts` (contributor < reviewer < owner) | thiếu spec tập trung (R6) |
| Route thực tế | `app/(app)/…` | `ARCHITECTURE.md` ghi `app/dashboard/…` — sai path (R4) |
| Enum trạng thái | `prisma/schema.prisma` | `WORKFLOW_STATE_MACHINE.md` khớp enum nhưng tự xưng "proposed" (R2) |
| Số test live | `docs/CURRENT_STATE.md` (126/126) | SSoT đã khai báo; cần chống trùng lặp ở FEATURE_MATRIX/ROADMAP (R3) |
| Kế hoạch API/DB cũ | `docs/archive/API_PLAN.md`, `DB_SCHEMA.md` | đã hiện thực (`app/api/v1/*`, `schema.prisma`) nhưng thiếu nhãn `implemented-by` (R5) |

## Phụ lục B — Artifacts tạm (nằm ngoài repo, không cam kết)

- `/tmp/doc_inventory.txt` — cây thư mục + số dòng tất cả tài liệu.
- `/tmp/archive_heads.txt` — head của 15 file `docs/archive/*`.
- `/tmp/a5_e2e.sh` + `/tmp/a5_out3.txt` — script/kết quả E2E 23 check (A5, hoàn thành trước đó).
