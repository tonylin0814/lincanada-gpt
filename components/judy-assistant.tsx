"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

const starterMessages: ChatMessage[] = [
  {
    id: 1,
    role: "assistant",
    text: "Hi, I am Judy. I can help you read and understand your records.",
  },
];

export function JudyAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(starterMessages);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedDraft = draft.trim();
    if (!trimmedDraft || isThinking) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        id: Date.now(),
        role: "user",
        text: trimmedDraft,
      },
    ];

    setMessages(nextMessages);
    setDraft("");
    setIsThinking(true);

    try {
      const response = await fetch("/api/judy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            text: message.text,
          })),
        }),
      });

      const result = (await response.json()) as {
        answer?: string;
        error?: string;
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: "assistant",
          text:
            result.answer ||
            result.error ||
            "I could not answer right now. Please try again.",
        },
      ]);
    } catch {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: "I could not reach Judy right now. Please try again.",
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[80] print:hidden">
      {isOpen ? (
        <section
          aria-label="Judy assistant chat"
          className="mb-4 flex h-[min(620px,calc(100vh-7rem))] w-[min(390px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-2xl"
        >
          <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
            <Image
              alt="Judy"
              className="h-11 w-11 rounded-full border border-white/35 object-cover"
              height={44}
              priority
              src="/judy-img.png"
              width={44}
            />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">Judy</h2>
              <p className="text-xs text-white/70">Read-only assistant</p>
            </div>
            <button
              aria-label="Close Judy assistant"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-lg leading-none text-white/75 hover:bg-white/10 hover:text-white"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              x
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.map((message) => (
              <div
                className={
                  message.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
                key={message.id}
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[82%] rounded-lg bg-blue-700 px-3 py-2 text-sm leading-6 text-white"
                      : "max-w-[82%] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800 shadow-sm"
                  }
                >
                  {message.text}
                </div>
              </div>
            ))}
            {isThinking ? (
              <div className="flex justify-start">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-500 shadow-sm">
                  Judy is checking your records...
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <form
            className="border-t border-slate-200 bg-white p-3"
            onSubmit={handleSubmit}
          >
            <div className="flex items-end gap-2">
              <label className="sr-only" htmlFor="judy-message">
                Ask Judy
              </label>
              <textarea
                className="max-h-28 min-h-11 flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-5 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                id="judy-message"
                onChange={(event) => setDraft(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Ask Judy a question..."
                rows={1}
                value={draft}
              />
              <button
                className="h-11 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!draft.trim() || isThinking}
                type="submit"
              >
                {isThinking ? "..." : "Send"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <button
          aria-label="Open Judy assistant"
          className="group flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white shadow-xl shadow-slate-950/20 ring-1 ring-slate-950/10 hover:shadow-2xl"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <Image
            alt=""
            className="h-14 w-14 rounded-full object-cover"
            height={56}
            priority
            src="/judy-img.png"
            width={56}
          />
          <span className="absolute -left-20 rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
            Judy
          </span>
        </button>
      )}
    </div>
  );
}
