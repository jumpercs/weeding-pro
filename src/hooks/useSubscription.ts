import { trpc } from '../lib/trpc';
import { isSupabaseConfigured } from '../lib/supabase';

export function useSubscription() {
  const isConfigured = isSupabaseConfigured();
  
  const query = trpc.subscriptions.getCurrent.useQuery(undefined, {
    enabled: isConfigured,
  });

  return {
    subscription: query.data ?? { plan: 'free' as const, status: 'active' as const },
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function usePlanLimits() {
  const isConfigured = isSupabaseConfigured();
  
  const query = trpc.subscriptions.getLimits.useQuery(undefined, {
    enabled: isConfigured,
  });

  const defaultLimits = {
    plan: 'free' as const,
    limits: { maxEvents: 1, maxGuestsPerEvent: 50 },
    usage: { eventCount: 0 },
  };

  return {
    data: query.data ?? defaultLimits,
    isLoading: query.isLoading,
    canCreateEvent: () => {
      if (!isConfigured) return true;
      const data = query.data ?? defaultLimits;
      if (data.limits.maxEvents === -1) return true;
      return data.usage.eventCount < data.limits.maxEvents;
    },
    canAddGuest: (currentCount: number) => {
      if (!isConfigured) return true;
      const data = query.data ?? defaultLimits;
      if (data.limits.maxGuestsPerEvent === -1) return true;
      return currentCount < data.limits.maxGuestsPerEvent;
    },
  };
}

export function useCreateCheckoutSession() {
  return trpc.subscriptions.createCheckoutSession.useMutation();
}

