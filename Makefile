dev:
	bunx tauri dev
start:
	bunx tauri dev
build:
	bunx astro check && bunx astro build
preview:
	bunx astro preview

format:
	bunx prettier -w src/
