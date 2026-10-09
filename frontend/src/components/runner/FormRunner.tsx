"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { END, nextQuestionId, visiblePath } from "@/lib/logic";
import { fontStylesheetUrl, themeVars } from "@/lib/theme";
import type { AnswerValue, Answers, FormDefinition } from "@/lib/types";
import { isEmpty, validateAnswer } from "@/lib/validation";
import { QuestionView } from "./QuestionView";
import { ThankYou, Welcome } from "./Screens";
import styles from "./runner.module.css";

interface FormRunnerProps {
  form: FormDefinition;
  /** "live" stores the response on the server; "preview" (builder) stores nothing. */
  mode: "live" | "preview";
  slug?: string;
}

type Stage = "welcome" | "question" | "done";

const slideVariants = {
  enter: (direction: number) => ({ y: direction > 0 ? 70 : -70, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (direction: number) => ({ y: direction > 0 ? -70 : 70, opacity: 0 }),
};

/** Remounting on restart is the simplest way to reset every piece of state. */
export function FormRunner(props: FormRunnerProps) {
  const [run, setRun] = useState(0);
  return <Runner key={run} {...props} onRestart={() => setRun((r) => r + 1)} />;
}

function useThemeFont(font: string) {
  useEffect(() => {
    if (font === "Inter") return; // already loaded by the root layout
    const href = fontStylesheetUrl(font);
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [font]);
}

/** Answers on the respondent's path, without empty ones: what the server expects. */
function answersForPath(form: FormDefinition, answers: Answers): Answers {
  const payload: Answers = {};
  for (const q of visiblePath(form.questions, answers)) {
    if (!isEmpty(answers[q.id])) payload[q.id] = answers[q.id];
  }
  return payload;
}

function Runner({ form, mode, slug, onRestart }: FormRunnerProps & { onRestart: () => void }) {
  const { questions, settings } = form;
  useThemeFont(settings.theme.font);

  const [stage, setStage] = useState<Stage>(
    settings.welcome.enabled ? "welcome" : questions.length ? "question" : "done",
  );
  const [currentId, setCurrentId] = useState<string | null>(questions[0]?.id ?? null);
  const [history, setHistory] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Mirrors of state for callbacks fired from timeouts and window listeners,
  // which would otherwise see stale values.
  const live = useRef({ stage, currentId, answers, history, submitting });
  live.current = { stage, currentId, answers, history, submitting };

  // ---------------------------------------------------------- persistence
  const startPromise = useRef<Promise<string> | null>(null);

  const ensureStarted = useCallback((): Promise<string> => {
    if (!slug) return Promise.reject(new Error("Missing form slug"));
    if (!startPromise.current) {
      startPromise.current = api
        .startResponse(slug)
        .then((r) => r.id)
        .catch((err) => {
          startPromise.current = null; // allow a retry on the next attempt
          throw err;
        });
    }
    return startPromise.current;
  }, [slug]);

  const saveProgress = useCallback(
    (current: Answers) => {
      if (mode !== "live" || !slug) return;
      ensureStarted()
        .then((id) => api.saveProgress(slug, id, answersForPath(form, current)))
        .catch(() => {
          // Partial saves are best-effort; the final submit re-sends everything.
        });
    },
    [mode, slug, form, ensureStarted],
  );

  // ----------------------------------------------------------- navigation
  const setAnswer = useCallback((questionId: string, value: AnswerValue) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      live.current.answers = next;
      return next;
    });
    setError(null);
  }, []);

  const showError = (message: string) => {
    setError(message);
    setErrorKey((k) => k + 1);
  };

  const submit = useCallback(async () => {
    const current = live.current.answers;
    if (mode === "preview") {
      setDirection(1);
      setStage("done");
      return;
    }
    setSubmitting(true);
    try {
      const id = await ensureStarted();
      await api.submitResponse(slug!, id, answersForPath(form, current));
      setDirection(1);
      setStage("done");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setStage("done"); // already submitted (e.g. double click)
      } else if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        // Server validation failed: jump back to the first offending question.
        const path = visiblePath(questions, current);
        const firstBad = path.find((q) => err.fieldErrors[q.id]);
        if (firstBad) {
          setDirection(-1);
          setHistory(path.slice(0, path.indexOf(firstBad)).map((q) => q.id));
          setCurrentId(firstBad.id);
          showError(err.fieldErrors[firstBad.id]);
        }
      } else {
        showError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [mode, slug, form, questions, ensureStarted]);

  const goNext = useCallback(() => {
    const { stage, currentId, answers, submitting } = live.current;
    if (submitting) return;
    if (stage === "welcome") {
      setDirection(1);
      setStage("question");
      return;
    }
    if (stage !== "question" || !currentId) return;

    const index = questions.findIndex((q) => q.id === currentId);
    const question = questions[index];
    const problem = validateAnswer(question, answers[question.id]);
    if (problem) {
      showError(problem);
      return;
    }
    const next = nextQuestionId(questions, index, answers);
    if (next === null || next === END) {
      void submit();
      return;
    }
    setDirection(1);
    setHistory((h) => [...h, currentId]);
    setCurrentId(next);
    setError(null);
    saveProgress(answers);
  }, [questions, submit, saveProgress]);

  const goBack = useCallback(() => {
    const { stage, history } = live.current;
    if (stage !== "question" || !history.length) return;
    setDirection(-1);
    setCurrentId(history[history.length - 1]);
    setHistory(history.slice(0, -1));
    setError(null);
  }, []);

  /** Single-click answers (choice, yes/no, rating) advance only if still on that question. */
  const commit = useCallback(
    (questionId: string) => {
      if (live.current.currentId === questionId && live.current.stage === "question") goNext();
    },
    [goNext],
  );

  // ------------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      const tag = target.tagName;

      if (e.key === "Enter") {
        if (tag === "TEXTAREA" && e.shiftKey) return; // line break in long text
        // Real buttons and links handle Enter themselves, except answer
        // buttons, where Enter should mean "OK" rather than re-select.
        if ((tag === "BUTTON" && !target.getAttribute("role")) || tag === "A") return;
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (tag === "TEXTAREA" || live.current.stage !== "question") return;
        e.preventDefault();
        if (e.key === "ArrowDown") goNext();
        else goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goBack]);

  // --------------------------------------------------------------- render
  const path = useMemo(() => visiblePath(questions, answers), [questions, answers]);
  const answeredOnPath = path.filter((q) => !isEmpty(answers[q.id])).length;
  const progress = stage === "done" ? 100 : path.length ? (answeredOnPath / path.length) * 100 : 0;

  const index = questions.findIndex((q) => q.id === currentId);
  const question = index >= 0 ? questions[index] : null;
  const nextId = question ? nextQuestionId(questions, index, answers) : null;
  const isLast = nextId === null || nextId === END;
  const slideKey = stage === "question" ? `q-${currentId}` : stage;

  return (
    <div className={styles.root} style={themeVars(settings.theme)}>
      {stage !== "welcome" && (
        <div
          className={styles.progress}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      )}

      {mode === "preview" && (
        <div className={styles.previewBanner}>
          Preview: responses won&apos;t be saved
          <button onClick={onRestart}>Restart</button>
        </div>
      )}

      <div className={styles.stage}>
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={slideKey}
            className={styles.slide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
          >
            {stage === "welcome" && <Welcome screen={settings.welcome} onStart={goNext} />}
            {stage === "done" &&
              (questions.length ? (
                <ThankYou screen={settings.thank_you} />
              ) : (
                <div className={styles.screen}>
                  <h1 className={styles.screenTitle}>This form has no questions yet.</h1>
                </div>
              ))}
            {stage === "question" && question && (
              <QuestionView
                question={question}
                number={index + 1}
                value={answers[question.id]}
                error={error}
                errorKey={errorKey}
                isLast={isLast}
                submitting={submitting}
                onChange={(value) => setAnswer(question.id, value)}
                onNext={goNext}
                onCommit={() => commit(question.id)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.nav}>
        {stage === "question" && (
          <div className={styles.navGroup}>
            <button
              className={styles.navBtn}
              onClick={goBack}
              disabled={!history.length}
              aria-label="Previous question"
            >
              <Icon name="chevronUp" size={20} strokeWidth={2.2} />
            </button>
            <button className={styles.navBtn} onClick={goNext} disabled={submitting} aria-label="Next question">
              <Icon name="chevronDown" size={20} strokeWidth={2.2} />
            </button>
          </div>
        )}
        <Link href="/" className={styles.madeWith} target={mode === "live" ? "_blank" : undefined}>
          Made with {BRAND}
        </Link>
      </div>
    </div>
  );
}
