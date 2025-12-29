export interface ExpenseItem {
  id: string;
  category: string;
  supplier: string;
  estimatedValue: number;
  actualValue: number;
  isContracted: boolean;
  include: boolean;
}

export interface GuestGroup {
  id: string;
  name: string;
  color: string;
}

export interface Guest {
  id: string;
  name: string;
  group: string; // Corresponde ao GuestGroup.name
  confirmed: boolean;
  parentId?: string; // ID do convidado ao qual este está conectado
  priority?: 1 | 2 | 3 | 4 | 5; // 1 = muito baixa, 2 = baixa, 3 = média, 4 = alta, 5 = muito alta (maior no grafo)
  photoUrl?: string; // URL da foto do convidado (base64 ou URL externa)
}

export interface AppState {
  budgetTotal: number;
  expenses: ExpenseItem[];
  guests: Guest[];
  guestGroups: GuestGroup[];
}

export type Action =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'UPDATE_BUDGET_TOTAL'; payload: number }
  | { type: 'ADD_EXPENSE'; payload: ExpenseItem }
  | { type: 'UPDATE_EXPENSE'; payload: ExpenseItem }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'ADD_GUEST'; payload: Guest }
  | { type: 'UPDATE_GUEST'; payload: Guest }
  | { type: 'BULK_ADD_GUESTS'; payload: Guest[] }
  | { type: 'DELETE_GUEST'; payload: string }
  | { type: 'TOGGLE_GUEST_CONFIRM'; payload: string }
  | { type: 'ADD_GUEST_GROUP'; payload: GuestGroup }
  | { type: 'DELETE_GUEST_GROUP'; payload: string };
