import { commonSchemas } from '@/lib/validation';
import z from 'zod';

export const bountyCreateSchema = z
  .object({
    title: commonSchemas.title,
    shortDescription: commonSchemas.shortDescription,
    description: commonSchemas.description,
    rewardSats: commonSchemas.rewardSatsArray,
    submissionDeadline: commonSchemas.date,
    judgingDeadline: commonSchemas.date,
  })
  .refine(
    (data) => {
      const now = new Date();
      const submissionDeadline = new Date(data.submissionDeadline);
      return submissionDeadline > now;
    },
    {
      message: 'Submission deadline must be in the future',
      path: ['submissionDeadline'],
    }
  )
  .refine(
    (data) => {
      const submissionDeadline = new Date(data.submissionDeadline);
      const judgingDeadline = new Date(data.judgingDeadline);
      return judgingDeadline > submissionDeadline;
    },
    {
      message: 'Judging deadline must be after submission deadline',
      path: ['judgingDeadline'],
    }
  );
export const winnersSchema = z
  .array(
    z.object({
      pubkey: commonSchemas.pubkey,
      amountSats: commonSchemas.rewardSats,
    })
  )
  .min(1);

// Re-export types
export type BountyCreateInput = z.infer<typeof bountyCreateSchema>;
export type BountyWinnersInput = z.infer<typeof winnersSchema>;
