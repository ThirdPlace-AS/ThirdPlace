// ─────────────────────────────────────────────────────────────
// lib/validators.ts
// Zod schemas for every user-facing form.
// Using Zod means validation logic lives in one place and is
// reusable across screens, hooks, and API calls.
// ─────────────────────────────────────────────────────────────
import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────────
export const signInSchema = z.object({
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters").max(50),
  email:       z.string().email("Enter a valid email"),
  password:    z.string().min(8, "Password must be at least 8 characters"),
});

export const phoneSchema = z.object({
  phone: z
    .string()
    .min(8, "Enter a valid phone number")
    .regex(/^\+?[0-9\s\-()]+$/, "Enter a valid phone number"),
});

export const otpSchema = z.object({
  token: z.string().length(6, "Enter the 6-digit code"),
});

// ── Create experience ─────────────────────────────────────────
export const createExperienceSchema = z.object({
  title: z
    .string()
    .min(3,  "Title must be at least 3 characters")
    .max(40, "Title must be under 40 characters"),
  description: z
    .string()
    .min(15,  "Add a bit more detail")
    .max(200, "Keep it under 200 characters"),
  category:        z.string().min(1, "Pick a category"),
  address:         z.string().min(3, "Add a location"),
  maxParticipants: z
    .number()
    .int()
    .min(2,    "Minimum 2 people")
    .max(1000, "Maximum 1000 people")
    .optional(),
  startsAt: z.date().min(new Date(), "Must be in the future"),
});

export type SignInValues        = z.infer<typeof signInSchema>;
export type SignUpValues         = z.infer<typeof signUpSchema>;
export type PhoneValues          = z.infer<typeof phoneSchema>;
export type OTPValues            = z.infer<typeof otpSchema>;
export type CreateExperienceValues = z.infer<typeof createExperienceSchema>;