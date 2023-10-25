import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth.validate();
	if (session?.user?.userId) {
		throw redirect(302, '/app');
	} else {
		throw redirect(302, '/sign-up');
	}
};
