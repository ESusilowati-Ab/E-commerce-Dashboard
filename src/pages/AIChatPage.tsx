import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Send,
  Sparkles,
  Code2,
  Lightbulb,
  TrendingUp,
  Target,
  AlertCircle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  User,
  MessageSquare,
  Table2,
} from "lucide-react";
import { useDataset } from "../store/DatasetContext";
import { Badge, EmptyState } from "../components/ui/Card";
import { ChartRenderer } from "../components/ui/Chart";
import { generateAIResponse } from "../lib/ai";
import { uid } from "../lib/utils";
import { cn } from "../lib/utils";
import type { ChatMessage } from "../types";

const suggestedPrompts = [
  { icon: Lightbulb, text: "What are the top insights?", desc: "Key findings" },
  {
    icon: BarChart3,
    text: "Show average salary by department",
    desc: "Group analysis",
  },
  { icon: TrendingUp, text: "Find correlations", desc: "Relationships" },
  { icon: AlertCircle, text: "Detect anomalies", desc: "Outliers" },
  { icon: Target, text: "Predict future values", desc: "Forecasting" },
];

export function AIChatPage() {
  const { dataset } = useDataset();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showCode, setShowCode] = useState<Record<string, boolean>>({});
  const [showReasoning, setShowReasoning] = useState<Record<string, boolean>>(
    {},
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  const send = (text: string) => {
    if (!dataset || !text.trim()) return;
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    setTimeout(
      () => {
        const response = generateAIResponse(dataset, text);
        const assistantMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: response.content,
          reasoning: response.reasoning,
          code: response.code,
          chart: response.chart,
          table: response.table,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setThinking(false);
      },
      600 + Math.random() * 400,
    );
  };

  if (!dataset) {
    return (
      <EmptyState
        icon={<Brain className="w-7 h-7" />}
        title="No dataset loaded"
        description="Upload a dataset to start chatting with your AI analyst."
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            AI Chat
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ask questions in natural language — answers grounded in your data
          </p>
        </div>
        <Badge variant="primary">
          <Brain className="w-3 h-3" /> {dataset.name}
        </Badge>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Ask me anything about your data
            </h3>
            <p className="text-sm text-slate-500 mb-6 text-center max-w-md">
              I can analyze trends, find patterns, detect anomalies, generate
              charts, and explain insights.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
              {suggestedPrompts.map((p) => (
                <button
                  key={p.text}
                  onClick={() => send(p.text)}
                  className="card card-hover p-3 text-left flex items-center gap-3 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center shrink-0 group-hover:bg-primary-500/20 transition">
                    <p.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {p.text}
                    </p>
                    <p className="text-xs text-slate-500">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-3",
              msg.role === "user" && "flex-row-reverse",
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                msg.role === "user"
                  ? "bg-gradient-to-br from-accent-500 to-primary-500"
                  : "bg-gradient-to-br from-primary-500 to-secondary-500",
              )}
            >
              {msg.role === "user" ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Brain className="w-4 h-4 text-white" />
              )}
            </div>
            <div
              className={cn(
                "flex-1 min-w-0 max-w-[85%]",
                msg.role === "user" && "flex justify-end",
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-3",
                  msg.role === "user"
                    ? "bg-primary-500/10 border border-primary-500/20"
                    : "card",
                )}
              >
                {/* Content */}
                <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {formatContent(msg.content)}
                </div>

                {/* Reasoning */}
                {msg.reasoning && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <button
                      onClick={() =>
                        setShowReasoning((prev) => ({
                          ...prev,
                          [msg.id]: !prev[msg.id],
                        }))
                      }
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition"
                    >
                      <Sparkles className="w-3 h-3" />
                      {showReasoning[msg.id] ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      Reasoning
                    </button>
                    <AnimatePresence>
                      {showReasoning[msg.id] && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="text-xs text-slate-500 mt-2 leading-relaxed overflow-hidden"
                        >
                          {msg.reasoning}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Code */}
                {msg.code && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <button
                      onClick={() =>
                        setShowCode((prev) => ({
                          ...prev,
                          [msg.id]: !prev[msg.id],
                        }))
                      }
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition"
                    >
                      <Code2 className="w-3 h-3" />
                      {showCode[msg.id] ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      Generated Python
                    </button>
                    <AnimatePresence>
                      {showCode[msg.id] && (
                        <motion.pre
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-2 p-3 rounded-xl bg-bg-input border border-border-subtle text-xs text-primary-300 font-mono overflow-x-auto overflow-hidden"
                        >
                          <code>{msg.code}</code>
                        </motion.pre>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Chart */}
                {msg.chart && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" /> {msg.chart.title}
                    </p>
                    <ChartRenderer spec={msg.chart} height={240} />
                  </div>
                )}

                {/* Table */}
                {msg.table && msg.table.rows.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <Table2 className="w-3 h-3" /> Results (
                      {msg.table.rows.length} rows)
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-border-subtle">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-bg-input/50 border-b border-border-subtle">
                            {msg.table.columns.map((c) => (
                              <th
                                key={c}
                                className="text-left px-2.5 py-1.5 font-medium text-slate-400 whitespace-nowrap"
                              >
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {msg.table.rows.slice(0, 8).map((row, i) => (
                            <tr
                              key={i}
                              className="border-b border-border-subtle last:border-0"
                            >
                              {msg.table!.columns.map((c) => (
                                <td
                                  key={c}
                                  className="px-2.5 py-1.5 text-slate-300 whitespace-nowrap"
                                >
                                  {String(row[c] ?? "—")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Thinking indicator */}
        <AnimatePresence>
          {thinking && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div className="card px-4 py-3 flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-primary-400"
                />
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  className="w-2 h-2 rounded-full bg-secondary-400"
                />
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  className="w-2 h-2 rounded-full bg-accent-500"
                />
                <span className="text-xs text-slate-500 ml-1">
                  Analyzing...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="pt-4 border-t border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask about your data..."
              className="input pl-10 py-3"
            />
          </div>
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || thinking}
            className="btn-primary py-3"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatContent(content: string): React.ReactNode {
  // Simple markdown: **bold** and bullet points
  const lines = content.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {parts.map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={j} className="text-white font-semibold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={j}>{part}</span>;
        })}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}
