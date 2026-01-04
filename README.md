# EventGraph - Visualizador de Relações Sociais para Eventos

Organize seus convidados, gerencie orçamento e visualize conexões em um grafo interativo. Perfeito para casamentos, eventos corporativos e festas.

## ✨ Features

- **Grafo Interativo D3.js** - Visualize relações entre convidados com física real
- **Gestão de Orçamento** - Controle gastos contratados vs previstos
- **Grupos Coloridos** - Categorize convidados por família, amigos, trabalho
- **Sistema de Prioridade** - 5 níveis de importância visual
- **Fotos nos Convidados** - Upload e compressão automática
- **Undo/Redo** - Histórico completo de alterações
- **Multi-eventos** - Gerencie múltiplos eventos (Pro/Business)
- **Sincronização na Nuvem** - Dados salvos no Supabase

## 🚀 Quick Start

### Pré-requisitos

- Node.js 20+ 
- Yarn ou npm
- Conta no [Supabase](https://supabase.com) (opcional para modo demo)
- Conta no [Stripe](https://stripe.com) (opcional para pagamentos)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/weeding-pro.git
cd weeding-pro

# Instale as dependências
yarn install --ignore-engines

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Inicie o servidor de desenvolvimento
yarn dev
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Supabase (obrigatório para persistência)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key

# Stripe (opcional - para pagamentos)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
VITE_STRIPE_PRICE_PRO=price_xxx
VITE_STRIPE_PRICE_BUSINESS=price_xxx
```

## 📦 Configuração do Supabase (Passo a Passo)

### 1. Criar Projeto

1. Acesse [app.supabase.com](https://app.supabase.com) e faça login
2. Clique em **"New Project"**
3. Escolha uma organização (ou crie uma)
4. Preencha:
   - **Name**: `eventgraph` (ou o nome que preferir)
   - **Database Password**: anote essa senha!
   - **Region**: escolha o mais próximo (ex: São Paulo)
5. Clique em **"Create new project"** e aguarde ~2 minutos

### 2. Executar o Schema do Banco

1. No menu lateral, vá em **SQL Editor**
2. Clique em **"New query"**
3. Copie TODO o conteúdo do arquivo `supabase/migrations/001_initial_schema.sql`
4. Cole no editor SQL
5. Clique em **"Run"** (ou Ctrl+Enter)
6. Deve aparecer "Success. No rows returned" - isso é normal!

### 3. Obter as Credenciais

1. No menu lateral, vá em **Project Settings** (ícone de engrenagem)
2. Clique em **API** no submenu
3. Copie:
   - **Project URL** → para `VITE_SUPABASE_URL`
   - **anon public** (em Project API keys) → para `VITE_SUPABASE_ANON_KEY`

### 4. Configurar Autenticação

#### Email/Senha (padrão):
1. Vá em **Authentication** → **Providers**
2. **Email** já vem habilitado por padrão
3. (Opcional) Desabilite "Confirm email" para testes

#### Google OAuth (opcional):
1. Vá em **Authentication** → **Providers** → **Google**
2. Habilite e siga as instruções para criar credenciais no Google Cloud Console
3. Cole o Client ID e Client Secret

### 5. Configurar o Projeto Local

Crie o arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. Testar

```bash
yarn dev
```

Acesse `http://localhost:3000`, crie uma conta e verifique se os dados estão sendo salvos!

### Troubleshooting

| Problema | Solução |
|----------|---------|
| "Invalid API key" | Verifique se copiou a chave `anon` corretamente |
| Erro de RLS | Execute o SQL novamente, pode ter falhado parcialmente |
| Login não funciona | Verifique se Email está habilitado em Providers |
| Dados não salvam | Abra o console do browser (F12) e veja os erros |

## 💳 Configuração do Stripe (Opcional)

### 1. Criar Conta e Produtos

1. Acesse [dashboard.stripe.com](https://dashboard.stripe.com) e crie uma conta
2. Use o **modo teste** (toggle no canto superior direito)
3. Vá em **Products** → **Add product**:

   **Produto 1 - Pro:**
   - Name: `EventGraph Pro`
   - Price: `R$ 97,00` / One time
   - Copie o `price_id` (ex: `price_1Abc...`)

   **Produto 2 - Business:**
   - Name: `EventGraph Business`
   - Price: `R$ 199,00` / Recurring monthly
   - Copie o `price_id`

### 2. Obter Chaves

1. Vá em **Developers** → **API keys**
2. Copie:
   - **Publishable key** (`pk_test_...`) → para `.env`
   - **Secret key** (`sk_test_...`) → para Supabase secrets

### 3. Deploy das Edge Functions

```bash
# Instale o CLI do Supabase
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref SEU_PROJECT_REF

# Configure os secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx

# Deploy das funções
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

### 4. Configurar Webhook

1. Vá em **Developers** → **Webhooks**
2. Clique **Add endpoint**
3. URL: `https://SEU_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
4. Eventos para ouvir:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copie o **Signing secret** (`whsec_...`) e adicione aos secrets

### 5. Atualizar .env

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
VITE_STRIPE_PRICE_PRO=price_xxx
VITE_STRIPE_PRICE_BUSINESS=price_xxx
```

## 🛠️ Stack Tecnológica

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Visualização**: D3.js
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Pagamentos**: Stripe
- **Deploy**: Vercel

## 📁 Estrutura do Projeto

```
src/
├── components/       # Componentes React
│   ├── BudgetView.tsx
│   └── GuestGraph.tsx
├── contexts/         # Contextos React
│   └── AuthContext.tsx
├── hooks/            # Custom hooks
│   ├── useUndoRedo.ts
│   └── usePlanLimits.ts
├── lib/              # Bibliotecas e configurações
│   ├── supabase.ts
│   ├── stripe.ts
│   └── database.types.ts
├── pages/            # Páginas da aplicação
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── EventPage.tsx
│   └── PricingPage.tsx
├── App.tsx           # Router e providers
├── constants.ts      # Constantes e estado inicial
├── types.ts          # TypeScript types
└── index.tsx         # Entry point
```

## 🚢 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático em cada push

```bash
# Ou via CLI
vercel --prod
```

### Outros

O projeto é compatível com qualquer plataforma que suporte Vite:
- Netlify
- Cloudflare Pages
- Railway
- Render

## 📊 Modelo de Negócio

| Plano | Preço | Features |
|-------|-------|----------|
| Grátis | R$ 0 | 1 evento, 30 convidados |
| Pro | R$ 97 | Ilimitado, fotos, export |
| Business | R$ 199/mês | Múltiplos eventos, API |

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/amazing-feature`)
3. Commit suas mudanças (`git commit -m 'Add amazing feature'`)
4. Push para a branch (`git push origin feature/amazing-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📧 Contato

- Website: [eventgraph.com.br](https://eventgraph.com.br)
- Email: suporte@eventgraph.com.br

---

Feito com ❤️ para tornar a organização de eventos mais visual e intuitiva.
