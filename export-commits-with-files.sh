#!/bin/bash

OUTPUT_FILE="commit_changes.md"

# Clear old file
> "$OUTPUT_FILE"

# Loop through all commits
for commit in $(git rev-list --all); do
    echo "Commit Message:" >> "$OUTPUT_FILE"
    git log -1 --pretty=format:"%s" $commit >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    echo "Changed Files:" >> "$OUTPUT_FILE"
    git diff-tree --no-commit-id --name-only -r $commit >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "------------------------" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

echo "Saved to $OUTPUT_FILE"
