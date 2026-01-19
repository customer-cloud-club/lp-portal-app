#!/bin/bash
# Apply all generated code from Miyabi agents

STORAGE_DIR="/Users/mashimaro/.miyabi/storage/IvyGain-skillfreak-streaming-system"
PROJECT_ROOT="/Users/mashimaro/skillfreak-streaming-system"

echo "🤖 Miyabi生成コード適用スクリプト"
echo "=================================="
echo ""

# Function to apply code from an issue
apply_issue() {
    local issue_num=$1
    local issue_dir="$STORAGE_DIR/issue-$issue_num"
    local output_file="$issue_dir/codegen-output.json"
    
    if [ ! -f "$output_file" ]; then
        echo "⚠️  Issue #$issue_num: codegen-output.json not found"
        return
    fi
    
    echo "📝 Processing Issue #$issue_num..."
    
    # Extract and create files
    local file_count=$(jq -r '.files | length' "$output_file")
    echo "   Files to create: $file_count"
    
    for i in $(seq 0 $((file_count - 1))); do
        local file_path=$(jq -r ".files[$i].path" "$output_file")
        local file_content=$(jq -r ".files[$i].content" "$output_file")
        local full_path="$PROJECT_ROOT/$file_path"
        local dir_path=$(dirname "$full_path")
        
        # Create directory if it doesn't exist
        mkdir -p "$dir_path"
        
        # Write file
        echo "$file_content" > "$full_path"
        echo "   ✅ Created: $file_path"
    done
    
    echo ""
}

# Apply all issues
for issue in 4 5 6 7 8 9 10 11 12 13; do
    apply_issue $issue
done

echo "🎉 All generated code applied successfully!"
echo ""
echo "Next steps:"
echo "  1. Review changes: git status"
echo "  2. Run tests: npm test"
echo "  3. Build: npm run build"
