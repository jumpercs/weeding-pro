import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { stripe } from '../lib/stripe';

export const subscriptionsRouter = router({
  // Get current subscription
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!subscription) {
      return {
        plan: 'free' as const,
        status: 'active' as const,
      };
    }

    return {
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    };
  }),

  // Create checkout session for upgrade
  createCheckoutSession: protectedProcedure
    .input(z.object({
      plan: z.enum(['pro', 'business']),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!stripe) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Stripe não configurado',
        });
      }

      // Get or create Stripe customer
      let subscription = await ctx.prisma.subscription.findUnique({
        where: { userId: ctx.user.id },
      });

      let customerId = subscription?.stripeCustomerId;

      if (!customerId) {
        const profile = await ctx.prisma.profile.findUnique({
          where: { id: ctx.user.id },
        });

        const customer = await stripe.customers.create({
          email: profile?.email ?? ctx.user.email,
          metadata: { userId: ctx.user.id },
        });

        customerId = customer.id;

        // Update subscription with customer ID
        await ctx.prisma.subscription.update({
          where: { userId: ctx.user.id },
          data: { stripeCustomerId: customerId },
        });
      }

      // Price IDs (should come from env in production)
      const priceIds: Record<string, string> = {
        pro: process.env.STRIPE_PRICE_PRO || 'price_pro',
        business: process.env.STRIPE_PRICE_BUSINESS || 'price_business',
      };

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: input.plan === 'pro' ? 'payment' : 'subscription',
        line_items: [{
          price: priceIds[input.plan],
          quantity: 1,
        }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          userId: ctx.user.id,
          plan: input.plan,
        },
      });

      return { url: session.url };
    }),

  // Get usage limits based on plan
  getLimits: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.user.id },
    });

    const plan = subscription?.plan ?? 'free';

    const limits = {
      free: { maxEvents: 1, maxGuestsPerEvent: 50 },
      pro: { maxEvents: 10, maxGuestsPerEvent: 500 },
      business: { maxEvents: -1, maxGuestsPerEvent: -1 }, // -1 = unlimited
    };

    // Get current usage
    const eventCount = await ctx.prisma.event.count({
      where: { userId: ctx.user.id },
    });

    return {
      plan,
      limits: limits[plan],
      usage: {
        eventCount,
      },
    };
  }),
});

