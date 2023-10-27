import { auth } from '$lib/server/lucia.js';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms/server';
import { formSchema as passwordSchema } from './change-password-schema.js';
import { formSchema as usernameSchema } from './change-username-schema.js';
import postgres from 'postgres';

import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { userKeys, users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { LuciaError } from 'lucia';

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
		const oldUserName = await db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: { username: true }
		});

		if (!oldUserName?.username) {
			return setError(form, '', 'No user found', { status: 500 });
		}

		try {
			const user = await auth.updateUserAttributes(userId, {
				username: form.data.username
			});

			// TODO: what is the lucia way to do this? https://github.com/lucia-auth/lucia/issues/1215
			// seems like i'm doing something wrong
			await db
				.update(userKeys)
				.set({ id: `username:${form.data.username.toLowerCase()}` })
				.where(eq(userKeys.id, `username:${oldUserName?.username}`))
				.returning({ id: userKeys.id });

			await auth.invalidateAllUserSessions(user.userId);
			const session = await auth.createSession({
				userId: user.userId,
				attributes: {}
			});

			locals.auth.setSession(session);

			return message(form, `Username updated to ${form.data.username}`);
		} catch (e) {
			console.log(e);
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
	},
	'change-password': async ({ request, locals }) => {
		const session = await locals.auth.validate();
		if (!session) {
			throw redirect(302, '/sign-in');
		}

		const { userId } = session.user;

		const form = await superValidate(request, passwordSchema);
		if (!form.valid) {
			return fail(400, { form });
		}

		const results = await db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: {
				username: true
			}
		});

		if (!results) {
			return setError(form, '', 'Can not find user', { status: 500 });
		}

		try {
			await db.transaction(async () => {
				await auth.useKey(
					'username',
					results.username.toLowerCase(),
					form.data['current-password']
				);
				await auth.updateKeyPassword(
					'username',
					results.username.toLowerCase(),
					form.data['new-password']
				);
				await auth.invalidateAllUserSessions(userId);
				const session = await auth.createSession({
					userId,
					attributes: {}
				});

				locals.auth.setSession(session);
			});
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
			return setError(form, '', 'An unknown error occurred', { status: 500 });
		}
	}
};
