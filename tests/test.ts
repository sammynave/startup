import { expect, test } from '@playwright/test';
import { db } from '../src/lib/server/db';
import { userKeys, userSessions, users } from '../src/lib/server/db/schema';

test.describe('websocket testing', () => {
	test.beforeEach(async () => {
		await db.delete(userSessions);
		await db.delete(userKeys);
		await db.delete(users);
	});

	test('index page has expected Sign up text', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
	});
});
