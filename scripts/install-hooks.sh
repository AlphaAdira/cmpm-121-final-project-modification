#!/bin/bash
# Install Git hooks for this repository

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
HOOKS_DIR="$SCRIPT_DIR/hooks"
GIT_HOOKS_DIR="$SCRIPT_DIR/../.git/hooks"

echo "Installing Git hooks..."

# Check if .git directory exists
if [ ! -d "$GIT_HOOKS_DIR" ]; then
    echo "git/hooks not found"
    exit 1
fi

# Copy pre-push hook
if [ -f "$HOOKS_DIR/pre-push" ]; then
    cp "$HOOKS_DIR/pre-push" "$GIT_HOOKS_DIR/pre-push"
    chmod +x "$GIT_HOOKS_DIR/pre-push"
    echo "Installed pre-push hook"
else
    echo "Pre-push hook not found in scripts/hooks/"
    exit 1
fi

echo "Hooks installed successfully!"
echo ""
echo "The pre-push hook will now run checks before every push to prevent"
echo "failed deployments from reaching GitHub Pages."
