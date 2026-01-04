import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Network, CheckCircle, Crown, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStripe, isStripeConfigured, STRIPE_PRICES, createCheckoutSession } from '../lib/stripe';
import toast from 'react-hot-toast';

export const PricingPage: React.FC = () => {
  const { user, subscription, isPro } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (priceId: string, planName: string) => {
    if (!user) {
      navigate(`/register?plan=${planName}`);
      return;
    }

    if (!isStripeConfigured()) {
      toast.error('Pagamentos não configurados. Configure o Stripe primeiro.');
      return;
    }

    setLoading(planName);

    try {
      const session = await createCheckoutSession({
        priceId,
        userId: user.id,
        email: user.email!,
        successUrl: `${window.location.origin}/dashboard?success=true`,
        cancelUrl: `${window.location.origin}/pricing?canceled=true`,
      });

      if (session?.url) {
        window.location.href = session.url;
      } else {
        // Fallback: redirect to Stripe directly (demo mode)
        const stripe = await getStripe();
        if (stripe) {
          // In production, you'd redirect to a checkout session URL
          toast.error('Checkout session creation failed. Check your backend setup.');
        } else {
          toast.error('Stripe não está configurado');
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Erro ao iniciar pagamento');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <nav className="bg-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-xl">
              <Network className="text-white" size={24} />
            </div>
            <span className="font-bold text-xl text-white">
              Event<span className="text-teal-400">Graph</span>
            </span>
          </Link>
          {user ? (
            <Link 
              to="/dashboard" 
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
              Voltar ao Dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-slate-400 hover:text-white transition-colors px-4 py-2">
                Entrar
              </Link>
              <Link to="/register" className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2 rounded-lg font-medium transition-colors">
                Começar Grátis
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Pricing Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Escolha seu plano
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Comece grátis e faça upgrade quando precisar de mais recursos.
            </p>
          </div>

          {/* Current plan badge */}
          {subscription && (
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-4 py-2 text-sm">
                <Crown size={16} className={isPro ? 'text-amber-400' : 'text-slate-500'} />
                Seu plano atual: <span className="font-bold text-white">{subscription.plan}</span>
              </span>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold mb-2">Grátis</h3>
                <div className="text-4xl font-bold">R$ 0</div>
                <p className="text-slate-400 text-sm mt-2">Para experimentar</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-slate-500 shrink-0" />
                  <span>1 evento</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-slate-500 shrink-0" />
                  <span>Até 30 convidados</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-slate-500 shrink-0" />
                  <span>Grafo interativo</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-slate-500 shrink-0" />
                  <span>Gestão de orçamento</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-slate-500 shrink-0" />
                  <span>Exportar JSON</span>
                </li>
              </ul>
              {subscription?.plan === 'free' ? (
                <div className="w-full text-center bg-slate-800 text-slate-400 py-3 rounded-lg font-medium">
                  Plano Atual
                </div>
              ) : (
                <Link 
                  to="/register" 
                  className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Começar Grátis
                </Link>
              )}
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-teal-900/50 to-slate-900 border-2 border-teal-500 rounded-2xl p-8 relative">
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
                  <CheckCircle size={18} className="text-teal-400 shrink-0" />
                  <span>Convidados ilimitados</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-teal-400 shrink-0" />
                  <span>Fotos nos convidados</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-teal-400 shrink-0" />
                  <span>Exportar PDF/Excel</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-teal-400 shrink-0" />
                  <span>Compartilhar com parceiro(a)</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-teal-400 shrink-0" />
                  <span>Suporte prioritário</span>
                </li>
              </ul>
              {subscription?.plan === 'pro' ? (
                <div className="w-full text-center bg-teal-700 text-white py-3 rounded-lg font-medium">
                  Plano Atual
                </div>
              ) : (
                <button 
                  onClick={() => handleCheckout(STRIPE_PRICES.PRO_SINGLE, 'pro')}
                  disabled={loading === 'pro'}
                  className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading === 'pro' ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Escolher Pro'
                  )}
                </button>
              )}
            </div>

            {/* Business Plan */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold mb-2">Business</h3>
                <div className="text-4xl font-bold">R$ 199</div>
                <p className="text-slate-400 text-sm mt-2">Por mês</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-violet-400 shrink-0" />
                  <span>Eventos ilimitados</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-violet-400 shrink-0" />
                  <span>Tudo do Pro</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-violet-400 shrink-0" />
                  <span>Templates personalizados</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-violet-400 shrink-0" />
                  <span>API de integração</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={18} className="text-violet-400 shrink-0" />
                  <span>White-label</span>
                </li>
              </ul>
              {subscription?.plan === 'business' ? (
                <div className="w-full text-center bg-violet-700 text-white py-3 rounded-lg font-medium">
                  Plano Atual
                </div>
              ) : (
                <button 
                  onClick={() => handleCheckout(STRIPE_PRICES.BUSINESS_MONTHLY, 'business')}
                  disabled={loading === 'business'}
                  className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading === 'business' ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Falar com Vendas'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* FAQ or additional info */}
          <div className="mt-16 text-center">
            <p className="text-slate-400">
              Dúvidas? <a href="mailto:suporte@eventgraph.com.br" className="text-teal-400 hover:text-teal-300">Entre em contato</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

