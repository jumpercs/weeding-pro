import { useReducer, useCallback } from 'react';
import { AppState, Action } from '../types';

interface HistoryState {
  past: AppState[];
  present: AppState;
  future: AppState[];
}

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
      dispatch({ type: 'LOAD', state});
  }, []);

  return { state: history.present, execute, undo, redo, canUndo, canRedo, loadState };
};

