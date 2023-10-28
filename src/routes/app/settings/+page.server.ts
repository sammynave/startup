import { fail, type Actions } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms/server';
import { formSchema as passwordSchema } from './change-password-schema.js';
import { formSchema as usernameSchema } from './change-username-schema.js';
import postgres from 'postgres';

import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { LuciaError } from 'lucia';
import { changePassword, changeUsername } from '$lib/server/lucia.js';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.user;
	const usernameForm = await superValidate(usernameSchema);
	const passwordForm = await superValidate(passwordSchema);

	const results = await db.query.users.findFirst({
		where: eq(users.id, userId),
		columns: {
			username: true
		}
	});

	if (!results) {
		return setError(usernameForm, '', 'Can not find user', { status: 500 });
	}

	usernameForm.data.username = results.username;

	return { usernameForm, passwordForm };
};

export const actions: Actions = {
	'change-username': async ({ request, locals }) => {
		const { userId } = locals.user;

		const form = await superValidate(request, usernameSchema);
		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const session = await changeUsername({
				userId,
				newUsername: form.data.username
			});

			locals.auth.setSession(session);

			return message(form, `Username updated to ${form.data.username}`);
		} catch (e) {
			if (e instanceof postgres.PostgresError) {
				if (e.code === '23505') {
					return setError(form, 'username', 'Username already taken');
				} else {
					const message = `An unknown PostgresError occurred - ${e.code}: ${e.detail} on ${e.table_name}`;
					return setError(form, '', message);
				}
			}

			return setError(form, '', `An unknown error occurred - ${e}`, { status: 500 });
		}
	},
	'change-password': async ({ request, locals }) => {
		const { userId } = locals.user;

		const form = await superValidate(request, passwordSchema);
		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const session = await changePassword({
				userId,
				oldPassword: form.data['current-password'],
				newPassword: form.data['new-password']
			});

			locals.auth.setSession(session);

			// TODO: How do you reset the form on success??
			return message(form, 'Password updated');
		} catch (e) {
			if (
				e instanceof LuciaError &&
				(e.message === 'AUTH_INVALID_KEY_ID' || e.message === 'AUTH_INVALID_PASSWORD')
			) {
				// user does not exist
				// or invalid password
				return setError(form, 'current-password', 'Incorrect password');
			}
			return setError(form, '', `An unknown error occurred - ${e}`, { status: 500 });
		}
	}
};
