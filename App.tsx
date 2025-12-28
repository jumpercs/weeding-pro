import React, { useState } from 'react';
import { Download, Upload, Undo2, Redo2, LayoutDashboard, Users } from 'lucide-react';
import { useUndoRedo } from './hooks/useUndoRedo';
import { INITIAL_STATE } from './constants';
import { BudgetView } from './components/BudgetView';
import { GuestGraph } from './components/GuestGraph';
import { AppState } from './types';

function App() {
  const { state, execute, undo, redo, canUndo, canRedo, loadState } = useUndoRedo(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'budget' | 'guests'>('budget');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Persistence Handlers
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `casamento_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        // Basic validation
        if (json.budgetTotal && Array.isArray(json.expenses) && Array.isArray(json.guests)) {
            // Migration check: ensure guestGroups exists if importing old file
            if (!json.guestGroups) {
                json.guestGroups = INITIAL_STATE.guestGroups;
            }
            loadState(json as AppState);
        } else {
            alert("Formato de arquivo inválido.");
        }
      } catch (err) {
        alert("Erro ao ler arquivo.");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      
      {/* Header / Toolbar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shadow-md shrink-0 z-20">
        <div className="flex items-center gap-3">
            <div className="bg-teal-600 p-2 rounded-lg">
                <LayoutDashboard className="text-white" size={20} />
            </div>
            <div>
                <h1 className="font-bold text-lg tracking-tight">Wedding Planner <span className="text-teal-400">Pro</span></h1>
            </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button 
                onClick={() => setActiveTab('budget')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'budget' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
                Orçamento
            </button>
            <button 
                onClick={() => setActiveTab('guests')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'guests' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
                <Users size={14} /> Convidados
            </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                    onClick={undo} 
                    disabled={!canUndo}
                    className="p-2 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors"
                    title="Desfazer"
                >
                    <Undo2 size={18} />
                </button>
                <div className="w-px h-6 bg-slate-700"></div>
                <button 
                    onClick={redo} 
                    disabled={!canRedo}
                    className="p-2 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors"
                    title="Refazer"
                >
                    <Redo2 size={18} />
                </button>
            </div>

            <div className="flex items-center gap-2">
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json"
                    onChange={handleImport}
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-teal-400 px-3 py-2 rounded hover:bg-slate-800 transition-colors"
                >
                    <Upload size={16} /> Importar
                </button>
                <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-teal-400 border border-teal-900/50 hover:border-teal-500/50 px-3 py-2 rounded transition-all shadow-sm"
                >
                    <Download size={16} /> Exportar
                </button>
            </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
          {activeTab === 'budget' ? (
              <BudgetView 
                state={state}
                onUpdateBudget={(val) => execute({ type: 'UPDATE_BUDGET_TOTAL', payload: val })}
                onUpdateExpense={(item) => execute({ type: 'UPDATE_EXPENSE', payload: item })}
                onDeleteExpense={(id) => execute({ type: 'DELETE_EXPENSE', payload: id })}
                onAddExpense={() => execute({ 
                    type: 'ADD_EXPENSE', 
                    payload: { 
                        id: Date.now().toString(), 
                        category: 'Nova Despesa', 
                        supplier: '', 
                        estimatedValue: 0, 
                        actualValue: 0, 
                        isContracted: false, 
                        include: true 
                    } 
                })}
              />
          ) : (
              <GuestGraph 
                guests={state.guests}
                groups={state.guestGroups}
                onAddGuest={(guest) => execute({ type: 'ADD_GUEST', payload: guest })}
                onUpdateGuest={(guest) => execute({ type: 'UPDATE_GUEST', payload: guest })}
                onBulkAddGuests={(guests) => execute({ type: 'BULK_ADD_GUESTS', payload: guests })}
                onDeleteGuest={(id) => execute({ type: 'DELETE_GUEST', payload: id })}
                onToggleConfirm={(id) => execute({ type: 'TOGGLE_GUEST_CONFIRM', payload: id })}
                onAddGroup={(group) => execute({ type: 'ADD_GUEST_GROUP', payload: group })}
                onDeleteGroup={(id) => execute({ type: 'DELETE_GUEST_GROUP', payload: id })}
              />
          )}
      </main>

    </div>
  );
}

export default App;