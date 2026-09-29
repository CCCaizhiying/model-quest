"use client";

import { useEffect, useRef, useState } from "react";

/** 经典 JRPG 打字机对话框：文字逐字浮现，点击跳过 */
export function DialogBox({
  text,
  speed = 45,
  className = "",
  gold = false,
}: {
  text: string;
  speed?: number;
  className?: string;
  gold?: boolean;
}) {
  const [shown, setShown] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    setShown(0);
    doneRef.current = false;
    const timer = setInterval(() => {
      setShown((s) => {
        if (s >= text.length) {
          clearInterval(timer);
          doneRef.current = true;
          return s;
        }
        return s + 1;
      });
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  const done = shown >= text.length;
  return (
    <div
      className={`rpg-window ${gold ? "rpg-window--gold" : ""} cursor-pointer select-none ${className}`}
      onClick={() => setShown(text.length)}
      title="点击快进"
    >
      <p className="text-sm leading-6 text-paper">
        {text.slice(0, shown)}
        {!done && <span className="typewriter__cursor" />}
      </p>
    </div>
  );
}
