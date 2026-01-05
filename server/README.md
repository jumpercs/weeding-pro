# EventGraph Backend

Backend tRPC para o EventGraph, com tipagem end-to-end.

## Stack

- **Runtime**: Node.js 20+
- **Framework**: Express + tRPC
- **ORM**: Prisma
- **Validação**: Zod
- **Auth**: JWT (valida tokens do Supabase)

## Setup

### 1. Instalar dependências

```bash
cd server
yarn install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo e preencha:

```bash
cp env.example .env
```

Variáveis necessárias:

```env
# Database - Pegar em Supabase > Settings > Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Supabase - Pegar em Supabase > Settings > API
SUPABASE_URL="https://[PROJECT].supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_JWT_SECRET="your-jwt-secret"

# Stripe (opcional)
STRIPE_SECRET_KEY="sk_test_..."

# Server
PORT=3001
FRONTEND_URL=http://localhost:3000
```

**Onde encontrar o JWT Secret:**
1. Supabase Dashboard > Settings > API
2. Scroll até "JWT Settings"
3. Copie o "JWT Secret"

### 3. Gerar cliente Prisma

```bash
yarn db:generate
```

### 4. Rodar em desenvolvimento

```bash
yarn dev
```

O servidor estará disponível em `http://localhost:3001`

## Endpoints

- `GET /health` - Health check
- `POST /trpc/*` - tRPC endpoints

## Routers disponíveis

| Router | Descrição |
|--------|-----------|
| `auth` | Perfil do usuário, atualização |
| `events` | CRUD de eventos |
| `guests` | CRUD de convidados |
| `guestGroups` | CRUD de grupos |
| `expenses` | CRUD de despesas |
| `subscriptions` | Planos e pagamentos |

## Uso no Frontend

```typescript
import { trpc } from '../lib/trpc';

// Em um componente
function MyComponent() {
  const { data: events } = trpc.events.list.useQuery();
  const createEvent = trpc.events.create.useMutation();
  
  const handleCreate = () => {
    createEvent.mutate({ name: 'Meu Evento', type: 'wedding' });
  };
}
```

## Deploy (VPS)

```bash
# Build
yarn build

# Rodar com PM2
pm2 start dist/index.js --name eventgraph-api
```

