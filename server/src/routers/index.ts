import { router } from '../trpc';
import { authRouter } from './auth';
import { eventsRouter } from './events';
import { guestsRouter } from './guests';
import { guestGroupsRouter } from './guestGroups';
import { expensesRouter } from './expenses';
import { subscriptionsRouter } from './subscriptions';

export const appRouter = router({
  auth: authRouter,
  events: eventsRouter,
  guests: guestsRouter,
  guestGroups: guestGroupsRouter,
  expenses: expensesRouter,
  subscriptions: subscriptionsRouter,
});

export type AppRouter = typeof appRouter;

