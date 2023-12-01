import { lucia } from 'lucia';
import { sveltekit } from 'lucia/middleware';
import { postgres as postgresAdapter } from '@lucia-auth/adapter-postgresql';
import { client } from './db.js';
import { dev } from '$app/environment';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { userKeys, users } from './db/schema';

export const auth = lucia({
	env: dev ? 'DEV' : 'PROD',
	middleware: sveltekit(),
	adapter: postgresAdapter(client, {
		user: 'users',
		key: 'user_keys',
		session: 'user_sessions'
	}),
	getUserAttributes: (databaseUser) => {
		return {
			roles: databaseUser.roles,
			username: databaseUser.username
		};
	}
});

export type Auth = typeof auth;

export async function signInWithPassword({
	username,
	password
}: {
	username: string;
	password: string;
}) {
	const key = await auth.useKey('username', username.toLowerCase(), password);
	return await auth.createSession({
		userId: key.userId,
		attributes: {}
	});
}

export async function signUp({
	username,
	password,
	roles = ['user']
}: {
	username: string;
	password: string;
	roles?: ('user' | 'admin')[];
}) {
	const user = await auth.createUser({
		key: {
			providerId: 'username',
			providerUserId: username.toLowerCase(),
			password: password
		},
		attributes: {
			username: username,
			roles
		}
	});
	return await auth.createSession({
		userId: user.userId,
		attributes: {}
	});
}

async function usernameFor(userId: string) {
	return await db.query.users.findFirst({
		where: eq(users.id, userId),
		columns: { username: true }
	});
}

export async function changeUsername({
	userId,
	newUsername
}: {
	userId: string;
	newUsername: string;
}) {
	return await db.transaction(async () => {
		const user = await usernameFor(userId);

		if (!user?.username) {
			throw 'No user found';
		}
		const oldUsername = user.username;
		const updatedUser = await auth.updateUserAttributes(userId, {
			username: newUsername
		});

		// TODO: what is the lucia way to do this? https://github.com/lucia-auth/lucia/issues/1215
		// seems like i'm doing something wrong
		await db
			.update(userKeys)
			.set({ id: `username:${newUsername.toLowerCase()}` })
			.where(eq(userKeys.id, `username:${oldUsername}`))
			.returning({ id: userKeys.id });

		await auth.invalidateAllUserSessions(updatedUser.userId);
		return await auth.createSession({
			userId: updatedUser.userId,
			attributes: {}
		});
	});
}

export async function changePassword({
	userId,
	oldPassword,
	newPassword
}: {
	userId: string;
	oldPassword: string;
	newPassword: string;
}) {
	return await db.transaction(async () => {
		const user = await usernameFor(userId);

		if (!user?.username) {
			throw 'Can not find user';
		}

		await auth.useKey('username', user.username.toLowerCase(), oldPassword);
		await auth.updateKeyPassword('username', user.username.toLowerCase(), newPassword);
		await auth.invalidateAllUserSessions(userId);
		return await auth.createSession({
			userId,
			attributes: {}
		});
	});
}
