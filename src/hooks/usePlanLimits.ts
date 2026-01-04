import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface PlanLimits {
  maxEvents: number;
  maxGuestsPerEvent: number;
  canUploadPhotos: boolean;
  canExportPdf: boolean;
  canShareEvent: boolean;
  canUseTemplates: boolean;
  planName: string;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxEvents: 1,
    maxGuestsPerEvent: 30,
    canUploadPhotos: false,
    canExportPdf: false,
    canShareEvent: false,
    canUseTemplates: false,
    planName: 'Grátis',
  },
  pro: {
    maxEvents: 1,
    maxGuestsPerEvent: Infinity,
    canUploadPhotos: true,
    canExportPdf: true,
    canShareEvent: true,
    canUseTemplates: false,
    planName: 'Pro',
  },
  business: {
    maxEvents: Infinity,
    maxGuestsPerEvent: Infinity,
    canUploadPhotos: true,
    canExportPdf: true,
    canShareEvent: true,
    canUseTemplates: true,
    planName: 'Business',
  },
};

export const usePlanLimits = () => {
  const { subscription, isConfigured } = useAuth();

  const limits = useMemo(() => {
    // If Supabase is not configured, give full access (demo mode)
    if (!isConfigured) {
      return PLAN_LIMITS.pro;
    }

    const plan = subscription?.plan || 'free';
    return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  }, [subscription, isConfigured]);

  const checkEventLimit = (currentEventCount: number): boolean => {
    return currentEventCount < limits.maxEvents;
  };

  const checkGuestLimit = (currentGuestCount: number): boolean => {
    return currentGuestCount < limits.maxGuestsPerEvent;
  };

  const getRemainingEvents = (currentEventCount: number): number => {
    if (limits.maxEvents === Infinity) return Infinity;
    return Math.max(0, limits.maxEvents - currentEventCount);
  };

  const getRemainingGuests = (currentGuestCount: number): number => {
    if (limits.maxGuestsPerEvent === Infinity) return Infinity;
    return Math.max(0, limits.maxGuestsPerEvent - currentGuestCount);
  };

  return {
    limits,
    checkEventLimit,
    checkGuestLimit,
    getRemainingEvents,
    getRemainingGuests,
  };
};

export default usePlanLimits;

