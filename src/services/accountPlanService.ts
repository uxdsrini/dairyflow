import { User } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import {
  Timestamp,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { FOUNDING_MEMBER_LIMIT, PLAN_VALIDITY_DAYS, TRIAL_LENGTH_DAYS } from '../config/plans';
import { PlanId, UserSubscriptionProfile } from '../types';

const COLLECTION = 'userSubscriptions';
const CONFIGURED_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const CONFIGURED_APP_BASE_URL = (import.meta.env.VITE_APP_BASE_URL || '').replace(/\/$/, '');
const API_BASE_URL = import.meta.env.DEV ? '' : CONFIGURED_API_BASE_URL;
const BILLING_UNAVAILABLE_MESSAGE = import.meta.env.DEV
  ? 'Billing service is unavailable. Run `npm run dev` to start both frontend and backend.'
  : 'Billing service is unavailable. Please try again in a moment.';

export interface BillingCallbackPayload {
  razorpay_payment_id: string;
  razorpay_payment_link_id: string;
  razorpay_payment_link_reference_id: string;
  razorpay_payment_link_status: string;
  razorpay_signature?: string;
}

const isNativePlatform = () => Capacitor.isNativePlatform();

const getBillingConfigurationError = () => {
  if (import.meta.env.DEV) {
    return null;
  }

  if (!isNativePlatform()) {
    return null;
  }

  if (!CONFIGURED_API_BASE_URL) {
    return 'Billing is not configured for this APK yet. Set `VITE_API_BASE_URL` to your public backend URL and rebuild the app.';
  }

  return null;
};

export const getBillingAppBaseUrl = () => {
  if (CONFIGURED_APP_BASE_URL) {
    return CONFIGURED_APP_BASE_URL;
  }

  return window.location.origin;
};

const getBillingApiBaseUrl = () => {
  const configurationError = getBillingConfigurationError();
  if (configurationError) {
    throw new Error(configurationError);
  }

  return API_BASE_URL;
};

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const toDate = (timestamp?: Timestamp | null) => {
  if (!timestamp) return null;
  return timestamp.toDate();
};

const buildDefaultProfile = (user: User, isFoundingMember: boolean): UserSubscriptionProfile => {
  const now = new Date();
  const createdAt = Timestamp.fromDate(now);
  return {
    id: user.uid,
    userId: user.uid,
    email: user.email || '',
    status: 'trial',
    trialPlan: 'premium',
    activePlan: null,
    trialStartedAt: createdAt,
    trialEndsAt: Timestamp.fromDate(addDays(now, TRIAL_LENGTH_DAYS)),
    planActivatedAt: null,
    planExpiresAt: null,
    isFoundingMember,
    pricingLockedUntil: isFoundingMember ? Timestamp.fromDate(addDays(now, 365)) : null,
    pendingPlan: null,
    pendingPaymentLinkId: null,
    pendingReferenceId: null,
    lastPaymentId: null,
    createdAt,
    updatedAt: createdAt,
  };
};

export const getEffectivePlan = (profile: UserSubscriptionProfile | null) => {
  if (!profile) return null;

  const now = new Date();
  const trialEndsAt = toDate(profile.trialEndsAt);
  const planExpiresAt = toDate(profile.planExpiresAt);

  if (profile.status === 'trial' && trialEndsAt && trialEndsAt > now) {
    return profile.trialPlan;
  }

  if (profile.status === 'active' && profile.activePlan && planExpiresAt && planExpiresAt > now) {
    return profile.activePlan;
  }

  return null;
};

export const getDaysRemaining = (timestamp?: Timestamp | null) => {
  if (!timestamp) return 0;
  const diff = timestamp.toDate().getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const syncSubscriptionStatus = async (profile: UserSubscriptionProfile) => {
  const now = new Date();
  const trialEndsAt = toDate(profile.trialEndsAt);
  const planExpiresAt = toDate(profile.planExpiresAt);
  const trialEnded = profile.status === 'trial' && !!trialEndsAt && trialEndsAt <= now;
  const paidPlanExpired = profile.status === 'active' && !!planExpiresAt && planExpiresAt <= now;

  if (!trialEnded && !paidPlanExpired) {
    return profile;
  }

  const nextProfile: UserSubscriptionProfile = {
    ...profile,
    status: 'expired',
    activePlan: paidPlanExpired ? null : profile.activePlan,
    planActivatedAt: paidPlanExpired ? null : profile.planActivatedAt || null,
    planExpiresAt: paidPlanExpired ? null : profile.planExpiresAt || null,
    updatedAt: Timestamp.now(),
  };

  await updateDoc(doc(db, COLLECTION, profile.userId), {
    status: nextProfile.status,
    activePlan: nextProfile.activePlan,
    planActivatedAt: nextProfile.planActivatedAt,
    planExpiresAt: nextProfile.planExpiresAt,
    updatedAt: nextProfile.updatedAt,
  });

  return nextProfile;
};

export const ensureUserSubscriptionProfile = async (user: User) => {
  const ref = doc(db, COLLECTION, user.uid);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    return syncSubscriptionStatus({ id: snapshot.id, ...snapshot.data() } as UserSubscriptionProfile);
  }

  const countSnapshot = await getCountFromServer(collection(db, COLLECTION));
  const isFoundingMember = countSnapshot.data().count < FOUNDING_MEMBER_LIMIT;
  const profile = buildDefaultProfile(user, isFoundingMember);

  await setDoc(ref, profile);
  return profile;
};

export const subscribeToUserPlan = (
  user: User,
  onChange: (profile: UserSubscriptionProfile) => void,
  onError?: (error: Error) => void
) => {
  const ref = doc(db, COLLECTION, user.uid);

  return onSnapshot(
    ref,
    (snapshot) => {
      void (async () => {
        try {
          if (!snapshot.exists()) {
            const created = await ensureUserSubscriptionProfile(user);
            onChange(created);
            return;
          }

          const profile = await syncSubscriptionStatus({
            id: snapshot.id,
            ...snapshot.data(),
          } as UserSubscriptionProfile);
          onChange(profile);
        } catch (error) {
          onError?.(error as Error);
        }
      })();
    },
    (error) => onError?.(error)
  );
};

const getAuthHeaders = async (user: User) => {
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const parseJsonResponse = async <T>(response: Response) => {
  const raw = await response.text();

  if (!raw) {
    return {} as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    const looksLikeHtml = /<!doctype html|<html[\s>]/i.test(raw);
    const configurationError = getBillingConfigurationError();

    if (looksLikeHtml && configurationError) {
      throw new Error(configurationError);
    }

    throw new Error(
      response.ok
        ? 'Billing service returned an unreadable response.'
        : `Billing service returned an unreadable error (${response.status}).`
    );
  }
};

const activateVerifiedPlan = async (
  user: User,
  planId: PlanId,
  expiresAtIso: string,
  paymentId?: string
) => {
  const ref = doc(db, COLLECTION, user.uid);
  const snapshot = await getDoc(ref);
  const existing = snapshot.exists()
    ? ({ id: snapshot.id, ...snapshot.data() } as UserSubscriptionProfile)
    : await ensureUserSubscriptionProfile(user);

  const now = Timestamp.now();
  const expiresAt = new Date(expiresAtIso);
  const safeExpiresAt = Number.isNaN(expiresAt.getTime()) ? addDays(new Date(), PLAN_VALIDITY_DAYS) : expiresAt;

  await setDoc(
    ref,
    {
      ...existing,
      email: user.email || existing.email || '',
      status: 'active',
      activePlan: planId,
      planActivatedAt: now,
      planExpiresAt: Timestamp.fromDate(safeExpiresAt),
      pendingPlan: null,
      pendingPaymentLinkId: null,
      pendingReferenceId: null,
      lastPaymentId: paymentId || existing.lastPaymentId || null,
      updatedAt: now,
    },
    { merge: true }
  );
};

export const createPaymentLink = async (user: User, planId: PlanId, appBaseUrl: string) => {
  const apiBaseUrl = getBillingApiBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/billing/create-payment-link`, {
      method: 'POST',
      headers: await getAuthHeaders(user),
      body: JSON.stringify({ planId, appBaseUrl }),
    });
  } catch {
    throw new Error(BILLING_UNAVAILABLE_MESSAGE);
  }

  const payload = await parseJsonResponse<{ error?: string; shortUrl: string; planId: PlanId }>(response);

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to create payment link.');
  }

  return payload as { shortUrl: string; planId: PlanId };
};

export const verifyPaymentLink = async (user: User, callbackPayload: BillingCallbackPayload) => {
  const apiBaseUrl = getBillingApiBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/billing/verify-payment-link`, {
      method: 'POST',
      headers: await getAuthHeaders(user),
      body: JSON.stringify(callbackPayload),
    });
  } catch {
    throw new Error(BILLING_UNAVAILABLE_MESSAGE);
  }

  const payload = await parseJsonResponse<{ error?: string; success: true; planId: PlanId; expiresAt: string; paymentId?: string }>(
    response
  );

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to verify payment.');
  }

  await activateVerifiedPlan(user, payload.planId, payload.expiresAt, payload.paymentId || callbackPayload.razorpay_payment_id);

  return payload as { success: true; planId: PlanId; expiresAt: string; paymentId?: string };
};

export const isBillingCallbackPayload = (searchParams: URLSearchParams) => {
  return (
    searchParams.has('razorpay_payment_id') &&
    searchParams.has('razorpay_payment_link_id') &&
    searchParams.has('razorpay_payment_link_reference_id') &&
    searchParams.has('razorpay_payment_link_status')
  );
};

export const getPlanDurationDays = () => PLAN_VALIDITY_DAYS;
