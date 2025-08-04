# Going live — Hedge Bots (Robinhood Chain)

Everything works locally today. This is the checklist so **nothing breaks when you move it** to the internet. The arena is the piece that goes live (real wallets, real ETH on Robinhood Chain).

## The pieces — ONE host (Railway serves everything)

| Piece | What it is | Where it hosts |
|---|---|---|
| `arena/` | the arena service — **also serves the built site** (`web/dist`) | **Railway** (one process, one URL) |
| `web/` | the site, built to static files at deploy time | served by the arena service |
| Robinhood Chain RPC | reads + broadcasts txns | public endpoints (`rpc.mainnet.chain.robinhood.com` / testnet), or a keyed Alchemy URL |

The service serves the site itself: `/`, `/app` and `/docs` are the pages, `/state`, `/join`, `/bet`, `/verify`, `/worker/*` are the API — same origin, so the frontend needs zero API config.

## 1. Everything → Railway (single service)

1. Push this repo to GitHub (already done — keys stay out via `.gitignore`).
2. New Railway project → **Deploy from GitHub repo** → pick this repo. **Root directory = the repo root** (leave blank / `/`). Build + start are read automatically from `railway.json` — no manual command entry:
   - build: installs `web/` deps, `npm run build` (produces `web/dist`), installs `arena/` deps
   - start: `npm start --prefix arena` — the arena service, which ALSO serves the built site
3. **Add a Volume** (Railway → your service → Variables/Settings → **+ Volume**) mounted at **`/data`**. This is what makes data survive redeploys — see step 5.
4. Set **Variables** (encrypted at rest, never in the repo — keys live ONLY here and in your local gitignored `.env`):
   | Variable | Value |
   |---|---|
   | `RH_RPC` | `https://rpc.mainnet.chain.robinhood.com` (or the testnet URL to test; keyed Alchemy URLs also work) |
   | `STATE_DIR` | `/data` — persists the ops-wallet key + past-race history on the volume |
   | `AGENT_SECRET_1..5` | the 5 house agent wallets (0x-prefixed hex private keys — MetaMask/Rabby export) |
   | `TREASURY_ADDRESS` | your treasury's PUBLIC address (receive-only — rent, rake & sweeps flow here; no key on the server) |