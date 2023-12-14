import { expect, test } from '@playwright/test';
import { db } from '../src/lib/server/db';
import { userKeys, userSessions, users } from '../src/lib/server/db/schema';

test.describe('sign up/sign in flow testing', () => {
	test.beforeEach(async () => {
		await db.delete(userSessions);
		await db.delete(userKeys);
		await db.delete(users);
	});

	test('can sign up, sign out, and sign in', async ({ page }) => {
		const username = 'sammy';
		await page.goto('/');
		await page.waitForSelector('body.started', { timeout: 5000 });
		await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
		await page.getByTestId('username').fill(username);
		await page.getByTestId('password').fill('qwertyqwerty');
		await page.getByTestId('confirm-password').fill('qwertyqwerty');
		await page.getByTestId('sign-up-submit').click();
		await expect(page.getByTestId('welcome')).toContainText(`Welcome, ${username}`);
		await expect(page).toHaveURL('/app');
		await page.getByTestId('sign-out').click();
		await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
		await page.getByTestId('username').fill(username);
		await page.getByTestId('password').fill('qwertyqwerty');
		await page.getByTestId('sign-in-submit').click();
		await expect(page.getByTestId('welcome')).toContainText(`Welcome, ${username}`);
	});
});
