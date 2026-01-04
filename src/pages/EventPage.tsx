import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Download, Upload, Undo2, Redo2, LayoutDashboard, Users, ArrowLeft, Loader2, Save, Cloud, CloudOff } from 'lucide-react';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { INITIAL_STATE, INITIAL_GROUPS, generateInitialExpenses } from '../constants';
import { BudgetView } from '../components/BudgetView';
import { GuestGraph } from '../components/GuestGraph';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Event as EventType, Guest as DbGuest, GuestGroup as DbGuestGroup, Expense as DbExpense } from '../lib/database.types';
import { AppState, Guest, GuestGroup, ExpenseItem } from '../types';
import toast from 'react-hot-toast';

export const EventPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { state, execute, undo, redo, canUndo, canRedo, loadState } = useUndoRedo(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'budget' | 'guests'>('budget');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load event and data
  useEffect(() => {
    loadEventData();
  }, [eventId]);

  // Track unsaved changes
  useEffect(() => {
    if (event) {
      setHasUnsavedChanges(true);
    }
  }, [state]);

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

  const loadEventData = async () => {
    if (!eventId) {
      navigate('/dashboard');
      return;
    }

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Event loading timeout');
        setLoading(false);
        toast.error('Timeout ao carregar evento');
      }
    }, 10000);

    if (!isSupabaseConfigured()) {
      // Demo mode
      clearTimeout(timeout);
      setEvent({
        id: eventId,
        user_id: 'demo',
        name: 'Meu Casamento',
        type: 'wedding',
        event_date: '2026-06-15',
        budget_total: 60000,
        description: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      loadState(INITIAL_STATE);
      setLoading(false);
      return;
    }

    try {
      // Load event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        clearTimeout(timeout);
        toast.error('Evento não encontrado');
        navigate('/dashboard');
        return;
      }

      setEvent(eventData);

      // Load guests
      const { data: guestsData } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId);

      // Load guest groups
      const { data: groupsData } = await supabase
        .from('guest_groups')
        .select('*')
        .eq('event_id', eventId);

      // Load expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .eq('event_id', eventId);

      // Convert to app state format
      const guests: Guest[] = (guestsData || []).map(g => ({
        id: g.id,
        name: g.name,
        groupId: g.group_id || '', // Use group_id (FK)
        confirmed: g.confirmed,
        parentId: g.parent_id || undefined,
        priority: g.priority as 1 | 2 | 3 | 4 | 5,
        photoUrl: g.photo_url || undefined,
      }));

      const guestGroups: GuestGroup[] = (groupsData || []).length > 0
        ? groupsData!.map(g => ({
            id: g.id,
            name: g.name,
            color: g.color,
          }))
        : INITIAL_GROUPS;

      const expenses: ExpenseItem[] = (expensesData || []).length > 0
        ? expensesData!.map(e => ({
            id: e.id,
            category: e.category,
            supplier: e.supplier || '',
            estimatedValue: Number(e.estimated_value),
            actualValue: Number(e.actual_value),
            isContracted: e.is_contracted,
            include: e.include,
          }))
        : generateInitialExpenses();

      loadState({
        budgetTotal: Number(eventData.budget_total),
        expenses,
        guests,
        guestGroups,
      });

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading event:', error);
      toast.error('Erro ao carregar evento');
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!isSupabaseConfigured() || !eventId || !event) {
      toast.success('Dados salvos localmente');
      return;
    }

    setSaving(true);

    try {
      // Update event budget
      await supabase
        .from('events')
        .update({ budget_total: state.budgetTotal })
        .eq('id', eventId);

      // Helper to check valid UUIDs
      const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      // Sync guest groups FIRST to get IDs for guests
      await supabase.from('guest_groups').delete().eq('event_id', eventId);
      let groupIdMap: Record<string, string> = {};
      
      if (state.guestGroups.length > 0) {
        const groupsHaveValidIds = state.guestGroups.every(g => isValidUUID(g.id));
        
        const { data: insertedGroups } = await supabase.from('guest_groups').insert(
          state.guestGroups.map(g => ({
            ...(groupsHaveValidIds ? { id: g.id } : {}),
            event_id: eventId,
            name: g.name,
            color: g.color,
          }))
        ).select();
        
        // Create mapping from old IDs to new IDs
        if (insertedGroups) {
          if (groupsHaveValidIds) {
            // IDs were preserved
            state.guestGroups.forEach(g => { groupIdMap[g.id] = g.id; });
          } else {
            // Map by name (order preserved)
            state.guestGroups.forEach((g, i) => {
              if (insertedGroups[i]) {
                groupIdMap[g.id] = insertedGroups[i].id;
              }
            });
          }
        }
      }

      // Sync guests - delete all and re-insert
      await supabase.from('guests').delete().eq('event_id', eventId);
      if (state.guests.length > 0) {
        const guestsHaveValidIds = state.guests.every(g => isValidUUID(g.id));
        
        await supabase.from('guests').insert(
          state.guests.map(g => ({
            ...(guestsHaveValidIds ? { id: g.id } : {}),
            event_id: eventId,
            name: g.name,
            group_id: groupIdMap[g.groupId] || g.groupId || null, // Use mapped group_id
            confirmed: g.confirmed,
            parent_id: (g.parentId && guestsHaveValidIds) ? g.parentId : null,
            priority: g.priority || 3,
            photo_url: g.photoUrl || null,
          }))
        );
      }

      // Sync expenses - omit id to let Supabase generate UUIDs
      await supabase.from('expenses').delete().eq('event_id', eventId);
      if (state.expenses.length > 0) {
        await supabase.from('expenses').insert(
          state.expenses.map(e => ({
            event_id: eventId,
            category: e.category,
            supplier: e.supplier || null,
            estimated_value: e.estimatedValue,
            actual_value: e.actualValue,
            is_contracted: e.isContracted,
            include: e.include,
          }))
        );
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      toast.success('Salvo na nuvem');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }, [eventId, event, state]);

  // Export/Import handlers (keep existing functionality)
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
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
        if (json.budgetTotal && Array.isArray(json.expenses) && Array.isArray(json.guests)) {
          if (!json.guestGroups) {
            json.guestGroups = INITIAL_STATE.guestGroups;
          }
          loadState(json as AppState);
          setHasUnsavedChanges(true);
          toast.success('Dados importados!');
        } else {
          toast.error('Formato de arquivo inválido');
        }
      } catch (err) {
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
};

