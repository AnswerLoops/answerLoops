#!/usr/bin/env bash
# Source this file to load Notion page IDs into the current shell:
#   source scripts/load-notion-env.sh
set -a
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env.notion"
set +a
