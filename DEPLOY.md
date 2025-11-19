# 部署指南

## 已完成的設定 ✅

1. ✅ Vite 配置已更新（base: '/family-friendly-tw/'）
2. ✅ GitHub Actions workflow 已建立（.github/workflows/deploy.yml）
3. ✅ README.md 已更新
4. ✅ Git commit 已完成

## 接下來的步驟

### 步驟 1：在 GitHub 建立 Repository

1. 前往：https://github.com/new
2. Repository name：`family-friendly-tw`
3. Description：親子友善台灣 - 展示台灣親子友善場所的互動式網站
4. 選擇 **Public**
5. **不要**勾選「Initialize this repository with a README」
6. 點擊「Create repository」

### 步驟 2：推送程式碼到 GitHub

在 Terminal 中執行以下指令：

```bash
cd /Users/howard/Desktop/family-friendly-tw

# 設定遠端 repository
git remote add origin https://github.com/fromlifetolines/family-friendly-tw.git

# 確認分支名稱為 main
git branch -M main

# 推送到 GitHub
git push -u origin main
```

### 步驟 3：啟用 GitHub Pages

1. 進入您的 repository：https://github.com/fromlifetolines/family-friendly-tw
2. 點擊「Settings」（設定）
3. 在左側選單找到「Pages」
4. 在「Source」選擇：**GitHub Actions**（不是 Deploy from a branch）
5. 儲存設定

### 步驟 4：等待部署完成

1. 推送程式碼後，GitHub Actions 會自動執行
2. 前往「Actions」標籤頁查看部署進度
3. 等待綠色勾勾出現（通常需要 1-2 分鐘）
4. 部署完成後，您的網站將可在以下網址訪問：

   **https://fromlifetolines.github.io/family-friendly-tw/**

## 後續更新

每次您修改程式碼並推送到 main 分支時：

```bash
git add .
git commit -m "更新說明"
git push
```

GitHub Actions 會自動重新建置和部署您的網站！

## 疑難排解

### 如果 GitHub Pages 沒有出現

1. 確認 repository 是 Public
2. 確認 Settings > Pages > Source 選擇了「GitHub Actions」
3. 檢查 Actions 標籤頁，確認 workflow 成功執行

### 如果網站顯示 404

1. 等待幾分鐘，GitHub Pages 需要時間部署
2. 確認 vite.config.ts 中的 base 路徑正確
3. 清除瀏覽器快取後重新整理

---

需要協助？請隨時詢問！
