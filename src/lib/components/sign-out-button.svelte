<script lang="ts">
	import { enhance } from '$app/forms';
</script>

<form method="post" action="?/sign-out" use:enhance>
	<button type="submit">Sign out</button>
</form>
