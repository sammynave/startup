import { expect, type Locator, type Page } from '@playwright/test';

export class SignUpPage {
	readonly page: Page;
	readonly usernameInput: Locator;
	readonly passwordInput: Locator;
	readonly confirmPasswordInput: Locator;
	readonly submitButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.usernameInput = page.getByTestId('username');
		this.passwordInput = page.getByTestId('password');
		this.confirmPasswordInput = page.getByTestId('confirm-password');
		this.submitButton = page.getByTestId('sign-up-submit');
	}

	async goto() {
		await this.page.goto('/sign-up');
		await this.isOnPage();
	}

	async signUp({ username, password }: { username: string; password: string }) {
		await this.isOnPage();
		await this.usernameInput.fill(username);
		await this.passwordInput.fill(password);
		await this.confirmPasswordInput.fill(password);
		await this.submitButton.click();
	}

	async isOnPage() {
		await this.page.waitForSelector('body.started', { timeout: 5000 });
		await expect(this.page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
	}
}
