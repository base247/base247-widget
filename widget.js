(function () {
  // ===== 設定區 =====
  const CONFIG = {
    webhookUrl: "https://hook.eu1.make.com/swl4n3nkrvebavbtjr5v4ns8wrwfengm",
    pollIntervalMs: 4000,
    welcomeText: "您好!有什麼我可以幫忙的嗎?",
    privacyNotice: "此對話可能會被記錄以提供更好的服務"
  };

  // 從 <script> 標籤讀取這個客戶專屬的 Widget Key 和顏色(每個客戶的嵌入碼不一樣,但程式碼是同一份)
  const currentScript = document.currentScript;
  const widgetKey = currentScript.getAttribute("data-widget-key");
  const primaryColor = currentScript.getAttribute("data-color") || "#2563eb"; // 沒填 data-color 就用預設藍色
  if (!widgetKey) {
    console.error("Base247 Widget: 找不到 data-widget-key,請檢查嵌入碼設定");
    return;
  }

  // ===== 產生本次瀏覽的匿名訪客 ID(用 sessionStorage,關閉分頁就失效) =====
  function getVisitorId() {
    let id = sessionStorage.getItem("base247_visitor_id");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("base247_visitor_id", id);
    }
    return id;
  }
  const visitorId = getVisitorId();

  // ===== 建立聊天泡泡 UI =====
  const bubble = document.createElement("div");
  bubble.innerHTML = "💬";
  Object.assign(bubble.style, {
    position: "fixed", bottom: "20px", right: "20px",
    width: "56px", height: "56px", borderRadius: "50%",
    background: primaryColor, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "24px", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    zIndex: 999999
  });
  document.body.appendChild(bubble);

  const panel = document.createElement("div");
  Object.assign(panel.style, {
    position: "fixed", bottom: "88px", right: "20px",
    width: "320px", height: "420px", background: "#fff",
    borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    display: "none", flexDirection: "column", overflow: "hidden",
    zIndex: 999999, fontFamily: "sans-serif"
  });
  panel.innerHTML = `
    <div style="background:${primaryColor};color:#fff;padding:12px;font-size:14px;">
      ${CONFIG.welcomeText}
      <div style="font-size:11px;opacity:0.85;margin-top:4px;">${CONFIG.privacyNotice}</div>
    </div>
    <div id="b247-messages" style="flex:1;overflow-y:auto;padding:10px;font-size:14px;"></div>
    <div style="display:flex;border-top:1px solid #eee;">
      <input id="b247-input" type="text" placeholder="輸入訊息..." style="flex:1;border:none;padding:10px;font-size:14px;outline:none;">
      <button id="b247-send" style="border:none;background:${primaryColor};color:#fff;padding:0 16px;cursor:pointer;">送出</button>
    </div>
  `;
  document.body.appendChild(panel);

  bubble.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = panel.style.display === "flex";
    panel.style.display = isOpen ? "none" : "flex";
    if (isOpen) { stopPolling(); } else { startPolling(); }
  });

  // 點聊天視窗以外的地方,自動關閉視窗
  document.addEventListener("click", (e) => {
    if (panel.style.display === "flex" && !panel.contains(e.target) && !bubble.contains(e.target)) {
      panel.style.display = "none";
      stopPolling();
    }
  });
  panel.addEventListener("click", (e) => e.stopPropagation()); // 點視窗「裡面」不要被判定成點外面

  // ===== 送出訊息 =====
  const inputEl = panel.querySelector("#b247-input");
  const sendBtn = panel.querySelector("#b247-send");
  const messagesEl = panel.querySelector("#b247-messages");

  function appendMessage(text, fromUser) {
    const msg = document.createElement("div");
    msg.textContent = text;
    Object.assign(msg.style, {
      margin: "6px 0", padding: "8px 10px", borderRadius: "8px",
      maxWidth: "80%", fontSize: "13px",
      background: fromUser ? primaryColor : "#f1f1f1",
      color: fromUser ? "#fff" : "#333",
      marginLeft: fromUser ? "auto" : "0"
    });
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    appendMessage(text, true);
    inputEl.value = ""; // 送出後立刻清空輸入框
    try {
      await fetch(CONFIG.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", widget_key: widgetKey, visitor_id: visitorId, text: text })
      });
    } catch (e) {
      console.error("Base247 Widget: 送出訊息失敗", e);
    }
  }
  sendBtn.addEventListener("click", sendMessage);

  // 用中文/日文等輸入法打字時,按 Enter 常常是「確認選字」而不是「送出」,
  // 這裡用 isComposing 判斷,選字過程中的 Enter 不會誤觸發送出
  let isComposing = false;
  inputEl.addEventListener("compositionstart", () => { isComposing = true; });
  inputEl.addEventListener("compositionend", () => { isComposing = false; });
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !isComposing) {
      e.preventDefault();
      sendMessage();
    }
  });

  // ===== 輪詢抓新訊息 =====
  let knownMessageCount = 0;
  let lastActivity = Date.now();
  inputEl.addEventListener("input", () => { lastActivity = Date.now(); });
  sendBtn.addEventListener("click", () => { lastActivity = Date.now(); });

  async function pollMessages() {
    if (Date.now() - lastActivity > 15 * 60 * 1000) { // 超過15分鐘沒有任何互動,自動停止
      stopPolling();
      return;
    }
    try {
      const res = await fetch(CONFIG.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "poll", widget_key: widgetKey, visitor_id: visitorId })
      });
      const data = await res.json();
      let messages = data.messages || [];
      // Make 那邊沒有排序,這裡自己依 created_at 由舊到新排一次
      messages = messages.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      if (messages.length > knownMessageCount) {
        // 只顯示新增的訊息,避免重複渲染(這裡先簡化處理,之後可依實際回傳格式優化)
        for (let i = knownMessageCount; i < messages.length; i++) {
          if (messages[i].sender_type === "assistant") {
            appendMessage(messages[i].content, false);
          }
        }
        knownMessageCount = messages.length;
      }
    } catch (e) {
      console.error("Base247 Widget: 輪詢訊息失敗", e);
    }
  }
  let pollTimer = null;
  function startPolling() {
    if (pollTimer) return; // 已經在跑就不要重複開
    pollTimer = setInterval(pollMessages, CONFIG.pollIntervalMs);
  }
  function stopPolling() {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopPolling(); // 分頁不在前景(切走、縮到背景),立刻停止輪詢
    } else if (panel.style.display === "flex") {
      startPolling(); // 切回來,而且聊天視窗本來是開著的,才恢復輪詢
    }
  });
})();
