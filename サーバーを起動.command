#!/bin/bash
cd "$(dirname "$0")"
echo "業務管理システム - 開発サーバーを起動しています..."
echo ""
echo "ブラウザが自動で開かない場合は、次のURLを開いてください："
echo "  http://localhost:3000"
echo ""
echo "終了するにはこのウィンドウで Ctrl+C を押すか、ウィンドウを閉じてください。"
echo "----------------------------------------"
npm run dev
