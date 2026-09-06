> **Historical / Superseded — not current SSoT.**

# SettleFlow — Product Architecture Audit

> Audit-only. Không sửa code, không stage/commit/push.

## 1. Kết luận điều hành

SettleFlow nên trở thành **payout operations platform cho crypto teams**:

```text
Tạo payout agreement → Contributor giao deliverable → Reviewer phê duyệt
→ Owner release USDC → Theo dõi transaction proof/reconciliation
```

Core hiện tại đã đúng hướng. Khoảng trống lớn nhất trước production là:

1. Authorization thật sự session-authoritative.
2. Transaction policy và spending controls.
3. Release/reconciliation đáng tin cậy.
4. Treasury visibility nhưng không biến thành custody/banking.
5. Audit trail bất biến và operational controls.

---

## 2. Current product

### Sản phẩm hiện tại

- Arc-native USDC payout workflow.
- Payout theo milestone.
- Contributor submission và proof links.
- Reviewer approve/reject.
- Owner release USDC.
- Transaction proof và activity ledger.
- Contributor directory.
- Dashboard, CSV export, webhook notifications.
- Arc execution qua `browser_wallet`, `circle_wallet`, mock/demo/real modes.

### Core workflow

```text
Owner tạo payout draft
  → Activate
  → Contributor submit deliverable
  → Reviewer approve/reject
  → Owner queue/release USDC
  → Proof được confirm/refresh
  → Cập nhật payout, milestone và activity
```

### Resource model

Hiện không có `Project` model. Scope thực tế là `Workspace`:

```text
User
  → WorkspaceMember(role)
  → Workspace
      → Contributor
      → Payout
          → Milestone
              → Submission
              → Review
              → Release
                  → TransactionProof
      → ActivityLog
```

User có thể thuộc nhiều Workspace. Payout và Contributor hiện scope theo Workspace, chưa có project-level scope.

---

## 3. Core problem và target user

### Vấn đề

Crypto teams thường trả contributor bằng chat, spreadsheet và manual wallet transfer. Kết quả:

- Thiếu approval flow.
- Không rõ payment state.
- Không kiểm soát thời điểm release.
- Khó audit.
- Khó đối chiếu DB với blockchain.

SettleFlow giải quyết **operational control của contributor payouts**, không chỉ việc gửi USDC.

### Target

- Crypto protocols.
- DAO/core teams.
- Web3 agencies.
- Venture studios.
- Protocol teams thuê nhiều contributor/contractor.
- Operations, finance và treasury leads.

### Core vs supporting

**Core:** payout agreement, milestone state machine, submission, review, release authorization, proof/reconciliation, workspace audit.

**Supporting:** contributor directory, dashboard, CSV, webhooks, theme/UI, faucet/testnet utilities, demo role switcher.

---

## 4. Missing capabilities

### P0 — cần có trước real production payment

- Session-authoritative identity và membership.
- Formal payout/milestone/release state machine.
- Release idempotency.
- Exact recipient, token, chain và amount validation.
- Per-transaction và workspace spending limits.
- Emergency pause/fail-closed execution.
- Pending/ambiguous reconciliation model.
- Wallet ownership verification bằng signed challenge/nonce.
- Audit events cho authorization và settlement intent.

### P1 — critical product capabilities

- Approval thresholds và dual approval.
- Recipient allowlist.
- Treasury read-only view: balance, reserved amount, exposure, pending releases.
- Reconciliation worker.
- Webhook retry/delivery log.
- Operational alerts.
- Multi-wallet identity model.
- Immutable audit export.
- Session revocation/rotation.
- Workspace invitation/member administration.

### P2 — differentiation/strategic

- Batch payouts.
- Recurring payouts.
- Conditional/programmatic settlement.
- Multi-step approval policies.
- Budget forecasting.
- Payment templates.
- Streaming/tranches.

### P3 — chưa nên build

- Private onchain transactions.
- Fiat banking rails.
- Custodial balances/deposits/withdrawals.
- Full accounting/ERP/payroll.
- Exchange, swap, lending hoặc yield.
- Full project-management suite.
- Full KYC/AML platform nếu chưa có regulatory mandate.
- DAO governance platform.

---

## 5. Security findings

### Authorization

`lib/auth/session-server.ts` hiện có dấu hiệu đang gộp nhiều trách nhiệm:

- Session resolution.
- User auto-provisioning.
- WorkspaceMember auto-creation.
- Chọn Workspace mặc định.
- Actor override từ cookie/query trong một số path.

Đây là rủi ro nếu authenticated actor có thể bị ghi đè bởi `sf_actor`, query hoặc client context. UI role switcher chỉ phù hợp demo/testing, không được dùng làm security boundary.

### Workspace isolation

Điểm tốt:

- Resource có `workspaceId`.
- Nhiều repository đã scope theo workspace.
- Có workspace mismatch checks.
- Có concurrency/reliability tests.

Cần harden:

- Centralize `requirePrincipal`, `requireWorkspaceMember`, `requirePermission`, `requireResourceScope`.
- Mọi query theo ID phải có workspace predicate ngay trong query hoặc repository boundary.
- Audit legacy `/api/*` và `/api/v1/*` để tránh khác biệt authorization.

### Identity/session

- Wallet login phải chứng minh ownership bằng challenge/nonce.
- Một User chỉ có một wallet field là hạn chế cho production.
- Cần wallet model riêng hỗ trợ nhiều wallet, chain, verifiedAt và status.
- Session cần expiry, rotation, revocation/version, secure cookie và production secret fail-closed.
- Session resolution không nên tạo DB records như side effect.

### Transaction authorization

Mỗi release phải server-side kiểm tra:

- Authenticated principal.
- Workspace membership.
- Payout/milestone state.
- Approved reviewer.
- Recipient/token/chain/amount.
- Source wallet.
- Idempotency.
- Spending limit.
- Emergency pause.

---

## 6. Architecture recommendation

### Module boundaries

```text
Identity
  → Principal/session/wallet challenge

Authorization
  → Membership, permission, resource scope

Domain workflows
  → Payout, milestone, release, reconciliation

Settlement adapter
  → Arc, browser wallet, server wallet, receipt verification

Policy engine
  → Limits, allowlists, thresholds, pause state

Operations
  → Audit, notifications, reconciliation jobs, alerts
```

### Data model nên chuẩn bị

- `Session` hoặc session revocation/version metadata.
- `WalletAddress` với `userId`, normalized address, chain, verifiedAt, status.
- `WorkspaceMember` unique `(workspaceId, userId)`, role, status, invitedBy.
- `ApprovalPolicy`.
- `ApprovalRequest`/`ApprovalStep`.
- `TransactionPolicy`.
- `RecipientAllowlist`.
- `ReleaseIntent`.
- `ReconciliationAttempt`.
- `WebhookDelivery`.
- Append-only `AuditEvent`.
- `IdempotencyKey`.

Chỉ thêm `Project` nếu một Workspace thực sự cần nhiều budget, member và policy độc lập.

---

## 7. Product boundary

### Nên build

- Workspace-scoped payout operations.
- Contributor compensation agreements.
- Milestone acceptance workflow.
- Approval separation.
- Controlled USDC settlement.
- Treasury/exposure visibility.
- Reconciliation.
- Audit và notifications.
- Arc settlement adapters.

### Không nên build

SettleFlow không nên trở thành:

- **Banking platform:** deposits, withdrawals, custodial balances, fiat rails.
- **Accounting platform:** general ledger, tax, payroll, AP/AR.
- **Project-management platform:** task board, sprint, chat, time tracking.
- **Exchange platform:** order book, swaps, trading custody, market making.

Có thể tích hợp các hệ thống trên qua webhook/export, nhưng không thay thế chúng.

---

## 8. Recommended roadmap

### Phase 1 — Authorization foundation

**Mục tiêu:** production-grade identity và permission.

**Capability:** Principal, session-derived role, membership checks, central permission helpers, explicit onboarding, wallet challenge.

**Dependency:** `User`, `WorkspaceMember`, auth/session hiện tại.

**Security impact:** giảm privilege escalation, IDOR và cross-workspace access.

### Phase 2 — Deterministic payout domain

**Mục tiêu:** lifecycle không thể bypass/double-release.

**Capability:** formal state machine, approval policy, separation-of-duties, idempotency, release intent, transaction policy.

**Dependency:** Phase 1.

**Security impact:** chặn state bypass, unauthorized approval, double release và invalid amount/recipient.

### Phase 3 — Safe settlement và reconciliation

**Mục tiêu:** production-safe Arc operations.

**Capability:** Arc adapter, receipt verifier, reconciliation worker, ambiguous outcome handling, retry policy, pause, limits, allowlists.

**Dependency:** Phase 2 và staging/prod infrastructure.

**Security impact:** giảm mất funds, double-spend và DB/onchain divergence.

### Phase 4 — Treasury operations

**Mục tiêu:** operator biết release có an toàn hay không.

**Capability:** balances, reserved exposure, pending obligations, low-balance alerts, funding readiness.

**Dependency:** Phase 3.

**Security impact:** giảm insufficient funds và uncontrolled exposure; vẫn non-custodial nếu chỉ hiển thị/kiểm soát execution.

### Phase 5 — Operational scale

**Mục tiêu:** giảm manual operations.

**Capability:** durable webhooks, retries, alerts, audit export, batch payouts, templates, recurring schedules nếu có demand.

**Dependency:** lifecycle, audit và reconciliation ổn định.

**Security impact:** cần idempotent delivery, schedule authorization và batch approval.

### Phase 6 — Programmable settlement

**Mục tiêu:** tạo Arc-native differentiation.

**Capability:** conditional release, multi-step approval, budget gates, programmable rules, streaming/tranches.

**Dependency:** các phase trước.

**Security impact:** cần policy versioning, simulation, explicit consent và abort semantics.

---

## 9. Permission model

### Owner

**Có quyền:**

- Quản lý workspace members và roles.
- Tạo, sửa, activate payout.
- Cấu hình approval/transaction policies.
- Approve release intent và release settlement.
- Retry/reconcile exceptional releases.
- Quản lý recipient allowlist.
- Xem toàn bộ payout, treasury và audit.
- Cấu hình integrations/webhooks.

**Vẫn phải tuân thủ:**

- Business state rules của payout/milestone/release.
- Separation-of-duties nếu policy của workspace yêu cầu; Owner không cần switch sang Reviewer để approve.
- Transaction limits và emergency controls.
- Immutable audit records không được xóa.

### Reviewer

**Có quyền:**

- Xem payout được policy cho phép.
- Review milestone submissions.
- Approve/reject kèm comment.
- Xem contributor/proof liên quan.
- Trigger status refresh/reconciliation không tạo giao dịch.

**Không có quyền:**

- Tạo/activate payout.
- Đổi recipient hoặc amount.
- Release funds.
- Đổi workspace policy.
- Quản lý members.
- Approve submission của chính mình.

### Contributor

**Có quyền:**

- Xem payout được assign cho mình.
- Submit/resubmit deliverable.
- Đính kèm proof/artifact links.
- Xem feedback.
- Theo dõi settlement status của mình.
- Cập nhật profile cá nhân nếu policy cho phép.

**Không có quyền:**

- Xem payout không liên quan.
- Đổi amount/recipient.
- Approve/reject.
- Release funds.
- Quản lý contributors khác.
- Đổi workspace settings.

---

## Final recommendation

Giữ nguyên wedge **payout operations + approval-controlled USDC settlement cho crypto teams**.

Ưu tiên tiếp theo:

1. Sửa và tách authorization/session boundary.
2. Tách provisioning khỏi session resolver.
3. Xây transaction policy.
4. Formalize release intent và idempotency.
5. Xây reconciliation.
6. Thêm treasury visibility.
7. Sau đó mới xây batch, recurring và programmable settlement.

**Chưa nên mở rộng UI hoặc thêm các feature banking/accounting/exchange.**

---

## Permission Architecture Audit — Finalized Model

### Audit verdict

Implementation hiện tại **chưa conform hoàn toàn** với permission model finalized.
Các blocker chính:

1. Owner đang bị chặn approve/reject milestone.
2. Session resolver vẫn có auto-provision User và tự gán User vào Workspace đầu tiên.
3. Role vẫn có thể bị suy từ email.
4. Authenticated cookie-store path vẫn cho phép actor override.
5. Contributor visibility chưa được filter nhất quán ngay tại database query.
6. Một số resource được fetch bằng ID trước rồi mới kiểm tra workspace.

### Current architecture

```text
sf_session
  → User
  → WorkspaceMember
  → ProductContext
  → API policy/repository
```

Hướng kiến trúc này đúng, nhưng `ProductContext` vẫn còn demo-era fields (`actor`, role-specific user IDs) và legacy fallback. Authorization production phải dựa trên:

```text
authenticated principal
  → WorkspaceMember của workspace hiện tại
  → stored role
  → permission check
  → workspace-scoped resource query
```

### Enforced matrix vs finalized model

| Capability | Owner | Reviewer | Contributor |
|---|---:|---:|---:|
| View all workspace data | Partial/PASS | Partial/PASS | FAIL — list/dashboard/activity chưa filter đủ |
| Create payout | PASS | PASS blocked | PASS blocked |
| Edit/activate payout | PASS | PASS blocked | PASS blocked |
| Delete payout | NOT IMPLEMENTED/UNCLEAR | blocked | blocked |
| Manage contributors | FAIL — creator exception còn tồn tại | blocked | blocked |
| Approve/reject milestone | **FAIL — Owner bị chặn** | PASS | blocked |
| Submit/resubmit milestone | blocked | blocked | PASS, nhưng identity matching chưa ổn định |
| Release funds | PASS | PASS blocked | PASS blocked |
| Retry/refresh settlement | PASS | PASS blocked | PASS blocked |
| Workspace settings | PASS | blocked | blocked |

### Violations and gaps

#### P0 — Owner cannot approve/reject

- **File:** `lib/runtime/product-policy.ts`, `assertCanApproveMilestone`, `assertCanRejectMilestone`; approve/reject routes.
- **Current:** policy chỉ chấp nhận actor `reviewer`.
- **Expected:** Owner hoặc Reviewer được approve/reject; Owner không cần switch role.
- **Fix recommendation:** cho phép `owner` và `reviewer`, nhưng vẫn giữ milestone state validation, rejection comment và các business rules khác.

#### P0 — Automatic workspace assignment

- **File:** `lib/auth/session-server.ts`, `resolveSessionMemberships`.
- **Current:** User chưa có membership được gán vào Workspace đầu tiên; default role có thể là Owner.
- **Expected:** authenticated user không có membership phải bị từ chối workspace access.
- **Fix recommendation:** session resolution chỉ đọc User + WorkspaceMember; provisioning phải là flow explicit, không chạy trong authorization request.

#### P0 — Role inferred from email

- **File:** `lib/auth/session-server.ts`.
- **Current:** email chứa `reviewer`, `contributor`, `builder` ảnh hưởng role.
- **Expected:** role chỉ lấy từ `WorkspaceMember.role`.
- **Fix recommendation:** loại bỏ email-based role inference.

#### P0 — Client actor/role can affect context

- **Files:** `lib/auth/session-server.ts`, `lib/runtime/product-context-client.ts`, `lib/runtime/product-context-server.ts`, `proxy.ts`.
- **Current:** actor có thể đi qua query, cookie, header; authenticated cookie-store resolver còn áp dụng actor override.
- **Expected:** client role switcher chỉ phục vụ UI/demo; không authoritative.
- **Fix recommendation:** authenticated server context luôn derive actor và user ID từ stored membership/session.

#### P0 — Contributor data visibility is not consistently scoped

- **Files:** dashboard, payout list, activity repositories/routes/pages.
- **Current:** nhiều read model load toàn bộ workspace data; detail policy mới filter một phần.
- **Expected:** Contributor chỉ được xem payout/milestone/settlement được assign cho mình.
- **Fix recommendation:** filter ở DB bằng `workspaceId` + `contributor.linkedUserId = principal.userId`, không filter ở client.

#### P0 — Contributor identity matching is unreliable

- **File:** `lib/runtime/product-policy.ts`, `assertCanViewPayout`.
- **Current:** so sánh email với User ID và wallet address với User ID.
- **Expected:** dùng `Contributor.linkedUserId` hoặc verified wallet relation.
- **Fix recommendation:** không cho phép ownership suy đoán từ email/request body.

#### P0 — Resource fetched by ID before workspace authorization

- **Files:** contributor, milestone, release repositories và các route tương ứng.
- **Current:** một số flow dùng `findUnique({ where: { id } })`, sau đó mới compare workspace.
- **Expected:** resource query phải scope ngay từ đầu.
- **Fix recommendation:** repository function protected nhận `workspaceId` bắt buộc và dùng relational predicate.

#### P1 — Contributor creator exception violates model

- **File:** `lib/runtime/product-policy.ts`, `assertCanManageContributor`.
- **Current:** creator của Contributor có thể update/delete contributor.
- **Expected:** chỉ Owner được manage contributors.
- **Fix recommendation:** bỏ creator exception; chỉ dùng stored WorkspaceMember role.

#### P1 — Multiple roles per workspace are allowed by schema

- **File:** `prisma/schema.prisma`, `WorkspaceMember`.
- **Current:** unique key là `(workspaceId, userId, role)`, cho phép một user có nhiều role trong cùng workspace.
- **Expected:** một user có một authoritative role trong một workspace.
- **Fix recommendation:** sau khi được duyệt schema change, cân nhắc unique `(workspaceId, userId)`.

#### P1 — Auth fallback is not cleanly separated

- **Files:** `lib/auth/session-server.ts`, `lib/runtime/product-context-server.ts`.
- **Current:** invalid/unresolved session có thể rơi về request/demo context ở một số helper.
- **Expected:** unauthenticated = 401; no membership/insufficient role = 403; không fallback demo context.
- **Fix recommendation:** tách `resolveAuthenticatedPrincipal()` và `resolveDemoContext()`.

#### P1 — `ops` role is not finalized

- **Files:** Prisma enum, session mapping, repository permissions.
- **Current:** `ops` được map ngầm thành Owner ở một lớp, nhưng xử lý khác nhau ở lớp khác.
- **Expected:** product model chỉ có Owner/Reviewer/Contributor, hoặc phải có explicit compatibility mapping.
- **Fix recommendation:** quyết định migration/compatibility policy trước khi mở rộng permission.

### Specific requested checks

- Role inferred from email: **violation — P0**.
- Client-provided actor/role trusted: **violation/risk — P0**.
- Automatic Workspace assignment: **violation — P0**.
- Contributor accessing another contributor payout: **risk/likely gap — P0**, do list/dashboard/activity filtering chưa đủ.
- Reviewer releasing funds: **currently blocked — PASS**, nhưng cần direct API regression tests.
- Reviewer creating/editing payouts: **currently blocked — PASS**, subject to removing fallback/override paths.
- Contributor creating payouts: **currently blocked — PASS**, subject to same condition.
- Cross-workspace access: **partially protected**, nhưng ID-only fetch và optional workspace scope còn rủi ro.
- Owner unnecessarily blocked: **violation — P0**, approve/reject milestone.
- UI-only permission enforcement: **not universal**; mutation policies tồn tại, nhưng read visibility và context resolution chưa fail-closed.

### Recommended implementation order

1. Remove auto-provision/default workspace assignment from authorization path.
2. Remove email-based role inference.
3. Make authenticated context strictly session → User → WorkspaceMember.
4. Remove authenticated actor override and demo fallback.
5. Allow Owner approve/reject while preserving state validation.
6. Remove contributor creator exception.
7. Make every protected resource query workspace-scoped at query time.
8. Add contributor-only DB filtering for payout/dashboard/activity reads.
9. Resolve contributor identity only through linked/verified identity.
10. Decide `ops` compatibility and one-role-per-workspace semantics.
11. Add direct API matrix tests for Owner/Reviewer/Contributor and cross-workspace cases.

**Implementation update:** approved authorization fixes have now been applied in code. Prisma schema remains unchanged. Transaction policy, reconciliation architecture, and `ops` compatibility remain intentionally untouched. See the final implementation report in the task response for verification results and remaining risks.
