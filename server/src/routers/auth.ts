import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { logger } from '../lib/logger';

export const authRouter = router({
  // Logout - log the action and invalidate any server-side cache
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    logger.info({ userId: ctx.user.id, email: ctx.user.email }, 'User logged out');
    
    // Here you could:
    // 1. Invalidate any server-side cache for this user
    // 2. Add token to a blacklist (if implementing token revocation)
    // 3. Log to audit trail
    // 4. Clean up any user-specific resources
    
    return { success: true, loggedOutAt: new Date().toISOString() };
  }),
  // Get current user info
  me: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.prisma.profile.findUnique({
      where: { id: ctx.user.id },
      include: {
        subscription: true,
      },
    });

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      subscription: profile.subscription ? {
        plan: profile.subscription.plan,
        status: profile.subscription.status,
      } : null,
    };
  }),

  // Check if user exists (for validation)
  checkEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.prisma.profile.findFirst({
        where: { email: input.email },
      });
      return { exists: !!profile };
    }),

  // Update profile
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      avatarUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.prisma.profile.update({
        where: { id: ctx.user.id },
        data: {
          name: input.name,
          avatarUrl: input.avatarUrl,
        },
      });

      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      };
    }),
});

