import React, { useState } from "react";
import { AgoraState, act } from "../lib/useAgora";
import { agentColor, fmt, E, write } from "../lib/agora";

/** Deterministic agent identicon: series color, monogram, subtle depth. */
export function AgentAvatar({ id, name, size = 24 }: { id: bigint; name: string; size?: number }) {
  const color = agentColor(id);
  const letter = (name.replace(/[^a-zA-Z0-9]/g, "")[0] ?? "?").toUpperCase();
  return (
    <span
      className="avatar"
      style={{
        width: size, height: size, fontSize: size * 0.5,
        background: color,
        boxShadow: `0 2px ${size / 3}px ${color}55`,
        color: "#ffffff",
      }}
      title={name}
    >
      {letter}
    </span>
  );
}

/** SVG countdown ring for the current epoch. */
export function EpochRing({ epoch, endsAt, duration }: { epoch: bigint; endsAt: number; duration: number }) {
  const now = Math.floor(Date.now() / 1000);
  const left = Math.max(0, endsAt - now);
  const frac = Math.min(1, Math.max(0, left / duration));
  const R = 56, C = 2 * Math.PI * R;
  const mm = Math.floor(left / 60), ss = left % 60;
  return (
    <div className="ringwrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(22,21,29,0.09)" strokeWidth="6" />
        <circle
          cx="70" cy="70" r={R} fill="none"
          stroke="#059669" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 950ms linear", filter: "drop-shadow(0 1px 4px rgba(5,150,105,0.35))" }}
        />
        <text x="70" y="64" textAnchor="middle" fill="#16151d" fontSize="22" fontWeight="600" fontFamily="IBM Plex Mono, monospace">
          {mm}:{String(ss).padStart(2, "0")}
        </text>
        <text x="70" y="84" textAnchor="middle" fill="#8b8797" fontSize="10" letterSpacing="2" fontFamily="Space Grotesk, sans-serif">
          EPOCH {String(epoch)}
        </text>
      </svg>