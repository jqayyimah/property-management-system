import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getBillingPlans,
  getCurrentSubscription,
  initializeBillingCheckout,
  verifyBillingCheckout,
} from '../services/billingService';
import { BillingPlan, BillingSubscription } from '../types';
import { getApiErrorMessage } from '../utils/apiError';

const formatCurrency = (amount: string | number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount));

const formatSubscriptionStatus = (status: string) => {
  switch (status) {
    case 'TRIAL_ACTIVE':
      return 'Free Trial Active';
    case 'TRIAL_EXPIRED':
      return 'Trial Expired';
    case 'ACTIVE':
      return 'Annual Plan Active';
    default:
      return status.replace(/_/g, ' ');
  }
};

export default function Billing() {
  const { user, refreshBilling } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingPlanId, setProcessingPlanId] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);

  const transactionId = searchParams.get('transaction_id');
  const txRef = searchParams.get('tx_ref');
  const paymentStatus = searchParams.get('status');

  const load = async () => {
    try {
      setError('');
      const [plansResult, subscriptionResult] = await Promise.all([
        getBillingPlans(),
        getCurrentSubscription(),
      ]);
      setPlans(plansResult);
      setSubscription(subscriptionResult);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to load billing'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!transactionId || !txRef || !paymentStatus) return;
    if (paymentStatus !== 'successful') {
      setError('Payment was not completed. You can try again when ready.');
      navigate('/billing', { replace: true });
      return;
    }

    const id = Number(transactionId);
    if (Number.isNaN(id)) {
      setError('Invalid payment callback received from Flutterwave.');
      navigate('/billing', { replace: true });
      return;
    }

    setVerifying(true);
    verifyBillingCheckout(id, txRef)
      .then((result) => {
        setSubscription(result);
        setSuccess(`Payment verified. Your ${result.plan.name} plan is now active.`);
        void refreshBilling();
        return getBillingPlans();
      })
      .then(setPlans)
      .catch((err: unknown) => {
        setError(getApiErrorMessage(err, 'Payment verification failed'));
      })
      .finally(() => {
        setVerifying(false);
        navigate('/billing', { replace: true });
      });
  }, [navigate, paymentStatus, transactionId, txRef]);

  const handleUpgrade = async (plan: BillingPlan) => {
    setProcessingPlanId(plan.id);
    setError('');
    setSuccess('');
    try {
      const result = await initializeBillingCheckout(plan.id);
      window.location.assign(result.checkout_link);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Unable to initialize checkout'));
      setProcessingPlanId(null);
    }
  };

  const currentPlanId = subscription?.plan.id;
  const usageTone = useMemo(() => {
    if (!subscription) return 'badge-occupied';
    const ratio =
      subscription.house_limit > 0
        ? subscription.houses_used / subscription.house_limit
        : 0;
    if (subscription.subscription_status === 'TRIAL_EXPIRED') return 'badge-unpaid';
    if (ratio >= 1) return 'badge-unpaid';
    if (ratio >= 0.8) return 'badge-partial';
    return 'badge-paid';
  }, [subscription]);

  if (user?.role === 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="page-hero-content">
          <span className="page-kicker">Billing</span>
          <h1 className="page-title">Plans and Subscription</h1>
          <p className="page-subtitle">
            Start with one free month, then move to annual billing based on the
            number of houses you manage.
          </p>
        </div>
        <div className="page-actions">
          {subscription && (
            <span className={`badge ${usageTone}`}>
              {formatSubscriptionStatus(subscription.subscription_status)}
            </span>
          )}
        </div>
      </div>

      {verifying && <div className="info-banner">Verifying your Flutterwave payment...</div>}
      {error && <div className="error-msg">{error}</div>}
      {success && <div className="config-success">{success}</div>}

      {loading ? (
        <div className="loading">Loading billing details...</div>
      ) : (
        <>
          {subscription && (
            <div className="summary-cards">
              <div className="summary-card">
                <div className="summary-card-icon">💳</div>
                <div className="summary-card-value">{subscription.plan.name}</div>
                <div className="summary-card-label">Current Plan</div>
                <div className="summary-card-note">{subscription.plan.description}</div>
              </div>
              <div className="summary-card">
                <div className="summary-card-icon">▣</div>
                <div className="summary-card-value">{subscription.houses_used}</div>
                <div className="summary-card-label">Houses Used</div>
                <div className="summary-card-note">
                  {subscription.subscription_status === 'TRIAL_EXPIRED'
                    ? 'Free trial ended. Upgrade to keep adding houses.'
                    : `${subscription.houses_remaining} remaining before your current limit`}
                </div>
              </div>
              <div className="summary-card summary-card-warning">
                <div className="summary-card-icon">📏</div>
                <div className="summary-card-value">{subscription.house_limit}</div>
                <div className="summary-card-label">House Limit</div>
                <div className="summary-card-note">
                  {subscription.ends_at
                    ? `Renews or expires on ${new Date(subscription.ends_at).toLocaleDateString()}`
                    : 'Billing activates after your 30-day free trial'}
                </div>
              </div>
            </div>
          )}

          <div className="section-block">
            <div className="section-header">
              <div>
                <h2 className="section-title">Available Plans</h2>
                <p className="section-subtitle">
                  House capacity is enforced when creating new properties.
                </p>
              </div>
            </div>
            <div className="pricing-grid">
              {plans.map((plan) => {
                const isCurrent = currentPlanId === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`pricing-card ${isCurrent ? 'is-current' : ''}`}
                  >
                    <div className="pricing-header">
                      <div>
                        <div className="pricing-name">{plan.name}</div>
                        <div className="pricing-description">{plan.description}</div>
                      </div>
                      {plan.is_default && <span className="badge badge-vacant">Default</span>}
                    </div>
                    <div className="pricing-price">
                      {Number(plan.price_amount) === 0
                        ? 'Free for 30 days'
                        : formatCurrency(plan.price_amount, plan.currency)}
                    </div>
                    <div className="pricing-meta">
                      {Number(plan.price_amount) === 0
                        ? 'One-time trial period'
                        : 'Billed annually'}
                    </div>
                    <div className="pricing-feature">
                      Up to <strong>{plan.house_limit}</strong> houses
                    </div>
                    <button
                      className={`btn ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                      disabled={isCurrent || processingPlanId === plan.id || Number(plan.price_amount) === 0}
                      onClick={() => void handleUpgrade(plan)}
                    >
                      {isCurrent
                        ? 'Current Plan'
                        : processingPlanId === plan.id
                          ? 'Redirecting...'
                          : Number(plan.price_amount) === 0
                            ? 'Included'
                            : 'Upgrade with Flutterwave'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
