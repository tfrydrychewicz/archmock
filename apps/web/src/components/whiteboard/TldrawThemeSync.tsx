"use client";

import { useEffect } from "react";
import { useEditor } from "tldraw";
import { useTheme } from "@/components/theme/ThemeProvider";

/** Syncs app theme (light/dark/system) to tldraw's color scheme. Must be rendered inside Tldraw. */
export function TldrawThemeSync() {
  const editor = useEditor();
  const { theme } = useTheme();

  useEffect(() => {
    editor.user.updateUserPreferences({
      colorScheme: theme,
    });
  }, [editor, theme]);

  return null;
}
