# BAIX Web Chat Widget

可嵌入任何已授權客戶網站的 AI 客服聊天泡泡。所有客戶共用同一份前端程式與 Web Gateway，再由公開 Widget Key 安全路由至各自的 BAIX 帳戶與 Dify Adapter。

## 客戶安裝方式

將下面這段程式碼貼到網站的 `</body>` 前即可：

```html
<script
  src="https://base247.github.io/base247-widget/widget.js?v=1.0.6"
  data-widget-key="客戶專屬的_Widget_Key"
  async></script>
