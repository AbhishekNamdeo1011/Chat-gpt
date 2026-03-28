import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CircleUserRound,
  LogOut,
  Menu,
  MessageCircle,
  PanelLeftClose,
  Plus,
  Send,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createChat } from "../lib/api";
import { connectSocket, getSocket } from "../lib/socket";
import ThemeToggle from "../components/ThemeToggle";

const CHAT_STORAGE_KEY = "chat_clone_history";

function buildLocalChat(title = "New Chat") {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    backendChatId: null,
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [
      {
        id: crypto.randomUUID(),
        role: "model",
        content: "Hi! Ask me anything and I will help you.",
        createdAt: timestamp,
      },
    ],
  };
}

function readStoredChats() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) {
      return [buildLocalChat("First Conversation")];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [buildLocalChat("First Conversation")];
    }
    return parsed;
  } catch (error) {
    return [buildLocalChat("First Conversation")];
  }
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [chats, setChats] = useState(readStoredChats);
  const [activeChatId, setActiveChatId] = useState(() => readStoredChats()[0].id);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) || chats[0],
    [activeChatId, chats]
  );

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setStatus("Connected");
    const onDisconnect = () => setStatus("Disconnected");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (socket.connected) {
      setStatus("Connected");
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  function updateChat(chatId, updater) {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== chatId) {
          return chat;
        }
        const updated = updater(chat);
        return {
          ...updated,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }

  function addMessage(chatId, role, content) {
    const message = {
      id: crypto.randomUUID(),
      role,
      content,
      createdAt: new Date().toISOString(),
    };

    updateChat(chatId, (chat) => ({
      ...chat,
      messages: [...chat.messages, message],
    }));

    return message.id;
  }

  function replaceMessage(chatId, messageId, role, content) {
    updateChat(chatId, (chat) => ({
      ...chat,
      messages: chat.messages.map((item) =>
        item.id === messageId
          ? {
              ...item,
              role,
              content,
            }
          : item
      ),
    }));
  }

  async function ensureBackendChat(localChatId) {
    const target = chats.find((chat) => chat.id === localChatId);
    if (!target) {
      throw new Error("Chat not found");
    }

    if (target.backendChatId) {
      return target.backendChatId;
    }

    const response = await createChat({ title: target.title });
    const backendChatId = response?.chat?._id;

    if (!backendChatId) {
      throw new Error("Backend did not return a chat id");
    }

    updateChat(localChatId, (chat) => ({
      ...chat,
      backendChatId,
    }));

    return backendChatId;
  }

  async function askAI(backendChatId, content) {
    const socket = await connectSocket();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("AI timeout. Try again."));
      }, 45000);

      const onResponse = (payload) => {
        if (!payload || payload.chat !== backendChatId) {
          return;
        }
        cleanup();
        resolve(payload.content || "No AI response received.");
      };

      const onError = (socketError) => {
        cleanup();
        reject(new Error(socketError?.message || "Socket connection failed"));
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        socket.off("ai-response", onResponse);
        socket.off("connect_error", onError);
      };

      socket.on("ai-response", onResponse);
      socket.on("connect_error", onError);
      socket.emit("ai-message", { chat: backendChatId, content });
    });
  }

  async function handleSend() {
    if (!input.trim() || pending || !activeChat) {
      return;
    }

    setPending(true);
    setError("");

    const text = input.trim();
    setInput("");
    addMessage(activeChat.id, "user", text);
    const placeholderId = addMessage(activeChat.id, "model", "Thinking...");

    try {
      const backendChatId = await ensureBackendChat(activeChat.id);
      const aiReply = await askAI(backendChatId, text);
      replaceMessage(activeChat.id, placeholderId, "model", aiReply);
    } catch (sendError) {
      replaceMessage(
        activeChat.id,
        placeholderId,
        "model",
        "I could not connect to the AI service. Please verify login and backend status."
      );
      setError(sendError.message);
    } finally {
      setPending(false);
    }
  }

  function handleNewChat() {
    const nextChat = buildLocalChat(`Chat ${chats.length + 1}`);
    setChats((prev) => [nextChat, ...prev]);
    setActiveChatId(nextChat.id);
    setSidebarOpen(true);
    setError("");
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function submitOnEnter(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-layout">
      <aside className={`history-panel ${sidebarOpen ? "is-open" : ""}`}>
        <div className="history-top">
          <h2>Conversations</h2>
          <button className="icon-button" type="button" onClick={() => setSidebarOpen(false)}>
            <PanelLeftClose size={18} />
          </button>
        </div>

        <button className="new-chat-button" type="button" onClick={handleNewChat}>
          <Plus size={17} /> New chat
        </button>

        <div className="history-list">
          {chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              className={`history-item ${chat.id === activeChat?.id ? "active" : ""}`}
              onClick={() => {
                setActiveChatId(chat.id);
                setSidebarOpen(false);
              }}
            >
              <MessageCircle size={16} />
              <div>
                <strong>{chat.title}</strong>
                <p>{chat.messages[chat.messages.length - 1]?.content || "No messages"}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="chat-main-screen">
        <header className="chat-topbar">
          <div className="chat-topbar-left">
            <button
              className="icon-button"
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              <Menu size={18} />
            </button>
            <div>
              <h1>{activeChat?.title || "Chat"}</h1>
              <span className={`status-dot ${status === "Connected" ? "online" : "offline"}`}>
                {status}
              </span>
            </div>
          </div>
          <div className="chat-topbar-right">
            <ThemeToggle />
            <div className="user-pill">
              <CircleUserRound size={18} />
              <span>{user?.email || "User"}</span>
            </div>
            <button className="icon-button" type="button" onClick={handleLogout}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {error && <p className="banner-error">{error}</p>}

        <section className="messages-feed">
          {activeChat?.messages.map((message) => (
            <article
              key={message.id}
              className={`bubble-row ${message.role === "user" ? "from-user" : "from-model"}`}
            >
              <div className="bubble">
                <p>{message.content}</p>
                <time>{formatTime(message.createdAt)}</time>
              </div>
            </article>
          ))}
        </section>

        <footer className="composer">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={submitOnEnter}
            placeholder="Message your AI assistant..."
            rows={1}
          />
          <button type="button" className="send-button" onClick={handleSend} disabled={pending}>
            <Send size={17} />
            <span>{pending ? "Sending" : "Send"}</span>
          </button>
        </footer>

        <p className="chat-note">
          Real backend wiring: <strong>POST /api/chat</strong> for chat creation and Socket.IO
          <strong> ai-message / ai-response</strong> for AI conversation.
          {!status.includes("Connected") && (
            <>
              {" "}
              If messages fail, make sure your backend Socket.IO server allows the frontend
              origin.
            </>
          )}
        </p>
      </main>

      <div className="mobile-auth-links">
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
      </div>
    </div>
  );
}

export default ChatPage;
