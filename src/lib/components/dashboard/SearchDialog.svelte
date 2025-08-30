<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { searchOpen } from "$lib/ui-store";
    import Input from "../ui/input/input.svelte";
    import * as Tabs from "$lib/components/ui/tabs/index.js";

    let activeTab = $state('spaces');
    let searchQuery = $state('');
   </script>
    
   <Dialog.Root bind:open={$searchOpen}

   >
    <!-- <Dialog.Trigger>Open</Dialog.Trigger> -->
    <Dialog.Content>
     <Dialog.Header>
      <Dialog.Title>Global search</Dialog.Title>
     </Dialog.Header>
     <Input class="w-full" bind:value={searchQuery}/>
     <Tabs.Root bind:value={activeTab} class="w-full">
        <Tabs.List>
          <Tabs.Trigger value="spaces">Spaces</Tabs.Trigger>
          <Tabs.Trigger value="uploads">Uploads</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="spaces">
          Spaces Tab
        </Tabs.Content>
        <Tabs.Content value="uploads">
          Uploads Tab
        </Tabs.Content>
      </Tabs.Root>
    </Dialog.Content>
   </Dialog.Root>