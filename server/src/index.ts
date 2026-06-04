import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import admin, { db } from './config/firebase-admin';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;
const USER_SUBSCRIPTIONS_COLLECTION = 'userSubscriptions';
const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

type PlanId = 'starter' | 'growth' | 'premium';

interface AuthenticatedRequest extends express.Request {
  user?: admin.auth.DecodedIdToken;
}

interface RazorpayPaymentLinkResponse {
  id: string;
  short_url: string;
  reference_id?: string;
  status: string;
  notes?: Record<string, string>;
}

const PLAN_PRICES: Record<PlanId, { name: string; amountInPaise: number }> = {
  starter: { name: 'Starter', amountInPaise: 29900 },
  growth: { name: 'Growth', amountInPaise: 59900 },
  premium: { name: 'Premium', amountInPaise: 99900 },
};

const requireAuth = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Failed to verify auth token:', error);
    return res.status(401).json({ error: 'Invalid authorization token.' });
  }
};

const getRazorpayCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured on the server.');
  }

  return { keyId, keySecret };
};

const callRazorpay = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const { keyId, keySecret } = getRazorpayCredentials();
  const authorization = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const response = await fetch(`${RAZORPAY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${authorization}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const payload = (await response.json()) as {
    error?: { description?: string };
    description?: string;
  };

  if (!response.ok) {
    const errorMessage =
      payload?.error?.description ||
      payload?.description ||
      'Razorpay request failed.';
    throw new Error(errorMessage);
  }

  return payload as T;
};

const buildReferenceId = (userId: string, planId: PlanId) => {
  return `DF-${planId[0]}-${userId.slice(0, 6)}-${randomUUID().slice(0, 8)}`;
};

const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

app.post('/api/billing/create-payment-link', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.uid;
  const email = req.user?.email || '';
  const { planId, appBaseUrl } = req.body as { planId?: PlanId; appBaseUrl?: string };

  if (!userId) {
    return res.status(401).json({ error: 'User is not authenticated.' });
  }

  if (!planId || !PLAN_PRICES[planId]) {
    return res.status(400).json({ error: 'Invalid plan selected.' });
  }

  if (!appBaseUrl || typeof appBaseUrl !== 'string') {
    return res.status(400).json({ error: 'Missing app base URL.' });
  }

  try {
    const plan = PLAN_PRICES[planId];
    const referenceId = buildReferenceId(userId, planId);
    const callbackUrl = `${trimTrailingSlash(appBaseUrl)}/upgrade/callback`;

    const paymentLink = await callRazorpay<RazorpayPaymentLinkResponse>('/payment_links', {
      method: 'POST',
      body: JSON.stringify({
        amount: plan.amountInPaise,
        currency: 'INR',
        accept_partial: false,
        description: `DairyFlow ${plan.name} Plan Subscription`,
        reference_id: referenceId,
        callback_url: callbackUrl,
        callback_method: 'get',
        reminder_enable: true,
        notify: {
          email: false,
          sms: false,
        },
        customer: {
          email,
        },
        notes: {
          userId,
          planId,
          email,
        },
      }),
    });

    await db.collection(USER_SUBSCRIPTIONS_COLLECTION).doc(userId).set(
      {
        userId,
        email,
        pendingPlan: planId,
        pendingPaymentLinkId: paymentLink.id,
        pendingReferenceId: referenceId,
        updatedAt: admin.firestore.Timestamp.now(),
      },
      { merge: true }
    );

    return res.json({
      planId,
      shortUrl: paymentLink.short_url,
      paymentLinkId: paymentLink.id,
    });
  } catch (error) {
    console.error('Failed to create payment link:', error);
    return res.status(500).json({
      error: (error as Error).message || 'Failed to create payment link.',
    });
  }
});

app.post('/api/billing/verify-payment-link', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.uid;
  const {
    razorpay_payment_id,
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
  } = req.body as {
    razorpay_payment_id?: string;
    razorpay_payment_link_id?: string;
    razorpay_payment_link_reference_id?: string;
    razorpay_payment_link_status?: string;
  };

  if (!userId) {
    return res.status(401).json({ error: 'User is not authenticated.' });
  }

  if (
    !razorpay_payment_id ||
    !razorpay_payment_link_id ||
    !razorpay_payment_link_reference_id ||
    !razorpay_payment_link_status
  ) {
    return res.status(400).json({ error: 'Payment callback payload is incomplete.' });
  }

  try {
    const subscriptionRef = db.collection(USER_SUBSCRIPTIONS_COLLECTION).doc(userId);
    const subscriptionSnapshot = await subscriptionRef.get();

    if (!subscriptionSnapshot.exists) {
      return res.status(404).json({ error: 'Subscription profile not found.' });
    }

    const subscriptionData = subscriptionSnapshot.data() as {
      activePlan?: PlanId;
      planExpiresAt?: admin.firestore.Timestamp;
      pendingPlan?: PlanId;
      pendingPaymentLinkId?: string;
      pendingReferenceId?: string;
    };

    if (
      subscriptionData.pendingPaymentLinkId !== razorpay_payment_link_id ||
      subscriptionData.pendingReferenceId !== razorpay_payment_link_reference_id ||
      !subscriptionData.pendingPlan
    ) {
      return res.status(400).json({ error: 'This payment does not match the pending plan checkout.' });
    }

    const paymentLink = await callRazorpay<RazorpayPaymentLinkResponse>(`/payment_links/${razorpay_payment_link_id}`, {
      method: 'GET',
    });

    if (paymentLink.status !== 'paid' || razorpay_payment_link_status !== 'paid') {
      return res.status(400).json({ error: 'Payment has not been completed yet.' });
    }

    if (paymentLink.reference_id !== razorpay_payment_link_reference_id) {
      return res.status(400).json({ error: 'Payment reference does not match.' });
    }

    if (paymentLink.notes?.userId !== userId || paymentLink.notes?.planId !== subscriptionData.pendingPlan) {
      return res.status(400).json({ error: 'Payment link verification failed for this user.' });
    }

    const now = new Date();
    const currentPlanExpiresAt = subscriptionData.planExpiresAt?.toDate();
    const extensionBaseDate =
      subscriptionData.activePlan === subscriptionData.pendingPlan &&
      currentPlanExpiresAt &&
      currentPlanExpiresAt > now
        ? currentPlanExpiresAt
        : now;
    const expiresAt = new Date(extensionBaseDate);
    expiresAt.setDate(expiresAt.getDate() + 30);

    await subscriptionRef.set(
      {
        status: 'active',
        activePlan: subscriptionData.pendingPlan,
        planActivatedAt: admin.firestore.Timestamp.fromDate(now),
        planExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        pendingPlan: null,
        pendingPaymentLinkId: null,
        pendingReferenceId: null,
        lastPaymentId: razorpay_payment_id,
        updatedAt: admin.firestore.Timestamp.fromDate(now),
      },
      { merge: true }
    );

    return res.json({
      success: true,
      planId: subscriptionData.pendingPlan,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to verify payment link:', error);
    return res.status(500).json({
      error: (error as Error).message || 'Failed to verify payment link.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`DairyFlow Backend Server running on http://localhost:${PORT}`);
});
