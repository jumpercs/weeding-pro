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

export const guestsRouter = router({
  // List guests for an event
  list: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      const guests = await ctx.prisma.guest.findMany({
        where: { eventId: input.eventId },
        include: { group: true },
        orderBy: { name: 'asc' },
      });

      return guests.map(g => ({
        id: g.id,
        name: g.name,
        groupId: g.groupId,
        groupName: g.group?.name ?? g.groupName,
        confirmed: g.confirmed,
        parentId: g.parentId,
        priority: g.priority as 1 | 2 | 3 | 4 | 5,
        photoUrl: g.photoUrl,
      }));
    }),

  // Create a guest
  create: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      name: z.string().min(1, 'Nome é obrigatório'),
      groupId: z.string().uuid().optional(),
      confirmed: z.boolean().default(false),
      parentId: z.string().uuid().nullable().optional(),
      priority: z.number().min(1).max(5).default(3),
      photoUrl: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      const guest = await ctx.prisma.guest.create({
        data: {
          eventId: input.eventId,
          name: input.name,
          groupId: input.groupId,
          confirmed: input.confirmed,
          parentId: input.parentId,
          priority: input.priority,
          photoUrl: input.photoUrl,
        },
        include: { group: true },
      });

      return {
        id: guest.id,
        name: guest.name,
        groupId: guest.groupId,
        groupName: guest.group?.name,
        confirmed: guest.confirmed,
        parentId: guest.parentId,
        priority: guest.priority as 1 | 2 | 3 | 4 | 5,
        photoUrl: guest.photoUrl,
      };
    }),

  // Bulk create guests
  bulkCreate: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      guests: z.array(z.object({
        name: z.string().min(1),
        groupId: z.string().uuid().optional(),
        confirmed: z.boolean().default(false),
        parentId: z.string().uuid().nullable().optional(),
        priority: z.number().min(1).max(5).default(3),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      const result = await ctx.prisma.guest.createMany({
        data: input.guests.map(g => ({
          eventId: input.eventId,
          name: g.name,
          groupId: g.groupId,
          confirmed: g.confirmed,
          parentId: g.parentId,
          priority: g.priority,
        })),
      });

      return { count: result.count };
    }),

  // Update a guest
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      eventId: z.string().uuid(),
      name: z.string().min(1).optional(),
      groupId: z.string().uuid().nullable().optional(),
      confirmed: z.boolean().optional(),
      parentId: z.string().uuid().nullable().optional(),
      priority: z.number().min(1).max(5).optional(),
      photoUrl: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      const guest = await ctx.prisma.guest.update({
        where: { id: input.id },
        data: {
          name: input.name,
          groupId: input.groupId,
          confirmed: input.confirmed,
          parentId: input.parentId,
          priority: input.priority,
          photoUrl: input.photoUrl,
        },
        include: { group: true },
      });

      return {
        id: guest.id,
        name: guest.name,
        groupId: guest.groupId,
        groupName: guest.group?.name,
        confirmed: guest.confirmed,
        parentId: guest.parentId,
        priority: guest.priority as 1 | 2 | 3 | 4 | 5,
        photoUrl: guest.photoUrl,
      };
    }),

  // Toggle confirmation
  toggleConfirm: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      eventId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      const current = await ctx.prisma.guest.findUnique({
        where: { id: input.id },
      });

      if (!current) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Convidado não encontrado',
        });
      }

      const guest = await ctx.prisma.guest.update({
        where: { id: input.id },
        data: { confirmed: !current.confirmed },
      });

      return { id: guest.id, confirmed: guest.confirmed };
    }),

  // Delete a guest
  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      eventId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      await ctx.prisma.guest.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});

