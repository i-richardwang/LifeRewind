#!/bin/bash

# CLI 测试脚本
set -e

CLI="node dist/cli/index.js"

echo "🧪 Testing LifeRewind Collector CLI"
echo "===================================="
echo ""

echo "1. Testing version..."
$CLI --version
echo ""

echo "2. Testing help..."
$CLI --help | head -10
echo ""

echo "3. Testing doctor..."
$CLI doctor
echo ""

echo "4. Testing config show (hidden API key)..."
$CLI config show | grep "API Key"
echo ""

echo "5. Testing config show with --reveal-secrets..."
$CLI config show --reveal-secrets | grep "API Key"
echo ""

echo "6. Testing status..."
$CLI status
echo ""

echo "7. Testing config path..."
$CLI config path
echo ""

echo "8. Testing JSON output..."
$CLI config show --json 2>/dev/null | jq -r '.api.apiKey' || echo "  (JSON output contains hidden key)"
echo ""

echo "✅ All automated tests passed!"
echo ""
echo "📝 Manual tests remaining:"
echo "  - Run 'liferewind init' to test interactive wizard"
echo "  - Run 'liferewind config edit' to test editor opening"
echo "  - Run 'liferewind collect --verbose' to test verbose mode"
echo "  - Run 'liferewind start --run-once' to test collection"
