import api from './api';
import { BillingPlan, BillingSubscription } from '../types';

export const getBillingPlans = () =>
  api.get<BillingPlan[]>('/billing/plans').then((r) => r.data);

export const getCurrentSubscription = () =>
  api.get<BillingSubscription>('/billing/subscription').then((r) => r.data);

export const initializeBillingCheckout = (planId: number) =>
  api
    .post<{ checkout_link: string; tx_ref: string }>('/billing/checkout', {
      plan_id: planId,
    })
    .then((r) => r.data);

export const verifyBillingCheckout = (transactionId: number, txRef: string) =>
  api
    .post<BillingSubscription>('/billing/verify', {
      transaction_id: transactionId,
      tx_ref: txRef,
    })
    .then((r) => r.data);
