import { auth } from '$lib/server/lucia.js';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms/server';
import { formSchema } from './schema';
import postgres from 'postgres';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

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
				const user = await auth.createUser({
					key: {
						providerId: 'username', // auth method
						providerUserId: form.data.username.toLowerCase(), // unique id when using "username" auth method
						password: form.data.password // hashed by Lucia
					},
					attributes: {
						username: form.data.username,
						roles: ['user']
					}
				});
				const session = await auth.createSession({
					userId: user.userId,
					attributes: {}
				});
				locals.auth.setSession(session); // set session cookie
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
		throw redirect(302, '/');
	}
};
