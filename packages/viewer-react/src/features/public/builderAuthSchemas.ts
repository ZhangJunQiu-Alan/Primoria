import { z } from 'zod';

const emailField = z
  .string()
  .trim()
  .min(1, 'Email address is required')
  .email('Enter a valid email address');

export const passwordResetSchema = z.object({
  email: emailField,
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    email: emailField,
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export function getFieldErrors<TFieldNames extends string>(
  error: z.ZodError,
): Partial<Record<TFieldNames, string>> {
  const fieldErrors: Partial<Record<TFieldNames, string>> = {};

  for (const issue of error.issues) {
    const fieldName = issue.path[0];
    if (typeof fieldName !== 'string') continue;
    if (fieldErrors[fieldName as TFieldNames]) continue;
    fieldErrors[fieldName as TFieldNames] = issue.message;
  }

  return fieldErrors;
}
