# Base247 Web Chat Widget

可嵌入任何已授權客戶網站的 AI 客服聊天泡泡。所有客戶共用同一份前端程式與 Web Gateway，再由公開 Widget Key 安全路由至各自的 Base247 帳戶與 Dify Adapter。

## 客戶安裝方式

將下面一段程式碼貼到網站的 `</body>` 前即可：

```html
<script
  src="https://base247.github.io/base247-widget/widget.js?v=1.0.0"
  data-widget-key="客戶專屬的_Widget_Key"
  async></script>
```

客戶不需要設定 Supabase、n8n、Dify 或任何密鑰。

## Base247 上線前設定

1. 使用 `base247_create_web_widget()` 建立 Widget。
2. 將客戶正式網站的完整 Origin 加入 `web_widget_origins`，例如 `https://www.example.com`。
3. 在 `channel_identities` 建立 `platform = 'web'`、`external_id = Widget Key` 的客戶對應。
4. 先從客戶的 HTTPS 網站驗證 Bootstrap、Send、Poll 與聯絡資料表單。

## 選用參數

```html
<script
  src="https://base247.github.io/base247-widget/widget.js?v=1.0.0"
  data-widget-key="wgt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  data-locale="zh-TW"
  async></script>
```

`data-locale` 支援 `zh-TW`、`en`、`es`。若省略，使用 Widget 後台設定的預設語言。

## 測試頁

正式測試網址：

`https://base247.github.io/base247-widget/test.html`

不要直接雙擊電腦裡的 HTML 檔。`file://` 頁面的 Origin 通常為 `null`，會被網域白名單拒絕。

## 安全原則

- Widget Key 是公開識別碼，不是密碼。
- 前端不得包含 Supabase Service Role、Dify API Key、n8n Credential 或平台 Token。
- Session Token 只保存在目前分頁的 `sessionStorage`，最長兩小時。
- 關閉分頁後，不讓下一位使用同一台電腦的人看到先前對話。
- 所有訪客文字都使用 `textContent` 顯示，不把訪客輸入當成 HTML。
- 真人需求只顯示聯絡資料表單；客服在瀏覽器外另外聯絡。
- 不修改或複製 `Base247 - Shared Core Processor - Usage Protected`。

## 目前部署說明

測試階段由 GitHub Pages 提供 `widget.js`，API 暫時連至 Base247 的 n8n Production Webhook。正式對外銷售前，建議把靜態檔與 API 入口移到 Base247 自有穩定網域，例如 `widget.base247.co`。
