import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Network, Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get('plan') || 'free';
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const { signUp, signInWithGoogle, isConfigured } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConfigured) {
      toast.success('Modo demo ativado!');
      navigate('/dashboard');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (!agreeTerms) {
      toast.error('Você precisa aceitar os termos de uso');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);

    if (error) {
      toast.error(error.message || 'Erro ao criar conta');
    } else {
      toast.success('Conta criada! Verifique seu email para confirmar.');
      navigate('/login');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isConfigured) {
      toast.error('Configure o Supabase para usar login social');
      return;
    }

    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message || 'Erro ao fazer login com Google');
    }
  };

  const planDetails = {
    free: { name: 'Grátis', price: 'R$ 0', features: ['1 evento', 'Até 30 convidados'] },
    pro: { name: 'Pro', price: 'R$ 97', features: ['Convidados ilimitados', 'Fotos nos convidados'] },
    business: { name: 'Business', price: 'R$ 199/mês', features: ['Eventos ilimitados', 'Tudo do Pro'] },
  };

  const plan = planDetails[selectedPlan as keyof typeof planDetails] || planDetails.free;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 py-12">
      <div className="absolute inset-0 bg-gradient-to-b from-teal-900/10 to-transparent pointer-events-none" />
      
      <div className="w-full max-w-md relative">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 rounded-xl">
            <Network className="text-white" size={28} />
          </div>
          <span className="font-bold text-2xl text-white">
            Event<span className="text-teal-400">Graph</span>
          </span>
        </Link>

        {/* Selected Plan */}
        {selectedPlan !== 'free' && (
          <div className="bg-teal-900/20 border border-teal-700/50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-teal-400 font-medium">Plano selecionado</span>
              <span className="text-white font-bold">{plan.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              {plan.features.map((feature, idx) => (
                <span key={idx} className="flex items-center gap-1">
                  <CheckCircle size={12} className="text-teal-400" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Criar sua conta</h1>
            <p className="text-slate-400">Comece a organizar seu evento agora</p>
          </div>

          {!isConfigured && (
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 mb-6">
              <p className="text-amber-400 text-sm">
                Modo demo: Supabase não configurado. Clique em criar conta para acessar.
              </p>
            </div>
          )}

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={!isConfigured}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 py-3 rounded-lg font-medium transition-colors mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-900 text-slate-500">ou</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nome completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  required={isConfigured}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  required={isConfigured}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  required={isConfigured}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirmar senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  required={isConfigured}
                />
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-teal-600 focus:ring-teal-500 bg-slate-800 mt-0.5"
              />
              <span className="text-sm text-slate-400">
                Eu concordo com os{' '}
                <a href="#" className="text-teal-400 hover:text-teal-300">Termos de Uso</a>
                {' '}e{' '}
                <a href="#" className="text-teal-400 hover:text-teal-300">Política de Privacidade</a>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || (!agreeTerms && isConfigured)}
              className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta'
              )}
            </button>
          </form>

          <p className="text-center text-slate-400 mt-6">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-teal-400 hover:text-teal-300 transition-colors font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

