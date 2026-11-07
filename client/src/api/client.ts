const BASE_URL = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('roscopal_auth_token');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('roscopal_auth_token', token);
  } else {
    localStorage.removeItem('roscopal_auth_token');
  }
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

export async function fetchPayPalConfig() {
  const res = await fetch(`${BASE_URL}/paypal/config`);
  return res.json();
}

export async function registerAccount(data: {
  name: string;
  email: string;
  password: string;
  paypalEmail?: string;
  location?: string;
}) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (json.token) {
    setAuthToken(json.token);
  }
  return json;
}

export async function loginAccount(data: { email: string; password: string }) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (json.token) {
    setAuthToken(json.token);
  }
  return json;
}

export async function logoutAccount() {
  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } finally {
    setAuthToken(null);
  }
}

export async function fetchCurrentUser() {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function fetchDemoPersonas() {
  const res = await fetch(`${BASE_URL}/demo/personas`);
  return res.json();
}

export async function fetchMyCircles(userId?: string) {
  const url = userId ? `${BASE_URL}/circles/my?userId=${userId}` : `${BASE_URL}/circles/my`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function createCircleWizard(data: any) {
  const res = await fetch(`${BASE_URL}/circles/wizard`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchInvitationPreview(code: string) {
  const res = await fetch(`${BASE_URL}/invitations/${code}`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function joinCircleWithCode(code: string, userId?: string) {
  const res = await fetch(`${BASE_URL}/invitations/${code}/join`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId })
  });
  return res.json();
}

export async function createCheckoutOrder(circleId: string, cycleId: string, memberId: string, amount: number, currency?: string) {
  const res = await fetch(`${BASE_URL}/contributions/checkout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ circleId, cycleId, memberId, amount, currency })
  });
  return res.json();
}

export async function confirmAiExtension(circleId: string, memberId: string, requestedDate: string, cycleId?: string) {
  const res = await fetch(`${BASE_URL}/ai/action/confirm-extension`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ circleId, memberId, requestedDate, cycleId })
  });
  return res.json();
}

export async function captureCheckoutOrder(orderId: string, contributionId?: string) {
  const res = await fetch(`${BASE_URL}/contributions/capture`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderId, contributionId })
  });
  return res.json();
}

export async function switchUser(userId: string) {
  const res = await fetch(`${BASE_URL}/auth/switch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId })
  });
  return res.json();
}

export async function fetchUsers() {
  const res = await fetch(`${BASE_URL}/users`);
  return res.json();
}

export async function fetchCircle(circleId: string) {
  const res = await fetch(`${BASE_URL}/circles/${circleId}`);
  return res.json();
}

export async function fetchMembers(circleId: string) {
  const res = await fetch(`${BASE_URL}/members/${circleId}`);
  return res.json();
}

export async function inviteMember(params: {
  circleId: string;
  name: string;
  email: string;
  paypalEmail?: string;
  location?: string;
}) {
  const res = await fetch(`${BASE_URL}/members/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return res.json();
}

export async function fetchCycles(circleId: string) {
  const res = await fetch(`${BASE_URL}/cycles/${circleId}`);
  return res.json();
}

export async function fetchContributions(circleId: string) {
  const res = await fetch(`${BASE_URL}/contributions/${circleId}`);
  return res.json();
}

export async function simulateMemberPayment(circleId: string, cycleId: string, memberId: string) {
  const res = await fetch(`${BASE_URL}/contributions/simulate-member-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ circleId, cycleId, memberId })
  });
  return res.json();
}

export async function fetchSafetyCheck(cycleId: string) {
  const res = await fetch(`${BASE_URL}/payouts/safety-check/${cycleId}`);
  return res.json();
}

export async function executePayout(cycleId: string) {
  const res = await fetch(`${BASE_URL}/payouts/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cycleId })
  });
  return res.json();
}

export async function fetchLedger(circleId: string) {
  const res = await fetch(`${BASE_URL}/ledger/${circleId}`);
  return res.json();
}

export async function verifyLedgerChain(circleId: string) {
  const res = await fetch(`${BASE_URL}/ledger/${circleId}/verify`);
  return res.json();
}

export async function sendAgentMessage(content: string, circleId: string) {
  const res = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, circleId })
  });
  return res.json();
}

export async function confirmAiCircle(policy: any, circleName?: string) {
  const res = await fetch(`${BASE_URL}/ai/confirm-circle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policy, circleName })
  });
  return res.json();
}

export async function runTestSuite() {
  const res = await fetch(`${BASE_URL}/test-suite/run`);
  return res.json();
}

export async function resetDemo() {
  const res = await fetch(`${BASE_URL}/demo/reset`, { method: 'POST' });
  return res.json();
}
