"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function TextPane({
  value,
  onChange,
  placeholder = "## Requirements\n\n• Functional\n• Non-functional\n\n## Notes",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newValue = value.slice(0, start) + "  " + value.slice(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
      }
    },
    [value, onChange]
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
        <h2 className="text-sm font-medium">Notes</h2>
        <button
          type="button"
          onClick={() => setIsPreview((p) => !p)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {isPreview ? "Edit" : "Preview"}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {isPreview ? (
          <div className="h-full overflow-auto p-4 prose prose-sm dark:prose-invert max-w-none">
            {value.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">{placeholder}</p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-full w-full resize-none border-0 bg-transparent p-4 text-sm focus:outline-none focus:ring-0 font-mono"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
