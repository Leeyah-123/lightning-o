import {
  bountySchemas,
  type BountyCreateInput,
  type BountyWinnersInput,
} from '@/lib/validation';

// Re-export schemas from validation utility
export const bountyCreateSchema = bountySchemas.create;
export const winnersSchema = bountySchemas.winners;

// Re-export types
export type { BountyCreateInput, BountyWinnersInput };
