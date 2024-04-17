types:
	bunx svelte-kit sync

dev: types
	bunx vite dev
build:
	bunx vite build
preview:
	bunx vite preview

check: types
	bunx svelte-check --tsconfig ./tsconfig.json
check.watch: types
	bunx svelte-check --tsconfig ./tsconfig.json --watch

lint:
	bunx prettier --check src/

format:
	bunx prettier --write src/
