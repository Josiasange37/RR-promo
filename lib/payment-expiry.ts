/**
 * lib/payment-expiry.ts — shared config for expiring abandoned payments.
 *
 * A hosted collection that is never completed on CamerPay's side stays PENDING
 * in our database until the webhook arrives. If the voter abandons the payment,
 * no final status is ever recorded. This constant is how long a transaction is
 * allowed to remain PENDING before the app marks it FAILED.
 *
 * The user asked that a non-valid payment be recorded as FAILED after the
 * necessary payment time (≈30 minutes or 1 hour). Default: 1 hour of leeway.
 */
export const PAYMENT_EXPIRY_MS =
  Number(process.env.PAYMENT_EXPIRY_MINUTES ?? 30) * 60 * 1000

export const PAYMENT_EXPIRY_MINUTES = PAYMENT_EXPIRY_MS / 60_000