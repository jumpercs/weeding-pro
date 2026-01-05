import { trpc } from '../lib/trpc';

export function useGuests(eventId: string) {
  const query = trpc.guests.list.useQuery(
    { eventId },
    { enabled: !!eventId && !eventId.startsWith('demo-') }
  );

  return {
    guests: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateGuest(eventId: string) {
  const utils = trpc.useUtils();
  
  return trpc.guests.create.useMutation({
    onSuccess: () => {
      utils.guests.list.invalidate({ eventId });
      utils.events.getById.invalidate({ id: eventId });
    },
  });
}

export function useBulkCreateGuests(eventId: string) {
  const utils = trpc.useUtils();
  
  return trpc.guests.bulkCreate.useMutation({
    onSuccess: () => {
      utils.guests.list.invalidate({ eventId });
      utils.events.getById.invalidate({ id: eventId });
    },
  });
}

export function useUpdateGuest(eventId: string) {
  const utils = trpc.useUtils();
  
  return trpc.guests.update.useMutation({
    onSuccess: () => {
      utils.guests.list.invalidate({ eventId });
    },
  });
}

export function useToggleGuestConfirm(eventId: string) {
  const utils = trpc.useUtils();
  
  return trpc.guests.toggleConfirm.useMutation({
    onSuccess: () => {
      utils.guests.list.invalidate({ eventId });
    },
  });
}

export function useDeleteGuest(eventId: string) {
  const utils = trpc.useUtils();
  
  return trpc.guests.delete.useMutation({
    onSuccess: () => {
      utils.guests.list.invalidate({ eventId });
      utils.events.getById.invalidate({ id: eventId });
    },
  });
}

