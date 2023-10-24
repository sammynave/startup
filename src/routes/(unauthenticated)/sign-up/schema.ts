import { z } from 'zod';
export const formSchema = z
	.object({
		username: z.string().min(2).max(50),
		password: z.string().min(8).max(50),
		'confirm-password': z.string().min(8).max(50)
	})
	.refine((data) => data.password === data['confirm-password'], {
		message: 'Passwords do not match',
		path: ['confirm-password']
	});
export type FormSchema = typeof formSchema;
