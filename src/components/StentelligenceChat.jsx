import React, { useState, useEffect, useRef } from "react";

const StentelligenceChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);

  // Auto scroll to bottom anytime messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // Auto welcome message ONCE when chat first opens
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "👋 Hi! I'm **Stentelligence**, your stencil engineering assistant. Ask me about aperture design, paste transfer, IPC rules, stencil thickness, or upload a Gerber file for analysis.",
        },
      ]);
    }
  }, [open]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("http://localhost:4000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: userMsg.content }),
      });

      const data = await res.json();
      setThinking(false);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "I received a blank response.",
        },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setThinking(false);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ There was an issue connecting to Stentelligence. Please try again.",
        },
      ]);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
  className="sti-chat-toggle-label"
  onClick={() => setOpen((o) => !o)}
>
  Stentelligence
</button>

      {/* Chat window */}
      {open && (
        <div className="sti-chat-window">
          <div className="sti-chat-header">
            <span>Stentelligence</span>
            <button
              className="sti-chat-close"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="sti-chat-body">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={
                  "sti-msg " +
                  (m.role === "user" ? "sti-user" : "sti-ai")
                }
                dangerouslySetInnerHTML={{ __html: m.content }}
              />
            ))}

            {thinking && (
              <div className="sti-thinking">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            )}

            <div ref={endRef}></div>
          </div>

          <div className="sti-chat-input-area">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask Stentelligence…"
            />
            <button onClick={sendMessage}>➤</button>
          </div>
        </div>
      )}
    </>
  );
};

export default StentelligenceChat;
