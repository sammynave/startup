import { expect, test } from '@playwright/test';
import { db } from '../src/lib/server/db';
import { userKeys, userSessions, users } from '../src/lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import { SignUpPage } from './poms/sign-up-page';

test.describe('sign up/sign in flow testing', () => {
	const username = 'sign-in-sign-out';
	const password = 'qwertyqwerty';

	const findUserIds = db.query.users
		.findMany({
			where: inArray(users.username, [username]),
			columns: { id: true }
		})
		.prepare('find_users');

	test.beforeEach(async () => {
		const results = await findUserIds.execute();
		const userIds = results.map(({ id }) => id);
		if (userIds.length) {
			await db.delete(userSessions).where(inArray(userSessions.userId, userIds));
			await db.delete(userKeys).where(inArray(userKeys.userId, userIds));
			await db.delete(users).where(inArray(users.id, userIds));
		}
	});

	test('can sign up, sign out, and sign in', async ({ page }) => {
		const signUpPage = new SignUpPage(page);
		await signUpPage.goto();
		await signUpPage.signUp({ username, password });

		await expect(page.getByTestId('welcome')).toContainText(`Welcome, ${username}`);
		await expect(page).toHaveURL('/app');
		await page.getByTestId('sign-out').click();
		await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
		await page.getByTestId('username').fill(username);
		await page.getByTestId('password').fill(password);
		await page.getByTestId('sign-in-submit').click();
		await expect(page.getByTestId('welcome')).toContainText(`Welcome, ${username}`);
	});
});
