import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../server/src/routers';

// Create tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// Get auth token from Supabase session
const getAuthToken = async (): Promise<string | null> => {
  // Check our custom storage key first
  try {
    const customAuthData = localStorage.getItem('eventgraph-auth');
    if (customAuthData) {
      const parsed = JSON.parse(customAuthData);
      if (parsed?.access_token) {
        return parsed.access_token;
      }
    }
  } catch {
    // Fall through to try default key
  }
  
  // Fallback: try default Supabase key pattern
  const supabaseAuthKey = Object.keys(localStorage).find(key => 
    key.startsWith('sb-') && key.endsWith('-auth-token')
  );
  
  if (!supabaseAuthKey) return null;
  
  try {
    const authData = JSON.parse(localStorage.getItem(supabaseAuthKey) || '{}');
    return authData?.access_token || null;
  } catch {
    return null;
  }
};

// Shared link configuration
const createLink = () => httpBatchLink({
  url: import.meta.env.VITE_API_URL || 'http://localhost:3001/trpc',
  transformer: superjson,
  async headers() {
    const token = await getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

// Create tRPC React client (for use with React Query hooks)
export const trpcReactClient = trpc.createClient({
  links: [createLink()],
});

// Create vanilla tRPC client (for use outside React components)
export const trpcClient = createTRPCClient<AppRouter>({
  links: [createLink()],
});
