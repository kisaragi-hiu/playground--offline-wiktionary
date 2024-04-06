<script>
  export let count = 5;

  function decrease() {
    count--;
  }
</script>

<div>{count}</div>
<button on:click={decrease}>Decrease</button>
