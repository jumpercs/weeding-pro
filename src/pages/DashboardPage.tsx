import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Calendar, 
  Users, 
  DollarSign, 
  MoreVertical, 
  Edit2, 
  Trash2,
  Network,
  LogOut,
  Settings,
  Crown,
  Loader2,
  PartyPopper,
  Building2,
  Cake
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEvents, useDeleteEvent, useCreateEvent } from '../hooks/useEvents';
import toast from 'react-hot-toast';

export const DashboardPage: React.FC = () => {
  const { user, profile, subscription, signOut, isPro } = useAuth();
  const { events, isLoading: loading } = useEvents();
  const deleteEventMutation = useDeleteEvent();
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await deleteEventMutation.mutateAsync({ id: eventId });
      toast.success('Evento excluído');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erro ao excluir evento');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      // Always navigate to home, even if signOut fails
      navigate('/');
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'wedding': return <PartyPopper size={24} className="text-rose-400" />;
      case 'corporate': return <Building2 size={24} className="text-blue-400" />;
      case 'birthday': return <Cake size={24} className="text-amber-400" />;
      default: return <Calendar size={24} className="text-teal-400" />;
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'wedding': return 'Casamento';
      case 'corporate': return 'Corporativo';
      case 'birthday': return 'Aniversário';
      default: return 'Outro';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Data não definida';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // Check event limit for free users
  const canCreateEvent = isPro || events.length < 1;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-xl">
              <Network className="text-white" size={24} />
            </div>
            <span className="font-bold text-xl text-white">
              Event<span className="text-teal-400">Graph</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Subscription badge */}
            {subscription && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                isPro 
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 border border-amber-500/30' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {isPro && <Crown size={14} />}
                {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
              </div>
            )}

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'user' ? null : 'user')}
                className="flex items-center gap-3 hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                  {(profile?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-white">
                    {profile?.name || 'Usuário'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {user?.email || 'demo@example.com'}
                  </p>
                </div>
              </button>

              {activeDropdown === 'user' && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 z-[60]">
                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-slate-700 transition-colors"
                    onClick={() => setActiveDropdown(null)}
                  >
                    <Settings size={16} />
                    Configurações
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2 text-rose-400 hover:bg-slate-700 transition-colors"
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Meus Eventos</h1>
            <p className="text-slate-400">
              Gerencie todos os seus eventos em um só lugar
            </p>
          </div>

          <button
            onClick={() => canCreateEvent ? setShowNewEventModal(true) : toast.error('Faça upgrade para criar mais eventos')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
              canCreateEvent
                ? 'bg-teal-600 hover:bg-teal-500 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Plus size={20} />
            Novo Evento
          </button>
        </div>

        {/* Upgrade banner for free users */}
        {!isPro && events.length >= 1 && (
          <div className="bg-gradient-to-r from-amber-900/30 to-amber-800/30 border border-amber-700/50 rounded-xl p-6 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500/20 p-3 rounded-xl">
                <Crown size={28} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Quer criar mais eventos?
                </h3>
                <p className="text-slate-300">
                  Faça upgrade para o plano Pro e tenha convidados ilimitados, fotos e muito mais.
                </p>
              </div>
            </div>
            <Link
              to="/#pricing"
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-6 py-3 rounded-lg font-bold transition-colors shrink-0"
            >
              Ver Planos
            </Link>
          </div>
        )}

        {/* Events grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-teal-500" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-slate-800/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar size={40} className="text-slate-600" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Nenhum evento ainda
            </h2>
            <p className="text-slate-400 mb-6">
              Crie seu primeiro evento para começar a organizar
            </p>
            <button
              onClick={() => setShowNewEventModal(true)}
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <Plus size={20} />
              Criar Primeiro Evento
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors group"
              >
                {/* Event header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 border-b border-slate-800">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-slate-700/50 p-3 rounded-xl">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === event.id ? null : event.id);
                        }}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {activeDropdown === event.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 z-50">
                          <Link
                            to={`/event/${event.id}`}
                            className="flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-slate-700 transition-colors"
                            onClick={() => setActiveDropdown(null)}
                          >
                            <Edit2 size={14} />
                            Editar
                          </Link>
                          <button
                            onClick={() => {
                              handleDeleteEvent(event.id);
                              setActiveDropdown(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-rose-400 hover:bg-slate-700 transition-colors"
                          >
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">
                    {event.name}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {getEventTypeLabel(event.type)}
                  </p>
                </div>

                {/* Event details */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3 text-slate-300">
                    <Calendar size={18} className="text-slate-500" />
                    <span>{formatDate(event.eventDate)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <DollarSign size={18} className="text-slate-500" />
                    <span>{formatCurrency(event.budgetTotal)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <Users size={18} className="text-slate-500" />
                    <span>{event.guestCount || 0} convidados</span>
                  </div>
                </div>

                {/* Action button */}
                <div className="px-6 pb-6">
                  <Link
                    to={`/event/${event.id}`}
                    className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-teal-400 py-3 rounded-xl font-medium transition-colors"
                  >
                    Abrir Evento
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Event Modal */}
      {showNewEventModal && (
        <NewEventModal
          onClose={() => setShowNewEventModal(false)}
          onCreated={() => setShowNewEventModal(false)}
        />
      )}

      {/* Click outside to close dropdowns */}
      {activeDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setActiveDropdown(null)}
          onContextMenu={(e) => e.preventDefault()}
        />
      )}
    </div>
  );
};

// New Event Modal Component
interface NewEventModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const NewEventModal: React.FC<NewEventModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'wedding' | 'corporate' | 'birthday' | 'other'>('wedding');
  const [eventDate, setEventDate] = useState('');
  const [budget, setBudget] = useState(60000);
  const navigate = useNavigate();
  
  const createEventMutation = useCreateEvent();
  const loading = createEventMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Digite um nome para o evento');
      return;
    }

    try {
      const newEvent = await createEventMutation.mutateAsync({
        name,
        type,
        eventDate: eventDate || null,
        budgetTotal: budget,
        description: null,
      });
      
      onCreated();
      toast.success('Evento criado!');
      navigate(`/event/${newEvent.id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Erro ao criar evento');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Criar Novo Evento</h2>
          <p className="text-slate-400 text-sm mt-1">
            Preencha as informações básicas do seu evento
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nome do Evento *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Casamento João & Maria"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tipo de Evento
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: 'wedding', label: 'Casamento', icon: PartyPopper, color: 'rose' },
                { value: 'corporate', label: 'Corporativo', icon: Building2, color: 'blue' },
                { value: 'birthday', label: 'Aniversário', icon: Cake, color: 'amber' },
                { value: 'other', label: 'Outro', icon: Calendar, color: 'teal' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value as typeof type)}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    type === option.value
                      ? `border-${option.color}-500 bg-${option.color}-500/10`
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <option.icon size={24} className={type === option.value ? `text-${option.color}-400` : 'text-slate-400'} />
                  <span className={`text-xs ${type === option.value ? 'text-white' : 'text-slate-400'}`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Data do Evento
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Orçamento Total (R$)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                min={0}
                step={1000}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Evento'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

