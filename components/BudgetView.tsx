import React from 'react';
import { AppState, ExpenseItem } from '../types';
import { Plus, Trash2, Check, X } from 'lucide-react';

interface BudgetViewProps {
  state: AppState;
  onUpdateBudget: (val: number) => void;
  onUpdateExpense: (item: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  onAddExpense: () => void;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const BudgetView: React.FC<BudgetViewProps> = ({
  state,
  onUpdateBudget,
  onUpdateExpense,
  onDeleteExpense,
  onAddExpense
}) => {
  // Calculations
  const totalBudget = state.budgetTotal;
  
  // Expenses that are marked to include
  const activeExpenses = state.expenses.filter(e => e.include);

  const totalContracted = activeExpenses
    .filter(e => e.isContracted)
    .reduce((acc, curr) => acc + curr.actualValue, 0);

  const totalProjected = activeExpenses
    .filter(e => !e.isContracted)
    .reduce((acc, curr) => acc + curr.estimatedValue, 0);
  
  // The screenshot implies "Faltam" (Missing/Forecast) is what is left to pay or estimated remaining
  // But logically in budget sheets:
  // Total Cost = Contracted (Paid/Fixed) + Projected (Estimated)
  const totalCost = totalContracted + totalProjected;
  const balance = totalBudget - totalCost;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-4 gap-6 overflow-hidden">
      
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
        
        {/* Main Budget Input Card */}
        <div className="bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-700">
            <h2 className="text-teal-400 text-sm font-bold uppercase tracking-wider mb-4">Visão Geral</h2>
            
            <div className="flex items-center justify-between mb-4">
                <label className="text-lg font-medium text-slate-300">Orçamento Total</label>
                <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-sm">R$</span>
                    <input 
                        type="number" 
                        value={state.budgetTotal} 
                        onChange={(e) => onUpdateBudget(Number(e.target.value))}
                        className="bg-white text-slate-900 pl-10 pr-4 py-2 rounded font-bold w-40 text-right focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-inner"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
                <label className="text-sm font-medium text-slate-400">Total Convidados</label>
                <span className="text-xl font-bold text-white">{state.guests.length}</span>
            </div>

             <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col">
                    <span className="text-xs text-slate-400 uppercase">Custo / Convidado</span>
                    <span className="text-lg font-mono text-teal-300">
                        {formatCurrency(state.guests.length > 0 ? totalCost / state.guests.length : 0)}
                    </span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-xs text-slate-400 uppercase">Progresso</span>
                     <span className="text-lg font-mono text-teal-300">
                        {Math.round((totalContracted / totalCost) * 100 || 0)}%
                    </span>
                </div>
            </div>
        </div>

        {/* Financial Summary Card (Replicating screenshot colors roughly) */}
        <div className="bg-slate-800 rounded-lg overflow-hidden shadow-lg border border-slate-700 flex flex-col">
             <div className="bg-teal-700 p-4 flex justify-between items-center">
                 <span className="font-bold text-white text-lg">Orçamento Disponível</span>
                 <span className="font-bold text-white text-2xl">{formatCurrency(totalBudget)}</span>
             </div>
             <div className="p-4 space-y-3 flex-1">
                 <div className="flex justify-between items-center text-slate-300">
                     <span>Contratado (Real)</span>
                     <span className="font-mono">{formatCurrency(totalContracted)}</span>
                 </div>
                 <div className="flex justify-between items-center text-slate-300">
                     <span>Faltam (Previsto)</span>
                     <span className="font-mono">{formatCurrency(totalProjected)}</span>
                 </div>
                 <div className="h-px bg-slate-600 my-2"></div>
                 <div className="flex justify-between items-center text-teal-400 font-bold text-lg">
                     <span>Custo Total</span>
                     <span>{formatCurrency(totalCost)}</span>
                 </div>
                 <div className={`flex justify-between items-center font-bold text-xl p-2 rounded ${balance >= 0 ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}`}>
                     <span>Saldo</span>
                     <span>{formatCurrency(balance)}</span>
                 </div>
             </div>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="flex-1 overflow-hidden bg-slate-800 rounded-lg border border-slate-700 shadow-xl flex flex-col">
        <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-slate-200">Detalhamento de Despesas</h3>
            <button 
                onClick={onAddExpense}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded text-sm transition-colors"
            >
                <Plus size={16} /> Novo Item
            </button>
        </div>

        <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="p-3 font-semibold border-b border-slate-700 w-1/4">Serviço / Categoria</th>
                        <th className="p-3 font-semibold border-b border-slate-700 w-1/4">Fornecedor</th>
                        <th className="p-3 font-semibold border-b border-slate-700 text-right">Valor Previsto</th>
                        <th className="p-3 font-semibold border-b border-slate-700 text-right">Valor Real</th>
                        <th className="p-3 font-semibold border-b border-slate-700 text-center w-24">Contratado?</th>
                        <th className="p-3 font-semibold border-b border-slate-700 text-center w-24">Incluir?</th>
                        <th className="p-3 font-semibold border-b border-slate-700 w-12"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {state.expenses.map((expense) => (
                        <tr key={expense.id} className={`hover:bg-slate-700/50 transition-colors ${!expense.include ? 'opacity-50' : ''}`}>
                            <td className="p-2">
                                <input 
                                    className="w-full bg-transparent text-slate-200 focus:outline-none focus:border-b focus:border-teal-500 px-1"
                                    value={expense.category}
                                    onChange={(e) => onUpdateExpense({...expense, category: e.target.value})}
                                />
                            </td>
                            <td className="p-2">
                                <input 
                                    className="w-full bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none focus:border-b focus:border-teal-500 px-1"
                                    placeholder="Nome do Fornecedor"
                                    value={expense.supplier}
                                    onChange={(e) => onUpdateExpense({...expense, supplier: e.target.value})}
                                />
                            </td>
                            <td className="p-2 text-right">
                                <div className="relative group">
                                    <span className="text-slate-500 absolute left-0 text-xs top-1">R$</span>
                                    <input 
                                        type="number"
                                        className="w-full bg-transparent text-right text-slate-200 focus:outline-none focus:bg-slate-700 rounded px-1"
                                        value={expense.estimatedValue}
                                        onChange={(e) => onUpdateExpense({...expense, estimatedValue: Number(e.target.value)})}
                                    />
                                </div>
                            </td>
                             <td className="p-2 text-right">
                                <div className="relative group">
                                    <span className={`absolute left-0 text-xs top-1 ${expense.isContracted ? 'text-teal-500' : 'text-slate-600'}`}>R$</span>
                                    <input 
                                        type="number"
                                        className={`w-full bg-transparent text-right focus:outline-none focus:bg-slate-700 rounded px-1 ${expense.isContracted ? 'text-teal-400 font-bold' : 'text-slate-500'}`}
                                        value={expense.actualValue}
                                        disabled={!expense.isContracted}
                                        onChange={(e) => onUpdateExpense({...expense, actualValue: Number(e.target.value)})}
                                    />
                                </div>
                            </td>
                            <td className="p-2 text-center">
                                <button 
                                    onClick={() => onUpdateExpense({...expense, isContracted: !expense.isContracted})}
                                    className={`p-1 rounded ${expense.isContracted ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                                >
                                    {expense.isContracted ? <Check size={16} /> : <span className="text-xs px-1">Não</span>}
                                </button>
                            </td>
                            <td className="p-2 text-center">
                                 <button 
                                    onClick={() => onUpdateExpense({...expense, include: !expense.include})}
                                    className={`p-1 rounded ${expense.include ? 'bg-slate-600 text-teal-300' : 'bg-slate-800 text-slate-600 border border-slate-700'}`}
                                >
                                    <span className="text-xs px-2">{expense.include ? 'Sim' : 'Não'}</span>
                                </button>
                            </td>
                            <td className="p-2 text-center">
                                <button 
                                    onClick={() => onDeleteExpense(expense.id)}
                                    className="text-slate-600 hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};