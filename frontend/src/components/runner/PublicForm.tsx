"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import type { PublicForm as PublicFormData } from "@/lib/types";
import { FormRunner } from "./FormRunner";

type State =
  | { status: "loading" }
  | { status: "ready"; form: PublicFormData }
  | { status: "closed" }
  | { status: "error"; message: string };

/** The shareable respondent page: /to/<slug>. No login required. */
export function PublicForm({ slug }: { slug: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    api
      .getPublicForm(slug)
      .then((form) => {
        if (cancelled) return;
        document.title = form.title;
        setState({ status: "ready", form });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setState({ status: "closed" });
        else setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong" });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === "ready") {
    return (
      <div style={{ position: "relative", height: "100dvh", width: "100%" }}>
        <FormRunner form={state.form} mode="live" slug={slug} />
      </div>
    );
  }

  return (
    <div className="page-center" style={{ minHeight: "100dvh", background: "#fff", color: "#191919" }}>
      {state.status === "loading" && (
        <>
          <div className="spinner" />
          <span style={{ color: "#5e5e5b" }}>Loading form...</span>
        </>
      )}
      {state.status === "closed" && (
        <>
          <h1 style={{ margin: 0, fontWeight: 400 }}>This form is now closed</h1>
          <p style={{ margin: 0, color: "#5e5e5b" }}>It isn&apos;t accepting new responses. Thanks for stopping by!</p>
        </>
      )}
      {state.status === "error" && (
        <>
          <h1 style={{ margin: 0, fontWeight: 400 }}>We couldn&apos;t load this form</h1>
          <p style={{ margin: 0, color: "#5e5e5b" }}>{state.message}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
        </>
      )}
      <p style={{ position: "absolute", bottom: 16, margin: 0, fontSize: 12, color: "#8a8a87" }}>Made with {BRAND}</p>
    </div>
  );
}
