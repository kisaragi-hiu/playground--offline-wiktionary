dev:
	bunx vite dev
build:
	bunx vite build
preview:
	bunx vite preview

check:
	bunx svelte-kit sync && bunx svelte-check --tsconfig ./tsconfig.json
check.watch:
	bunx svelte-kit sync && bunx svelte-check --tsconfig ./tsconfig.json --watch

lint:
	bunx prettier --check src/

format:
	bunx prettier --write src/
