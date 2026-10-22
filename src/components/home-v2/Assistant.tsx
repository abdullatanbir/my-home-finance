import { useEffect, useRef, useState } from "react";
import { Sparkles, X, ArrowUpRight, Send } from "lucide-react";
/** Only inject a provider after explicit service/data-sharing authorization.
 * The default application supplies no adapter and sends no requests or financial records. */
export interface AssistantAdapter {
  ask(input: {
    question: string;
    signal: AbortSignal;
  }): Promise<{ answer: string }>;
}
export default function Assistant({
  open,
  onClose,
  adapter,
}: {
  open: boolean;
  onClose: () => void;
  adapter?: AssistantAdapter;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    previous = useRef<HTMLElement | null>(null),
    request = useRef<AbortController | null>(null);
  const [question, setQuestion] = useState(""),
    [state, setState] = useState<
      "idle" | "loading" | "error" | "unavailable" | "answer"
    >("idle"),
    [answer, setAnswer] = useState("");
  useEffect(() => {
    if (open) {
      previous.current = document.activeElement as HTMLElement;
      ref.current?.showModal();
      const overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = overflow;
        request.current?.abort();
      };
    } else {
      request.current?.abort();
      setState("idle");
      setAnswer("");
      setQuestion("");
      ref.current?.close();
      previous.current?.focus();
    }
  }, [open]);
  useEffect(() => () => request.current?.abort(), []);
  const send = async () => {
    if (!question.trim() || state === "loading") return;
    if (!adapter) {
      setState("unavailable");
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState("loading");
    setAnswer("");
    try {
      const result = await adapter.ask({
        question: question.trim(),
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        if (!result.answer.trim()) throw Error("Empty response");
        setAnswer(result.answer);
        setState("answer");
      }
    } catch {
      if (!controller.signal.aborted) setState("error");
    }
  };
  return (
    <dialog
      ref={ref}
      className="hv2-assistant"
      aria-label="Financial copilot"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="bc-section-head">
        <div className="hv2-ai-title">
          <Sparkles />
          <div>
            <p className="bc-eyebrow">A LITTLE PERSPECTIVE</p>
            <h2>Your financial copilot</h2>
          </div>
        </div>
        <button autoFocus aria-label="Close assistant" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <p>Make space for better questions.</p>
      <span className="hv2-ai-connection">
        {adapter ? "Provider configured" : "AI not connected"}
      </span>
      <p className="hv2-ai-disclosure">
        {adapter
          ? "Your question is sent to the configured provider. No financial records are attached automatically."
          : "No AI provider is configured. Questions stay in this open session; nothing is sent or saved. External financial analysis is unavailable."}
      </p>
      <div className="hv2-ai-prompts">
        {[
          "Where did I spend the most money this month?",
          "Am I staying on budget?",
          "Why did my net worth decline?",
          "Can I afford a larger emergency fund?",
          "How soon can I eliminate my debt?",
        ].map((text) => (
          <button
            key={text}
            onClick={() => {
              setQuestion(text);
              setState("idle");
            }}
          >
            {text}
            <ArrowUpRight size={15} />
          </button>
        ))}
      </div>
      {state === "unavailable" && (
        <p role="status" className="hv2-ai-message">
          AI analysis is unavailable until an authorized provider is connected.
          You can explore your spending, budget and local scenarios directly in
          the app.
        </p>
      )}
      {state === "loading" && (
        <p role="status" className="hv2-ai-message">
          Waiting for your configured provider…
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="hv2-ai-message">
          The provider could not respond. Your financial data has not been
          changed. Try again.
        </p>
      )}
      {state === "answer" && (
        <section className="hv2-ai-message" aria-label="Provider response">
          <h3>Provider response</h3>
          <p>{answer}</p>
        </section>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="hv2-ai-question">Your question</label>
        <textarea
          id="hv2-ai-question"
          value={question}
          maxLength={2000}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about your financial picture…"
        />
        <button
          className="bc-primary"
          disabled={!question.trim() || state === "loading"}
        >
          <Send size={16} /> {state === "error" ? "Try again" : "Ask copilot"}
        </button>
      </form>
      <small>
        Guidance requires an authorized provider. This candidate does not
        generate or simulate AI advice.
      </small>
    </dialog>
  );
}
