"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <div
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="
        w-14 h-7 flex items-center
        bg-gray-300 dark:bg-gray-700 
        rounded-full cursor-pointer p-1 transition-all
      "
    >
      <div
        className={`
          w-5 h-5 rounded-full bg-white dark:bg-black shadow-md transform transition-all
          ${isDark ? "translate-x-7" : ""}
        `}
      ></div>
    </div>
  );
}
