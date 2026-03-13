import { z } from "zod";

export const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const passwordSchema = z.string()
  .min(8, "Minimum 8 characters")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[^a-zA-Z0-9]/, "Must contain a special character");

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export const businessSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.enum(["HOTEL", "RESORT", "RESTAURANT", "TOUR", "ARTISAN", "TRAVEL_AND_TOURS", "EVENT_VENUE"]),
  about: z.string().max(300).optional(),
  address: z.string().min(1),
  barangay: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  owner: z.string().optional(),
  coverPhotoUrl: z.string().url().optional().or(z.literal("")),
});

export const feePaymentSchema = z.object({
  lines: z.array(z.object({
    payerType: z.enum(["REGULAR_TOURIST", "PALAWENO", "STUDENT", "SENIOR_CITIZEN", "PWD"]),
    quantity: z.number().int().min(0),
  })).refine(lines => lines.some(l => l.quantity > 0), "At least one person required"),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().max(500).optional(),
});
