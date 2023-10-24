<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Form from '$lib/components/ui/form';
	import { formSchema, type FormSchema } from './schema';
	import type { SuperValidated } from 'sveltekit-superforms';

	export let form: SuperValidated<FormSchema>;
	let showPassword = false;
</script>

<Form.Root
	class="w-full sm:w-[380px] mx-auto"
	{form}
	schema={formSchema}
	method="post"
	let:config
	let:submitting
	let:errors
>
	<Card.Root>
		<Card.Header>
			<Card.Title>Sign up</Card.Title>
			<Card.Description>create an account</Card.Description>
		</Card.Header>
		<Card.Content>
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
					<Form.Label>Username</Form.Label>
					<Form.Input />
					<Form.Validation />
				</Form.Field>
			</Form.Item>
			<Form.Item>
				<Form.Field {config} name="password">
					<Form.Label class="inline-flex w-full justify-between"
						>Password
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
				<Form.Field {config} name="confirm-password">
					<Form.Label class="inline-flex w-full justify-between">Confirm password</Form.Label>
					<Form.Input type={showPassword ? 'text' : 'password'} />
					<Form.Validation />
				</Form.Field>
			</Form.Item>
		</Card.Content>
		<Card.Footer>
			<Form.Button type="submit" disabled={submitting}>Sign up</Form.Button>
		</Card.Footer>
	</Card.Root>
</Form.Root>
