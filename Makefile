.PHONY: build serve check
port ?= 1313

build:
	hugo --environment production --noBuildLock --panicOnWarning

serve:
	hugo server --bind 127.0.0.1 --port $(port) --disableFastRender

check:
	@mkdir -p .checks
	@set -eu; run=$$(mktemp -d "$(CURDIR)/.checks/pages-XXXXXX"); \
	  echo "Check output: $$run"; \
	  hugo --environment production --destination "$$run/public" --cacheDir "$$run/cache" \
	    --noBuildLock --panicOnWarning --printPathWarnings --printI18nWarnings; \
	  uv run --no-project --no-managed-python --python ">=3.11" --no-python-downloads python tests/check_pages.py "$$run/public"; \
	  uv run --no-project --no-managed-python --python ">=3.11" --no-python-downloads python tests/check_workflow.py
