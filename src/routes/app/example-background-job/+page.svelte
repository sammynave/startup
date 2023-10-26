<script lang="ts">
	import { enhance } from '$app/forms';
	import { PUBLIC_FAKTORY_URL } from '$env/static/public';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	import P from '$lib/components/ui/p.svelte';
	import { Separator } from '$lib/components/ui/select';

	export let form;
</script>

<Card.Root class="min-w-min sm:w-[380px] mx-auto border-none shadow-none">
	<Card.Header>
		<Card.Title>Example background job</Card.Title>
		<Separator />
	</Card.Header>
	<Card.Content>
		<P>
			Click the button below to queue up an example background job. You can queue up as many as you
			like! If you haven't started any workers yet, you can view them in the
			<a class="underline" href={`${PUBLIC_FAKTORY_URL}/queues/default`}>Faktory UI.</a>
		</P>

		<P>Start a worker (`pnpm dev:worker`) to process the queue</P>
	</Card.Content>
	<Card.Footer class="gap-4">
		<form method="post" action="?/example-job" use:enhance>
			<Button variant="outline" type="submit">kick off example job</Button>
		</form>
		{#if form?.jobId}
			Job Id: {form.jobId}
		{/if}
	</Card.Footer>
</Card.Root>
