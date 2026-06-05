import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FEATURE_ACCESS, FeatureKey, PLAN_DEFINITIONS, getCustomerLimit, getNextPlan, hasPlanAccess } from '../config/plans';
import {
  BillingCallbackPayload,
  createPaymentLink,
  ensureUserSubscriptionProfile,
  getBillingAppBaseUrl,
  getDaysRemaining,
  getEffectivePlan,
  isBillingCallbackPayload,
  subscribeToUserPlan,
  verifyPaymentLink,
} from '../services/accountPlanService';
import { clearPostUpgradeAction, savePostUpgradeAction } from '../services/postUpgradeActionService';
import { PlanId, UserSubscriptionProfile } from '../types';
import { useAuth } from './AuthContext';

type UpgradeReason = 'manual' | 'trial_expired' | 'feature_locked' | 'limit_reached';

interface UpgradeModalState {
  open: boolean;
  reason: UpgradeReason;
  title: string;
  description: string;
  recommendedPlan: PlanId;
  featureKey?: FeatureKey;
}

interface SubscriptionContextType {
  subscription: UserSubscriptionProfile | null;
  loading: boolean;
  effectivePlan: PlanId | null;
  trialDaysLeft: number;
  planDaysLeft: number;
  upgradeModalState: UpgradeModalState;
  checkoutLoadingPlan: PlanId | null;
  canAccessFeature: (featureKey: FeatureKey) => boolean;
  requestFeatureAccess: (featureKey: FeatureKey) => boolean;
  openUpgradeModal: (featureKey?: FeatureKey) => void;
  closeUpgradeModal: () => void;
  startCheckout: (planId: PlanId) => Promise<void>;
  verifyCheckoutCallback: (searchParams: URLSearchParams) => Promise<{ planId: PlanId; expiresAt: string; paymentId?: string }>;
  isCustomerLimitReached: (customerCount: number) => boolean;
}

const defaultUpgradeState: UpgradeModalState = {
  open: false,
  reason: 'manual',
  title: 'Unlock DairyFlow Plans',
  description: 'Choose the plan that matches your dairy business and activate it through Razorpay.',
  recommendedPlan: 'starter',
};

const SubscriptionContext = createContext<SubscriptionContextType>({} as SubscriptionContextType);

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscriptionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<PlanId | null>(null);
  const [upgradeModalState, setUpgradeModalState] = useState<UpgradeModalState>(defaultUpgradeState);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!currentUser) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    let unsubscribe: () => void = () => {};
    setLoading(true);

    void (async () => {
      try {
        await ensureUserSubscriptionProfile(currentUser);
        unsubscribe = subscribeToUserPlan(
          currentUser,
          (profile) => {
            setSubscription(profile);
            setLoading(false);
          },
          (error) => {
            console.error('Failed to load subscription profile:', error);
            toast.error('Failed to load plan details');
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Failed to initialize subscription profile:', error);
        toast.error('Failed to initialize billing profile');
        setLoading(false);
      }
    })();

    return () => unsubscribe();
  }, [authLoading, currentUser]);

  const effectivePlan = useMemo(() => getEffectivePlan(subscription), [subscription]);
  const trialDaysLeft = useMemo(() => getDaysRemaining(subscription?.trialEndsAt), [subscription]);
  const planDaysLeft = useMemo(() => getDaysRemaining(subscription?.planExpiresAt), [subscription]);

  useEffect(() => {
    if (!currentUser || !subscription || effectivePlan || loading) {
      return;
    }

    const promptKey = `dairyflow-upgrade-prompt-${currentUser.uid}-${subscription.updatedAt?.seconds || '0'}`;
    if (sessionStorage.getItem(promptKey)) {
      return;
    }

    sessionStorage.setItem(promptKey, 'shown');
    setUpgradeModalState({
      open: true,
      reason: 'trial_expired',
      title: 'Your 30-day Premium trial has ended',
      description: 'Choose Starter, Growth, or Premium to keep using DairyFlow features with uninterrupted access.',
      recommendedPlan: 'starter',
    });
  }, [currentUser, effectivePlan, loading, subscription]);

  const canAccessFeature = (featureKey: FeatureKey) => {
    const requirement = FEATURE_ACCESS[featureKey];
    if (!requirement) return true;
    return hasPlanAccess(effectivePlan, requirement.minimumPlan);
  };

  const closeUpgradeModal = () => {
    setUpgradeModalState((prev) => ({ ...prev, open: false }));
  };

  const openUpgradeModal = (featureKey?: FeatureKey) => {
    if (featureKey) {
      const requirement = FEATURE_ACCESS[featureKey];
      setUpgradeModalState({
        open: true,
        reason: 'feature_locked',
        featureKey,
        title: `Upgrade to ${PLAN_DEFINITIONS[requirement.minimumPlan].name}`,
        description: requirement.upgradeMessage,
        recommendedPlan: requirement.minimumPlan,
      });
      return;
    }

    setUpgradeModalState({
      open: true,
      reason: effectivePlan ? 'manual' : 'trial_expired',
      title: effectivePlan
        ? `Manage your ${PLAN_DEFINITIONS[effectivePlan].name} plan`
        : 'Choose a DairyFlow plan',
      description: effectivePlan
        ? 'Switch plans or renew access through Razorpay.'
        : 'Your trial has ended. Pick the plan that matches your dairy business.',
      recommendedPlan: effectivePlan ? getNextPlan(effectivePlan) : 'starter',
    });
  };

  const requestFeatureAccess = (featureKey: FeatureKey) => {
    if (canAccessFeature(featureKey)) {
      return true;
    }

    const requirement = FEATURE_ACCESS[featureKey];
    const title = effectivePlan
      ? `Upgrade to ${PLAN_DEFINITIONS[requirement.minimumPlan].name}`
      : 'Choose a DairyFlow plan';
    const description = effectivePlan
      ? requirement.upgradeMessage
      : 'Your 30-day Premium trial has ended. Choose a plan to continue using DairyFlow.';

    setUpgradeModalState({
      open: true,
      reason: effectivePlan ? 'feature_locked' : 'trial_expired',
      featureKey,
      title,
      description,
      recommendedPlan: requirement.minimumPlan,
    });
    return false;
  };

  const isCustomerLimitReached = (customerCount: number) => {
    const limit = getCustomerLimit(effectivePlan);
    if (!limit) {
      return false;
    }

    if (customerCount < limit) {
      return false;
    }

    const recommendedPlan = getNextPlan(effectivePlan);
    setUpgradeModalState({
      open: true,
      reason: 'limit_reached',
      title: 'Customer limit reached',
      description: `${PLAN_DEFINITIONS[effectivePlan as PlanId].name} supports up to ${limit} customers. Upgrade now for ₹${PLAN_DEFINITIONS[recommendedPlan].price}/month.`,
      recommendedPlan,
    });
    return true;
  };

  const startCheckout = async (planId: PlanId) => {
    if (!currentUser) {
      toast.error('Please sign in to continue');
      return;
    }

    setCheckoutLoadingPlan(planId);
    try {
      if (upgradeModalState.reason === 'limit_reached') {
        savePostUpgradeAction('resume_add_customer');
      } else {
        clearPostUpgradeAction();
      }

      const response = await createPaymentLink(currentUser, planId, getBillingAppBaseUrl());
      window.location.assign(response.shortUrl);
    } catch (error) {
      console.error('Failed to start checkout:', error);
      clearPostUpgradeAction();
      toast.error((error as Error).message || 'Unable to open Razorpay checkout');
    } finally {
      setCheckoutLoadingPlan(null);
    }
  };

  const verifyCheckoutCallback = async (searchParams: URLSearchParams) => {
    if (!currentUser) {
      throw new Error('Please sign in again to verify your payment.');
    }

    if (!isBillingCallbackPayload(searchParams)) {
      throw new Error('Payment callback parameters are incomplete.');
    }

    const payload: BillingCallbackPayload = {
      razorpay_payment_id: searchParams.get('razorpay_payment_id') || '',
      razorpay_payment_link_id: searchParams.get('razorpay_payment_link_id') || '',
      razorpay_payment_link_reference_id: searchParams.get('razorpay_payment_link_reference_id') || '',
      razorpay_payment_link_status: searchParams.get('razorpay_payment_link_status') || '',
      razorpay_signature: searchParams.get('razorpay_signature') || undefined,
    };

    const result = await verifyPaymentLink(currentUser, payload);
    closeUpgradeModal();
    return result;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        effectivePlan,
        trialDaysLeft,
        planDaysLeft,
        upgradeModalState,
        checkoutLoadingPlan,
        canAccessFeature,
        requestFeatureAccess,
        openUpgradeModal,
        closeUpgradeModal,
        startCheckout,
        verifyCheckoutCallback,
        isCustomerLimitReached,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
