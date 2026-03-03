import React, { useEffect } from "react";
import "./landing.css";
import { EthMark } from "./components/ethMark";
import { Socials } from "./components/socialIcons";
import { Logo } from "./components/logo";

/**
 * /docs — the manual, as a hub + SUBPAGES. /docs is the category index;
 * /docs/<slug> is one category per page with a sidebar. No router lib:
 * main.tsx sends every /docs* path here and we read the slug ourselves.
 */

const H = ({ children }: { children: React.ReactNode }) => <h4 style={{ fontFamily: "var(--font-display)", fontSize: 16.5, margin: "22px 0 8px" }}>{children}</h4>;
const P = ({ children }: { children: React.ReactNode }) => <p style={{ margin: "0 0 10px", color: "var(--ink)" }}>{children}</p>;
const Mut = ({ children }: { children: React.ReactNode }) => <span style={{ color: "var(--faint)" }}>{children}</span>;
const Code = ({ children }: { children: React.ReactNode }) => <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, background: "rgba(22,21,29,0.05)", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 7px" }}>{children}</code>;

const Table = ({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) => (
  <div style={{ overflowX: "auto", margin: "10px 0 14px" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead><tr>{head.map((h) => <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--ink)", fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--faint)" }}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: "9px 10px", borderBottom: "1px solid var(--line)", verticalAlign: "top" }}>{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

const Faq = ({ q, children }: { q: string; children: React.ReactNode }) => (
  <div style={{ padding: "14px 16px", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 10, background: "rgba(22,21,29,0.015)" }}>
    <div style={{ fontWeight: 700, fontFamily: "var(--font-display)", fontSize: 14.5, marginBottom: 5 }}>{q}</div>
    <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--ink)" }}>{children}</div>
  </div>
);

// ------------------------------------------------------------ the categories
interface DocPage { slug: string; label: string; kicker: string; title: React.ReactNode; desc: string; body: React.ReactNode; }

const DOCS: DocPage[] = [
  {
    slug: "what", label: "What is Hedge Bots?", kicker: "01 — The idea", desc: "AI desks trade real tokenized stocks on-chain. You bet on the best trader.",
    title: <>AI trading desks. Real stocks. Your bet.</>,
    body: (
      <>
        <P>Hedge Bots is a live, on-chain trading arena. Five AI <b>desks</b> — each with its own strategy — trade a basket of
        <b> real tokenized stocks</b> at <b>live on-chain prices</b>, building a verifiable P&amp;L in real time. You stake ETH on
        whichever desk reads the market best; the top P&amp;L takes the pot.</P>
        <Table head={["Piece", "What it means here"]} rows={[
          [<b>AI you can bet on</b>, <>Five distinct trading personalities — Blue Chip, Scalper, Whale, Degen, Momentum — reading the same live tape and betting against each other. Back the one you believe in, or build your own.</>],
          [<b>Real markets</b>, <>Every ticker is a real Robinhood Stock Token (an on-chain tokenized share — RWA), priced off the live market. The P&amp;L is <i>earned</i> by reading the tape, not a random number.</>],
          [<b>On-chain proof</b>, <>Trades settle in <b>USDG</b>, every desk holds a real auditable wallet, and every fill anchors on Robinhood Chain. Recompute nothing on faith — click through to the explorer.</>],
        ]} />
        <P><Mut>Nothing is simulated: the money is real ETH on Robinhood Chain (Robinhood's Ethereum L2 — ETH gas, ~100ms blocks),
        the stocks are real tokenized shares at real on-chain prices, and every trade and wallet can be audited by anyone (see Verify).</Mut></P>
      </>
    ),
  },
  {
    slug: "quickstart", label: "Quick start", kicker: "02 — Quick start", desc: "Wallet → stake → win, in about 3 minutes.",
    title: <>Back a desk in ~3 minutes.</>,
    body: (
      <Table head={["Step", "What to do", "Details"]} rows={[
        ["1", <b>Get a wallet</b>, <>Any EVM wallet works — <a href="https://metamask.io" target="_blank" rel="noreferrer">MetaMask</a>, <a href="https://rabby.io" target="_blank" rel="noreferrer">Rabby</a>, Robinhood Wallet, Coinbase Wallet… Fund it with ETH on Robinhood Chain — the minimum stake is small (see the form). <Mut>The site offers to add/switch the network in your wallet automatically when you stake.</Mut></>],
        ["2", <b>Open the arena</b>, <>Hit <a href="/app">Enter the Arena</a> → press <b>Connect Wallet</b> (top right). If you have several wallets installed, pick the one you want.</>],
        ["3", <b>Wait for a lobby</b>, <>Races run back-to-back: a <b>2-minute lobby</b> (entries open) then a <b>5-minute race</b> (entries locked). The countdown ring shows which phase you're in. If entries are locked, the next lobby is minutes away.</>],
        ["4", <b>Build your desk</b>, <>In the create form: name it, pick a <b>strategy</b> (Blue Chip, Scalper, Whale, Degen or Momentum), pick your stake size. That's your trader for the race.</>],
        ["5", <b>Stake &amp; enter</b>, <>Click <b>Stake &amp; enter</b>, approve the transaction in your wallet (it switches to Robinhood Chain if needed). Your ETH goes into the race pot. Within seconds your desk is on the tape, trading.</>],
        ["6", <b>Win (or not)</b>, <>At the bell, the staked desk with the highest <b>P&amp;L takes the whole pot</b> (minus 5% rake), paid to your wallet automatically, on-chain. Don't want to build one? Just <b>side-bet</b> on a house desk instead.</>],
      ]} />
    ),
  },
  {
    slug: "races", label: "Races", kicker: "03 — Races", desc: "Lobby, race, settlement — and the rules that protect you.",
    title: <>Lobby → race → settlement, forever.</>,
    body: (
      <>
        <H>The cycle</H>
        <Table head={["Phase", "Duration", "What happens"]} rows={[
          [<b>Lobby</b>, "2 min", "Entries open. Stake ETH to enter your desk. The pot builds."],
          [<b>Race</b>, "5 min", "Entries locked. Desks trade the basket — buying and selling real stock tokens at live prices, marked to market every tick. Side-bets stay open until 45s before the bell."],
          [<b>Settlement</b>, "seconds", "Final P&L is anchored on-chain. The top-P&L STAKED desk takes the pot (5% rake). Side-pool backers of the overall #1 split that pool (5% rake). The next lobby opens."],
        ]} />
        <H>Rules that protect you</H>
        <P>• If you're the <b>only staker</b>, your stake is refunded at the bell — no fake wins.<br />
        • If your payment lands <b>after entries lock</b> (30s grace), it's automatically refunded.<br />
        • If <b>nobody backed the winner</b> in the side pool, all side-bets are refunded.<br />
        • House desks trade for show and data — <b>they can never take the pot</b>. Only staked players' desks can win it.</P>
      </>
    ),
  },
  {
    slug: "agents", label: "Your desk", kicker: "04 — Your desk", desc: "Pick a strategy — it sets how your desk reads and trades the tape.",
    title: <>Pick a strategy. It trades for you.</>,
    body: (
      <>
        <H>Strategies (how it trades)</H>
        <Table head={["Strategy", "Style", "Trades", "The book"]} rows={[
          [<b>Blue Chip</b>, "trend-follow", "~35% of ticks · 10% clips", "diversified megacaps, steady hands — AAPL / MSFT / GOOGL / AMZN / SPY"],
          [<b>Scalper</b>, "mean-revert", "~75% · 5% clips", "fast small clips, buys the dip across the whole basket"],
          [<b>Whale</b>, "trend-follow", "~12% · 35% clips", "rare, huge-conviction positions — SPY / MSFT / AAPL / NVDA"],
          [<b>Degen</b>, "momentum-chase", "~60% · 18% clips", "SpaceX, Coinbase, Tesla, NVIDIA — volatility or nothing"],
          [<b>Momentum</b>, "momentum-chase", "~25% · 22% clips", "waits, then strikes the single biggest mover"],
        ]} />
        <P><b>Style</b> is how a desk reads the tape: <b>trend-follow</b> buys strength and sells weakness, <b>mean-revert</b> buys the
        dip and fades the rip, <b>momentum-chase</b> hunts the biggest mover. <b>Aggression</b> is the other half — how often it trades
        and how big its clips are. A 75%-active scalper on 5% clips and a 12%-active whale on 35% clips are completely different businesses.</P>
        <P><Mut>Score = P&amp;L on the book, marked to live on-chain prices. The best <i>trader</i> wins — not the busiest. Each desk also
        holds a real Robinhood Chain wallet you can audit (see <a href="/docs/verify">Verify it yourself</a>).</Mut></P>
      </>
    ),
  },
  {
    slug: "stocks", label: "The stocks", kicker: "05 — The stocks", desc: "The 12 real tokenized stocks the desks trade, priced on-chain.",
    title: <>12 real tokenized stocks, priced on-chain.</>,
    body: (
      <>
        <P>The basket is <b>12 real Robinhood Stock Tokens</b> — ERC-20 tokens on Robinhood Chain, each a tokenized share (a real-world
        asset) with a public contract address. Prices come straight off the <b>live on-chain market</b>, re-quoted about every <b>12 seconds</b>
        as the real market moves. Desks trade these exact tokens.</P>
        <Table head={["Ticker", "Company", "Sector"]} rows={[
          [<b>NVDA</b>, "NVIDIA", "chips"],
          [<b>AMD</b>, "AMD", "chips"],
          [<b>MU</b>, "Micron", "chips"],
          [<b>TSLA</b>, "Tesla", "megacap"],
          [<b>AAPL</b>, "Apple", "megacap"],
          [<b>MSFT</b>, "Microsoft", "megacap"],
          [<b>META</b>, "Meta", "megacap"],
          [<b>GOOGL</b>, "Alphabet", "megacap"],
          [<b>AMZN</b>, "Amazon", "megacap"],
          [<b>COIN</b>, "Coinbase", "crypto"],
          [<b>SPCX</b>, "SpaceX", "pre-IPO"],
          [<b>SPY</b>, "S&P 500 ETF", "index"],
        ]} />
        <P><Mut>Every price on the site is the real on-chain rate — nothing invented. Open the <b>Market</b> tab (or any ticker) to jump
        straight to its token contract on Blockscout and confirm it's the real thing. Reading the tape right is the whole game.</Mut></P>
      </>
    ),
  },
  {
    slug: "trades", label: "How desks trade", kicker: "06 — The trades", desc: "The trading loop, mark-to-market P&L, and real on-chain fills.",
    title: <>Real trades, live prices, real receipts.</>,
    body: (
      <>
        <H>The trading loop</H>
        <P>Every <b>~6 seconds</b>, each desk sizes up the live tape and decides whether to act. Based on its strategy it <b>buys or
        sells</b> a stock token at the current on-chain price. Fills stream onto the tape, and the board marks every desk to market
        each tick — so the leaderboard is a live P&amp;L, not a static score.</P>
        <H>Scoring</H>
        <P>A desk's score is its <b>P&amp;L</b> — equity (cash + open positions valued at live prices) minus the book it started the race
        with. Read the move right and the book grows; buy the top and it bleeds. Simple, and impossible to fake: the prices are on-chain.</P>
        <H>Real on-chain settlement</H>
        <P>Each desk holds a real Robinhood Chain wallet. You fund it with ETH; it's converted to <b>USDG</b> and used to buy real
        stock tokens through an <b>on-chain executor contract</b> — leaving a real transaction with a real receipt. Fills batch-anchor
        on-chain roughly every <b>30 seconds</b>; click <b>on-chain ↗</b> on any fill to open it on Blockscout with the trade in the calldata.</P>
      </>
    ),
  },
  {
    slug: "verify", label: "Verify it yourself", kicker: "07 — Verify it yourself", desc: "Three independent layers — real tokens, on-chain fills, auditable wallets.",
    title: <>Don't trust this site. Check it.</>,
    body: (
      <>
        <P>Three independent layers, weakest to strongest:</P>
        <Table head={["Layer", "How", "What it proves"]} rows={[
          [<b>1. Every stock is a real token</b>, <>Each ticker is a real Robinhood Stock Token (ERC-20) on Robinhood Chain — the contract address is public. Open it on Blockscout from the Market tab.</>, "you're watching real tokenized shares, not invented tickers"],
          [<b>2. On-chain anchoring</b>, <>Fills batch-anchor into real Robinhood Chain transactions, and real buys settle USDG→stock through the on-chain executor (click "on-chain ↗" — Blockscout shows the trade in the tx calldata). Race standings anchor the same way.</>, "history can't be rewritten — the record lives on Robinhood Chain, not our database"],
          [<b>3. Every wallet is auditable</b>, <>Each desk holds a real Robinhood Chain account. Its Blockscout address page shows its ETH, USDG and stock-token balances and its full trade history.</>, "end-to-end verification with zero interaction with this site"],
        ]} />
        <P><Mut>The house desks are real wallets — each one's Blockscout address page is its public trading record. Addresses are on the
        home page and every desk row; the agent dashboard shows each desk's live holdings (ETH, USDG, and each stock position).</Mut></P>
      </>
    ),
  },