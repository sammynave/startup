<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { formSchema, type FormSchema } from './change-username-schema';
	import type { SuperValidated } from 'sveltekit-superforms';

	export let form: SuperValidated<FormSchema>;
</script>

<Form.Root
	class="w-full"
	{form}
	schema={formSchema}
	method="post"
	action="?/change-username"
	let:message
	let:config
	let:submitting
	let:errors
>
	{#if errors?._errors?.length}
		{#each errors._errors as error}
			<div
				class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-destructive"
			>
				{error}
			</div>
		{/each}
	{/if}
	<Form.Item>
		<Form.Field {config} name="username">
			<Form.Label class="inline-flex w-full justify-between">Username</Form.Label>
			<Form.Input type="text" />
			<Form.Validation />
		</Form.Field>
	</Form.Item>
	<Form.Button class="mt-2" type="submit" disabled={submitting}>Change username</Form.Button>
	{#if message}
		<p class="text-positive-foreground">{message}</p>
	{/if}
</Form.Root>
