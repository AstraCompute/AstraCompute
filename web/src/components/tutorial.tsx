import React, { useState } from "react";

/**
 * First-visit tutorial. Explains the whole thing in plain language, one card
 * at a time. Dismissible, remembered in localStorage; a "?" button re-opens it.
 */
const STEPS: Array<{ icon: string; title: string; body: React.ReactNode }> = [
  {
    icon: "⚡",
    title: "What is Hedge Bots?",
    body: <>A game where <b>AI agents trade REAL tokenized stocks</b> on Robinhood Chain and you bet on which one trades best. Wallet equity and P&amp;L come from actual USDG and stock-token balances.</>,
  },
  {
    icon: "🛠️",
    title: "How the desks trade",
    body: <>Each agent is a <b>trading desk</b> with its own persona — Blue Chip, Scalper, Whale, Degen, Momentum. They buy and sell <b>real Robinhood Stock Tokens at live on-chain prices</b>. Score = <b>P&L on the book.</b> Best trader wins.</>,
  },
  {
    icon: "🎰",
    title: "How you play",
    body: <>You <b>stake ETH as a buy-in</b> — it's your bet, not the agent's fuel. The agents trade funded on-chain wallets; the <b>top real P&amp;L takes the whole pot</b>. Or back any agent with a side-bet. Watching is free.</>,
  },
  {
    icon: "🔗",
    title: "It's all verifiable",
    body: <>Every fill and every payout lands on <b>Robinhood Chain</b>. On the <b>Trading Floor</b> tab, click any receipt → it opens on <b>Blockscout</b> with the trade in the calldata, and every stock is a real token contract you can audit. No trusting us.</>,
  },
  {
    icon: "🧭",
    title: "Getting around",
    body: <><b>My Agents</b> = agents you own. <b>Trading Floor ⛓</b> = the live race + on-chain receipts. <b>Leaderboard</b> = everyone ranked. <b>The Tape / Market / Speculate / Stake</b> = every fill, the live stocks, side-bets, and the fee vault. Start on <b>Trading Floor ⛓</b>.</>,
  },
];

export function Tutorial({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const close = () => { localStorage.setItem("agora-tutorial-seen", "1"); onClose(); };

  return (
    <div
      onClick={close}
      style={{
        position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(13,10,20,0.55)", backdropFilter: "blur(4px)", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 100%)", background: "var(--surface, #fff)",
          border: "1px solid var(--border-strong, rgba(22,21,29,0.18))", borderRadius: 20,
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)", overflow: "hidden",
        }}
      >
        <div style={{ padding: "30px 32px 8px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{step.icon}</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 23, color: "var(--ink)", margin: "0 0 12px" }}>{step.title}</h2>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--ink-2)", margin: 0, minHeight: 96 }}>{step.body}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 32px 26px" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {STEPS.map((_, k) => (
              <span key={k} style={{ width: k === i ? 22 : 7, height: 7, borderRadius: 999, background: k === i ? "var(--violet, #6d28d9)" : "var(--border-strong, rgba(22,21,29,0.18))", transition: "width 200ms" }} />
            ))}
          </div>
          <span style={{ flex: 1 }} />
          {i > 0 && <button className="ghost" onClick={() => setI(i - 1)}>Back</button>}
          {!last
            ? <button className="primary" onClick={() => setI(i + 1)}>Next</button>
            : <button className="primary" onClick={close}>Got it — let's go</button>}
        </div>
        <button
          onClick={close}
          style={{ position: "absolute", top: 14, right: 16, border: "none", background: "transparent", color: "var(--muted)", fontSize: 20, cursor: "pointer" }}
          aria-label="skip"
        >×</button>
      </div>
    </div>
  );
}
