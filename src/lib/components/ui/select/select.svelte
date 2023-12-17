<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';

	type $$Props = SelectPrimitive.Props<unknown>;

	export let selected: $$Props['selected'] = undefined;
	export let open: $$Props['open'] = undefined;
</script>

<SelectPrimitive.Root bind:selected bind:open {...$$restProps}>
	<slot />
</SelectPrimitive.Root>
