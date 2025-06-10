import z from "zod";

export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const positiveIntegerSchema = z.number().int().positive();

export const usersResponseSchema = z.object({
  nextPage: positiveIntegerSchema.optional(),
  users: z.array(userSchema),
});
