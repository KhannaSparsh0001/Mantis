"use client";

import { useState, useRef, useEffect } from "react";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with initial query or greeting
  useEffect(() => {
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
      setMessages(initialMsgs);
      triggerAiResponse(initialQuery, initialMsgs);
    } else {
      setMessages(initialMsgs);
    }
  }, [productId, initialQuery]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const triggerAiResponse = async (userText: string, currentMessages: Message[]) => {
    setIsTyping(true);

    // Mock AI Tech logic based on issue keywords for robust fallback
    setTimeout(() => {
      let aiText = "Could you tell me if the device displays any error codes or lights when this happens?";
      let suggestedActions = ["Check physical power switch", "Verify wall outlet works"];
      let manualLinks = [{ name: "Powering On", page: 12 }, { name: "Troubleshooting Guide", page: 28 }];

      const text = userText.toLowerCase();
      if (text.includes("turn on") || text.includes("dead") || text.includes("won't start")) {
        aiText = "Understood. A scooter that won't turn on is usually caused by a battery connection issue, a blown fuse, or a damaged power line. Let's check the charging state. When you plug in the charger, does the charger block LED light up red, green, or remain off?";
        suggestedActions = ["Plug in charger", "Observe charger LED color", "Check charging port pins"];
        manualLinks = [{ name: "Charging the Battery", page: 18 }, { name: "Troubleshooting Guide", page: 28 }];
      } else if (text.includes("charging") || text.includes("charge")) {
        aiText = "If the charger LED stays green but the scooter is empty, the BMS (Battery Management System) might be in sleep mode or the fuse F3 (10A) under the baseboard has blown. Please check if the connection between the battery terminal and controller is tight.";
        suggestedActions = ["Inspect Fuse F3 (10A)", "Check battery-to-controller connection", "Reset BMS"];
        manualLinks = [{ name: "BMS Protection Mode", page: 22 }, { name: "Replacing the Fuse", page: 34 }];
      } else if (text.includes("e4") || text.includes("error")) {
        aiText = "Error Code E4 typically indicates a communication failure between the handlebar dashboard and the main controller. This is often caused by a loose wire inside the handlebar stem. Can you unscrew the handlebar mount and verify if the 4-pin cable is clicked in tightly?";
        suggestedActions = ["Unscrew handlebar head", "Verify 4-pin cable connection", "Inspect wires for pinches"];
        manualLinks = [{ name: "Handlebar Wiring Diagram", page: 15 }, { name: "Error Code Definitions", page: 41 }];
      } else if (text.includes("brake") || text.includes("stopping")) {
        aiText = "A loose mechanical brake requires adjusting the tension cable at the caliper. Let's inspect the brake pads. Is the pad wear marker still visible, or is the metal rotor rubbing against the caliper body?";
        suggestedActions = ["Check caliper cable tension", "Inspect brake pad wear indicator", "Align caliper bracket"];
        manualLinks = [{ name: "Brake Caliper Alignment", page: 30 }, { name: "Replacing Brake Pads", page: 32 }];
      }

      // Update Parent UI if callback is provided
      if (onSuggestedActionsChange) onSuggestedActionsChange(suggestedActions);
      if (onManualLinksChange) onManualLinksChange(manualLinks);

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: aiText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 1200);
  };

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
    triggerAiResponse(userMessage.text, updatedMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[350px] max-h-[500px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "ai" && (
              <div className="mr-2 h-7 w-7 rounded-full bg-green-50 flex items-center justify-center text-mantis-green border border-green-100 flex-shrink-0">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            )}
            
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.sender === "user"
                ? "bg-slate-100 text-slate-800 rounded-br-none"
                : "bg-white border border-slate-200/80 text-slate-700 rounded-bl-none shadow-sm"
            }`}>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              <span className="mt-1 block text-right text-[10px] text-slate-400 font-semibold">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {/* AI Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="mr-2 h-7 w-7 rounded-full bg-green-50 flex items-center justify-center text-mantis-green border border-green-100 flex-shrink-0">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
              </svg>
            </div>
            <div className="bg-white border border-slate-200/80 text-slate-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Form */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type your response..."
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-mantis-green focus:bg-white focus:ring-1 focus:ring-mantis-green"
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
