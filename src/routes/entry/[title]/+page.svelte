<script lang="ts">
  export let data;

  import { afterNavigate } from "$app/navigation";

  // Wiktionary redlinks encourage readers to create them. Here, showing that
  // would not be helpful, so we replace them with something else.
  afterNavigate(() => {
    // Section 0 is the banners for protection, links to Wikipedia, etc.
    document.querySelector('section[data-mw-section-id="0"]')?.remove();
    // Remove transcluded tables, which don't work well in our context
    document
      .querySelectorAll('table[typeof="mw:Transclusion"]')
      ?.forEach((x) => x.remove());
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
