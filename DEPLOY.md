# デプロイ手順

## 手順（ターミナルで実行）

### 1. GitHub に保存（コミット・プッシュ）

```bash
cd /Users/fukitakatsumi/sagyou-wariate

# 変更をステージング
git add App.jsx

# コミット
git commit -m "fix: 作業割当の保存でデータが消える不具合修正・デバッグ強化（storeId正規化、空上書き防止、undefinedガード）"

# GitHub にプッシュ
git push origin main
```

### 2. デプロイ

**Firebase Hosting の場合:**

```bash
npm run build
firebase deploy --only hosting:sagyou-wariate
```

**Vercel の場合:**

```bash
npm run deploy:vercel
```

---

## 一括実行

`deploy.sh` を実行すると、上記の Git プッシュとビルド・デプロイをまとめて実行できます。

```bash
cd /Users/fukitakatsumi/sagyou-wariate
chmod +x deploy.sh
./deploy.sh
```

確認なしで実行する場合: `./deploy.sh --no-prompt`

---

## 注意

- 初回は `firebase login` または `vercel login` でログインが必要な場合があります。
- GitHub へのプッシュには、リポジトリへの書き込み権限が必要です。
