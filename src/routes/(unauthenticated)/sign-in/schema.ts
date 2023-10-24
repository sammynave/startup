import { z } from 'zod';
export const signInSchema = z.object({
	username: z.string(),
	password: z.string().min(8).max(50)
});
export type SignInSchema = typeof signInSchema;
