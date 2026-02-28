#!/bin/bash
# GitHub にプッシュしてデプロイするスクリプト
# 使い方: ./deploy.sh  または  ./deploy.sh --no-prompt（確認なしで実行）
set -e
cd "$(dirname "$0")"

NO_PROMPT=false
[[ "$1" == "--no-prompt" ]] && NO_PROMPT=true

echo "=== 1. Git にコミット・プッシュ ==="
git add App.jsx
git status
if [[ "$NO_PROMPT" != "true" ]]; then
  read -p "上記の変更をコミットしてプッシュしますか? (y/N): " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "中止しました。"
    exit 0
  fi
fi

git commit -m "fix: 作業割当の保存でデータが消える不具合修正・デバッグ強化（storeId正規化、空上書き防止、undefinedガード）"
git push origin main

echo ""
echo "=== 2. ビルド・デプロイ ==="
npm run build
if command -v firebase &> /dev/null; then
  echo "Firebase でデプロイします..."
  firebase deploy --only hosting:sagyou-wariate
elif command -v vercel &> /dev/null; then
  echo "Vercel でデプロイします..."
  vercel --prod
else
  echo "firebase または vercel CLI がインストールされていません。"
  echo "ビルドは完了しています。デプロイは手動で実行してください:"
  echo "  npm run deploy     # Firebase"
  echo "  npm run deploy:vercel  # Vercel"
fi

echo ""
echo "完了しました。"
