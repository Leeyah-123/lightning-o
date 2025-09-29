import { z } from 'zod';
import { errorMessages, validationUtils } from './validation';

// Form-specific validation schemas
export const formSchemas = {
  // Bounty creation form
  bountyCreate: z
    .object({
      title: z
        .string()
        .min(3, errorMessages.tooShort('Title', 3))
        .max(120, errorMessages.tooLong('Title', 120))
        .transform(validationUtils.sanitizeString),

      shortDescription: z
        .string()
        .min(5, errorMessages.tooShort('Short description', 5))
        .max(200, errorMessages.tooLong('Short description', 200))
        .transform(validationUtils.sanitizeString),

      description: z
        .string()
        .min(10, errorMessages.tooShort('Description', 10))
        .max(10000, errorMessages.tooLong('Description', 10000))
        .refine(
          validationUtils.isValidHTML,
          'Description contains invalid HTML tags'
        ),

      rewardSats: z
        .number()
        .int('Reward must be a whole number')
        .positive('Reward must be positive'),

      submissionDeadline: z.date({
        message: errorMessages.required('Submission deadline'),
      }),

      judgingDeadline: z.date({
        message: errorMessages.required('Judging deadline'),
      }),
    })
    .refine((data) => validationUtils.isFutureDate(data.submissionDeadline), {
      message: errorMessages.futureDate('Submission deadline'),
      path: ['submissionDeadline'],
    })
    .refine(
      (data) =>
        validationUtils.isJudgingAfterSubmission(
          data.submissionDeadline,
          data.judgingDeadline
        ),
      {
        message: errorMessages.afterDate(
          'Judging deadline',
          'submission deadline'
        ),
        path: ['judgingDeadline'],
      }
    ),

  // User authentication form
  auth: z.object({
    secretKey: z
      .string()
      .min(1, errorMessages.required('Secret key'))
      .refine(
        validationUtils.isValidSecretKey,
        errorMessages.invalidFormat('Secret key')
      ),
  }),

  // Winner selection form
  winnerSelection: z.object({
    pubkey: z
      .string()
      .min(1, errorMessages.required('Public key'))
      .refine(
        validationUtils.isValidPubkey,
        errorMessages.invalidFormat('Public key')
      ),

    amountSats: z
      .number()
      .int('Amount must be a whole number')
      .positive('Amount must be positive'),
  }),
};

// Form validation utilities
export const formValidationUtils = {
  // Validate form data and return formatted errors
  validateForm: <T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): {
    success: boolean;
    data?: T;
    errors?: Record<string, string[]>;
  } => {
    try {
      const result = schema.safeParse(data);

      if (result.success) {
        return { success: true, data: result.data };
      }

      const errors: Record<string, string[]> = {};
      result.error.issues.forEach((error) => {
        const path = error.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(error.message);
      });

      return { success: false, errors };
    } catch {
      return {
        success: false,
        errors: { general: ['Validation failed'] },
      };
    }
  },

  // Get field error message
  getFieldError: (
    errors: Record<string, string[]> | undefined,
    field: string
  ): string | undefined => {
    return errors?.[field]?.[0];
  },

  // Check if field has error
  hasFieldError: (
    errors: Record<string, string[]> | undefined,
    field: string
  ): boolean => {
    return Boolean(errors?.[field]?.length);
  },

  // Sanitize form data before validation
  sanitizeFormData: (
    data: Record<string, unknown>
  ): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = {};

    Object.keys(data).forEach((key) => {
      const value = data[key];
      if (typeof value === 'string') {
        sanitized[key] = validationUtils.sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  },

  // Validate date range
  validateDateRange: (
    startDate: Date,
    endDate: Date
  ): {
    isValid: boolean;
    error?: string;
  } => {
    if (!validationUtils.isFutureDate(startDate)) {
      return { isValid: false, error: errorMessages.futureDate('Start date') };
    }

    if (!validationUtils.isJudgingAfterSubmission(startDate, endDate)) {
      return {
        isValid: false,
        error: errorMessages.afterDate('End date', 'start date'),
      };
    }

    return { isValid: true };
  },
};

// Type exports
export type BountyCreateFormData = z.infer<typeof formSchemas.bountyCreate>;
export type AuthFormData = z.infer<typeof formSchemas.auth>;
export type WinnerSelectionFormData = z.infer<
  typeof formSchemas.winnerSelection
>;

import { FieldError, FieldErrors, FieldValues } from 'react-hook-form';
import { ZodError, ZodType } from 'zod';

// Utility to convert ZodError to Hook Form-compatible FieldErrors
const zodToHookFormErrors = (zodError: ZodError): FieldErrors => {
  const errors: FieldErrors = {};

  for (const issue of zodError.issues) {
    const path = issue.path.join('.') || 'root';
    errors[path] = {
      type: issue.code,
      message: issue.message,
    } as FieldError;
  }

  return errors;
};

// Custom resolver for useForm()
export const customResolver = (schema: ZodType) => {
  return async (
    values: FieldValues
  ): Promise<{
    values: Record<string, never>;
    errors: FieldErrors;
  }> => {
    try {
      const result = await schema.safeParseAsync(values);

      if (result.success) {
        return {
          values: result.data as Record<string, never>,
          errors: {},
        };
      } else {
        return {
          values: {},
          errors: zodToHookFormErrors(result.error),
        };
      }
    } catch (error) {
      console.error('Resolver error: ', error);
      return {
        values: {},
        errors: {
          root: {
            type: 'unknown',
            message: 'An unknown error occurred during validation',
          } as FieldError,
        },
      };
    }
  };
};
