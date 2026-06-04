import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { FEATURE_ACCESS, FeatureKey, PLAN_DEFINITIONS } from '../../config/plans';
import { useSubscription } from '../../contexts/SubscriptionContext';

interface FeatureLockedStateProps {
  featureKey: FeatureKey;
  title: string;
  description: string;
}

const FeatureLockedState: React.FC<FeatureLockedStateProps> = ({ featureKey, title, description }) => {
  const { openUpgradeModal } = useSubscription();
  const requiredPlan = PLAN_DEFINITIONS[FEATURE_ACCESS[featureKey].minimumPlan];

  return (
    <div className="card p-8 sm:p-10 text-center max-w-2xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
        <Lock className="w-8 h-8 text-amber-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500 mt-3 leading-6">{description}</p>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-dairy-50 text-dairy-700 px-4 py-2 text-sm font-medium">
        <Sparkles className="w-4 h-4" />
        Available in {requiredPlan.name} for ₹{requiredPlan.price}/month
      </div>
      <div className="mt-6 flex justify-center">
        <button onClick={() => openUpgradeModal(featureKey)} className="btn-primary">
          View Plans & Upgrade
        </button>
      </div>
    </div>
  );
};

export default FeatureLockedState;

