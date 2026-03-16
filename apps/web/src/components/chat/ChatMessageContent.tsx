"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const isInline = !match;
    if (isInline) {
      return (
        <code
          className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className={`block overflow-x-auto rounded-lg bg-muted p-4 text-sm font-mono ${className ?? ""}`}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre({ children }) {
    return <div className="my-2">{children}</div>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-4 border-primary/50 bg-primary/5 pl-4 py-2 my-2 rounded-r text-muted-foreground">
        {children}
      </blockquote>
    );
  },
  table({ children }) {
    return (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border border-border bg-muted/50 px-3 py-2 text-left font-medium">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="border border-border px-3 py-2">{children}</td>;
  },
};

export function ChatMessageContent({ content }: { content: string }) {
  return (
    <div className="chat-content prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
