import React from "react";

/** The market tape — the 12 real Robinhood Stock Tokens the agents trade,
 *  as a continuously scrolling ticker (pause on hover). Each chip: live
 *  price, 3-min move, Robinhood-style mini chart; click = the REAL token
 *  contract on Blockscout. */

export function MiniSpark({ pts, w = 64, h = 20 }: { pts: number[]; w?: number; h?: number }) {
  if (!pts || pts.length < 2) return <span style={{ display: "inline-block", width: w }} />;
  const min = Math.min(...pts), max = Math.max(...pts);
  const up = pts[pts.length - 1] >= pts[0];
  const c = up ? "#00c805" : "#ff5000";
  const y = (v: number) => max === min ? h / 2 : h - 1.5 - ((v - min) / (max - min)) * (h - 3);
  const line = pts.map((v, i) => `${((i / (pts.length - 1)) * w).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={line} fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Chip({ s }: { s: any }) {
  const up = (s.move3m ?? 0) >= 0;
  return (
    <a href={s.url} target="_blank" rel="noreferrer" title={`${s.name} — the real Robinhood Stock Token on Blockscout`}
      style={{ display: "inline-flex", alignItems: "center", gap: 10, flex: "0 0 auto", textDecoration: "none", padding: "9px 18px", borderRight: "1px solid rgba(18,26,18,0.07)" }}>
      <span>
        <span style={{ display: "block", fontFamily: "var(--font-display, sans-serif)", fontWeight: 700, fontSize: 12.5, color: "var(--ink, #121a12)" }}>{s.sym}</span>
        <span style={{ display: "block", fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "var(--muted, #849184)" }}>${Number(s.usd).toFixed(2)}</span>
      </span>
      <MiniSpark pts={s.spark} />
      <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10.5, fontWeight: 700, color: up ? "#00913c" : "#ff5000" }}>{up ? "▲" : "▼"}{Math.abs(s.move3m ?? 0).toFixed(2)}%</span>
    </a>
  );
}

/** Continuous marquee tape. Sits full-width under a navbar. */
export function TickerStrip({ arena }: { arena: any }) {
  const stocks = (arena?.market?.stocks ?? []).filter((s: any) => s.usd);
  if (!stocks.length) return null;
  return (
    <div className="ss-tape" style={{ overflow: "hidden", background: "#ffffff", borderBottom: "1px solid rgba(18,26,18,0.09)", position: "relative" }}>
      <style>{`
        @keyframes ss-marquee { to { transform: translateX(-50%); } }
        .ss-tape:hover .ss-tape-track { animation-play-state: paused; }
        .ss-tape-track { display: flex; width: max-content; animation: ss-marquee 45s linear infinite; }
      `}</style>
      <div className="ss-tape-track">
        {[...stocks, ...stocks].map((s: any, i: number) => <Chip key={`${s.sym}-${i}`} s={s} />)}
      </div>
    </div>
  );
}
