import { z } from 'zod';
export const formSchema = z.object({
	'current-password': z.string().min(8).max(50),
	'new-password': z.string().min(8).max(50)
});
export type FormSchema = typeof formSchema;
