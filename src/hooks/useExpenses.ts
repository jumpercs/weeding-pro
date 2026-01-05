import { trpc } from '../lib/trpc';

export function useExpenses(eventId: string) {
  const query = trpc.expenses.list.useQuery(
    { eventId },
    { enabled: !!eventId && !eventId.startsWith('demo-') }
  );

  return {
    expenses: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateExpense(eventId: string) {
  const utils = trpc.useUtils();
  
  return trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate({ eventId });
    },
  });
}

export function useUpdateExpense(eventId: string) {
  const utils = trpc.useUtils();
  
  return trpc.expenses.update.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate({ eventId });
    },
  });
}

export function useDeleteExpense(eventId: string) {
  const utils = trpc.useUtils();
  
  return trpc.expenses.delete.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate({ eventId });
    },
  });
}

export function useSyncExpenses(eventId: string) {
  const utils = trpc.useUtils();
  
  return trpc.expenses.sync.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate({ eventId });
    },
  });
}

