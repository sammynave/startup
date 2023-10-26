<script lang="ts">
	import DataTable from './data-table.svelte';
	export let data;
</script>

<DataTable users={data.users} />
