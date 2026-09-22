-- Google/Circle accounts and Web3 accounts are independent product identities.
-- Legacy deterministic EOAs stay as historical records so referenced release
-- data remains intact, but cannot establish a Web3 session or fund a release.
UPDATE "UserWallet"
SET
  "authEnabled" = false,
  "transactionEnabled" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "kind" = 'legacy_export_eoa'::"UserWalletKind"
  AND ("authEnabled" = true OR "transactionEnabled" = true);
