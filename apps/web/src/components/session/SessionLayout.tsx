"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { SessionWhiteboard } from "./SessionWhiteboard";
import { TextPane } from "./TextPane";
import { ChatPanel } from "@/components/chat/ChatPanel";

type Problem = {
  id: string;
  title: string;
  difficulty: string;
  timeLimit: number;
  statement: string;
};

function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

export function SessionLayout({
  sessionId,
  problem,
  diagramDocument,
  notesDocument,
  onSaveDiagram,
  onSaveNotes,
}: {
  sessionId: string;
  problem?: Problem;
  diagramDocument: unknown;
  notesDocument: string;
  onSaveDiagram: (snapshot: unknown) => Promise<void>;
  onSaveNotes: (notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(notesDocument);
  const saveNotesRef = useRef(onSaveNotes);
  saveNotesRef.current = onSaveNotes;

  useEffect(() => {
    setNotes(notesDocument);
  }, [notesDocument]);

  const debouncedSave = useCallback(
    debounce((v: string) => {
      saveNotesRef.current(v).catch(console.error);
    }, 1500),
    []
  );

  const handleNotesChange = useCallback(
    (v: string) => {
      setNotes(v);
      debouncedSave(v);
    },
    [debouncedSave]
  );

  return (
    <Group
      id="session-layout"
      orientation="horizontal"
      className="flex-1 min-h-0 w-full"
      resizeTargetMinimumSize={{ fine: 8, coarse: 16 }}
    >
      <Panel
        id="text"
        defaultSize="25"
        minSize="12"
        maxSize="45"
        className="flex flex-col min-w-0 bg-muted/10 overflow-hidden"
      >
        <TextPane
          value={notes}
          onChange={handleNotesChange}
          placeholder={
            problem?.statement
              ? `## Problem\n\n${problem.statement.slice(0, 200)}...\n\n## Requirements\n\n• Functional\n• Non-functional\n\n## Notes`
              : "## Requirements\n\n• Functional\n• Non-functional\n\n## Notes"
          }
        />
      </Panel>
      <Separator
        id="text-drawing"
        className="min-w-2 bg-border hover:bg-primary/30 transition-colors data-[resize-handle-active]:bg-primary cursor-col-resize"
      />
      <Panel id="drawing" defaultSize="45" minSize="25" className="flex flex-col min-w-0 overflow-hidden">
        <SessionWhiteboard
          sessionId={sessionId}
          initialSnapshot={diagramDocument}
          onSave={onSaveDiagram}
        />
      </Panel>
      <Separator
        id="drawing-chat"
        className="min-w-2 bg-border hover:bg-primary/30 transition-colors data-[resize-handle-active]:bg-primary cursor-col-resize"
      />
      <Panel
        id="chat"
        defaultSize="30"
        minSize="12"
        maxSize="50"
        className="flex flex-col min-w-0 bg-muted/20 overflow-hidden"
      >
        <ChatPanel
          sessionId={sessionId}
          problemStatement={problem?.statement}
        />
      </Panel>
    </Group>
  );
}
