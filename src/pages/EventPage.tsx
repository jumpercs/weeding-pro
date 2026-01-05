import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Download, Upload, Undo2, Redo2, LayoutDashboard, Users, ArrowLeft, Loader2, Save, Cloud, CloudOff } from 'lucide-react';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { INITIAL_STATE, INITIAL_GROUPS, generateInitialExpenses } from '../constants';
import { BudgetView } from '../components/BudgetView';
import { GuestGraph } from '../components/GuestGraph';
import { isSupabaseConfigured } from '../lib/supabase';
import { useEvent, useSyncEventData, useSyncDelta } from '../hooks/useEvents';
import type { Event as EventType } from '../lib/database.types';
import { AppState, Guest, GuestGroup, ExpenseItem } from '../types';
import toast from 'react-hot-toast';

export const EventPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  const { state, execute, undo, redo, canUndo, canRedo, loadState, getDeltas, hasPendingChanges, markAsSynced } = useUndoRedo(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'budget' | 'guests'>('budget');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Use delta-based change detection
  const hasUnsavedChanges = dataLoaded && hasPendingChanges();

  // Use tRPC to fetch event data
  const { event: trpcEvent, isLoading: trpcLoading } = useEvent(eventId || '');
  
  // Convert tRPC event to local format
  const event: EventType | null = trpcEvent ? {
    id: trpcEvent.id,
    user_id: '', // Not needed for display
    name: trpcEvent.name,
    type: trpcEvent.type,
    event_date: trpcEvent.eventDate,
    budget_total: trpcEvent.budgetTotal,
    description: trpcEvent.description,
    created_at: trpcEvent.createdAt,
    updated_at: trpcEvent.updatedAt,
  } : null;
  
  const loading = !isSupabaseConfigured() ? false : (trpcLoading && !dataLoaded);

  // Load state from tRPC data when it arrives
  useEffect(() => {
    if (trpcEvent && !dataLoaded) {
      const guests: Guest[] = (trpcEvent.guests || []).map(g => ({
        id: g.id,
        name: g.name,
        groupId: g.groupId || '',
        confirmed: g.confirmed,
        parentId: g.parentId || undefined,
        priority: g.priority as 1 | 2 | 3 | 4 | 5,
        photoUrl: g.photoUrl || undefined,
      }));

      const guestGroups: GuestGroup[] = (trpcEvent.guestGroups || []).map(g => ({
        id: g.id,
        name: g.name,
        color: g.color,
      }));

      const expenses: ExpenseItem[] = (trpcEvent.expenses || []).map(e => ({
        id: e.id,
        category: e.category,
        supplier: e.supplier || '',
        estimatedValue: e.estimatedValue,
        actualValue: e.actualValue,
        isContracted: e.isContracted,
        include: e.include,
      }));

      loadState({
        budgetTotal: trpcEvent.budgetTotal,
        expenses,
        guests,
        guestGroups,
      });
      
      setDataLoaded(true);
    }
  }, [trpcEvent, dataLoaded, loadState]);

  // Handle demo mode
  useEffect(() => {
    if (!isSupabaseConfigured() && !dataLoaded) {
      loadState(INITIAL_STATE);
      setDataLoaded(true);
    }
  }, [dataLoaded, loadState]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!isSupabaseConfigured() || !hasUnsavedChanges) return;

    const interval = setInterval(() => {
      if (hasUnsavedChanges) {
        handleSave();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [hasUnsavedChanges]);

// Use delta sync for fast incremental saves, fallback to full sync for large changes
  const syncDelta = useSyncDelta();
  const syncEventData = useSyncEventData();

  const handleSave = useCallback(async () => {
    if (!isSupabaseConfigured() || !eventId || !event) {
      toast.success('Dados salvos localmente');
      return;
    }

    setSaving(true);

    try {
      const delta = getDeltas();
      
      // Calculate total changes
      const totalChanges = 
        (delta.budgetTotal !== undefined ? 1 : 0) +
        delta.guests.created.length + delta.guests.updated.length + delta.guests.deleted.length +
        delta.guestGroups.created.length + delta.guestGroups.updated.length + delta.guestGroups.deleted.length +
        delta.expenses.created.length + delta.expenses.updated.length + delta.expenses.deleted.length;

      // If changes are small, use delta sync (much faster)
      // If changes are large (>50% of data), use full sync
      const totalItems = state.guests.length + state.guestGroups.length + state.expenses.length;
      const useDeltaSync = totalChanges < totalItems * 0.5;

      if (useDeltaSync && totalChanges > 0) {
        // Delta sync - only send changes
        await syncDelta.mutateAsync({
          eventId,
          budgetTotal: delta.budgetTotal,
          guests: {
            created: delta.guests.created.map(g => ({
              id: g.id,
              name: g.name,
              groupId: g.groupId || null,
              confirmed: g.confirmed,
              parentId: g.parentId || null,
              priority: g.priority || 3,
              photoUrl: g.photoUrl || null,
            })),
            updated: delta.guests.updated.map(g => ({
              id: g.id,
              name: g.name,
              groupId: g.groupId || null,
              confirmed: g.confirmed,
              parentId: g.parentId || null,
              priority: g.priority || 3,
              photoUrl: g.photoUrl || null,
            })),
            deleted: delta.guests.deleted,
          },
          guestGroups: {
            created: delta.guestGroups.created,
            updated: delta.guestGroups.updated,
            deleted: delta.guestGroups.deleted,
          },
          expenses: {
            created: delta.expenses.created.map(e => ({
              id: e.id,
              category: e.category,
              supplier: e.supplier || null,
              estimatedValue: e.estimatedValue,
              actualValue: e.actualValue,
              isContracted: e.isContracted,
              include: e.include,
            })),
            updated: delta.expenses.updated.map(e => ({
              id: e.id,
              category: e.category,
              supplier: e.supplier || null,
              estimatedValue: e.estimatedValue,
              actualValue: e.actualValue,
              isContracted: e.isContracted,
              include: e.include,
            })),
            deleted: delta.expenses.deleted,
          },
        });
      } else if (totalChanges > 0) {
        // Full sync for large changes or first save
        await syncEventData.mutateAsync({
          eventId,
          budgetTotal: state.budgetTotal,
          guestGroups: state.guestGroups.map(g => ({
            id: g.id,
            name: g.name,
            color: g.color,
          })),
          guests: state.guests.map(g => ({
            id: g.id,
            name: g.name,
            groupId: g.groupId || null,
            confirmed: g.confirmed,
            parentId: g.parentId || null,
            priority: g.priority || 3,
            photoUrl: g.photoUrl || null,
          })),
          expenses: state.expenses.map(e => ({
            id: e.id,
            category: e.category,
            supplier: e.supplier || null,
            estimatedValue: e.estimatedValue,
            actualValue: e.actualValue,
            isContracted: e.isContracted,
            include: e.include,
          })),
        });
      }

      // Mark current state as synced (update baseline)
      markAsSynced();
      setLastSaved(new Date());
      toast.success('Salvo na nuvem');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }, [eventId, event, state, getDeltas, syncDelta, syncEventData, markAsSynced]);

  // Export/Import handlers - exports clean data without internal IDs
  const handleExport = () => {
    // Create clean export without internal IDs (more portable)
    const exportData = {
      budgetTotal: state.budgetTotal,
      guestGroups: state.guestGroups.map(g => ({
        name: g.name,
        color: g.color,
      })),
      guests: state.guests.map(g => {
        const group = state.guestGroups.find(gr => gr.id === g.groupId);
        const parent = g.parentId ? state.guests.find(p => p.id === g.parentId) : null;
        return {
          name: g.name,
          groupName: group?.name || '',
          confirmed: g.confirmed,
          parentName: parent?.name || null,
          priority: g.priority || 3,
          photoUrl: g.photoUrl || null,
        };
      }),
      expenses: state.expenses.map(e => ({
        category: e.category,
        supplier: e.supplier,
        estimatedValue: e.estimatedValue,
        actualValue: e.actualValue,
        isContracted: e.isContracted,
        include: e.include,
      })),
      exportedAt: new Date().toISOString(),
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${event?.name || 'evento'}_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (json.budgetTotal !== undefined && Array.isArray(json.guests)) {
          
          // Extract unique group names and create groups
          // Support both 'group' (old format) and 'groupName' (new format)
          const groupNames = new Set<string>();
          json.guestGroups?.forEach((g: { name: string }) => groupNames.add(g.name));
          json.guests.forEach((g: { group?: string; groupName?: string }) => {
            const gName = g.group || g.groupName;
            if (gName) groupNames.add(gName);
          });
          
          const groupByName: Record<string, GuestGroup> = {};
          const defaultColors = ['#f43f5e', '#d946ef', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];
          let colorIdx = 0;
          
          // Use provided groups or create from names
          if (json.guestGroups?.length > 0) {
            json.guestGroups.forEach((g: { name: string; color?: string }) => {
              const id = crypto.randomUUID();
              groupByName[g.name] = { id, name: g.name, color: g.color || defaultColors[colorIdx++ % defaultColors.length] };
            });
          }
          // Add any groups referenced by guests but not in guestGroups
          groupNames.forEach(name => {
            if (!groupByName[name]) {
              groupByName[name] = { id: crypto.randomUUID(), name, color: defaultColors[colorIdx++ % defaultColors.length] };
            }
          });
          
          const newGroups = Object.values(groupByName);
          if (newGroups.length === 0) {
            INITIAL_GROUPS.forEach(g => {
              groupByName[g.name] = { id: crypto.randomUUID(), name: g.name, color: g.color };
            });
          }
          const finalGroups = Object.values(groupByName);
          
          // Create guests - first pass to build old ID -> new ID map
          const oldIdToNewId: Record<string, string> = {};
          json.guests.forEach((g: { id?: string }) => {
            const oldId = g.id || crypto.randomUUID();
            oldIdToNewId[oldId] = crypto.randomUUID();
          });
          
          // Second pass to create guests with correct references
          // Support both 'parentId' (old format) and 'parentName' (new format)
          type ImportedGuest = { 
            id?: string; 
            name: string; 
            group?: string; 
            groupName?: string; 
            confirmed?: boolean; 
            parentId?: string; 
            parentName?: string | null; 
            priority?: number; 
            photoUrl?: string | null;
          };
          
          // Build name -> newId map for parentName lookup
          const nameToNewId: Record<string, string> = {};
          json.guests.forEach((g: ImportedGuest) => {
            const oldId = g.id || crypto.randomUUID();
            nameToNewId[g.name] = oldIdToNewId[oldId];
          });
          
          const newGuests: Guest[] = json.guests.map((g: ImportedGuest) => {
            const oldId = g.id || '';
            const groupName = g.group || g.groupName;
            
            // Resolve parentId: check old parentId first, then parentName
            let resolvedParentId: string | undefined;
            if (g.parentId && oldIdToNewId[g.parentId]) {
              resolvedParentId = oldIdToNewId[g.parentId];
            } else if (g.parentName && nameToNewId[g.parentName]) {
              resolvedParentId = nameToNewId[g.parentName];
            }
            
            return {
              id: oldIdToNewId[oldId] || crypto.randomUUID(),
              name: g.name,
              groupId: groupName ? (groupByName[groupName]?.id || finalGroups[0]?.id) : finalGroups[0]?.id,
              confirmed: g.confirmed || false,
              parentId: resolvedParentId,
              priority: (g.priority || 3) as 1 | 2 | 3 | 4 | 5,
              photoUrl: g.photoUrl || undefined,
            };
          });
          
          // Expenses
          const newExpenses: ExpenseItem[] = (json.expenses || generateInitialExpenses()).map((e: { category?: string; supplier?: string; estimatedValue?: number; actualValue?: number; isContracted?: boolean; include?: boolean }) => ({
            id: crypto.randomUUID(),
            category: e.category || 'Sem categoria',
            supplier: e.supplier || '',
            estimatedValue: e.estimatedValue || 0,
            actualValue: e.actualValue || 0,
            isContracted: e.isContracted || false,
            include: e.include !== false,
          }));
          
          // Load into local state
          loadState({
            budgetTotal: json.budgetTotal,
            guestGroups: finalGroups,
            guests: newGuests,
            expenses: newExpenses,
          });
          
          // Save to database immediately using full sync
          if (eventId) {
            syncEventData.mutate({
              eventId,
              budgetTotal: json.budgetTotal,
              guestGroups: finalGroups.map(g => ({
                id: g.id,
                name: g.name,
                color: g.color,
              })),
              guests: newGuests.map(g => ({
                id: g.id,
                name: g.name,
                groupId: g.groupId || null,
                confirmed: g.confirmed,
                parentId: g.parentId || null,
                priority: g.priority || 3,
                photoUrl: g.photoUrl || null,
              })),
              expenses: newExpenses.map(e => ({
                id: e.id,
                category: e.category,
                supplier: e.supplier || null,
                estimatedValue: e.estimatedValue,
                actualValue: e.actualValue,
                isContracted: e.isContracted,
                include: e.include,
              })),
            });
            markAsSynced();
            toast.success(`Importado e salvo: ${newGuests.length} convidados, ${finalGroups.length} grupos`);
          } else {
            toast.success(`Importado: ${newGuests.length} convidados, ${finalGroups.length} grupos`);
          }
        } else {
          toast.error('Formato de arquivo inválido');
        }
      } catch (err) {
        console.error('Import error:', err);
        toast.error('Erro ao ler arquivo');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <Loader2 size={40} className="animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      
      {/* Header / Toolbar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shadow-md shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link 
            to="/dashboard"
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 p-2 rounded-lg">
              <LayoutDashboard className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">{event?.name || 'Evento'}</h1>
              <p className="text-xs text-slate-400">
                {lastSaved ? `Salvo às ${lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Não salvo'}
              </p>
            </div>
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
          {/* Save status */}
          <div className="flex items-center gap-2 text-sm">
            {isSupabaseConfigured() ? (
              hasUnsavedChanges ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <CloudOff size={14} />
                  Alterações não salvas
                </span>
              ) : (
                <span className="text-teal-400 flex items-center gap-1">
                  <Cloud size={14} />
                  Sincronizado
                </span>
              )
            ) : (
              <span className="text-slate-500 flex items-center gap-1">
                <CloudOff size={14} />
                Modo offline
              </span>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="flex items-center gap-2 text-sm bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar
          </button>

          {/* Undo/Redo */}
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

          {/* Import/Export */}
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
                id: crypto.randomUUID(), 
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
};

