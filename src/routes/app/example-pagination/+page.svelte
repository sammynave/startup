<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/select';
</script>

<Card.Root class="min-w-min sm:w-[380px] mx-auto border-none shadow-none">
	<Card.Header>
		<Card.Title>Example pagination</Card.Title>
		<div>TODO: search/filter controls</div>
		<Separator />
	</Card.Header>
	<Card.Content>
		<div>TODO: sortable, filterable table</div>
	</Card.Content>
	<Card.Footer class="gap-4">
		<div>TODO: next/prev page buttons</div>
	</Card.Footer>
</Card.Root>
