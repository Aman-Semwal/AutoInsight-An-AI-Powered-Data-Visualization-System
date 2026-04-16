import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, User, Sparkles, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const suggestions = [
  "Summarize this dataset",
  "What are the key trends?",
  "Are there any anomalies or outliers?",
  "Which columns have missing data?",
  "Suggest the best chart types",
  "Show correlation analysis",
];

const AiAssistant = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: "Hello! I'm your AI data assistant. Select a dataset and ask me anything — trends, summaries, anomalies, or chart suggestions.", timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets-ai", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("datasets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const query = text || input.trim();
    if (!query || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: query, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const ds = datasets.find((d: any) => d.id === selectedDataset);
    if (!ds) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Please select a dataset first so I can analyze your data.", timestamp: new Date() }]);
      setLoading(false);
      return;
    }

    // Build conversation history for context
    const chatHistory = [...messages.filter(m => m.id !== "welcome"), userMsg].map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: chatHistory,
          datasetContext: {
            name: ds.name,
            columns: ds.columns,
            rowCount: ds.row_count,
            sampleRows: ds.preview_rows,
          },
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsertAssistant = (content: string) => {
        assistantContent = content;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.id.startsWith("stream-")) {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
          }
          return [...prev, { id: `stream-${Date.now()}`, role: "assistant", content, timestamp: new Date() }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              upsertAssistant(assistantContent);
            }
          } catch { /* partial JSON */ }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              upsertAssistant(assistantContent);
            }
          } catch {}
        }
      }

      if (!assistantContent) {
        upsertAssistant("I couldn't generate a response. Please try again.");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `Sorry, I encountered an error: ${e.message}`, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-chart-4 to-chart-5 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Powered by AI — ask anything about your data</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={selectedDataset} onValueChange={setSelectedDataset}>
            <SelectTrigger className="w-48 bg-card border-border/50"><SelectValue placeholder="Select dataset" /></SelectTrigger>
            <SelectContent>
              {datasets.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => setMessages([messages[0]])} title="Clear chat">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chart-4 to-chart-5 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-br-md" 
                  : "glass border border-border/30 text-foreground rounded-bl-md"
              }`} style={msg.role === "assistant" ? { boxShadow: "var(--shadow-card)" } : undefined}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mt-1 [&>ul]:mt-1 [&>ol]:mt-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && !messages.some(m => m.id.startsWith("stream-")) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chart-4 to-chart-5 flex items-center justify-center"><Bot className="w-4 h-4 text-primary-foreground" /></div>
            <div className="glass rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Analyzing...</span>
            </div>
          </motion.div>
        )}
      </div>

      {messages.length <= 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 pb-3">
          {suggestions.map((s) => (
            <button key={s} onClick={() => handleSend(s)} className="px-3 py-1.5 rounded-full border border-border/50 text-xs text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors">
              {s}
            </button>
          ))}
        </motion.div>
      )}

      <div className="flex gap-2 pt-2 border-t border-border/30">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={selectedDataset ? "Ask about your data..." : "Select a dataset first..."} className="bg-card border-border/50" disabled={loading} />
        <Button onClick={() => handleSend()} disabled={loading || !input.trim()} className="bg-gradient-primary text-primary-foreground glow-primary">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default AiAssistant;
