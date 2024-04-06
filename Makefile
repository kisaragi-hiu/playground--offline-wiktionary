dev.astro:
	bunx astro dev

dev:
	bunx tauri dev
build:
	bunx astro check && bunx astro build
preview:
	bunx astro preview

format:
	bunx prettier -w src/
