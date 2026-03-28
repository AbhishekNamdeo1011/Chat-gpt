import React, { useState } from "react";
import axios from "axios";
import { Send, Menu, Plus, MessageSquare } from "lucide-react";
import "./Home.css";

// 🧩 Local reusable components (all-in-one)
const Button = ({ children, onClick, className = "", size = "md", disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`btn ${size === "icon" ? "btn-icon" : ""} ${className}`}
  >
    {children}
  </button>
);

const Input = ({ value, onChange, onKeyPress, placeholder, className = "" }) => (
  <input
    value={value}
    onChange={onChange}
    onKeyPress={onKeyPress}
    placeholder={placeholder}
    className={`input ${className}`}
  />
);

const ScrollArea = ({ children, className = "" }) => (
  <div className={`scroll-area ${className}`}>{children}</div>
);

// 💬 Main Home Component
const Home = () => {
  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "Hello! I'm your AI assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState("chat-1");

  const [previousChats, setPreviousChats] = useState([
    {
      id: "chat-1",
      title: "Current Conversation",
      lastMessage: "Hello! I'm your AI assistant...",
      timestamp: new Date(),
    },
  ]);

  // 📨 Send Message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    // Update UI immediately with user message
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Add a "typing..." placeholder message
    const typingMsg = {
      id: "typing",
      text: "AI is typing...",
      isUser: false,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, typingMsg]);

    try {
      // 🔗 Make API request to your backend
      const response = await axios.post("http://localhost:5000/api/chat", {
        message: userMessage.text,
      });

      // Remove "typing..." message and add AI response
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== "typing").concat({
          id: Date.now().toString(),
          text: response.data.reply || "No response from AI.",
          isUser: false,
          timestamp: new Date(),
        })
      );
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== "typing").concat({
          id: Date.now().toString(),
          text: "⚠️ Error: Unable to get a response from the AI server.",
          isUser: false,
          timestamp: new Date(),
        })
      );
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    const newChatId = `chat-${Date.now()}`;
    const newChat = {
      id: newChatId,
      title: "New Conversation",
      lastMessage: "Start a new conversation",
      timestamp: new Date(),
    };

    setPreviousChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setMessages([
      {
        id: "1",
        text: "Hello! I'm your AI assistant. How can I help you today?",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
    setSidebarOpen(false);
  };

  const handleChatSelect = (chatId) => {
    setCurrentChatId(chatId);
    setSidebarOpen(false);
  };

  return (
    <div className="home-container">
      {/* 📱 Mobile Menu Button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* 🌫️ Sidebar Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 🧭 Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <Button onClick={handleNewChat} className="new-chat-btn">
            <Plus className="h-5 w-5 mr-2" /> New Chat
          </Button>
        </div>

        <ScrollArea className="sidebar-chats">
          <div className="chat-list">
            {previousChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => handleChatSelect(chat.id)}
                className={`chat-item ${
                  currentChatId === chat.id ? "chat-item-active" : ""
                }`}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <div className="chat-item-content">
                  <h3 className="chat-item-title">{chat.title}</h3>
                  <p className="chat-item-message">{chat.lastMessage}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* 💬 Chat Area */}
      <main className="chat-main">
        <ScrollArea className="messages-container">
          <div className="messages-wrapper">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${
                  message.isUser ? "message-user" : "message-ai"
                }`}
              >
                <div className="message-bubble">
                  <p className="message-text">{message.text}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* ⌨️ Input */}
        <div className="input-container">
          <div className="input-wrapper">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="chat-input"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="send-btn"
              size="icon"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
