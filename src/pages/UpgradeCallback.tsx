import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';

const UpgradeCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyCheckoutCallback } = useSubscription();

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        await verifyCheckoutCallback(searchParams);
        if (!mounted) return;
        toast.success('Payment confirmed. Your plan is now active.');
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Failed to verify payment callback:', error);
        if (!mounted) return;
        toast.error((error as Error).message || 'Payment verification failed');
        navigate('/', { replace: true });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate, searchParams, verifyCheckoutCallback]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card p-8 text-center max-w-md w-full">
        <div className="w-14 h-14 rounded-2xl bg-dairy-50 flex items-center justify-center mx-auto">
          <Loader2 className="w-7 h-7 text-dairy-600 animate-spin" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mt-5">Confirming your payment</h1>
        <p className="text-sm text-gray-500 mt-2">
          DairyFlow is verifying your Razorpay payment and activating the selected plan.
        </p>
      </div>
    </div>
  );
};

export default UpgradeCallback;
