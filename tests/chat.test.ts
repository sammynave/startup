import { expect, test } from '@playwright/test';
import { db } from '../src/lib/server/db';
import { userKeys, userSessions, users } from '../src/lib/server/db/schema';
import { client } from '../src/lib/server/websockets/redis-client';

test.describe('sign up/sign in flow testing', () => {
	test.beforeEach(async () => {
		await db.delete(userSessions);
		await db.delete(userKeys);
		await db.delete(users);
		await client().flushall();
	});

	test('can chat', async ({ browser }) => {
		// Create two different contexts (and pages) so users can chat to each other
		const sammyContext = await browser.newContext();
		const sammyPage = await sammyContext.newPage();

		const otherContext = await browser.newContext();
		const otherPage = await otherContext.newPage();

		const username = 'sammy';
		await sammyPage.goto('/');
		await sammyPage.waitForSelector('body.started', { timeout: 5000 });
		await expect(sammyPage.getByRole('heading', { name: 'Sign up' })).toBeVisible();
		await sammyPage.getByTestId('username').fill(username);
		await sammyPage.getByTestId('password').fill('qwertyqwerty');
		await sammyPage.getByTestId('confirm-password').fill('qwertyqwerty');
		await sammyPage.getByTestId('sign-up-submit').click();
		await expect(sammyPage.getByTestId('welcome')).toContainText(`Welcome, ${username}`);
		await expect(sammyPage).toHaveURL('/app');
		await sammyPage.getByTestId('websocket-link').click();
		await expect(sammyPage).toHaveURL('/app/websocket-example/using-pub-sub');
		const message = 'hello';
		await sammyPage.getByTestId('chat-input').fill(message);
		await sammyPage.getByTestId('chat-submit').click();
		await expect(sammyPage.getByTestId('joined')).toContainText(`${username} joined`);
		await expect(sammyPage.getByTestId('message-from-other')).toHaveCount(0);
		await expect(sammyPage.getByTestId('message-from-me')).toContainText(message);

		const otherUsername = 'other';
		await otherPage.goto('/');
		await otherPage.waitForSelector('body.started', { timeout: 5000 });
		await expect(otherPage.getByRole('heading', { name: 'Sign up' })).toBeVisible();
		await otherPage.getByTestId('username').fill(otherUsername);
		await otherPage.getByTestId('password').fill('qwertyqwerty');
		await otherPage.getByTestId('confirm-password').fill('qwertyqwerty');
		await otherPage.getByTestId('sign-up-submit').click();
		await expect(otherPage.getByTestId('welcome')).toContainText(`Welcome, ${otherUsername}`);
		await expect(otherPage).toHaveURL('/app');
		await otherPage.getByTestId('websocket-link').click();
		await expect(otherPage).toHaveURL('/app/websocket-example/using-pub-sub');
		await expect(otherPage.getByTestId('joined')).toContainText(`${otherUsername} joined`);
		await expect(otherPage.getByTestId('message-from-other')).toContainText(
			`${username}: ${message}`
		);

		const otherMessage = 'hi there';
		await otherPage.getByTestId('chat-input').fill(otherMessage);
		await otherPage.getByTestId('chat-submit').click();
		await expect(otherPage.getByTestId('message-from-me')).toContainText(otherMessage);

		await expect(sammyPage.getByTestId('message-from-other')).toContainText(otherMessage);
	});
});
