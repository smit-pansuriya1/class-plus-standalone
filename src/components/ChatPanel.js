import { useMeeting, usePubSub } from "@videosdk.live/react-sdk";
import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  const { localParticipant } = useMeeting();
  const localId = localParticipant?.id;

  const { publish } = usePubSub("CHAT", {
    onMessageReceived: (message) => {
      setMessages((prev) => [...prev, message]);
    },
    onOldMessagesReceived: (oldMessages) => {
      setMessages(oldMessages);
    },
  });

  // Keep the latest message in view.
  useEffect(() => {
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages]);

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
    <aside className="side-panel" aria-label="Chat">
      <header className="side-panel-header">
        <h2>Chat</h2>
        <button type="button" className="side-panel-close" onClick={onClose} aria-label="Close chat">
          <X size={18} />
        </button>
      </header>

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
