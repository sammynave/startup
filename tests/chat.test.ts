import { expect, test } from '@playwright/test';
import { db } from '../src/lib/server/db';
import { userKeys, userSessions, users } from '../src/lib/server/db/schema';
import { client } from '../src/lib/server/websockets/redis-client';
import { inArray } from 'drizzle-orm';
import { SignUpPage } from './poms/sign-up-page';

test.describe('websocket testing', () => {
	const sammy = 'sammy';
	const sammyPassword = 'qwertyqwerty';
	const otherUsername = 'other';
	const otherPassword = 'abcdabcd';
	const findUserIds = db.query.users
		.findMany({
			where: inArray(users.username, [sammy, otherUsername]),
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
		await client().flushall();
	});

	test('can chat', async ({ browser }) => {
		// Create two different contexts (and pages) so users can chat to each other
		const sammyContext = await browser.newContext();
		const sammyPage = await sammyContext.newPage();
		const sammySignUp = new SignUpPage(sammyPage);
		await sammySignUp.goto();
		await sammySignUp.signUp({ username: sammy, password: sammyPassword });

		await expect(sammyPage.getByTestId('welcome')).toContainText(`Welcome, ${sammy}`);
		await expect(sammyPage).toHaveURL('/app');
		await sammyPage.getByTestId('websocket-link').click();
		await expect(sammyPage).toHaveURL('/app/websocket-example/using-pub-sub');
		const message = 'hello';
		await sammyPage.getByTestId('chat-input').fill(message);
		await sammyPage.getByTestId('chat-submit').click();
		await expect(sammyPage.getByTestId('joined')).toContainText(`${sammy} joined`);
		await expect(sammyPage.getByTestId('message-from-other')).toHaveCount(0);
		await expect(sammyPage.getByTestId('message-from-me')).toContainText(message);

		const otherContext = await browser.newContext();
		const otherPage = await otherContext.newPage();
		const otherSignUp = new SignUpPage(otherPage);
		await otherSignUp.goto();
		await otherSignUp.signUp({ username: otherUsername, password: otherPassword });

		await expect(otherPage.getByTestId('welcome')).toContainText(`Welcome, ${otherUsername}`);
		await expect(otherPage).toHaveURL('/app');
		await otherPage.getByTestId('websocket-link').click();
		await expect(otherPage).toHaveURL('/app/websocket-example/using-pub-sub');
		await expect(otherPage.getByTestId('joined')).toContainText(`${otherUsername} joined`);
		await expect(otherPage.getByTestId('message-from-other')).toContainText(`${sammy}: ${message}`);

		const otherMessage = 'hi there';
		await otherPage.getByTestId('chat-input').fill(otherMessage);
		await otherPage.getByTestId('chat-submit').click();
		await expect(otherPage.getByTestId('message-from-me')).toContainText(otherMessage);

		await expect(sammyPage.getByTestId('message-from-other')).toContainText(otherMessage);
	});
});
