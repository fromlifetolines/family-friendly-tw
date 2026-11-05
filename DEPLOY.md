# GitHub Pages 部署

專案使用 GitHub Actions 建置 Vite 網站，並將 `dist/` 發佈至 `gh-pages` 分支。

## GitHub 設定

1. 開啟 repository 的 **Settings → Pages**。
2. 在 **Build and deployment** 選擇 **Deploy from a branch**。
3. 選擇 `gh-pages` 分支和 `/ (root)` 資料夾並儲存。
4. 確認 repository 為公開，或方案支援私有 repository 的 Pages。

## 自動部署

推送至 `main` 分支或手動執行 Actions 中的 **Deploy to GitHub Pages** workflow 時，流程會安裝相依套件、執行 `npm run build`，並發佈 `dist/`。部署網址：

<https://fromlifetolines.github.io/family-friendly-tw/>

網站路徑由 `vite.config.ts` 的 `base` 設定；若 repository 名稱變更，請一併調整該值。

## 本機驗證

```bash
npm ci
npm run build
npm run preview
```

預覽時請使用含 `/family-friendly-tw/` 的路徑，確認 GitHub Pages 子路徑上的資源可載入。
