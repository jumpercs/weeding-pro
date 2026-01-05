import { trpc } from '../lib/trpc';
import { isSupabaseConfigured } from '../lib/supabase';

// Demo events for when backend is not available
const DEMO_EVENTS = [
  {
    id: 'demo-1',
    name: 'Meu Casamento',
    type: 'wedding' as const,
    eventDate: '2026-06-15',
    budgetTotal: 60000,
    description: 'Casamento dos sonhos',
    createdAt: new Date().toISOString(),
    guestCount: 0,
    expenseCount: 0,
  },
];

export function useEvents() {
  const isConfigured = isSupabaseConfigured();
  
  const query = trpc.events.list.useQuery(undefined, {
    enabled: isConfigured,
  });

  return {
    events: isConfigured ? (query.data ?? []) : DEMO_EVENTS,
    isLoading: isConfigured ? query.isLoading : false,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useEvent(eventId: string) {
  const isConfigured = isSupabaseConfigured();
  
  const query = trpc.events.getById.useQuery(
    { id: eventId },
    { enabled: isConfigured && !!eventId && !eventId.startsWith('demo-') }
  );

  return {
    event: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateEvent() {
  const utils = trpc.useUtils();
  
  return trpc.events.create.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
    },
  });
}

export function useUpdateEvent() {
  const utils = trpc.useUtils();
  
  return trpc.events.update.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
    },
  });
}

export function useDeleteEvent() {
  const utils = trpc.useUtils();
  
  return trpc.events.delete.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
    },
  });
}

// Full sync - replaces all data (used for large changes or initial sync)
// NOTE: Does NOT invalidate cache - frontend already has updated state
export function useSyncEventData() {
  return trpc.events.syncData.useMutation();
}

// Delta sync - only syncs changes (created, updated, deleted)
// Much faster for incremental updates
// NOTE: Does NOT invalidate cache - frontend already has updated state
export function useSyncDelta() {
  return trpc.events.syncDelta.useMutation();
}

