"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
}

interface DiagnosticAssistantProps {
  productId?: string;
  initialQuery?: string;
  onSuggestedActionsChange?: (actions: string[]) => void;
  onManualLinksChange?: (links: { name: string; page: number }[]) => void;
}

export default function DiagnosticAssistant({
  productId = "xiaomi-scooter-4-pro",
  initialQuery = "",
  onSuggestedActionsChange,
  onManualLinksChange,
}: DiagnosticAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const greetingText = `I'll help you diagnose your product issue. Let's work systematically through tests to isolate the problem. Describe what symptoms you are seeing.`;
    const initialMsgs: Message[] = [
      {
        id: "greeting",
        sender: "ai",
        text: greetingText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ];

    if (initialQuery) {
      initialMsgs.push({
        id: "initial-query",
        sender: "user",
        text: initialQuery,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    return initialMsgs;
  });
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const triggerAiResponse = useCallback(async (userText: string) => {
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:8000/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, query: userText }),
      });
      const data = await res.json();

      if (onSuggestedActionsChange) onSuggestedActionsChange(data.suggestedActions);
      if (onManualLinksChange) onManualLinksChange(data.manualLinks);

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error("Error communicating with backend:", err);
    } finally {
      setIsTyping(false);
    }
  }, [productId, onSuggestedActionsChange, onManualLinksChange]);

  // Trigger AI response on mount if initialQuery is set
  useEffect(() => {
    if (initialQuery) {
      requestAnimationFrame(() => {
        triggerAiResponse(initialQuery);
      });
    }
  }, [initialQuery, triggerAiResponse]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);


  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    triggerAiResponse(userMessage.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[350px] max-h-[500px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "ai" && (
              <div className="mr-2 h-7 w-7 rounded-full bg-green-50 dark:bg-green-950/40 flex items-center justify-center text-mantis-green border border-green-100 dark:border-green-900/30 flex-shrink-0">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            )}

            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${msg.sender === "user"
                ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-br-none"
                : "bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-bl-none shadow-sm dark:shadow-slate-950/30"
              }`}>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              <span className="mt-1 block text-right text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {/* AI Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="mr-2 h-7 w-7 rounded-full bg-green-50 dark:bg-green-950/40 flex items-center justify-center text-mantis-green border border-green-100 dark:border-green-900/30 flex-shrink-0">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
              </svg>
            </div>
            <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Form */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type your response..."
            className="flex-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-mantis-green dark:focus:border-mantis-green focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-mantis-green dark:text-white"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={isTyping || !inputValue.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-mantis-green text-white shadow-sm hover:bg-mantis-green-dark transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
