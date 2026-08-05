# 本機報價單管理系統

以 React + Tailwind CSS（shadcn 風格元件）製作的報價單管理工具。本機以 `server.js` 儲存資料，部署到 Vercel 後則使用 Vercel Blob 持久保存。

## 啟動

請先安裝 Node.js 20 以上版本，於專案資料夾執行：

```powershell
npm.cmd install
npm.cmd run dev
```

執行後會自動開啟 `http://127.0.0.1:5173`。本機資料會寫入 `data/app-data.json`（已列入 Git 忽略清單）。

## 部署到 Vercel

1. 將專案推送至 GitHub，並在 Vercel 匯入該 repository。
2. 到專案的 **Storage** 建立並連接一個 **Private Blob** store；Vercel 會自動設定 `BLOB_READ_WRITE_TOKEN`。
3. 設定 Build Command 為 `pnpm build`、Output Directory 為 `dist`，然後部署。
4. 在 Vercel 的 Deployment Protection 啟用存取保護；目前系統尚未有使用者登入，這一步可避免陌生人讀寫報價與客戶資料。

## 功能

- 供應商、客戶資料與可增刪的報價品項
- 小計、折扣、稅金、訂金與尾款的即時計算
- 報價歷史清單、客戶與類別資料都儲存在使用者選擇的本機 JSON 檔
- 適合 A4 的列印版面
