import { commonSchemas } from '@/lib/validation';
import { z } from 'zod';

export const grantCreateSchema = z
  .object({
    title: commonSchemas.title,
    shortDescription: commonSchemas.shortDescription,
    description: commonSchemas.description,
    reward: z.object({
      type: z.enum(['fixed', 'range']),
      amount: commonSchemas.rewardSats,
      maxAmount: z
        .number()
        .min(1, 'Max amount must be at least 1 sat')
        .optional(),
    }),
    tranches: z
      .array(
        z.object({
          amount: z.number().min(1, 'Tranche amount must be at least 1 sat'),
          maxAmount: z
            .number()
            .min(1, 'Max amount must be at least 1 sat')
            .optional(),
          description: z.string().min(1, 'Tranche description is required'),
        })
      )
      .min(1, 'At least one tranche is required'),
  })
  .refine(
    (data) => {
      if (data.reward.type === 'range') {
        return (
          data.reward.maxAmount && data.reward.maxAmount > data.reward.amount
        );
      }
      return true;
    },
    {
      message: 'Max amount must be greater than min amount for range rewards',
      path: ['reward', 'maxAmount'],
    }
  )
  .refine(
    (data) => {
      const totalTrancheAmount = data.tranches.reduce(
        (sum, tranche) => sum + (tranche.maxAmount || tranche.amount),
        0
      );
      const totalRewardAmount =
        data.reward.type === 'fixed'
          ? data.reward.amount
          : data.reward.maxAmount!;
      return totalTrancheAmount === totalRewardAmount;
    },
    {
      message: 'Total tranche amount must equal total reward amount',
      path: ['tranches'],
    }
  )
  .refine(
    (data) => {
      return data.tranches.every((tranche) => {
        if (tranche.maxAmount) {
          return tranche.maxAmount > tranche.amount;
        }
        return true;
      });
    },
    {
      message: 'Max amount must be greater than min amount for range tranches',
      path: ['tranches'],
    }
  );

export const grantApplySchema = z.object({
  portfolioLink: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  proposal: z.string().min(1, 'Proposal is required'),
  budgetRequest: z
    .number()
    .min(1, 'Budget request must be at least 1 sat')
    .optional(),
});

export const grantSelectSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  finalAllocation: z
    .number()
    .min(1, 'Final allocation must be at least 1 sat')
    .optional(),
});

export const grantTrancheSubmitSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  links: z.array(z.string().url('Must be a valid URL')).optional(),
});

export const grantTrancheReviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
});

export type GrantCreateInput = z.infer<typeof grantCreateSchema>;
export type GrantApplyInput = z.infer<typeof grantApplySchema>;
export type GrantSelectInput = z.infer<typeof grantSelectSchema>;
export type GrantTrancheSubmitInput = z.infer<typeof grantTrancheSubmitSchema>;
export type GrantTrancheReviewInput = z.infer<typeof grantTrancheReviewSchema>;

export const grantValidationUtils = {
  // Calculate total tranche amount
  calculateTotalTrancheAmount: (
    tranches: { amount: number; maxAmount?: number }[]
  ): number => {
    return tranches.reduce(
      (sum, tranche) => sum + (tranche.maxAmount || tranche.amount),
      0
    );
  },

  // Check if tranche sum equals reward amount
  validateTrancheSum: (
    tranches: { amount: number; maxAmount?: number }[],
    reward: { type: 'fixed' | 'range'; amount: number; maxAmount?: number }
  ): boolean => {
    const total = grantValidationUtils.calculateTotalTrancheAmount(tranches);
    if (reward.type === 'fixed') {
      return total === reward.amount;
    }
    return (
      total >= reward.amount && total <= (reward.maxAmount || reward.amount)
    );
  },

  // Check if reward is a single amount
  isSingleAmount: (reward: {
    type: 'fixed' | 'range';
    amount: number;
    maxAmount?: number;
  }): boolean => {
    return (
      reward.type === 'fixed' ||
      (reward.type === 'range' && reward.amount === reward.maxAmount)
    );
  },

  // Check if tranche is a single amount
  isTrancheSingleAmount: (tranche: {
    amount: number;
    maxAmount?: number;
  }): boolean => {
    return !tranche.maxAmount || tranche.amount === tranche.maxAmount;
  },

  // Format tranche amount display
  formatTrancheAmount: (tranche: {
    amount: number;
    maxAmount?: number;
  }): string => {
    if (!tranche.maxAmount || tranche.amount === tranche.maxAmount) {
      return `${tranche.amount.toLocaleString()} sats`;
    }
    return `${tranche.amount.toLocaleString()} - ${tranche.maxAmount.toLocaleString()} sats`;
  },
};
