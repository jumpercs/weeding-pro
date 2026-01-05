import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';

const eventTypeEnum = z.enum(['wedding', 'corporate', 'birthday', 'other']);

export const eventsRouter = router({
  // List all events for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const events = await ctx.prisma.event.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            guests: true,
            expenses: true,
          },
        },
      },
    });

    return events.map(event => ({
      id: event.id,
      name: event.name,
      type: event.type,
      eventDate: event.eventDate?.toISOString() ?? null,
      budgetTotal: Number(event.budgetTotal),
      description: event.description,
      createdAt: event.createdAt.toISOString(),
      guestCount: event._count.guests,
      expenseCount: event._count.expenses,
    }));
  }),

  // Get single event by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
        include: {
          guests: {
            orderBy: { name: 'asc' },
          },
          guestGroups: {
            orderBy: { name: 'asc' },
          },
          expenses: {
            orderBy: { category: 'asc' },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento não encontrado',
        });
      }

      return {
        id: event.id,
        name: event.name,
        type: event.type,
        eventDate: event.eventDate?.toISOString() ?? null,
        budgetTotal: Number(event.budgetTotal),
        description: event.description,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        guests: event.guests.map(g => {
          // Get group name from guestGroups array (avoids N+1 query)
          const group = event.guestGroups.find(grp => grp.id === g.groupId);
          return {
            id: g.id,
            name: g.name,
            groupId: g.groupId,
            groupName: group?.name ?? null,
            confirmed: g.confirmed,
            parentId: g.parentId,
            priority: g.priority as 1 | 2 | 3 | 4 | 5,
            photoUrl: g.photoUrl,
          };
        }),
        guestGroups: event.guestGroups.map(g => ({
          id: g.id,
          name: g.name,
          color: g.color,
        })),
        expenses: event.expenses.map(e => ({
          id: e.id,
          category: e.category,
          supplier: e.supplier,
          estimatedValue: Number(e.estimatedValue),
          actualValue: Number(e.actualValue),
          isContracted: e.isContracted,
          include: e.include,
        })),
      };
    }),

  // Create a new event
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, 'Nome é obrigatório'),
      type: eventTypeEnum.default('wedding'),
      eventDate: z.string().nullish(),
      budgetTotal: z.number().min(0).default(0),
      description: z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          type: input.type,
          eventDate: input.eventDate ? new Date(input.eventDate) : null,
          budgetTotal: input.budgetTotal,
          description: input.description,
        },
      });

      return {
        id: event.id,
        name: event.name,
        type: event.type,
        eventDate: event.eventDate?.toISOString() ?? null,
        budgetTotal: Number(event.budgetTotal),
        createdAt: event.createdAt.toISOString(),
      };
    }),

  // Update an event
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      type: eventTypeEnum.optional(),
      eventDate: z.string().nullable().optional(),
      budgetTotal: z.number().min(0).optional(),
      description: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.prisma.event.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento não encontrado',
        });
      }

      const event = await ctx.prisma.event.update({
        where: { id: input.id },
        data: {
          name: input.name,
          type: input.type,
          eventDate: input.eventDate !== undefined 
            ? (input.eventDate ? new Date(input.eventDate) : null)
            : undefined,
          budgetTotal: input.budgetTotal,
          description: input.description,
        },
      });

      return {
        id: event.id,
        name: event.name,
        type: event.type,
        eventDate: event.eventDate?.toISOString() ?? null,
        budgetTotal: Number(event.budgetTotal),
        updatedAt: event.updatedAt.toISOString(),
      };
    }),

  // Delete an event
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.prisma.event.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento não encontrado',
        });
      }

      await ctx.prisma.event.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Sync all event data (bulk update for guests, groups, expenses)
  // OPTIMIZED: Parallelized operations + raw SQL bulk inserts + preserved client IDs
  syncData: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      budgetTotal: z.number().min(0),
      guestGroups: z.array(z.object({
        id: z.string(),
        name: z.string(),
        color: z.string(),
      })),
      guests: z.array(z.object({
        id: z.string(),
        name: z.string(),
        groupId: z.string().nullish(),
        confirmed: z.boolean(),
        parentId: z.string().nullish(),
        priority: z.number().min(1).max(5).default(3),
        photoUrl: z.string().nullish(),
      })),
      expenses: z.array(z.object({
        id: z.string(),
        category: z.string(),
        supplier: z.string().nullish(),
        estimatedValue: z.number(),
        actualValue: z.number(),
        isContracted: z.boolean(),
        include: z.boolean(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const event = await ctx.prisma.event.findFirst({
        where: { id: input.eventId, userId: ctx.user.id },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento não encontrado',
        });
      }

      // Helper to check if string is a valid UUID
      const isValidUUID = (id: string | undefined | null): id is string => {
        if (!id) return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      };

      // Helper to escape SQL string values
      const escapeSQL = (val: string | null | undefined): string => {
        if (val === null || val === undefined) return 'NULL';
        return `'${val.replace(/'/g, "''")}'`;
      };

      const eventId = input.eventId;

      // Use transaction with optimized parallel operations
      await ctx.prisma.$transaction(async (tx) => {
        // PARALLEL 1: Update budget + Delete all existing data in parallel
        await Promise.all([
          tx.$executeRawUnsafe(`UPDATE events SET budget_total = ${input.budgetTotal}, updated_at = NOW() WHERE id = '${eventId}'::uuid`),
          tx.$executeRawUnsafe(`DELETE FROM guests WHERE event_id = '${eventId}'::uuid`),
          tx.$executeRawUnsafe(`DELETE FROM guest_groups WHERE event_id = '${eventId}'::uuid`),
          tx.$executeRawUnsafe(`DELETE FROM expenses WHERE event_id = '${eventId}'::uuid`),
        ]);

        // Build group ID mapping (old non-UUID IDs -> new UUIDs for legacy data)
        const groupIdMap: Record<string, string> = {};
        for (const group of input.guestGroups) {
          if (isValidUUID(group.id)) {
            groupIdMap[group.id] = group.id;
          } else {
            // Generate new UUID for non-UUID IDs (legacy data)
            const newId = crypto.randomUUID();
            groupIdMap[group.id] = newId;
          }
        }

        // PARALLEL 2: Insert groups and expenses simultaneously (they're independent)
        const insertPromises: Promise<unknown>[] = [];

        // Bulk insert guest groups using raw SQL with preserved/mapped IDs
        if (input.guestGroups.length > 0) {
          const groupValues = input.guestGroups
            .map(g => `('${groupIdMap[g.id]}'::uuid, '${eventId}'::uuid, ${escapeSQL(g.name)}, ${escapeSQL(g.color)}, NOW())`)
            .join(',\n');
          
          insertPromises.push(
            tx.$executeRawUnsafe(`
              INSERT INTO guest_groups (id, event_id, name, color, created_at)
              VALUES ${groupValues}
            `)
          );
        }

        // Bulk insert expenses using raw SQL with preserved IDs
        if (input.expenses.length > 0) {
          const expenseValues = input.expenses
            .map(e => {
              const expenseId = isValidUUID(e.id) ? e.id : crypto.randomUUID();
              return `('${expenseId}'::uuid, '${eventId}'::uuid, ${escapeSQL(e.category)}, ${escapeSQL(e.supplier)}, ${e.estimatedValue}, ${e.actualValue}, ${e.isContracted}, ${e.include}, NOW(), NOW())`;
            })
            .join(',\n');
          
          insertPromises.push(
            tx.$executeRawUnsafe(`
              INSERT INTO expenses (id, event_id, category, supplier, estimated_value, actual_value, is_contracted, include, created_at, updated_at)
              VALUES ${expenseValues}
            `)
          );
        }

        await Promise.all(insertPromises);

        // Build guest ID mapping (old non-UUID IDs -> new UUIDs for legacy data)
        const guestIdMap: Record<string, string> = {};
        for (const guest of input.guests) {
          if (isValidUUID(guest.id)) {
            guestIdMap[guest.id] = guest.id;
          } else {
            const newId = crypto.randomUUID();
            guestIdMap[guest.id] = newId;
          }
        }

        // Insert guests with preserved/mapped IDs (sequential because of parentId dependency)
        if (input.guests.length > 0) {
          const guestValues = input.guests
            .map(g => {
              const guestId = guestIdMap[g.id];
              const groupId = g.groupId ? (groupIdMap[g.groupId] || null) : null;
              const parentId = g.parentId ? (guestIdMap[g.parentId] || null) : null;
              
              return `('${guestId}'::uuid, '${eventId}'::uuid, ${escapeSQL(g.name)}, ${groupId ? `'${groupId}'::uuid` : 'NULL'}, ${g.confirmed}, ${parentId ? `'${parentId}'::uuid` : 'NULL'}, ${g.priority}, ${escapeSQL(g.photoUrl)}, NOW(), NOW())`;
            })
            .join(',\n');
          
          await tx.$executeRawUnsafe(`
            INSERT INTO guests (id, event_id, name, group_id, confirmed, parent_id, priority, photo_url, created_at, updated_at)
            VALUES ${guestValues}
          `);
        }
      }, {
        timeout: 30000, // Reduced timeout since operations are now faster
      });

      return { success: true, savedAt: new Date().toISOString() };
    }),

  // Delta sync - only sync changes (created, updated, deleted items)
  // ULTRA-OPTIMIZED: Only processes actual changes, not the entire dataset
  syncDelta: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      budgetTotal: z.number().min(0).optional(),
      guests: z.object({
        created: z.array(z.object({
          id: z.string(),
          name: z.string(),
          groupId: z.string().nullish(),
          confirmed: z.boolean(),
          parentId: z.string().nullish(),
          priority: z.number().min(1).max(5).default(3),
          photoUrl: z.string().nullish(),
        })),
        updated: z.array(z.object({
          id: z.string(),
          name: z.string(),
          groupId: z.string().nullish(),
          confirmed: z.boolean(),
          parentId: z.string().nullish(),
          priority: z.number().min(1).max(5).default(3),
          photoUrl: z.string().nullish(),
        })),
        deleted: z.array(z.string()),
      }),
      guestGroups: z.object({
        created: z.array(z.object({
          id: z.string(),
          name: z.string(),
          color: z.string(),
        })),
        updated: z.array(z.object({
          id: z.string(),
          name: z.string(),
          color: z.string(),
        })),
        deleted: z.array(z.string()),
      }),
      expenses: z.object({
        created: z.array(z.object({
          id: z.string(),
          category: z.string(),
          supplier: z.string().nullish(),
          estimatedValue: z.number(),
          actualValue: z.number(),
          isContracted: z.boolean(),
          include: z.boolean(),
        })),
        updated: z.array(z.object({
          id: z.string(),
          category: z.string(),
          supplier: z.string().nullish(),
          estimatedValue: z.number(),
          actualValue: z.number(),
          isContracted: z.boolean(),
          include: z.boolean(),
        })),
        deleted: z.array(z.string()),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const event = await ctx.prisma.event.findFirst({
        where: { id: input.eventId, userId: ctx.user.id },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento não encontrado',
        });
      }

      // Helper to escape SQL string values
      const escapeSQL = (val: string | null | undefined): string => {
        if (val === null || val === undefined) return 'NULL';
        return `'${val.replace(/'/g, "''")}'`;
      };

      const eventId = input.eventId;
      
      // Build all SQL statements to execute in a single transaction
      const statements: string[] = [];

      // Budget update
      if (input.budgetTotal !== undefined) {
        statements.push(
          `UPDATE events SET budget_total = ${input.budgetTotal}, updated_at = NOW() WHERE id = '${eventId}'::uuid`
        );
      }

      // ========== DELETES (order matters for FK) ==========
      
      // Delete guests first (has FK to groups)
      if (input.guests.deleted.length > 0) {
        const ids = input.guests.deleted.map(id => `'${id}'::uuid`).join(', ');
        statements.push(`DELETE FROM guests WHERE id IN (${ids}) AND event_id = '${eventId}'::uuid`);
      }

      // Delete guest groups
      if (input.guestGroups.deleted.length > 0) {
        const ids = input.guestGroups.deleted.map(id => `'${id}'::uuid`).join(', ');
        statements.push(`DELETE FROM guest_groups WHERE id IN (${ids}) AND event_id = '${eventId}'::uuid`);
      }

      // Delete expenses
      if (input.expenses.deleted.length > 0) {
        const ids = input.expenses.deleted.map(id => `'${id}'::uuid`).join(', ');
        statements.push(`DELETE FROM expenses WHERE id IN (${ids}) AND event_id = '${eventId}'::uuid`);
      }

      // ========== CREATES ==========

      // Create guest groups (before guests that reference them)
      if (input.guestGroups.created.length > 0) {
        const values = input.guestGroups.created
          .map(g => `('${g.id}'::uuid, '${eventId}'::uuid, ${escapeSQL(g.name)}, ${escapeSQL(g.color)}, NOW())`)
          .join(', ');
        statements.push(`INSERT INTO guest_groups (id, event_id, name, color, created_at) VALUES ${values}`);
      }

      // Create expenses
      if (input.expenses.created.length > 0) {
        const values = input.expenses.created
          .map(e => `('${e.id}'::uuid, '${eventId}'::uuid, ${escapeSQL(e.category)}, ${escapeSQL(e.supplier)}, ${e.estimatedValue}, ${e.actualValue}, ${e.isContracted}, ${e.include}, NOW(), NOW())`)
          .join(', ');
        statements.push(`INSERT INTO expenses (id, event_id, category, supplier, estimated_value, actual_value, is_contracted, include, created_at, updated_at) VALUES ${values}`);
      }

      // Create guests
      if (input.guests.created.length > 0) {
        const values = input.guests.created
          .map(g => {
            const groupId = g.groupId ? `'${g.groupId}'::uuid` : 'NULL';
            const parentId = g.parentId ? `'${g.parentId}'::uuid` : 'NULL';
            return `('${g.id}'::uuid, '${eventId}'::uuid, ${escapeSQL(g.name)}, ${groupId}, ${g.confirmed}, ${parentId}, ${g.priority}, ${escapeSQL(g.photoUrl)}, NOW(), NOW())`;
          })
          .join(', ');
        statements.push(`INSERT INTO guests (id, event_id, name, group_id, confirmed, parent_id, priority, photo_url, created_at, updated_at) VALUES ${values}`);
      }

      // ========== UPDATES ==========

      // Update guest groups
      for (const group of input.guestGroups.updated) {
        statements.push(
          `UPDATE guest_groups SET name = ${escapeSQL(group.name)}, color = ${escapeSQL(group.color)} WHERE id = '${group.id}'::uuid AND event_id = '${eventId}'::uuid`
        );
      }

      // Update expenses
      for (const expense of input.expenses.updated) {
        statements.push(
          `UPDATE expenses SET category = ${escapeSQL(expense.category)}, supplier = ${escapeSQL(expense.supplier)}, estimated_value = ${expense.estimatedValue}, actual_value = ${expense.actualValue}, is_contracted = ${expense.isContracted}, include = ${expense.include}, updated_at = NOW() WHERE id = '${expense.id}'::uuid AND event_id = '${eventId}'::uuid`
        );
      }

      // Update guests
      for (const guest of input.guests.updated) {
        const groupId = guest.groupId ? `'${guest.groupId}'::uuid` : 'NULL';
        const parentId = guest.parentId ? `'${guest.parentId}'::uuid` : 'NULL';
        statements.push(
          `UPDATE guests SET name = ${escapeSQL(guest.name)}, group_id = ${groupId}, confirmed = ${guest.confirmed}, parent_id = ${parentId}, priority = ${guest.priority}, photo_url = ${escapeSQL(guest.photoUrl)}, updated_at = NOW() WHERE id = '${guest.id}'::uuid AND event_id = '${eventId}'::uuid`
        );
      }

      // Execute all statements in a single query if there are any
      if (statements.length > 0) {
        const combinedSQL = statements.join(';\n');
        await ctx.prisma.$executeRawUnsafe(combinedSQL);
      }

      return { success: true, savedAt: new Date().toISOString() };
    }),
});

