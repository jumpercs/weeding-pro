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

export const INITIAL_GROUPS: GuestGroup[] = [
  { id: 'grp-1', name: 'Casal', color: '#f43f5e' },       // Rose
  { id: 'grp-2', name: 'Família Noiva', color: '#d946ef' }, // Fuchsia
  { id: 'grp-3', name: 'Família Noivo', color: '#8b5cf6' }, // Violet
  { id: 'grp-4', name: 'Amigos', color: '#0ea5e9' },        // Sky
  { id: 'grp-5', name: 'Trabalho', color: '#10b981' },      // Emerald
];

export const generateInitialExpenses = (): ExpenseItem[] => {
  return INITIAL_CATEGORIES.map((cat, index) => ({
    id: `init-${index}`,
    category: cat,
    supplier: '',
    estimatedValue: 0,
    actualValue: 0,
    isContracted: false,
    include: true,
  }));
};

export const INITIAL_STATE: AppState = {
  budgetTotal: 60000,
  expenses: generateInitialExpenses(),
  guestGroups: INITIAL_GROUPS,
  guests: [
    { id: 'g1', name: 'Noivo', group: 'Casal', confirmed: true },
    { id: 'g2', name: 'Noiva', group: 'Casal', confirmed: true },
    { id: 'g3', name: 'Mãe da Noiva', group: 'Família Noiva', confirmed: true },
    { id: 'g4', name: 'Pai da Noiva', group: 'Família Noiva', confirmed: true },
    { id: 'g5', name: 'Mãe do Noivo', group: 'Família Noivo', confirmed: true },
    { id: 'g6', name: 'Pai do Noivo', group: 'Família Noivo', confirmed: true },
  ]
};