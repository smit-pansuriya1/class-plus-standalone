import { useMeeting, usePubSub } from "@videosdk.live/react-sdk";
import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ChatPanel is ALWAYS mounted (the parent toggles only its visibility via the
// `open` prop), so the CHAT subscription below stays alive whether the panel is
// open or not — messages are never missed.
//
// Critically, usePubSub lives HERE, in a leaf, not in MeetingSurface. The SDK's
// usePubSub buffers messages internally and re-renders its host on every
// message; keeping it in this leaf confines those re-renders to the chat
// subtree and leaves the video grid untouched (which is what was saturating the
// main thread and tripping the socket heartbeat under load).
export default function ChatPanel({ open, onClose }) {
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  const { localParticipant } = useMeeting();
  const localId = localParticipant?.id;

  // The hook keeps the buffered history (persist:true) + live messages, so we
  // read `messages` directly instead of keeping a second copy in component
  // state (that would double the per-message re-render work).
  const { publish, messages } = usePubSub("CHAT", { maxMessages: 2000 });

  // Keep the latest message in view — only meaningful while the panel is open.
  useEffect(() => {
    if (!open) {
      return;
    }
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages, open]);

  const sendMessage = (event) => {
    event.preventDefault();
    const text = draft.trim();

    if (!text) {
      return;
    }

    publish(text, { persist: true });
    setDraft("");
  };

  return (
    <aside className={`side-panel ${open ? "open" : ""}`} aria-label="Chat" aria-hidden={!open}>
      <header className="side-panel-header">
        <h2>Chat</h2>
        <button type="button" className="side-panel-close" onClick={onClose} aria-label="Close chat">
          <X size={18} />
        </button>
      </header>

      {/* Render the (potentially long) list only when open: the subscription
          still runs while closed, but we skip reconciling the list DOM. */}
      {open ? (
        <div className="chat-messages" ref={listRef}>
          {messages.length === 0 ? (
            <p className="chat-empty">No messages yet. Say hello 👋</p>
          ) : (
            messages.map((message, index) => {
              const mine = message.senderId === localId;
              return (
                <div
                  key={`${message.id || index}-${message.timestamp || ""}`}
                  className={`chat-bubble ${mine ? "mine" : ""}`}
                >
                  {!mine ? (
                    <span className="chat-sender">{message.senderName || "Participant"}</span>
                  ) : null}
                  <span className="chat-text">{message.message}</span>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      <form className="chat-composer" onSubmit={sendMessage}>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message"
          aria-label="Message"
        />
        <button type="submit" className="chat-send" disabled={!draft.trim()} aria-label="Send">
          <Send size={18} />
        </button>
      </form>
    </aside>
  );
}
