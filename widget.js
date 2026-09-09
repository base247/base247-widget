(function () {
  "use strict";

  if (window.__BASE247_WIDGET_LOADED__) return;
  window.__BASE247_WIDGET_LOADED__ = true;

  const script = document.currentScript;
  const widgetKey = String(script?.getAttribute("data-widget-key") || "").trim();
  const requestedLocale = String(script?.getAttribute("data-locale") || "").trim();
  const rawApiBase = String(
    script?.getAttribute("data-api-base") || "https://tentacled-slug.pikapod.net/webhook"
  ).trim();

  if (!/^wgt_[a-f0-9]{32}$/i.test(widgetKey)) {
    console.error("Base247 Widget：data-widget-key 無效或不存在。");
    return;
  }

  let apiBase;
  try {
    const parsed = new URL(rawApiBase);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      throw new Error("API 必須使用 HTTPS");
    }
    apiBase = parsed.href.replace(/\/$/, "");
  } catch (error) {
    console.error("Base247 Widget：data-api-base 無效。", error);
    return;
  }

  const ENDPOINTS = {
    bootstrap: `${apiBase}/base247-widget-bootstrap`,
    send: `${apiBase}/base247-widget-send`,
    poll: `${apiBase}/base247-widget-poll`,
    lead: `${apiBase}/base247-widget-lead`
  };

  const MAX_IDLE_MS = 15 * 60 * 1000;
  const REQUEST_TIMEOUT_MS = 20 * 1000;
  const storageKey = `base247_widget_session:${widgetKey}`;

  const COPY = {
    "zh-TW": {
      closeLabel: "關閉聊天視窗",
      openLabel: "開啟聊天視窗",
      onlineLabel: "線上客服",
      loading: "正在連線…",
      sending: "正在送出…",
      processing: "正在整理回覆…",
      retry: "重新送出",
      failed: "送出失敗",
      reconnect: "工作階段已結束，重新開啟即可開始新對話。",
      idle: "已暫停更新，輸入訊息後會自動恢復。",
      contactTitle: "請留下聯絡方式",
      contactIntro: "客服將依照您留下的資料另外聯絡您。",
      nameLabel: "姓名（選填）",
      namePlaceholder: "怎麼稱呼您？",
      typeLabel: "聯絡方式",
      valueLabel: "帳號或聯絡資料",
      valuePlaceholder: "請輸入 Email、LINE ID 或電話",
      noteLabel: "補充說明（選填）",
      notePlaceholder: "方便聯絡的時間或其他說明",
      consentLabel: "我同意 Base247 將這些資料提供給客服聯絡使用。",
      submitLead: "送出聯絡資料",
      savingLead: "正在送出…",
      leadSaved: "資料已送出，客服將另外與您聯絡。",
      requiredContact: "請填寫聯絡資料並勾選同意。",
      optionEmail: "Email",
      optionLine: "LINE",
      optionPhone: "電話",
      optionWhatsApp: "WhatsApp",
      optionOther: "其他",
      networkError: "目前無法連線，請稍後再試。"
    },
    en: {
      closeLabel: "Close chat",
      openLabel: "Open chat",
      onlineLabel: "Online support",
      loading: "Connecting…",
      sending: "Sending…",
      processing: "Preparing a reply…",
      retry: "Try again",
      failed: "Not sent",
      reconnect: "This session has ended. Reopen the chat to start a new conversation.",
      idle: "Updates paused. Typing a message will resume them.",
      contactTitle: "Leave your contact details",
      contactIntro: "Our team will contact you separately using the details below.",
      nameLabel: "Name (optional)",
      namePlaceholder: "How should we address you?",
      typeLabel: "Contact method",
      valueLabel: "Contact details",
      valuePlaceholder: "Enter your email, LINE ID, or phone number",
      noteLabel: "Notes (optional)",
      notePlaceholder: "Best time to contact you or other details",
      consentLabel: "I agree that Base247 may share these details with support for contact purposes.",
      submitLead: "Send contact details",
      savingLead: "Sending…",
      leadSaved: "Your details were sent. Our team will contact you separately.",
      requiredContact: "Enter contact details and confirm your consent.",
      optionEmail: "Email",
      optionLine: "LINE",
      optionPhone: "Phone",
      optionWhatsApp: "WhatsApp",
      optionOther: "Other",
      networkError: "Unable to connect right now. Please try again shortly."
    },
    es: {
      closeLabel: "Cerrar chat",
      openLabel: "Abrir chat",
      onlineLabel: "Atención en línea",
      loading: "Conectando…",
      sending: "Enviando…",
      processing: "Preparando una respuesta…",
      retry: "Reintentar",
      failed: "No enviado",
      reconnect: "Esta sesión ha finalizado. Vuelve a abrir el chat para iniciar otra conversación.",
      idle: "Actualizaciones en pausa. Escribe un mensaje para reanudarlas.",
      contactTitle: "Déjanos tus datos de contacto",
      contactIntro: "Nuestro equipo se pondrá en contacto contigo por separado.",
      nameLabel: "Nombre (opcional)",
      namePlaceholder: "¿Cómo debemos llamarte?",
      typeLabel: "Método de contacto",
      valueLabel: "Datos de contacto",
      valuePlaceholder: "Introduce tu email, LINE ID o teléfono",
      noteLabel: "Notas (opcional)",
      notePlaceholder: "Mejor horario u otra información",
      consentLabel: "Acepto que Base247 comparta estos datos con soporte para contactarme.",
      submitLead: "Enviar datos",
      savingLead: "Enviando…",
      leadSaved: "Tus datos se enviaron. Nuestro equipo se pondrá en contacto contigo.",
      requiredContact: "Introduce tus datos y confirma el consentimiento.",
      optionEmail: "Email",
      optionLine: "LINE",
      optionPhone: "Teléfono",
      optionWhatsApp: "WhatsApp",
      optionOther: "Otro",
      networkError: "No se puede conectar ahora. Inténtalo de nuevo en unos instantes."
    }
  };

  const state = {
    visitorId: "",
    sessionToken: "",
    expiresAt: "",
    config: null,
    locale: "zh-TW",
    copy: COPY["zh-TW"],
    isOpen: false,
    isReady: false,
    isSending: false,
    isPolling: false,
    isRenewing: false,
    leadSubmitted: false,
    showContactForm: false,
    serverMessages: [],
    pendingMessages: new Map(),
    renderedAssistantIds: new Set(),
    unreadCount: 0,
    lastActivityAt: Date.now(),
    pollTimer: null,
    pollGeneration: 0,
    elements: null
  };

  function safeSessionGet() {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function safeSessionSet(value) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Some privacy modes disable sessionStorage. The in-memory session still works.
    }
  }

  function safeSessionRemove() {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore storage restrictions.
    }
  }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return Array.from(bytes, (byte, index) => {
      const value = byte.toString(16).padStart(2, "0");
      return [4, 6, 8, 10].includes(index) ? `-${value}` : value;
    }).join("");
  }

  function normalizeLocale(value) {
    const locale = String(value || "").toLowerCase();
    if (locale.startsWith("zh")) return "zh-TW";
    if (locale.startsWith("es")) return "es";
    return "en";
  }

  function getReadableTextColor(hex) {
    const match = /^#([a-f0-9]{6})$/i.exec(String(hex || ""));
    if (!match) return "#ffffff";
    const number = Number.parseInt(match[1], 16);
    const r = (number >> 16) & 255;
    const g = (number >> 8) & 255;
    const b = number & 255;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.62 ? "#111827" : "#ffffff";
  }

  class ApiError extends Error {
    constructor(message, status, code) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.code = code;
    }
  }

  async function fetchJson(url, options) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...options,
        cache: "no-store",
        credentials: "omit",
        signal: controller.signal
      });
      const text = await response.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new ApiError("INVALID_JSON_RESPONSE", response.status, "INVALID_JSON_RESPONSE");
        }
      }
      if (!response.ok || data.ok !== true) {
        const code = String(data.error || `HTTP_${response.status}`);
        throw new ApiError(code, response.status, code);
      }
      return data;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new ApiError("REQUEST_TIMEOUT", 0, "REQUEST_TIMEOUT");
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function postForm(url, values) {
    const body = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => body.set(key, String(value ?? "")));
    return fetchJson(url, { method: "POST", body });
  }

  function sessionIsUsable(saved) {
    if (!saved?.visitorId || !saved?.sessionToken || !saved?.expiresAt || !saved?.config) return false;
    return new Date(saved.expiresAt).getTime() > Date.now() + 30 * 1000;
  }

  async function bootstrap() {
    const saved = safeSessionGet();
    if (sessionIsUsable(saved)) {
      state.visitorId = saved.visitorId;
      state.sessionToken = saved.sessionToken;
      state.expiresAt = saved.expiresAt;
      state.config = saved.config;
      return;
    }

    safeSessionRemove();
    state.visitorId = uuid();
    const url = new URL(ENDPOINTS.bootstrap);
    url.searchParams.set("widget_key", widgetKey);
    url.searchParams.set("visitor_id", state.visitorId);
    const result = await fetchJson(url.href, { method: "GET" });

    state.sessionToken = String(result.session_token || "");
    state.expiresAt = String(result.expires_at || "");
    state.config = result.config || {};
    safeSessionSet({
      visitorId: state.visitorId,
      sessionToken: state.sessionToken,
      expiresAt: state.expiresAt,
      config: state.config
    });
  }

  function applyLocaleAndConfig() {
    state.locale = normalizeLocale(requestedLocale || state.config?.default_locale || "zh-TW");
    const serverCopy = state.config?.ui_texts?.[state.locale] || {};
    state.copy = { ...COPY[state.locale], ...serverCopy };
  }

  function buildWidget() {
    const host = document.createElement("div");
    host.id = "base247-widget-root";
    const shadow = host.attachShadow({ mode: "closed" });
    const position = state.config?.position === "left" ? "left" : "right";
    const primary = /^#[a-f0-9]{6}$/i.test(state.config?.primary_color || "")
      ? state.config.primary_color
      : "#2563eb";
    const onPrimary = getReadableTextColor(primary);

    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          --b247-primary: ${primary};
          --b247-on-primary: ${onPrimary};
          --b247-text: #172033;
          --b247-muted: #667085;
          --b247-border: #e7eaf0;
          --b247-surface: #ffffff;
          --b247-soft: #f4f6f9;
          --b247-danger: #b42318;
          --b247-success: #067647;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", Arial, sans-serif;
          color: var(--b247-text);
        }
        *, *::before, *::after { box-sizing: border-box; }
        button, input, textarea, select { font: inherit; }
        .wrap { position: fixed; z-index: 2147483000; bottom: max(20px, env(safe-area-inset-bottom)); ${position}: max(20px, env(safe-area-inset-${position})); }
        .launcher {
          position: relative; display: grid; place-items: center; width: 60px; height: 60px;
          padding: 0; border: 0; border-radius: 999px; color: #ffffff;
          background: #030408; cursor: pointer;
          box-shadow: 0 12px 32px rgba(16, 24, 40, .24); isolation: isolate;
          transition: transform .18s ease, box-shadow .18s ease;
        }
        .launcher-orb {
          position: absolute; inset: 0; overflow: hidden; border-radius: inherit;
          background: #030408; pointer-events: none; z-index: 0;
        }
        .launcher-orb::before, .launcher-orb::after {
          content: ""; position: absolute; pointer-events: none; border-radius: 50%;
        }
        .launcher-orb::before {
          inset: -38%;
          background: conic-gradient(from 0deg,
            rgba(3, 4, 8, .96) 0 9%,
            rgba(71, 140, 255, .92) 22%,
            rgba(10, 32, 76, .72) 38%,
            rgba(195, 59, 245, .9) 55%,
            rgba(43, 8, 64, .74) 72%,
            rgba(71, 140, 255, .72) 88%,
            rgba(3, 4, 8, .96) 100%);
          filter: blur(7px); opacity: .9;
          animation: b247-orb-spin 10s linear infinite;
        }
        .launcher-orb::after {
          inset: -24%;
          background:
            radial-gradient(circle at 28% 68%, rgba(71, 140, 255, .9) 0%, rgba(71, 140, 255, .2) 35%, transparent 62%),
            radial-gradient(circle at 72% 30%, rgba(195, 59, 245, .88) 0%, rgba(195, 59, 245, .18) 36%, transparent 64%);
          filter: blur(6px);
          animation: b247-orb-flow 6.4s ease-in-out infinite;
        }
        .launcher[aria-expanded="true"] .launcher-orb { filter: brightness(.72); }
        .launcher:hover { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(16, 24, 40, .28); }
        .launcher:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
          outline: 3px solid color-mix(in srgb, var(--b247-primary) 35%, white); outline-offset: 2px;
        }
        .badge {
          position: absolute; top: -3px; right: -3px; min-width: 21px; height: 21px; padding: 0 5px;
          display: none; place-items: center; border: 2px solid white; border-radius: 999px;
          background: #d92d20; color: white; font: 700 11px/1 Arial, sans-serif; z-index: 3;
        }
        .badge.visible { display: grid; }
        .panel {
          position: absolute; ${position}: 0; bottom: 76px; width: min(380px, calc(100vw - 32px)); height: min(620px, calc(100dvh - 120px));
          display: none; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden;
          border: 1px solid rgba(16, 24, 40, .08); border-radius: 20px; background: var(--b247-surface);
          box-shadow: 0 22px 70px rgba(16, 24, 40, .25); transform-origin: bottom ${position};
        }
        .panel.open { display: grid; animation: b247-in .18s ease-out; }
        @keyframes b247-in { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes b247-orb-spin { to { transform: rotate(360deg); } }
        @keyframes b247-orb-flow {
          0%, 100% { opacity: .48; transform: translate(-9%, 8%) scale(.94); }
          34% { opacity: .9; transform: translate(10%, -11%) scale(1.08); }
          68% { opacity: .62; transform: translate(7%, 10%) scale(1); }
        }
        .header { display: flex; align-items: flex-start; gap: 12px; padding: 16px; color: var(--b247-on-primary); background: var(--b247-primary); }
        .identity { min-width: 0; flex: 1; }
        .business { margin: 0; font-size: 16px; line-height: 1.35; font-weight: 750; overflow-wrap: anywhere; }
        .online { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 12px; opacity: .9; }
        .online::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: #6ce9a6; box-shadow: 0 0 0 3px rgba(108, 233, 166, .18); }
        .close { width: 34px; height: 34px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 10px; color: inherit; background: rgba(255,255,255,.14); cursor: pointer; }
        .close:hover { background: rgba(255,255,255,.23); }
        .close svg { width: 18px; height: 18px; stroke: currentColor; stroke-width: 2; fill: none; }
        .conversation { min-height: 0; overflow-y: auto; padding: 16px 14px 10px; overscroll-behavior: contain; background: linear-gradient(#fbfcfe, #fff); }
        .privacy { margin: 0 auto 14px; max-width: 290px; color: var(--b247-muted); font-size: 11px; line-height: 1.45; text-align: center; }
        .messages { display: flex; flex-direction: column; gap: 9px; }
        .message-row { display: flex; flex-direction: column; align-items: flex-start; }
        .message-row.user { align-items: flex-end; }
        .message {
          max-width: 84%; padding: 10px 12px; border-radius: 14px 14px 14px 4px;
          color: var(--b247-text); background: var(--b247-soft); font-size: 14px; line-height: 1.48;
          overflow-wrap: anywhere; white-space: pre-wrap;
        }
        .user .message { border-radius: 14px 14px 4px 14px; color: var(--b247-on-primary); background: var(--b247-primary); }
        .message.pending { opacity: .72; }
        .message.failed { border: 1px solid #fecdca; color: var(--b247-danger); background: #fef3f2; opacity: 1; }
        .message-meta { display: flex; align-items: center; gap: 7px; margin-top: 4px; color: var(--b247-muted); font-size: 11px; }
        .retry { padding: 2px 7px; border: 0; border-radius: 8px; color: var(--b247-danger); background: #fee4e2; cursor: pointer; font-size: 11px; }
        .lead-card { display: none; margin-top: 14px; padding: 14px; border: 1px solid var(--b247-border); border-radius: 16px; background: white; box-shadow: 0 8px 24px rgba(16,24,40,.06); }
        .lead-card.visible { display: block; }
        .lead-title { margin: 0; font-size: 15px; font-weight: 750; }
        .lead-intro { margin: 5px 0 13px; color: var(--b247-muted); font-size: 12px; line-height: 1.45; }
        .field { display: grid; gap: 5px; margin-top: 10px; }
        .field label { color: #344054; font-size: 12px; font-weight: 650; }
        .field input, .field textarea, .field select {
          width: 100%; padding: 9px 10px; border: 1px solid #d0d5dd; border-radius: 10px;
          color: var(--b247-text); background: white; font-size: 13px; outline: none;
        }
        .field textarea { min-height: 64px; resize: vertical; }
        .consent { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; color: #475467; font-size: 11px; line-height: 1.45; }
        .consent input { width: 16px; height: 16px; margin: 0; accent-color: var(--b247-primary); flex: 0 0 auto; }
        .lead-submit { width: 100%; margin-top: 12px; padding: 10px 12px; border: 0; border-radius: 10px; color: var(--b247-on-primary); background: var(--b247-primary); cursor: pointer; font-size: 13px; font-weight: 700; }
        .lead-submit:disabled { cursor: wait; opacity: .65; }
        .footer { border-top: 1px solid var(--b247-border); background: white; }
        .status { min-height: 20px; padding: 5px 13px 0; color: var(--b247-muted); font-size: 11px; line-height: 1.35; }
        .status.error { color: var(--b247-danger); }
        .status.success { color: var(--b247-success); }
        .composer { display: flex; align-items: flex-end; gap: 8px; padding: 8px 10px 11px; }
        .input {
          min-width: 0; max-height: 110px; flex: 1; resize: none; overflow-y: auto;
          padding: 10px 11px; border: 1px solid #d0d5dd; border-radius: 12px;
          color: var(--b247-text); background: white; font-size: 14px; line-height: 1.4; outline: none;
        }
        .input:disabled { background: #f9fafb; }
        .send { min-width: 62px; height: 42px; padding: 0 12px; border: 0; border-radius: 12px; color: var(--b247-on-primary); background: var(--b247-primary); cursor: pointer; font-size: 13px; font-weight: 750; }
        .send:disabled { cursor: not-allowed; opacity: .55; }
        @media (max-width: 480px) {
          .wrap { left: 12px; right: 12px; bottom: max(12px, env(safe-area-inset-bottom)); }
          .launcher { position: absolute; right: 0; bottom: 0; }
          .panel { position: fixed; left: 10px; right: 10px; bottom: max(82px, calc(env(safe-area-inset-bottom) + 76px)); width: auto; height: min(72dvh, 620px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .launcher, .panel { transition: none; animation: none; }
          .launcher-orb::before, .launcher-orb::after { animation: none; opacity: .65; transform: none; }
        }
      </style>
      <div class="wrap">
        <section class="panel" role="dialog" aria-modal="false" aria-labelledby="b247-business">
          <header class="header">
            <div class="identity">
              <h2 class="business" id="b247-business"></h2>
              <div class="online"></div>
            </div>
            <button class="close" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </header>
          <main class="conversation">
            <p class="privacy"></p>
            <div class="messages" role="log" aria-live="polite" aria-relevant="additions"></div>
            <form class="lead-card" novalidate>
              <h3 class="lead-title"></h3>
              <p class="lead-intro"></p>
              <div class="field"><label for="b247-name"></label><input id="b247-name" name="name" maxlength="120" autocomplete="name"></div>
              <div class="field"><label for="b247-type"></label><select id="b247-type" name="contact_type"></select></div>
              <div class="field"><label for="b247-value"></label><input id="b247-value" name="contact_value" maxlength="320" required autocomplete="email"></div>
              <div class="field"><label for="b247-note"></label><textarea id="b247-note" name="note" maxlength="2000"></textarea></div>
              <label class="consent"><input name="consent" type="checkbox" required><span></span></label>
              <button class="lead-submit" type="submit"></button>
            </form>
          </main>
          <footer class="footer">
            <div class="status" role="status" aria-live="polite"></div>
            <div class="composer">
              <textarea class="input" rows="1" maxlength="4000"></textarea>
              <button class="send" type="button"></button>
            </div>
          </footer>
        </section>
        <button class="launcher" type="button">
          <span class="launcher-orb" aria-hidden="true"></span>
          <span class="badge" aria-hidden="true"></span>
        </button>
      </div>
    `;

    document.body.appendChild(host);

    const elements = {
      host,
      panel: shadow.querySelector(".panel"),
      launcher: shadow.querySelector(".launcher"),
      badge: shadow.querySelector(".badge"),
      close: shadow.querySelector(".close"),
      business: shadow.querySelector(".business"),
      online: shadow.querySelector(".online"),
      privacy: shadow.querySelector(".privacy"),
      messages: shadow.querySelector(".messages"),
      conversation: shadow.querySelector(".conversation"),
      status: shadow.querySelector(".status"),
      input: shadow.querySelector(".input"),
      send: shadow.querySelector(".send"),
      leadForm: shadow.querySelector(".lead-card"),
      leadTitle: shadow.querySelector(".lead-title"),
      leadIntro: shadow.querySelector(".lead-intro"),
      leadNameLabel: shadow.querySelector('label[for="b247-name"]'),
      leadName: shadow.querySelector("#b247-name"),
      leadTypeLabel: shadow.querySelector('label[for="b247-type"]'),
      leadType: shadow.querySelector("#b247-type"),
      leadValueLabel: shadow.querySelector('label[for="b247-value"]'),
      leadValue: shadow.querySelector("#b247-value"),
      leadNoteLabel: shadow.querySelector('label[for="b247-note"]'),
      leadNote: shadow.querySelector("#b247-note"),
      leadConsent: shadow.querySelector('input[name="consent"]'),
      leadConsentText: shadow.querySelector(".consent span"),
      leadSubmit: shadow.querySelector(".lead-submit")
    };
    state.elements = elements;

    elements.business.textContent = state.config?.business_name || "Base247";
    elements.online.textContent = state.copy.onlineLabel;
    elements.privacy.textContent = state.copy.privacyNotice || "";
    elements.input.placeholder = state.copy.inputPlaceholder || "";
    elements.send.textContent = state.copy.sendLabel || "Send";
    elements.launcher.setAttribute("aria-label", state.copy.openLabel);
    elements.launcher.setAttribute("aria-expanded", "false");
    elements.close.setAttribute("aria-label", state.copy.closeLabel);
    elements.leadTitle.textContent = state.copy.contactTitle;
    elements.leadIntro.textContent = state.copy.contactIntro;
    elements.leadNameLabel.textContent = state.copy.nameLabel;
    elements.leadName.placeholder = state.copy.namePlaceholder;
    elements.leadTypeLabel.textContent = state.copy.typeLabel;
    elements.leadValueLabel.textContent = state.copy.valueLabel;
    elements.leadValue.placeholder = state.copy.valuePlaceholder;
    elements.leadNoteLabel.textContent = state.copy.noteLabel;
    elements.leadNote.placeholder = state.copy.notePlaceholder;
    elements.leadConsentText.textContent = state.copy.consentLabel;
    elements.leadSubmit.textContent = state.copy.submitLead;

    [
      ["email", state.copy.optionEmail],
      ["line", state.copy.optionLine],
      ["phone", state.copy.optionPhone],
      ["whatsapp", state.copy.optionWhatsApp],
      ["other", state.copy.optionOther]
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      elements.leadType.appendChild(option);
    });

    bindEvents();
    renderMessages();
    state.isReady = true;
  }

  function bindEvents() {
    const el = state.elements;
    el.launcher.addEventListener("click", () => setOpen(!state.isOpen));
    el.close.addEventListener("click", () => setOpen(false));
    el.send.addEventListener("click", () => sendMessage());
    el.input.addEventListener("input", () => {
      state.lastActivityAt = Date.now();
      autoSizeInput();
      updateComposer();
      if (state.isOpen && !state.pollTimer && !state.isPolling) startPolling();
    });
    el.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        sendMessage();
      }
    });
    el.leadForm.addEventListener("submit", submitLead);
    el.leadType.addEventListener("change", updateContactAutocomplete);
    el.messages.addEventListener("click", (event) => {
      const button = event.target.closest("[data-retry-id]");
      if (button) retryMessage(button.getAttribute("data-retry-id"));
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopPolling();
      else if (state.isOpen) startPolling();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.isOpen) setOpen(false);
    });
  }

  function setOpen(open) {
    state.isOpen = open;
    const el = state.elements;
    el.panel.classList.toggle("open", open);
    el.launcher.setAttribute("aria-expanded", String(open));
    el.launcher.setAttribute("aria-label", open ? state.copy.closeLabel : state.copy.openLabel);
    if (open) {
      state.unreadCount = 0;
      updateBadge();
      state.lastActivityAt = Date.now();
      window.setTimeout(() => el.input.focus(), 50);
      startPolling();
    } else {
      stopPolling();
      el.launcher.focus();
    }
  }

  function autoSizeInput() {
    const input = state.elements.input;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
  }

  function updateComposer() {
    const disabled = !state.isReady || !state.sessionToken || state.isSending || state.isRenewing || state.showContactForm || state.leadSubmitted;
    state.elements.input.disabled = disabled;
    state.elements.send.disabled = disabled || !state.elements.input.value.trim();
  }

  function setStatus(message, tone) {
    const status = state.elements.status;
    status.textContent = message || "";
    status.className = `status${tone ? ` ${tone}` : ""}`;
  }

  function updateBadge() {
    const badge = state.elements.badge;
    badge.textContent = state.unreadCount > 9 ? "9+" : String(state.unreadCount || "");
    badge.classList.toggle("visible", state.unreadCount > 0 && !state.isOpen);
  }

  function renderMessages() {
    const container = state.elements?.messages;
    if (!container) return;
    container.replaceChildren();

    const welcome = document.createElement("div");
    welcome.className = "message-row assistant";
    const welcomeBubble = document.createElement("div");
    welcomeBubble.className = "message";
    welcomeBubble.textContent = state.copy.welcomeText || "";
    welcome.appendChild(welcomeBubble);
    container.appendChild(welcome);

    state.serverMessages.forEach((message) => {
      if (!message || !["user", "assistant"].includes(message.sender_type)) return;
      appendMessageNode(container, message.content, message.sender_type, "sent", null);
    });

    state.pendingMessages.forEach((pending) => {
      appendMessageNode(container, pending.text, "user", pending.status, pending.id);
    });

    state.elements.leadForm.classList.toggle("visible", state.showContactForm && !state.leadSubmitted);
    updateComposer();
    window.requestAnimationFrame(() => {
      state.elements.conversation.scrollTop = state.elements.conversation.scrollHeight;
    });
  }

  function appendMessageNode(container, text, sender, status, retryId) {
    const row = document.createElement("div");
    row.className = `message-row ${sender}`;
    const bubble = document.createElement("div");
    bubble.className = `message${status === "sending" ? " pending" : ""}${status === "failed" ? " failed" : ""}`;
    bubble.textContent = String(text || "");
    row.appendChild(bubble);

    if (status === "sending" || status === "failed") {
      const meta = document.createElement("div");
      meta.className = "message-meta";
      const label = document.createElement("span");
      label.textContent = status === "sending" ? state.copy.sending : state.copy.failed;
      meta.appendChild(label);
      if (status === "failed" && retryId) {
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "retry";
        retry.textContent = state.copy.retry;
        retry.setAttribute("data-retry-id", retryId);
        meta.appendChild(retry);
      }
      row.appendChild(meta);
    }
    container.appendChild(row);
  }

  async function sendMessage(existingId) {
    if (state.isSending || state.showContactForm || state.leadSubmitted) return;
    const existing = existingId ? state.pendingMessages.get(existingId) : null;
    const text = String(existing?.text || state.elements.input.value).trim();
    if (!text) return;

    const id = existingId || uuid();
    state.pendingMessages.set(id, { id, text, status: "sending" });
    if (!existingId) {
      state.elements.input.value = "";
      autoSizeInput();
    }
    state.isSending = true;
    state.lastActivityAt = Date.now();
    setStatus(state.copy.sending);
    renderMessages();

    try {
      await postForm(ENDPOINTS.send, {
        session_token: state.sessionToken,
        client_message_id: id,
        content: text
      });
      setStatus(state.copy.processing);
      schedulePoll(400);
    } catch (error) {
      const pending = state.pendingMessages.get(id);
      if (pending) pending.status = "failed";
      setStatus(error?.status === 401 ? state.copy.reconnect : (state.copy.errorText || state.copy.networkError), "error");
      if (error?.status === 401) renewSession();
    } finally {
      state.isSending = false;
      renderMessages();
    }
  }

  function retryMessage(id) {
    const pending = state.pendingMessages.get(id);
    if (!pending) return;
    pending.status = "sending";
    sendMessage(id);
  }

  function startPolling() {
    if (!state.isOpen || document.hidden || state.isPolling || state.pollTimer) return;
    state.pollGeneration += 1;
    schedulePoll(0, state.pollGeneration);
  }

  function stopPolling() {
    state.pollGeneration += 1;
    if (state.pollTimer) window.clearTimeout(state.pollTimer);
    state.pollTimer = null;
  }

  function schedulePoll(delay, generation = state.pollGeneration) {
    if (!state.isOpen || document.hidden) return;
    if (state.pollTimer) window.clearTimeout(state.pollTimer);
    state.pollTimer = window.setTimeout(() => {
      state.pollTimer = null;
      pollMessages(generation);
    }, delay);
  }

  async function pollMessages(generation) {
    if (!state.isOpen || document.hidden || state.isPolling || generation !== state.pollGeneration) return;
    if (Date.now() - state.lastActivityAt > MAX_IDLE_MS) {
      setStatus(state.copy.idle);
      stopPolling();
      return;
    }

    state.isPolling = true;
    let nextDelay = 4500;
    try {
      const data = await postForm(ENDPOINTS.poll, { session_token: state.sessionToken });
      if (generation !== state.pollGeneration) return;

      const previousAssistantIds = new Set(
        state.serverMessages.filter((item) => item.sender_type === "assistant").map((item) => String(item.id))
      );
      state.serverMessages = Array.isArray(data.messages)
        ? data.messages
            .filter((item) => item && ["user", "assistant"].includes(item.sender_type))
            .slice()
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        : [];

      for (const [id, pending] of state.pendingMessages) {
        const existsOnServer = state.serverMessages.some(
          (item) => item.sender_type === "user" && String(item.content) === pending.text
        );
        if (existsOnServer) state.pendingMessages.delete(id);
      }

      if (data.request_status === "failed" && data.client_message_id) {
        const failed = state.pendingMessages.get(String(data.client_message_id));
        if (failed) failed.status = "failed";
        setStatus(state.copy.errorText || state.copy.networkError, "error");
      } else if (data.request_status === "processing") {
        setStatus(state.copy.processing);
        nextDelay = 1400;
      } else {
        setStatus("");
      }

      state.leadSubmitted = data.lead_submitted === true;
      state.showContactForm = data.show_contact_form === true && !state.leadSubmitted;

      const newAssistantCount = state.serverMessages.filter(
        (item) => item.sender_type === "assistant" && !previousAssistantIds.has(String(item.id))
      ).length;
      if (!state.isOpen && newAssistantCount > 0) {
        state.unreadCount += newAssistantCount;
        updateBadge();
      }
      renderMessages();
    } catch (error) {
      if (generation !== state.pollGeneration) return;
      if (error?.status === 401) {
        setStatus(state.copy.reconnect, "error");
        renewSession();
        return;
      }
      setStatus(state.copy.networkError, "error");
      nextDelay = 8000;
    } finally {
      state.isPolling = false;
      if (generation === state.pollGeneration && state.isOpen) schedulePoll(nextDelay, generation);
    }
  }

  async function renewSession() {
    if (state.isRenewing) return;
    state.isRenewing = true;
    safeSessionRemove();
    state.sessionToken = "";
    stopPolling();
    state.serverMessages = [];
    state.pendingMessages.clear();
    state.leadSubmitted = false;
    state.showContactForm = false;
    renderMessages();
    updateComposer();
    try {
      await bootstrap();
      setStatus(state.copy.reconnect);
      if (state.isOpen) startPolling();
    } catch {
      setStatus(state.copy.networkError, "error");
    } finally {
      state.isRenewing = false;
      updateComposer();
    }
  }

  function updateContactAutocomplete() {
    const type = state.elements.leadType.value;
    state.elements.leadValue.autocomplete = type === "email" ? "email" : type === "phone" || type === "whatsapp" ? "tel" : "off";
  }

  async function submitLead(event) {
    event.preventDefault();
    const el = state.elements;
    const contactValue = el.leadValue.value.trim();
    if (!contactValue || !el.leadConsent.checked) {
      setStatus(state.copy.requiredContact, "error");
      return;
    }

    el.leadSubmit.disabled = true;
    el.leadSubmit.textContent = state.copy.savingLead;
    try {
      await postForm(ENDPOINTS.lead, {
        session_token: state.sessionToken,
        name: el.leadName.value.trim(),
        contact_type: el.leadType.value,
        contact_value: contactValue,
        note: el.leadNote.value.trim(),
        consent: true
      });
      state.leadSubmitted = true;
      state.showContactForm = false;
      el.leadForm.reset();
      setStatus(state.copy.leadSaved, "success");
      renderMessages();
    } catch (error) {
      setStatus(error?.status === 401 ? state.copy.reconnect : (state.copy.errorText || state.copy.networkError), "error");
      if (error?.status === 401) renewSession();
    } finally {
      el.leadSubmit.disabled = false;
      el.leadSubmit.textContent = state.copy.submitLead;
    }
  }

  async function init() {
    try {
      await bootstrap();
      applyLocaleAndConfig();
      if (document.readyState === "loading") {
        await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
      }
      buildWidget();
    } catch (error) {
      window.__BASE247_WIDGET_LOADED__ = false;
      console.error("Base247 Widget：初始化失敗。", error);
    }
  }

  init();
})();
