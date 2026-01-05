import { ExpenseItem, AppState, GuestGroup } from './types';

export const INITIAL_CATEGORIES = [
  "Asses./Cerimonial",
  "Recepcionistas",
  "Local da Cerimônia",
  "Local Recepção",
  "Gerador",
  "Segurança/Limpeza",
  "Decoração",
  "Fotógrafo",
  "Vídeo",
  "Gastronomia",
  "Garçons/Metria",
  "Chopp/Bebidas",
  "Bar de Drinks",
  "Bolo",
  "Doces",
  "Forminhas",
  "Papelaria",
  "Vestido da Noiva",
  "Acessórios Noiva",
  "Dia da Noiva",
  "Traje do Noivo",
  "Músicos Cerimônia",
  "Banda/DJ Festa",
  "Iluminação Cênica",
  "Lembrancinhas",
  "Lua de Mel",
  "Noite de Núpcias"
];

// Generate initial groups with UUIDs at runtime
export const generateInitialGroups = (): GuestGroup[] => [
  { id: crypto.randomUUID(), name: 'Casal', color: '#f43f5e' },       // Rose
  { id: crypto.randomUUID(), name: 'Família Noiva', color: '#d946ef' }, // Fuchsia
  { id: crypto.randomUUID(), name: 'Família Noivo', color: '#8b5cf6' }, // Violet
  { id: crypto.randomUUID(), name: 'Amigos', color: '#0ea5e9' },        // Sky
  { id: crypto.randomUUID(), name: 'Trabalho', color: '#10b981' },      // Emerald
];

// Legacy constant for backwards compatibility - generates new UUIDs each time
export const INITIAL_GROUPS: GuestGroup[] = generateInitialGroups();

export const generateInitialExpenses = (): ExpenseItem[] => {
  return INITIAL_CATEGORIES.map((cat) => ({
    id: crypto.randomUUID(),
    category: cat,
    supplier: '',
    estimatedValue: 0,
    actualValue: 0,
    isContracted: false,
    include: true,
  }));
};

export const generateInitialState = (): AppState => ({
  budgetTotal: 60000,
  expenses: generateInitialExpenses(),
  guestGroups: generateInitialGroups(),
  guests: []
});

// Legacy constant - now generates fresh UUIDs
export const INITIAL_STATE: AppState = generateInitialState();

