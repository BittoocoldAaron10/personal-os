/**
 * JarvisChat Component
 *
 * A chat widget for interacting with Jarvis from the OS website.
 * Shows Jarvis status, chat history, and allows sending messages.
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import { isJarvisOnline, checkJarvisStatus } from "@/lib/jarvis-client";
import { supabase } from "@/lib/supabase";

interface Message {
  id: string;
  type: "user" | "jarvis" | "gemini" | "error";
  text: string;
  timestamp: Date;
}

interface JarvisChatProps {
  userId: string;
  className?: string;
}

export default function JarvisChat({ userId, className = "" }: JarvisChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check Jarvis status on mount and periodically
  useEffect(() => {
    const checkStatus = async () => {
      const online = await isJarvisOnline();
      setIsOnline(online);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/jarvis/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input,
          userId,
          deep: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `${data.source}-${Date.now()}`,
        type: data.source === "jarvis" ? "jarvis" : "gemini",
        text: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update status indicator
      if (data.source === "jarvis") {
        setIsOnline(true);
      }
    } catch (error) {
      console.error("Chat error:", error);

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to get response",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with status */}
      <div className="flex items-center justify-between p-4 border-b bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">JARVIS</h2>

          {/* Status indicator */}
          <div className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full ${
                isOnline === null
                  ? "bg-gray-400"
                  : isOnline
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {isOnline === null
                ? "Checking..."
                : isOnline
                ? "Online"
                : "Offline (using Gemini)"}
            </span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => setShowChat(false)}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p className="text-sm">Welcome to JARVIS</p>
            <p className="text-xs mt-2">
              Chat with your local AI assistant or ask questions.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg ${
                msg.type === "user"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : msg.type === "error"
                  ? "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100 rounded-bl-none"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none"
              }`}
            >
              <p className="text-sm break-words">{msg.text}</p>
              {msg.type !== "user" && (
                <p className="text-xs opacity-75 mt-1">
                  {msg.type === "jarvis" ? "JARVIS" : "Gemini"}{" "}
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded-lg rounded-bl-none">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-600 dark:bg-slate-300 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-slate-600 dark:bg-slate-300 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="w-2 h-2 bg-slate-600 dark:bg-slate-300 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={sendMessage} className="border-t p-4 bg-slate-50 dark:bg-slate-900">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask JARVIS..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
