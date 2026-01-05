import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';

// Helper to verify event ownership
async function verifyEventOwnership(ctx: { prisma: any; user: { id: string } }, eventId: string) {
  const event = await ctx.prisma.event.findFirst({
    where: { id: eventId, userId: ctx.user.id },
  });
  if (!event) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Evento não encontrado',
    });
  }
  return event;
}

export const guestGroupsRouter = router({
  // List guest groups for an event
  list: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      const groups = await ctx.prisma.guestGroup.findMany({
        where: { eventId: input.eventId },
        include: {
          _count: {
            select: { guests: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return groups.map(g => ({
        id: g.id,
        name: g.name,
        color: g.color,
        guestCount: g._count.guests,
      }));
    }),

  // Create a guest group
  create: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      name: z.string().min(1, 'Nome é obrigatório'),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#64748b'),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      const group = await ctx.prisma.guestGroup.create({
        data: {
          eventId: input.eventId,
          name: input.name,
          color: input.color,
        },
      });

      return {
        id: group.id,
        name: group.name,
        color: group.color,
      };
    }),

  // Update a guest group
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      eventId: z.string().uuid(),
      name: z.string().min(1).optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      const group = await ctx.prisma.guestGroup.update({
        where: { id: input.id },
        data: {
          name: input.name,
          color: input.color,
        },
      });

      return {
        id: group.id,
        name: group.name,
        color: group.color,
      };
    }),

  // Delete a guest group
  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      eventId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      await ctx.prisma.guestGroup.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});

