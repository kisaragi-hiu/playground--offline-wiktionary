<script lang="ts">
  export let data;

  import { onMount } from "svelte";

  // Wiktionary redlinks encourage readers to create them. Here, showing that
  // would not be helpful, so we replace them with something else.
  onMount(() => {
    for (const aElem of document.querySelectorAll('a[href*="redlink=1"]')) {
      const parent = aElem.parentNode;
      if (parent) {
        const newElem = document.createElement("b");
        newElem.textContent = aElem.textContent;
        parent.replaceChild(newElem, aElem);
      }
    }
  });
</script>

<div class="prose">
  <h1>{data.title}</h1>
  {@html data.text}
</div>
