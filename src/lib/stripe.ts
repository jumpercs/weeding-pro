import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    console.warn('Stripe publishable key not found');
    return Promise.resolve(null);
  }

  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  
  return stripePromise;
};

export const isStripeConfigured = () => {
  return Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
};

// Price IDs - configure these in your Stripe Dashboard
export const STRIPE_PRICES = {
  PRO_SINGLE: import.meta.env.VITE_STRIPE_PRICE_PRO || 'price_pro_single',
  BUSINESS_MONTHLY: import.meta.env.VITE_STRIPE_PRICE_BUSINESS || 'price_business_monthly',
};

export interface CheckoutSessionRequest {
  priceId: string;
  userId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}

// This function should call your backend to create a checkout session
// For now, it's a placeholder that you'll implement with Supabase Edge Functions
export const createCheckoutSession = async (request: CheckoutSessionRequest): Promise<{ url: string } | null> => {
  // In production, this would call a Supabase Edge Function or API route
  // that creates a Stripe Checkout Session on the server
  console.log('Creating checkout session:', request);
  
  // Placeholder - implement with your backend
  return null;
};

