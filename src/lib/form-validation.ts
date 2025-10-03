import { z } from 'zod';
import { errorMessages, validationUtils } from './validation';

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
