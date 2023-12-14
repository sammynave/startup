import { fail, redirect, type Actions } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms/server';
import { formSchema } from './schema';
import postgres from 'postgres';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { signUp } from '$lib/server/lucia.js';

export const load: PageServerLoad = async () => {
	const form = await superValidate(formSchema);
	return { form };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, formSchema);

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			await db.transaction(async () => {
				const session = await signUp({
					username: form.data.username,
					password: form.data.password
				});
				locals.auth.setSession(session);
			});
		} catch (e) {
			if (e instanceof postgres.PostgresError) {
				if (e.code === '23505') {
					return setError(form, 'username', 'Username already taken');
				} else {
					const message = `An unknown PostgresError occurred - ${e.code}: ${e.detail} on ${e.table_name}`;
					return setError(form, '', message);
				}
			}

			return setError(form, '', 'An unknown error occurred', { status: 500 });
		}
		// redirect to
		// make sure you don't throw inside a try/catch block!
		redirect(302, '/app');
	}
};
