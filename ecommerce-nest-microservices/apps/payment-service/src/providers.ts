import { randomBytes } from 'crypto';

export interface CreatePaymentInput {
  amount: number;
  currency: string;
  referenceId: string; // our PaymentOrder id
}
export interface CreatePaymentResult {
  paymentLinkId: string;
  checkoutUrl: string;
}

/**
 * Gateway abstraction. Implement this interface for Razorpay / Stripe
 * (create order/session in createPayment, call the refund API in refund)
 * and select it via PAYMENT_PROVIDER in payment.module.ts.
 */
export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  refund(input: { providerPaymentId: string; amount: number; reason?: string }): Promise<{ providerRefundId: string }>;
}

/** Development provider – payments are "completed" by calling POST /api/payments/confirm. */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const id = `mock_${randomBytes(8).toString('hex')}`;
    const gatewayUrl = (process.env.GATEWAY_PUBLIC_URL ?? 'http://localhost:8000').replace(/\/+$/, '');
    return { paymentLinkId: id, checkoutUrl: `${gatewayUrl}/api/payments/confirm#${id}` };
  }

  async refund() {
    return { providerRefundId: `mock_rf_${randomBytes(6).toString('hex')}` };
  }
}
