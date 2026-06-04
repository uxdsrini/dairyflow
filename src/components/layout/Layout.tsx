import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { PLAN_DEFINITIONS } from '../../config/plans';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { subscription, effectivePlan, trialDaysLeft, planDaysLeft, openUpgradeModal } = useSubscription();
  const showTrialBanner = subscription?.status === 'trial' && !!effectivePlan;
  const showExpiredBanner = !!subscription && !effectivePlan;
  const showRenewalBanner = subscription?.status === 'active' && !!effectivePlan && planDaysLeft > 0 && planDaysLeft <= 7;

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-[260px] pb-20 lg:pb-0">
        <Header onMenuToggle={() => setSidebarOpen(true)} />
        {showTrialBanner && (
          <div className="px-4 sm:px-6 lg:px-8 pt-4 max-w-7xl mx-auto">
            <div className="rounded-2xl border border-dairy-100 bg-gradient-to-r from-dairy-50 to-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge-green">Premium Trial</span>
                  {subscription?.isFoundingMember && <span className="badge-blue">Founding Member</span>}
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  You have {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left in your 30-day Premium trial.
                </p>
              </div>
              <button onClick={() => openUpgradeModal()} className="btn-secondary sm:self-start">
                View Plans
              </button>
            </div>
          </div>
        )}
        {showExpiredBanner && (
          <div className="px-4 sm:px-6 lg:px-8 pt-4 max-w-7xl mx-auto">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge-yellow">Trial Ended</span>
                  {subscription?.isFoundingMember && <span className="badge-blue">Founding Member</span>}
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  Your 30-day Premium trial has ended. Choose Starter, Growth, or Premium to continue using DairyFlow.
                </p>
              </div>
              <button onClick={() => openUpgradeModal()} className="btn-primary sm:self-start">
                Choose Plan
              </button>
            </div>
          </div>
        )}
        {showRenewalBanner && effectivePlan && (
          <div className="px-4 sm:px-6 lg:px-8 pt-4 max-w-7xl mx-auto">
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-gray-700">
                Your {PLAN_DEFINITIONS[effectivePlan].name} plan renews in {planDaysLeft} day{planDaysLeft === 1 ? '' : 's'}.
              </p>
              <button onClick={() => openUpgradeModal()} className="btn-secondary sm:self-start">
                Renew or Switch Plan
              </button>
            </div>
          </div>
        )}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
};

export default Layout;
