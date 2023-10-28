import { LuciaError } from 'lucia';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms/server';
import { signInSchema } from './schema';
import type { PageServerLoad } from './$types';
import { signInWithPassword } from '$lib/server/lucia.js';

export const load: PageServerLoad = async () => {
	const form = await superValidate(signInSchema);
	return { form };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, signInSchema);

		if (!form.valid) {
			return fail(400, { form });
		}
		try {
			const session = await signInWithPassword({
				username: form.data.username,
				password: form.data.password
			});
			locals.auth.setSession(session); // set session cookie
		} catch (e) {
			if (
				e instanceof LuciaError &&
				(e.message === 'AUTH_INVALID_KEY_ID' || e.message === 'AUTH_INVALID_PASSWORD')
			) {
				// user does not exist
				// or invalid password
				return setError(form, '', 'Incorrect username or password');
			}
			return setError(form, '', 'An unknown error occurred', { status: 500 });
		}
		// redirect to
		// make sure you don't throw inside a try/catch block!
		throw redirect(302, '/app');
	}
};
