import React from 'react';
import { Check, Crown, Loader2, ShieldCheck, Star, Zap } from 'lucide-react';
import Modal from '../ui/Modal';
import { PLAN_DEFINITIONS, PLAN_ORDER } from '../../config/plans';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { PlanId } from '../../types';

const planIcons: Record<PlanId, React.ReactNode> = {
  starter: <Star className="w-5 h-5" />,
  growth: <Zap className="w-5 h-5" />,
  premium: <Crown className="w-5 h-5" />,
};

const planThemes: Record<PlanId, { accent: string; icon: string; panel: string; button: string }> = {
  starter: {
    accent: 'border-gray-200 bg-white',
    icon: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    panel: 'border-gray-100',
    button: 'btn-secondary',
  },
  growth: {
    accent: 'border-gray-200 bg-white',
    icon: 'text-dairy-700 bg-dairy-50 border-dairy-100',
    panel: 'border-gray-100',
    button: 'btn-secondary',
  },
  premium: {
    accent: 'border-emerald-400 bg-gradient-to-b from-emerald-50/80 via-white to-white shadow-lg shadow-emerald-100/70',
    icon: 'text-emerald-700 bg-white border-emerald-100',
    panel: 'border-emerald-100',
    button: 'btn-primary',
  },
};

const UpgradeModal: React.FC = () => {
  const {
    subscription,
    effectivePlan,
    upgradeModalState,
    closeUpgradeModal,
    startCheckout,
    checkoutLoadingPlan,
    trialDaysLeft,
    planDaysLeft,
  } = useSubscription();

  return (
    <Modal
      isOpen={upgradeModalState.open}
      onClose={closeUpgradeModal}
      title="Choose Your DairyFlow Plan"
      size="xl"
      contentClassName="h-[100dvh] max-h-[100dvh] rounded-none sm:h-[min(92vh,940px)] sm:max-h-[min(92vh,940px)] sm:max-w-[min(1180px,calc(100vw-2rem))] sm:rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
      headerClassName="px-5 py-4 sm:px-7 sm:py-5 lg:px-8 bg-white/95 backdrop-blur-sm"
      bodyClassName="p-0 flex-1 min-h-0 overflow-hidden"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <div className="rounded-[28px] border border-dairy-100 bg-gradient-to-r from-dairy-50/90 via-emerald-50/50 to-white p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900 sm:text-xl">{upgradeModalState.title}</span>
                  {subscription?.isFoundingMember && (
                    <span className="badge-blue">Founding Member</span>
                  )}
                  {subscription?.status === 'trial' && trialDaysLeft > 0 && (
                    <span className="badge-green">{trialDaysLeft} days of Premium trial left</span>
                  )}
                  {subscription?.status === 'active' && effectivePlan && planDaysLeft > 0 && (
                    <span className="badge-green">{planDaysLeft} billing days remaining</span>
                  )}
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600 sm:text-base">
                  {upgradeModalState.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 xl:max-w-sm xl:justify-end">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Razorpay payments
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm">
                  UPI, PhonePe, Google Pay, Paytm, Cards
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {PLAN_ORDER.map((planId) => {
              const plan = PLAN_DEFINITIONS[planId];
              const isCurrentPlan = effectivePlan === planId && subscription?.status === 'active';
              const isRecommended = upgradeModalState.recommendedPlan === planId;
              const isTrialPlan = effectivePlan === planId && subscription?.status === 'trial';
              const theme = planThemes[plan.id];

              return (
                <div
                  key={plan.id}
                  className={`relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-[28px] border p-5 sm:p-6 ${
                    isRecommended ? planThemes.premium.accent : theme.accent
                  } ${plan.id === 'premium' ? 'md:col-span-2 xl:col-span-1' : ''}`}
                >
                  {isRecommended && (
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-dairy-500 to-emerald-400" />
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 flex-none items-center justify-center rounded-2xl border ${theme.icon}`}>
                      {planIcons[plan.id]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[1.9rem] font-bold leading-none tracking-tight text-gray-900">{plan.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-gray-500 sm:text-base">{plan.tagline}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {isRecommended && <span className="badge-green">Recommended</span>}
                    {isTrialPlan && <span className="badge-blue">Current Trial</span>}
                    {isCurrentPlan && <span className="badge-green">Current Plan</span>}
                  </div>

                  <div className="mt-5">
                    <div className="text-5xl font-bold tracking-tight text-gray-950">₹{plan.price}</div>
                    <div className="mt-2 text-lg text-gray-500">per month</div>
                  </div>

                  <p className="mt-5 min-h-[96px] text-[15px] leading-7 text-gray-600">
                    {plan.summary}
                  </p>

                  <div className={`mt-5 rounded-2xl border bg-white/70 p-4 ${theme.panel}`}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Includes</span>
                      <span className="text-xs font-medium text-gray-500">{plan.features.length} features</span>
                    </div>

                    <div className="space-y-3 lg:max-h-[320px] lg:overflow-y-auto lg:pr-1 scrollbar-hide">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-2.5 text-sm text-gray-700 sm:text-[15px]">
                          <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                          <span className="leading-6">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-5">
                    <button
                      onClick={() => startCheckout(plan.id)}
                      disabled={checkoutLoadingPlan === plan.id}
                      className={`${isRecommended ? 'btn-primary' : theme.button} w-full flex min-h-[56px] items-center justify-center gap-2 text-base font-semibold`}
                    >
                      {checkoutLoadingPlan === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isCurrentPlan ? `Renew ${plan.name}` : `Purchase ${plan.name}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-100 px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-xs leading-6 text-gray-500 sm:text-sm">
            Registered users get a 30-day Premium trial. After that, DairyFlow shows this upgrade flow and activates the selected plan after Razorpay confirms payment.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default UpgradeModal;
