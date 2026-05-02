/**
 * ChatWidget.jsx — Drop-in floating AI chat assistant component
 *
 * Features:
 *  • Floating bubble button fixed at bottom-right
 *  • Slide-up chat panel (400 × 500 px)
 *  • Token-by-token streaming responses
 *  • Animated typing indicator
 *  • Multi-turn conversation history sent to backend
 *  • No external UI libraries — plain React + inline styles
 *
 * Usage:
 *   import ChatWidget from './components/ChatWidget';
 *   // Then drop <ChatWidget /> anywhere in your app (e.g. App.jsx)
 *
 * Environment variable (optional):
 *   VITE_API_URL=http://localhost:8000
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
const API_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:8000";

const WELCOME_MESSAGE = {
  role: "assistant",
  content: `Hi! I'm [MY NAME]'s AI assistant. Ask me anything about their skills, experience, or projects!`,
};

// ── Colour tokens (works on both light and dark backgrounds) ──────────────────
const COLORS = {
  accent:        "#6C63FF",   // purple-blue
  accentHover:   "#574fd6",
  bg:            "#1a1a2e",   // deep navy panel
  surface:       "#16213e",   // slightly lighter panel header/footer
  border:        "rgba(108,99,255,0.25)",
  userBubble:    "#6C63FF",
  assistBubble:  "#2a2a4a",
  text:          "#e8e8f0",
  subText:       "#9898b8",
  inputBg:       "#0f0f23",
  shadow:        "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(108,99,255,0.2)",
  bubbleShadow:  "0 8px 32px rgba(108,99,255,0.45)",
};

// ── Inline Styles ─────────────────────────────────────────────────────────────

const s = {
  /* Floating bubble button */
  bubble: (open) => ({
    position:        "fixed",
    bottom:          "28px",
    right:           "28px",
    width:           "60px",
    height:          "60px",
    borderRadius:    "50%",
    background:      `linear-gradient(135deg, ${COLORS.accent}, #a78bfa)`,
    border:          "none",
    cursor:          "pointer",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    zIndex:          9999,
    boxShadow:       COLORS.bubbleShadow,
    transform:       open ? "scale(0.92)" : "scale(1)",
    transition:      "transform 0.2s ease, box-shadow 0.2s ease",
  }),

  /* Chat panel */
  panel: (open) => ({
    position:        "fixed",
    bottom:          "104px",
    right:           "28px",
    width:           "400px",
    height:          "500px",
    borderRadius:    "20px",
    background:      COLORS.bg,
    border:          `1px solid ${COLORS.border}`,
    boxShadow:       COLORS.shadow,
    display:         "flex",
    flexDirection:   "column",
    overflow:        "hidden",
    zIndex:          9998,
    opacity:         open ? 1 : 0,
    transform:       open ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)",
    pointerEvents:   open ? "all" : "none",
    transition:      "opacity 0.28s ease, transform 0.28s ease",
  }),

  /* Header */
  header: {
    background:      `linear-gradient(135deg, ${COLORS.surface}, #0f0f23)`,
    borderBottom:    `1px solid ${COLORS.border}`,
    padding:         "16px 18px",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "space-between",
    flexShrink:      0,
  },

  headerLeft: {
    display:    "flex",
    alignItems: "center",
    gap:        "10px",
  },

  avatar: {
    width:        "36px",
    height:       "36px",
    borderRadius: "50%",
    background:   `linear-gradient(135deg, ${COLORS.accent}, #a78bfa)`,
    display:      "flex",
    alignItems:   "center",
    justifyContent: "center",
    fontSize:     "18px",
    flexShrink:   0,
  },

  headerTitle: {
    color:      COLORS.text,
    fontWeight: 700,
    fontSize:   "15px",
    margin:     0,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },

  headerSub: {
    color:      COLORS.subText,
    fontSize:   "11px",
    margin:     0,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },

  closeBtn: {
    background:  "transparent",
    border:      "none",
    color:       COLORS.subText,
    cursor:      "pointer",
    fontSize:    "20px",
    lineHeight:  1,
    padding:     "4px 6px",
    borderRadius: "6px",
    transition:  "color 0.15s",
  },

  /* Messages area */
  messages: {
    flex:      1,
    overflowY: "auto",
    padding:   "16px 14px",
    display:   "flex",
    flexDirection: "column",
    gap:       "10px",
    scrollbarWidth: "thin",
    scrollbarColor: `${COLORS.accent}44 transparent`,
  },

  /* Individual message bubble */
  msgRow: (role) => ({
    display:        "flex",
    justifyContent: role === "user" ? "flex-end" : "flex-start",
    alignItems:     "flex-end",
    gap:            "8px",
  }),

  bubble: (role) => ({
    maxWidth:     "80%",
    padding:      "10px 14px",
    borderRadius: role === "user"
      ? "18px 18px 4px 18px"
      : "18px 18px 18px 4px",
    background:   role === "user" ? COLORS.userBubble : COLORS.assistBubble,
    color:        COLORS.text,
    fontSize:     "13.5px",
    lineHeight:   "1.55",
    fontFamily:   "'Inter', 'Segoe UI', sans-serif",
    whiteSpace:   "pre-wrap",
    wordBreak:    "break-word",
    boxShadow:    role === "user"
      ? "0 2px 12px rgba(108,99,255,0.3)"
      : "0 2px 8px rgba(0,0,0,0.3)",
  }),

  /* Typing dots */
  typingDots: {
    display:    "flex",
    gap:        "5px",
    padding:    "12px 14px",
    background: COLORS.assistBubble,
    borderRadius: "18px 18px 18px 4px",
    alignItems: "center",
  },

  dot: (i) => ({
    width:        "7px",
    height:       "7px",
    borderRadius: "50%",
    background:   COLORS.accent,
    animation:    `chatDotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
  }),

  /* Input row */
  inputRow: {
    display:     "flex",
    gap:         "8px",
    padding:     "12px 14px",
    borderTop:   `1px solid ${COLORS.border}`,
    background:  COLORS.surface,
    flexShrink:  0,
    alignItems:  "flex-end",
  },

  textarea: {
    flex:        1,
    background:  COLORS.inputBg,
    border:      `1px solid ${COLORS.border}`,
    borderRadius: "12px",
    padding:     "10px 14px",
    color:       COLORS.text,
    fontSize:    "13.5px",
    fontFamily:  "'Inter', 'Segoe UI', sans-serif",
    resize:      "none",
    outline:     "none",
    minHeight:   "40px",
    maxHeight:   "100px",
    lineHeight:  "1.5",
    transition:  "border-color 0.2s",
  },

  sendBtn: (disabled) => ({
    width:        "40px",
    height:       "40px",
    borderRadius: "12px",
    background:   disabled
      ? "rgba(108,99,255,0.3)"
      : `linear-gradient(135deg, ${COLORS.accent}, #a78bfa)`,
    border:       "none",
    cursor:       disabled ? "not-allowed" : "pointer",
    display:      "flex",
    alignItems:   "center",
    justifyContent: "center",
    flexShrink:   0,
    transition:   "background 0.2s, transform 0.1s",
    transform:    "scale(1)",
  }),
};

// ── Keyframe injection (done once) ────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes chatDotBounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
    40%            { transform: translateY(-6px); opacity: 1; }
  }
`;

function injectKeyframes() {
  if (document.getElementById("chat-widget-keyframes")) return;
  const style = document.createElement("style");
  style.id = "chat-widget-keyframes";
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
}

// ── Typing indicator component ────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={s.msgRow("assistant")}>
      <div style={s.typingDots}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={s.dot(i)} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatWidget() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);

  // Inject CSS keyframes on mount
  useEffect(() => { injectKeyframes(); }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 100) + "px";
    }
  };

  /**
   * Send the user's message to the backend and stream the response.
   * Updates the last assistant message in-place as tokens arrive.
   */
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Build history excluding the welcome message
    const history = messages
      .filter((m) => m.role !== "welcome")
      .map(({ role, content }) => ({ role, content }));

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: text, history }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Add an empty assistant message placeholder
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "" },
      ]);
      setLoading(false);

      // Stream response tokens into the last message
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role:    "assistant",
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch (err) {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role:    "assistant",
          content: `Sorry, I couldn't connect to the server. Please make sure the backend is running.\n\nError: ${err.message}`,
        },
      ]);
    }
  }, [input, loading, messages]);

  // Submit on Enter (Shift+Enter for new line)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const canSend = input.trim().length > 0 && !loading;

  return (
    <>
      {/* ── Chat panel ───────────────────────────────────────────────── */}
      <div style={s.panel(open)} role="dialog" aria-label="AI Chat Assistant">
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.avatar}>🤖</div>
            <div>
              <p style={s.headerTitle}>Jam's AI Assistant</p>
              <p style={s.headerSub}>Powered by Gemini · Ask me anything!</p>
            </div>
          </div>
          <button
            style={s.closeBtn}
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div style={s.messages} id="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} style={s.msgRow(msg.role)}>
              <div style={s.bubble(msg.role)}>{msg.content}</div>
            </div>
          ))}

          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input row */}
        <div style={s.inputRow}>
          <textarea
            ref={textareaRef}
            id="chat-input"
            style={s.textarea}
            rows={1}
            placeholder="Ask about skills, projects, experience…"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={loading}
            aria-label="Chat message input"
          />
          <button
            id="chat-send-btn"
            style={s.sendBtn(!canSend)}
            onClick={sendMessage}
            disabled={!canSend}
            aria-label="Send message"
            title="Send"
          >
            {/* Paper-plane icon (SVG) */}
            <svg
              width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="white" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Floating bubble ───────────────────────────────────────────── */}
      <button
        id="chat-bubble-btn"
        style={s.bubble(open)}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open AI chat"}
        title="Chat with AI"
      >
        {open ? (
          <svg
            width="22" height="22" viewBox="0 0 24 24"
            fill="none" stroke="white" strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            width="26" height="26" viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        )}
      </button>
    </>
  );
}
