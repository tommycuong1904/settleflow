-- An optional, account-scoped record of a user's decision to defer the
-- Web2 payment-account onboarding. Existing users remain unaffected.
ALTER TABLE "User" ADD COLUMN "paymentAccountOnboardingSkippedAt" TIMESTAMP(3);
