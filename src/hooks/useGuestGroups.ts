import { trpc } from '../lib/trpc';

export function useGuestGroups(eventId: string) {
  const query = trpc.guestGroups.list.useQuery(
    { eventId },
    { enabled: !!eventId && !eventId.startsWith('demo-') }
  );

  return {
    groups: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateGuestGroup(eventId: string) {
  const utils = trpc.useUtils();
  
  return trpc.guestGroups.create.useMutation({
    onSuccess: () => {
      utils.guestGroups.list.invalidate({ eventId });
    },
  });
}

export function useUpdateGuestGroup(eventId: string) {
  const utils = trpc.useUtils();
  
  return trpc.guestGroups.update.useMutation({
    onSuccess: () => {
      utils.guestGroups.list.invalidate({ eventId });
    },
  });
}

export function useDeleteGuestGroup(eventId: string) {
  const utils = trpc.useUtils();
  
  return trpc.guestGroups.delete.useMutation({
    onSuccess: () => {
      utils.guestGroups.list.invalidate({ eventId });
    },
  });
}

