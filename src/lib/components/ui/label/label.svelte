<script lang="ts">
  export let htmlFor: string | undefined = undefined;
  export let className: string = '';
</script>

<label 
  for={htmlFor} 
  class={`block text-sm font-medium text-gray-700 ${className}`}
>
  <slot />
</label> 