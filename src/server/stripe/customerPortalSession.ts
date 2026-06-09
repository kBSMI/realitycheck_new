export interface CustomerPortalSessionRequest {
  userId: string;
  customerId?: string;
  returnUrl: string;
}

export interface CustomerPortalSessionResponse {
  status: 'mocked' | 'created' | 'not_configured';
  url?: string;
  message: string;
}

export async function createCustomerPortalSession(request: CustomerPortalSessionRequest): Promise<CustomerPortalSessionResponse> {
  return {
    status: 'mocked',
    url: `${request.returnUrl}?mock_customer_portal=1&user=${encodeURIComponent(request.userId)}`,
    message: 'Stripe customer portal placeholder. Codex should replace this with billingPortal.sessions.create on a server endpoint.',
  };
}
