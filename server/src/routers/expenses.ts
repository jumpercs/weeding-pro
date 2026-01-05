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

export const expensesRouter = router({
  // List expenses for an event
  list: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      const expenses = await ctx.prisma.expense.findMany({
        where: { eventId: input.eventId },
        orderBy: { category: 'asc' },
      });

      return expenses.map(e => ({
        id: e.id,
        category: e.category,
        supplier: e.supplier,
        estimatedValue: Number(e.estimatedValue),
        actualValue: Number(e.actualValue),
        isContracted: e.isContracted,
        include: e.include,
      }));
    }),

  // Create an expense
  create: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      category: z.string().min(1, 'Categoria é obrigatória'),
      supplier: z.string().nullable().optional(),
      estimatedValue: z.number().min(0).default(0),
      actualValue: z.number().min(0).default(0),
      isContracted: z.boolean().default(false),
      include: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      const expense = await ctx.prisma.expense.create({
        data: {
          eventId: input.eventId,
          category: input.category,
          supplier: input.supplier,
          estimatedValue: input.estimatedValue,
          actualValue: input.actualValue,
          isContracted: input.isContracted,
          include: input.include,
        },
      });

      return {
        id: expense.id,
        category: expense.category,
        supplier: expense.supplier,
        estimatedValue: Number(expense.estimatedValue),
        actualValue: Number(expense.actualValue),
        isContracted: expense.isContracted,
        include: expense.include,
      };
    }),

  // Update an expense
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      eventId: z.string().uuid(),
      category: z.string().min(1).optional(),
      supplier: z.string().nullable().optional(),
      estimatedValue: z.number().min(0).optional(),
      actualValue: z.number().min(0).optional(),
      isContracted: z.boolean().optional(),
      include: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      const expense = await ctx.prisma.expense.update({
        where: { id: input.id },
        data: {
          category: input.category,
          supplier: input.supplier,
          estimatedValue: input.estimatedValue,
          actualValue: input.actualValue,
          isContracted: input.isContracted,
          include: input.include,
        },
      });

      return {
        id: expense.id,
        category: expense.category,
        supplier: expense.supplier,
        estimatedValue: Number(expense.estimatedValue),
        actualValue: Number(expense.actualValue),
        isContracted: expense.isContracted,
        include: expense.include,
      };
    }),

  // Delete an expense
  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      eventId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      await ctx.prisma.expense.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Bulk sync expenses (delete all and recreate)
  sync: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      expenses: z.array(z.object({
        category: z.string().min(1),
        supplier: z.string().nullable().optional(),
        estimatedValue: z.number().min(0).default(0),
        actualValue: z.number().min(0).default(0),
        isContracted: z.boolean().default(false),
        include: z.boolean().default(true),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx, input.eventId);

      // Delete existing expenses
      await ctx.prisma.expense.deleteMany({
        where: { eventId: input.eventId },
      });

      // Create new expenses
      const result = await ctx.prisma.expense.createMany({
        data: input.expenses.map(e => ({
          eventId: input.eventId,
          category: e.category,
          supplier: e.supplier,
          estimatedValue: e.estimatedValue,
          actualValue: e.actualValue,
          isContracted: e.isContracted,
          include: e.include,
        })),
      });

      return { count: result.count };
    }),
});

