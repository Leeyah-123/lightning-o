import { z } from 'zod';

// Milestone validation schema
export const milestoneSchema = z.object({
  id: z.string().min(1, 'Milestone ID is required'),
  amountSats: z.number().min(1, 'Amount must be at least 1 sat'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  eta: z.number().min(Date.now(), 'ETA must be in the future'),
});

// Gig creation validation schema
export const createGigSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be less than 100 characters'),
  shortDescription: z
    .string()
    .min(20, 'Short description must be at least 20 characters')
    .max(200, 'Short description must be less than 200 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  budgetRange: z
    .object({
      minSats: z.number().min(1, 'Minimum budget must be at least 1 sat'),
      maxSats: z.number().min(1, 'Maximum budget must be at least 1 sat'),
    })
    .optional()
    .refine(
      (data) => {
        if (!data) return true;
        return data.maxSats >= data.minSats;
      },
      {
        message:
          'Maximum budget must be greater than or equal to minimum budget',
      }
    ),
});

// Gig application validation schema
export const applyToGigSchema = z.object({
  portfolioLink: z.url('Must be a valid URL').optional().or(z.literal('')),
  milestones: z
    .array(milestoneSchema)
    .min(1, 'At least one milestone is required')
    .refine(
      (milestones) => {
        const totalAmount = milestones.reduce(
          (sum, milestone) => sum + milestone.amountSats,
          0
        );
        return totalAmount > 0;
      },
      {
        message: 'Total milestone amount must be greater than 0',
        path: ['milestones'],
      }
    ),
});

// Milestone submission validation schema
export const submitMilestoneSchema = z.object({
  content: z
    .string()
    .min(20, 'Submission content must be at least 20 characters'),
  lightningAddress: z.string().min(1, 'Lightning address is required'),
});

// Milestone approval/rejection validation schema
export const reviewMilestoneSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    rejectionReason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (
        data.action === 'reject' &&
        (!data.rejectionReason || data.rejectionReason.trim().length === 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Rejection reason is required when rejecting a milestone',
      path: ['rejectionReason'],
    }
  );

// Gig cancellation validation schema
export const cancelGigSchema = z.object({
  reason: z
    .string()
    .min(10, 'Cancellation reason must be at least 10 characters')
    .optional(),
});

// Utility functions for validation
export const gigValidationUtils = {
  // Validate milestone sum equals offer amount
  validateMilestoneSum: (
    milestones: Array<{ amountSats: number }>,
    offerAmount: number
  ): boolean => {
    const total = milestones.reduce(
      (sum, milestone) => sum + milestone.amountSats,
      0
    );
    return total === offerAmount;
  },

  // Validate budget range
  validateBudgetRange: (budgetRange?: {
    minSats: number;
    maxSats: number;
  }): boolean => {
    if (!budgetRange) return true;
    return (
      budgetRange.maxSats >= budgetRange.minSats && budgetRange.minSats > 0
    );
  },

  // Validate Lightning address format (basic validation)
  validateLightningAddress: (address: string): boolean => {
    // Basic Lightning address validation - can be enhanced with more sophisticated checks
    const lightningRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return lightningRegex.test(address);
  },

  // Validate portfolio link
  validatePortfolioLink: (link?: string): boolean => {
    if (!link || link.trim() === '') return true;
    try {
      new URL(link);
      return true;
    } catch {
      return false;
    }
  },

  // Check if gig can be cancelled
  canCancelGig: (gig: {
    status: string;
    selectedApplicationId?: string;
  }): boolean => {
    return gig.status === 'open' && !gig.selectedApplicationId;
  },

  // Check if applications are allowed
  canApplyToGig: (gig: { status: string }): boolean => {
    return gig.status === 'open';
  },

  // Check if milestone can be submitted
  canSubmitMilestone: (milestone: { status: string }): boolean => {
    return milestone.status === 'pending';
  },

  // Check if milestone can be reviewed
  canReviewMilestone: (milestone: { status: string }): boolean => {
    return milestone.status === 'submitted';
  },

  // Get validation error message for common cases
  getValidationErrorMessage: (error: z.ZodError): string => {
    const firstError = Array.isArray((error as any).issues)
      ? (error as any).issues[0]
      : undefined;
    if (firstError) {
      return firstError.message;
    }
    return 'Validation failed';
  },

  // Sanitize input strings
  sanitizeString: (input: string): string => {
    return input.trim().replace(/\s+/g, ' ');
  },

  // Format sats amount for display
  formatSats: (amount: number): string => {
    return amount.toLocaleString() + ' sats';
  },

  // Calculate total milestone amount
  calculateTotalMilestoneAmount: (
    milestones: Array<{ amountSats: number }>
  ): number => {
    return milestones.reduce((sum, milestone) => sum + milestone.amountSats, 0);
  },

  // Check if all milestones are completed
  areAllMilestonesCompleted: (
    milestones: Array<{ status: string }>
  ): boolean => {
    return milestones.every((milestone) => milestone.status === 'accepted');
  },

  // Get completed milestones count
  getCompletedMilestonesCount: (
    milestones: Array<{ status: string }>
  ): number => {
    return milestones.filter((milestone) => milestone.status === 'accepted')
      .length;
  },
};
