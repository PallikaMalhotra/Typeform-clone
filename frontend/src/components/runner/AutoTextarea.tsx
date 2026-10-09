"use client";

import { useEffect, useRef } from "react";

interface AutoTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className: string;
  ariaLabel?: string;
}

/** A textarea that grows with its content; used for inline editing in the builder. */
export function AutoTextarea({ value, onChange, placeholder, className, ariaLabel }: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      className={className}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
