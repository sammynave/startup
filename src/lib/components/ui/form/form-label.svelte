<script lang="ts">
	import type { Label as LabelPrimitive } from 'bits-ui';
	import { getFormField } from 'formsnap';
	import { cn } from '$lib/utils';
	import { Label } from '$lib/components/ui/label';

	type $$Props = LabelPrimitive.Props;

	let className: $$Props['class'] = undefined;
	export { className as class };

	const {
		errors,
		// @ts-expect-error waiting for lib to be updated
		ids: { input }
	} = getFormField();
</script>

<Label for={input} class={cn($errors && 'text-destructive', className)} {...$$restProps}>
	<slot />
</Label>
