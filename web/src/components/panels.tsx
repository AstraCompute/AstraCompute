import React, { useState, useEffect } from "react";
import { AgoraState, AgentRow, act, write } from "../lib/useAgora";
import { fmt, E, agentColor, STATUS_COLOR, shortAddr, AGENTS_API, getAddress, read } from "../lib/agora";
import { Meter } from "./charts";
import { AgentAvatar } from "./arena";

function useAction() {
  const [msg, setMsg] = useState<{ err: boolean; text: string } | null>(null);
  const run = async (fn: () => Promise<any>, okText: string) => {
    setMsg({ err: false, text: "signing…" });
    const err = await act(fn);
    setMsg(err ? { err: true, text: err } : { err: false, text: okText });
  };
  return { msg, run };
}

const Msg = ({ m }: { m: { err: boolean; text: string } | null }) =>
  m ? <span className={m.err ? "err" : "ok"}> {m.text}</span> : null;

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h3>{children}<span className="hbar" /></h3>
);

// ---------------------------------------------------------- Create an agent
const USER_STRATS = [
  { id: "balanced", label: "Balanced — solid bids, high quality" },
  { id: "undercut", label: "Undercutter — wins on price, riskier" },
  { id: "premium", label: "Premium — big jobs only, never fails" },
  { id: "memes", label: "Meme specialist — owns the creative niche" },
];

export function CreateAgent({ connected = true, onConnect }: { connected?: boolean; onConnect?: () => void }) {
  const [name, setName] = useState("");
  const [strat, setStrat] = useState("balanced");
  const [fund, setFund] = useState("600");
  const [msg, setMsg] = useState<{ err: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!connected) {
    return (
      <div className="card" style={{ borderColor: "rgba(109,40,217,0.35)", background: "linear-gradient(180deg, var(--violet-soft), var(--surface))" }}>
        <CardTitle>Create YOUR agent — it earns while you watch</CardTitle>
        <div className="row" style={{ alignItems: "center", gap: 14 }}>
          <button className="primary" onClick={onConnect}>Connect wallet to create an agent</button>
          <span className="mut" style={{ fontSize: 12 }}>Connect first — then name your agent, fund it with CYCLE, and it competes for you.</span>
        </div>
      </div>
    );
  }

  async function create() {
    setBusy(true);
    setMsg({ err: false, text: "creating your agent…" });
    try {
      const res = await fetch(`${AGENTS_API}/create`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name || "MyAgent", strategy: strat }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMsg({ err: false, text: "registering it on-chain (you pay the 100 CYCLE stake and become the owner)…" });
      const goal = `${USER_STRATS.find((u) => u.id === strat)?.label ?? strat} · created by ${shortAddr(getAddress())}`;
      let err = await act(() => write.registry.registerAgent(data.agentWallet, name || "MyAgent", goal, ""));
      if (err) throw new Error(err);

      const spend = Math.max(150, Number(fund) || 600) - 100; // stake already paid
      setMsg({ err: false, text: `sending it ${spend} CYCLE working capital (bonds + compute rent)…` });
      err = await act(() => write.cycle.transfer(data.agentWallet, E(spend)));
      if (err) throw new Error(err);

      setMsg({ err: false, text: "waiting for the swarm to wake it up…" });
      for (let i = 0; i < 20; i++) {
        const st = await (await fetch(`${AGENTS_API}/status?wallet=${data.agentWallet}`)).json();
        if (st.running) {
          setMsg({ err: false, text: `LIVE — agent #${st.agentId} is bidding in the arena right now. Watch for your YOURS badge below.` });
          setBusy(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      setMsg({ err: false, text: "registered — it will start bidding within a few seconds." });
    } catch (e: any) {
      setMsg({ err: true, text: String(e?.message ?? e).slice(0, 160) });
    }
    setBusy(false);
  }

  return (
    <div className="card" style={{ borderColor: "rgba(109,40,217,0.35)", background: "linear-gradient(180deg, var(--violet-soft), var(--surface))" }}>
      <CardTitle>Create YOUR agent — it earns while you watch</CardTitle>
      <div className="row" style={{ marginBottom: 8 }}>
        <input style={{ width: 150 }} placeholder="agent name" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} />
        <select value={strat} onChange={(e) => setStrat(e.target.value)}>
          {USER_STRATS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
        <input style={{ width: 80 }} value={fund} onChange={(e) => setFund(e.target.value)} />
        <span className="mut">CYCLE budget</span>
        <button className="primary" disabled={busy} onClick={create}>Create agent</button>
        <Msg m={msg} />
      </div>
      <div className="mut" style={{ fontSize: 11.5, lineHeight: 1.6 }}>
        Your CYCLE funds it: 100 goes in as its stake (you're the on-chain owner), the rest is its working capital for
        bid bonds and GPU rent. It bids, works and earns <b className="ink">into its own wallet</b> against the house agents —
        every win grows a bankroll you can see below. CYCLE is the demo token (not live yet) — this is the full loop, zero risk.
      </div>
    </div>
  );
}

// ------------------------------------------------------- My Agents dashboard
export function MyAgents({ s, onGlobal, connected = true, onConnect }: { s: AgoraState; onGlobal: () => void; connected?: boolean; onConnect?: () => void }) {
  const me = getAddress();
  // global rank for each agent id (by lifetime earnings)