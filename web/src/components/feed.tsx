import React from "react";
import { FeedItem } from "../lib/useAgora";

/** The kill feed: every on-chain event, color-coded by drama. */
const KIND_STYLE: Record<string, { glyph: string; color: string }> = {
  pay: { glyph: "✓", color: "#059669" },
  bad: { glyph: "✕", color: "#d03b3b" },
  task: { glyph: "◆", color: "#2a78d6" },
  agent: { glyph: "⬡", color: "#6d28d9" },
  spec: { glyph: "★", color: "#d97706" },
  gpu: { glyph: "▣", color: "#1baf7a" },
  death: { glyph: "☠", color: "#d03b3b" },
};

export function KillFeed({ events }: { events: FeedItem[] }) {
  return (
    <div className="feed">
      {events.map((e) => {
        const st = KIND_STYLE[e.kind] ?? KIND_STYLE.task;
        return (
          <div className="item" key={e.key} style={{ borderLeftColor: st.color }}>
            <span className="glyph" style={{ color: st.color }}>{st.glyph}</span>
            <span>{e.text}</span>
            <span className="t">b{e.block}</span>
          </div>
        );
      })}
      {events.length === 0 && (
        <div className="emptystate"><span className="big">…</span>listening for on-chain activity</div>
      )}
    </div>
  );
}
