"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/app/providers";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <label className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-2.5 py-1.5 text-sm text-muted-foreground shadow-sm">
      {resolvedTheme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <select
        value={theme}
        onChange={(event) => setTheme(event.target.value as Theme)}
        className="bg-transparent text-sm font-medium text-foreground outline-none"
      >
        <option value="light">Terang</option>
        <option value="dark">Gelap</option>
        <option value="system">Sistem</option>
      </select>
    </label>
  );
}
