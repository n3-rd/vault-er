<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let className: string = '';

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
</script>

<div 
  class={`animate-spin rounded-full border-4 border-t-primary border-gray-200 ${sizeClasses[size]} ${className}`}
  role="status"
>
  <span class="sr-only">Loading...</span>
</div> 