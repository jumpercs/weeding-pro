import { useReducer, useCallback, useRef } from 'react';
import { AppState, Action, DeltaChanges, Guest, GuestGroup, ExpenseItem } from '../types';

interface HistoryState {
  past: AppState[];
  present: AppState;
  future: AppState[];
}

// Helper to create empty delta changes
const createEmptyDelta = (): DeltaChanges => ({
  budgetTotal: undefined,
  guests: { created: [], updated: [], deleted: [] },
  guestGroups: { created: [], updated: [], deleted: [] },
  expenses: { created: [], updated: [], deleted: [] },
});

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;
    case 'UPDATE_BUDGET_TOTAL':
      return { ...state, budgetTotal: action.payload };
    case 'ADD_EXPENSE':
      return { ...state, expenses: [...state.expenses, action.payload] };
    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };
    case 'DELETE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.payload),
      };
    case 'ADD_GUEST':
      return { ...state, guests: [...state.guests, action.payload] };
    case 'UPDATE_GUEST':
      return {
        ...state,
        guests: state.guests.map((g) =>
          g.id === action.payload.id ? action.payload : g
        ),
      };
    case 'BULK_ADD_GUESTS':
      return { ...state, guests: [...state.guests, ...action.payload] };
    case 'DELETE_GUEST':
      return {
        ...state,
        guests: state.guests.filter((g) => g.id !== action.payload),
      };
    case 'TOGGLE_GUEST_CONFIRM':
      return {
        ...state,
        guests: state.guests.map((g) =>
            g.id === action.payload ? { ...g, confirmed: !g.confirmed } : g
        )
      };
    case 'ADD_GUEST_GROUP':
      return { ...state, guestGroups: [...state.guestGroups, action.payload] };
    case 'DELETE_GUEST_GROUP':
      return {
        ...state,
        guestGroups: state.guestGroups.filter((g) => g.id !== action.payload)
      };
    default:
      return state;
  }
};

export const useUndoRedo = (initialState: AppState) => {
  // Track the "baseline" state from which deltas are calculated
  const baselineRef = useRef<AppState>(initialState);
  // Track IDs that exist in the baseline (from server)
  const baselineIdsRef = useRef<{
    guests: Set<string>;
    guestGroups: Set<string>;
    expenses: Set<string>;
  }>({
    guests: new Set(),
    guestGroups: new Set(),
    expenses: new Set(),
  });

  const [history, dispatch] = useReducer(
    (currentState: HistoryState, action: { type: 'UNDO' } | { type: 'REDO' } | { type: 'ACTION'; action: Action } | { type: 'LOAD'; state: AppState }) => {
      const { past, present, future } = currentState;

      switch (action.type) {
        case 'UNDO':
          if (past.length === 0) return currentState;
          const previous = past[past.length - 1];
          const newPast = past.slice(0, past.length - 1);
          return {
            past: newPast,
            present: previous,
            future: [present, ...future],
          };
        case 'REDO':
          if (future.length === 0) return currentState;
          const next = future[0];
          const newFuture = future.slice(1);
          return {
            past: [...past, present],
            present: next,
            future: newFuture,
          };
        case 'ACTION':
          const newPresent = reducer(present, action.action);
          if (newPresent === present) return currentState; 
          return {
            past: [...past, present],
            present: newPresent,
            future: [], // Clear future on new action
          };
        case 'LOAD':
           return {
             past: [],
             present: action.state,
             future: []
           }
        default:
          return currentState;
      }
    },
    {
      past: [],
      present: initialState,
      future: [],
    }
  );

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const execute = useCallback((action: Action) => {
    dispatch({ type: 'ACTION', action });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const loadState = useCallback((state: AppState) => {
    // When loading from server, set this as the new baseline
    baselineRef.current = state;
    baselineIdsRef.current = {
      guests: new Set(state.guests.map(g => g.id)),
      guestGroups: new Set(state.guestGroups.map(g => g.id)),
      expenses: new Set(state.expenses.map(e => e.id)),
    };
    dispatch({ type: 'LOAD', state });
  }, []);

  // Calculate deltas between current state and baseline
  const getDeltas = useCallback((): DeltaChanges => {
    const current = history.present;
    const baseline = baselineRef.current;
    const baselineIds = baselineIdsRef.current;
    
    const delta = createEmptyDelta();

    // Budget delta
    if (current.budgetTotal !== baseline.budgetTotal) {
      delta.budgetTotal = current.budgetTotal;
    }

    // Guest deltas
    const currentGuestIds = new Set(current.guests.map(g => g.id));
    const baselineGuestMap = new Map(baseline.guests.map(g => [g.id, g]));
    
    for (const guest of current.guests) {
      if (!baselineIds.guests.has(guest.id)) {
        // New guest (not in baseline)
        delta.guests.created.push(guest);
      } else {
        // Check if updated
        const baselineGuest = baselineGuestMap.get(guest.id);
        if (baselineGuest && JSON.stringify(guest) !== JSON.stringify(baselineGuest)) {
          delta.guests.updated.push(guest);
        }
      }
    }
    
    // Deleted guests
    for (const id of baselineIds.guests) {
      if (!currentGuestIds.has(id)) {
        delta.guests.deleted.push(id);
      }
    }

    // GuestGroup deltas
    const currentGroupIds = new Set(current.guestGroups.map(g => g.id));
    const baselineGroupMap = new Map(baseline.guestGroups.map(g => [g.id, g]));
    
    for (const group of current.guestGroups) {
      if (!baselineIds.guestGroups.has(group.id)) {
        delta.guestGroups.created.push(group);
      } else {
        const baselineGroup = baselineGroupMap.get(group.id);
        if (baselineGroup && JSON.stringify(group) !== JSON.stringify(baselineGroup)) {
          delta.guestGroups.updated.push(group);
        }
      }
    }
    
    for (const id of baselineIds.guestGroups) {
      if (!currentGroupIds.has(id)) {
        delta.guestGroups.deleted.push(id);
      }
    }

    // Expense deltas
    const currentExpenseIds = new Set(current.expenses.map(e => e.id));
    const baselineExpenseMap = new Map(baseline.expenses.map(e => [e.id, e]));
    
    for (const expense of current.expenses) {
      if (!baselineIds.expenses.has(expense.id)) {
        delta.expenses.created.push(expense);
      } else {
        const baselineExpense = baselineExpenseMap.get(expense.id);
        if (baselineExpense && JSON.stringify(expense) !== JSON.stringify(baselineExpense)) {
          delta.expenses.updated.push(expense);
        }
      }
    }
    
    for (const id of baselineIds.expenses) {
      if (!currentExpenseIds.has(id)) {
        delta.expenses.deleted.push(id);
      }
    }

    return delta;
  }, [history.present]);

  // Check if there are any pending changes
  const hasPendingChanges = useCallback((): boolean => {
    const delta = getDeltas();
    return (
      delta.budgetTotal !== undefined ||
      delta.guests.created.length > 0 ||
      delta.guests.updated.length > 0 ||
      delta.guests.deleted.length > 0 ||
      delta.guestGroups.created.length > 0 ||
      delta.guestGroups.updated.length > 0 ||
      delta.guestGroups.deleted.length > 0 ||
      delta.expenses.created.length > 0 ||
      delta.expenses.updated.length > 0 ||
      delta.expenses.deleted.length > 0
    );
  }, [getDeltas]);

  // Mark current state as synced (update baseline)
  const markAsSynced = useCallback(() => {
    const current = history.present;
    baselineRef.current = current;
    baselineIdsRef.current = {
      guests: new Set(current.guests.map(g => g.id)),
      guestGroups: new Set(current.guestGroups.map(g => g.id)),
      expenses: new Set(current.expenses.map(e => e.id)),
    };
  }, [history.present]);

  return { 
    state: history.present, 
    execute, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    loadState,
    getDeltas,
    hasPendingChanges,
    markAsSynced,
  };
};

