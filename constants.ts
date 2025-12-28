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
    { id: 'g0', name: 'O Casal', group: 'Casal', confirmed: true },
    { id: 'g1', name: 'Mãe da Noiva', group: 'Família Noiva', confirmed: true, parentId: 'g0' },
    { id: 'g2', name: 'Pai da Noiva', group: 'Família Noiva', confirmed: true, parentId: 'g0' },
    { id: 'g3', name: 'Mãe do Noivo', group: 'Família Noivo', confirmed: true, parentId: 'g0' },
    { id: 'g4', name: 'Pai do Noivo', group: 'Família Noivo', confirmed: true, parentId: 'g0' },
    { id: 'g5', name: 'Tia Maria', group: 'Família Noiva', confirmed: false, parentId: 'g1' },
    { id: 'g6', name: 'Tio João', group: 'Família Noiva', confirmed: false, parentId: 'g1' },
  ]
};