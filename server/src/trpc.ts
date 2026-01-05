import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import * as jose from 'jose';
import superjson from 'superjson';
import { prisma } from './lib/prisma';
import { logger } from './lib/logger';

// Context type
export interface Context {
  prisma: typeof prisma;
  user: {
    id: string;
    email: string;
  } | null;
}

// Cache for JWKS
let jwksCache: jose.JWTVerifyGetKey | null = null;

// Get JWKS for Supabase token verification
const getJWKS = () => {
  if (jwksCache) return jwksCache;
  
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL not configured');
  }
  
  // Supabase JWKS endpoint (note: /auth/v1 prefix required)
  const jwksUrl = new URL('/auth/v1/.well-known/jwks.json', supabaseUrl);
  logger.info({ jwksUrl: jwksUrl.toString() }, 'Initializing JWKS from Supabase');
  jwksCache = jose.createRemoteJWKSet(jwksUrl);
  return jwksCache;
};

// Create context for each request
export const createContext = async ({ req }: CreateExpressContextOptions): Promise<Context> => {
  let user: Context['user'] = null;

  // Extract JWT from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      if (!supabaseUrl) {
        logger.warn('SUPABASE_URL not set');
      } else {
        // Verify JWT using JWKS (supports ES256)
        const JWKS = getJWKS();
        const { payload } = await jose.jwtVerify(token, JWKS, {
          issuer: `${supabaseUrl}/auth/v1`,
          audience: 'authenticated',
        });
        
        user = {
          id: payload.sub!,
          email: payload.email as string,
        };
      }
    } catch (error) {
      // Invalid token - user stays null
      logger.debug({ error }, 'Invalid JWT token');
    }
  }

  return {
    prisma,
    user,
  };
};

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof Error ? error.cause.message : null,
    },
  }),
});

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// Auth middleware
const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Você precisa estar logado para acessar este recurso',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // user is now non-null
    },
  });
});

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(isAuthed);

