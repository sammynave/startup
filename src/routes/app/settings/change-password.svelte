<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { formSchema, type FormSchema } from './change-password-schema';
	import type { SuperValidated } from 'sveltekit-superforms';

	export let form: SuperValidated<FormSchema>;
	let showPassword = false;
</script>

<Form.Root
	class="w-full"
	{form}
	schema={formSchema}
	method="post"
	action="?/change-password"
	let:reset
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
		<Form.Field {config} name="current-password">
			<Form.Label class="inline-flex w-full justify-between"
				>Current password
				<Form.Button
					type="button"
					class="w-100 p-0 pt-2 pb-2 text-xs h-0"
					variant="link"
					on:click={() => (showPassword = !showPassword)}
					>{showPassword ? 'hide' : 'show'}</Form.Button
				>
			</Form.Label>
			<Form.Input type={showPassword ? 'text' : 'password'} />
			<Form.Validation />
		</Form.Field>
		<Form.Field {config} name="new-password">
			<Form.Label class="inline-flex w-full justify-between">Confirm password</Form.Label>
			<Form.Input type={showPassword ? 'text' : 'password'} />
			<Form.Validation />
		</Form.Field>
	</Form.Item>
	<Form.Button type="submit" disabled={submitting}>Change password</Form.Button>
	{#if message}
		{(() => {
			reset({ keepMessage: true });
			return '';
		})()}
		<p class="text-positive-foreground">{message}</p>
	{/if}
</Form.Root>
