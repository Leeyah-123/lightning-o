import { bech32 } from 'bech32';
import { z } from 'zod';

// Common validation schemas
export const commonSchemas = {
  // String validations
  title: z.string().min(3).max(120),
  shortDescription: z.string().min(5).max(200),
  description: z.string().min(10).max(10000),

  // Number validations
  rewardSats: z.number().int().positive(),

  // Reward validation (single number or array of numbers)
  rewardSatsArray: z.union([
    z.number().int().positive(),
    z.array(z.number().int().positive()).min(1).max(10),
  ]),

  // Date validations
  date: z.date({
    message: 'Date is required',
  }),

  // Nostr validations
  pubkey: z.string().min(5),
  secretKey: z.string().min(1),
};

// Bounty validation schemas
export const bountySchemas = {
  create: z
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
    ),

  winners: z
    .array(
      z.object({
        pubkey: commonSchemas.pubkey,
        amountSats: commonSchemas.rewardSats,
      })
    )
    .min(1),
};

// Auth validation schemas
export const authSchemas = {
  secretKey: z.string().min(1, 'Secret key is required'),
  pubkey: commonSchemas.pubkey,
};

// Nostr event validation schemas
export const nostrSchemas = {
  event: z.object({
    id: z.string(),
    pubkey: z.string(),
    created_at: z.number(),
    kind: z.number(),
    content: z.string(),
    sig: z.string(),
    tags: z.array(z.array(z.string())),
  }),

  bountyContent: z.object({
    type: z.enum(['pending', 'open', 'completed']),
    bountyId: z.string(),
  }),
};

// Validation utility functions
export const validationUtils = {
  // Validate if a date is in the future
  isFutureDate: (date: Date): boolean => {
    return date > new Date();
  },

  // Validate if judging deadline is after submission deadline
  isJudgingAfterSubmission: (
    submissionDeadline: Date,
    judgingDeadline: Date
  ): boolean => {
    return judgingDeadline > submissionDeadline;
  },

  // Validate Nostr pubkey format
  isValidPubkey: (pubkey: string): boolean => {
    // Check if it's a bech32 npub string
    if (/^npub1[0-9a-z]{58}$/i.test(pubkey)) {
      try {
        const decoded = bech32.decode(pubkey);
        // Verify the prefix is 'npub' and data length is correct (32 bytes = 52 chars in bech32)
        return decoded.prefix === 'npub' && decoded.words.length > 0;
      } catch (e) {
        return false;
      }
    }

    // Check if it's a 64-character hex string (32 bytes)
    if (/^[0-9a-f]{64}$/i.test(pubkey)) {
      return true; // Hex format is valid by regex alone
    }

    return false;
  },

  // Validate Nostr secret key format
  isValidSecretKey: (secretKey: string): boolean => {
    // Check if it's a bech32 nsec string
    if (/^nsec1[0-9a-z]{58}$/i.test(secretKey)) {
      try {
        const decoded = bech32.decode(secretKey);
        // Verify the prefix is 'nsec' and data length is correct
        return decoded.prefix === 'nsec' && decoded.words.length > 0;
      } catch (e) {
        return false;
      }
    }

    // Check if it's a 64-character hex string (32 bytes)
    if (/^[0-9a-f]{64}$/i.test(secretKey)) {
      return true; // Hex format is valid by regex alone
    }

    return false;
  },

  // Sanitize string input
  sanitizeString: (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
  },

  // Validate HTML content for rich text
  isValidHTML: (html: string): boolean => {
    const allowedTags = [
      'p',
      'strong',
      'em',
      'ul',
      'ol',
      'li',
      'br',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
    ];
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^<>]*>/g;
    const matches = html.match(tagRegex);

    if (!matches) return true;

    return matches.every((match) => {
      const tag = match
        .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b.*/, '$1')
        .toLowerCase();
      return allowedTags.includes(tag);
    });
  },

  // Reward utility functions
  getTotalReward: (rewardSats: number | number[]): number => {
    return Array.isArray(rewardSats)
      ? rewardSats.reduce((sum, reward) => sum + reward, 0)
      : rewardSats;
  },

  isMultiTierReward: (rewardSats: number | number[]): boolean => {
    return Array.isArray(rewardSats) && rewardSats.length > 1;
  },

  getRewardTiers: (rewardSats: number | number[]): number[] => {
    return Array.isArray(rewardSats) ? rewardSats : [rewardSats];
  },

  formatRewardDisplay: (rewardSats: number | number[]): string => {
    if (Array.isArray(rewardSats)) {
      return rewardSats.map((r) => r.toLocaleString()).join(' + ') + ' sats';
    }
    return rewardSats.toLocaleString() + ' sats';
  },
};

// Error message helpers
export const errorMessages = {
  required: (field: string) => `${field} is required`,
  tooShort: (field: string, min: number) =>
    `${field} must be at least ${min} characters`,
  tooLong: (field: string, max: number) =>
    `${field} must be no more than ${max} characters`,
  invalidFormat: (field: string) => `${field} format is invalid`,
  futureDate: (field: string) => `${field} must be in the future`,
  afterDate: (field: string, otherField: string) =>
    `${field} must be after ${otherField}`,
};

// Type exports
export type BountyCreateInput = z.infer<typeof bountySchemas.create>;
export type BountyWinnersInput = z.infer<typeof bountySchemas.winners>;
export type AuthSecretKeyInput = z.infer<typeof authSchemas.secretKey>;
export type NostrEventInput = z.infer<typeof nostrSchemas.event>;
