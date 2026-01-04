import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Network, 
  DollarSign, 
  Users, 
  Sparkles, 
  CheckCircle, 
  ArrowRight,
  Zap,
  Shield,
  BarChart3
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-xl">
              <Network className="text-white" size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight">
              Event<span className="text-teal-400">Graph</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/login" 
              className="text-slate-400 hover:text-white transition-colors px-4 py-2"
            >
              Entrar
            </Link>
            <Link 
              to="/register" 
              className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2 rounded-lg font-medium transition-colors"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-teal-900/20 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-600/10 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-teal-900/30 border border-teal-700/50 rounded-full px-4 py-2 mb-6">
              <Sparkles size={16} className="text-teal-400" />
              <span className="text-sm text-teal-300">A forma mais visual de organizar seu evento</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Visualize suas 
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent"> relações sociais</span>
              <br />como nunca antes
            </h1>
            
            <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
              Organize convidados, gerencie orçamento e visualize conexões em um 
              grafo interativo. Perfeito para casamentos, eventos corporativos e festas.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/register" 
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-teal-900/50"
              >
                Criar Meu Evento <ArrowRight size={20} />
              </Link>
              <Link 
                to="/demo" 
                className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
              >
                Ver Demonstração
              </Link>
            </div>
          </div>

          {/* Hero Image/Preview */}
          <div className="mt-16 relative">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
              <div className="bg-slate-800 px-4 py-3 flex items-center gap-2 border-b border-slate-700">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs text-slate-500 ml-2">EventGraph - Meu Casamento</span>
              </div>
              <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-8">
                {/* Simulated graph visualization */}
                <svg viewBox="0 0 800 400" className="w-full h-full opacity-80">
                  {/* Connection lines */}
                  <line x1="400" y1="200" x2="250" y2="120" stroke="#0d9488" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
                  <line x1="400" y1="200" x2="550" y2="120" stroke="#0d9488" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
                  <line x1="400" y1="200" x2="300" y2="300" stroke="#0d9488" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
                  <line x1="400" y1="200" x2="500" y2="300" stroke="#0d9488" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
                  <line x1="250" y1="120" x2="150" y2="80" stroke="#0d9488" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
                  <line x1="250" y1="120" x2="180" y2="180" stroke="#0d9488" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
                  <line x1="550" y1="120" x2="650" y2="80" stroke="#0d9488" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
                  <line x1="550" y1="120" x2="620" y2="180" stroke="#0d9488" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
                  
                  {/* Center node - Couple */}
                  <circle cx="400" cy="200" r="35" fill="#f43f5e" className="animate-pulse" />
                  <text x="400" y="255" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">Casal</text>
                  
                  {/* Family nodes */}
                  <circle cx="250" cy="120" r="25" fill="#d946ef" />
                  <text x="250" y="165" textAnchor="middle" fill="#e2e8f0" fontSize="10">Família Noiva</text>
                  
                  <circle cx="550" cy="120" r="25" fill="#8b5cf6" />
                  <text x="550" y="165" textAnchor="middle" fill="#e2e8f0" fontSize="10">Família Noivo</text>
                  
                  {/* Friend nodes */}
                  <circle cx="300" cy="300" r="20" fill="#0ea5e9" />
                  <text x="300" y="335" textAnchor="middle" fill="#e2e8f0" fontSize="10">Amigos</text>
                  
                  <circle cx="500" cy="300" r="18" fill="#10b981" />
                  <text x="500" y="335" textAnchor="middle" fill="#e2e8f0" fontSize="10">Trabalho</text>
                  
                  {/* Extended family */}
                  <circle cx="150" cy="80" r="12" fill="#d946ef" opacity="0.7" />
                  <circle cx="180" cy="180" r="14" fill="#d946ef" opacity="0.7" />
                  <circle cx="650" cy="80" r="12" fill="#8b5cf6" opacity="0.7" />
                  <circle cx="620" cy="180" r="14" fill="#8b5cf6" opacity="0.7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tudo que você precisa para organizar seu evento
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Uma plataforma completa que substitui planilhas, apps e anotações dispersas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-teal-500/50 transition-colors">
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Network size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Grafo de Relações</h3>
              <p className="text-slate-400">
                Visualize quem conhece quem. Identifique clusters, pontes sociais e 
                evite colocar pessoas erradas na mesma mesa.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-teal-500/50 transition-colors">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <DollarSign size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Gestão de Orçamento</h3>
              <p className="text-slate-400">
                Controle gastos contratados vs previstos, acompanhe o saldo em tempo 
                real e saiba exatamente o custo por convidado.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-teal-500/50 transition-colors">
              <div className="bg-gradient-to-br from-violet-500 to-violet-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Users size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Gestão de Convidados</h3>
              <p className="text-slate-400">
                Adicione fotos, defina prioridades, confirme presenças e agrupe 
                convidados por categoria com cores personalizadas.
              </p>
            </div>
          </div>

          {/* Additional features */}
          <div className="grid md:grid-cols-4 gap-6 mt-12">
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle size={20} className="text-teal-400 shrink-0" />
              <span>Undo/Redo ilimitado</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle size={20} className="text-teal-400 shrink-0" />
              <span>Exportar dados</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle size={20} className="text-teal-400 shrink-0" />
              <span>Múltiplos eventos</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle size={20} className="text-teal-400 shrink-0" />
              <span>Sincronização na nuvem</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6" id="pricing">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Preços simples e transparentes
            </h2>
            <p className="text-slate-400 text-lg">
              Comece grátis, faça upgrade quando precisar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold mb-2">Grátis</h3>
                <div className="text-4xl font-bold">R$ 0</div>
                <p className="text-slate-400 text-sm mt-2">Para experimentar</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-slate-500" />
                  <span>1 evento</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-slate-500" />
                  <span>Até 30 convidados</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-slate-500" />
                  <span>Grafo interativo</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-slate-500" />
                  <span>Gestão de orçamento</span>
                </li>
              </ul>
              <Link 
                to="/register" 
                className="block w-full text-center bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Começar Grátis
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-teal-900/50 to-slate-800/50 border-2 border-teal-500 rounded-2xl p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-sm font-bold px-4 py-1 rounded-full">
                MAIS POPULAR
              </div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold mb-2">Pro</h3>
                <div className="text-4xl font-bold">R$ 97</div>
                <p className="text-slate-400 text-sm mt-2">Pagamento único por evento</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-teal-400" />
                  <span>Convidados ilimitados</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-teal-400" />
                  <span>Fotos nos convidados</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-teal-400" />
                  <span>Exportar PDF/Excel</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-teal-400" />
                  <span>Compartilhar com parceiro(a)</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-teal-400" />
                  <span>Suporte prioritário</span>
                </li>
              </ul>
              <Link 
                to="/register?plan=pro" 
                className="block w-full text-center bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Escolher Pro
              </Link>
            </div>

            {/* Business Plan */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold mb-2">Business</h3>
                <div className="text-4xl font-bold">R$ 199</div>
                <p className="text-slate-400 text-sm mt-2">Por mês</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-violet-400" />
                  <span>Eventos ilimitados</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-violet-400" />
                  <span>Tudo do Pro</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-violet-400" />
                  <span>Templates personalizados</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-violet-400" />
                  <span>API de integração</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-violet-400" />
                  <span>White-label</span>
                </li>
              </ul>
              <Link 
                to="/register?plan=business" 
                className="block w-full text-center bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Falar com Vendas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para organizar seu evento?
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            Comece grátis agora e veja como é fácil visualizar suas relações sociais.
          </p>
          <Link 
            to="/register" 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-teal-900/50"
          >
            Criar Conta Grátis <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-xl">
              <Network className="text-white" size={20} />
            </div>
            <span className="font-bold text-lg">
              Event<span className="text-teal-400">Graph</span>
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Contato</a>
          </div>
          <p className="text-sm text-slate-500">
            © 2026 EventGraph. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

