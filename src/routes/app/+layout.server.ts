export async function load({ locals }) {
	return {
		isAdmin: locals.user.roles.includes('admin')
	};
}
