# FL Decision Copilot — Voice V2.12 (Voice + GDS)

A high-efficiency, offline-capable local single-file copilot designed for First Line call center agents handling complex airline rebooking, cancellations, ancillaries, schedule changes, and name corrections (NACO/NACH) across Amadeus, Sabre, and LCC systems.

Built in strict compliance with the **Concentrix / ETG FL Decision Copilot Product Spec** and **JSON Rule Pack** (Sections 1 through 18b / V2.12).

---

## 🎙️ Voice Architecture & 4 Core Layers

Unlike chat-first tools, FL Decision Copilot Voice is locked for voice channels — speak cues are rendered in large, glanceable typography (18–22px+) rather than copy-pasting text, and GDS commands are formatted for single-click copy into Amadeus Selling Platform Connect or Sabre Red 360.

1. **Layer A — CEP Coach Stepper & Timer**
   - Compact stepper tracking call progression: `1` (Open) → `2` (Ack) → `3` (Commit) → `4` (Probe) → `5` (Solution) → `6` (Agree) → `7` (Summary) → `8` (Close). Full labels visible on hover.
   - **Soft Hold Timer**: 10-minute hold reminder with amber pulse when approaching the quote validity threshold.
   - **Pre-Close QA Scorecard**: 8-point checklist modal to guarantee scorecard compliance before call wrap-up.

2. **Layer B — Progressive Decision Matrix & Action Card**
   - Cascading dropdowns: Customer Request, Booking System, Ticket State, Pax Scope, Disruption Flag, Payment Context.
   - Immediate matching against 33+ verified policy paths with dynamic ranking.
   - **Action Card**:
     - Sequential **FL Do Now** steps.
     - High-visibility red **Strictly Forbidden (DO NOT)** rules (e.g. no mixed-date rebooking without splitting, no manual YQ/YR assumptions).
     - Cross-cutting alerts: **Mandatory Phone Email Verification Gate**, Coupon Status checks, Service Fee calculations.
     - Direct CTA jumping into the relevant GDS Runbook.

3. **Layer C — Voice Script Cue Engine**
   - Voice-adapted speak cues with instant variable interpolation (`{agent_name}`, `{request}`, `{solution}`, `{amount}`, `{currency}`, `{date}`).
   - Fast fuzzy search via Fuse.js triggered with `/`, `@tag`, or aliases (`@hi`, `@ack`, `@comm`, `@probe`, `@hold`, `@rebook`, `@naco`, etc.).
   - `🗣️ Spoken / Log` button + secondary `📋 Copy Text`.

4. **Layer D — GDS Live Runbook & Multi-PNR Tracker**
   - Interactive step-through for complex GDS workflows:
     - **Amadeus & Sabre Rebooking**: Split PNR (`SP1,2` → `ER` → `RTAXR`), Coupon Status check (`RTTN` / `WETR*`), Manual `FQP`/`WFRTR` reprice when ATC fails on used outbound segment, MOTO/Payment Link, Service fee, Rebooking Wizard handoff.
     - **Cancellation & Void**: Same-day void automation, 24h airline rule, BR exception, partial-pax split.
     - **Name Correction (NACO/NACH)**: Section 18 decision layer for codeshare blocks, "YY promised exception" boundary, and Supervisor callback queue.
   - **Huge Monospace Command Display**: Glanceable in <1s (20–24px font) with single-click copy.
   - **Rebooking Wizard vs Modify Order**: Clear distinction (Rebooking Wizard = keep ticket/reissue; Modify Order = refund/void).
   - **Multi-PNR Tracker**: Collapsible bottom drawer tracking multiple PNRs across GDS and LCC with cross-PNR fee rules.

---

## 🖥️ UI Density Modes (Desktop Only ≥1280px)

- **Comfort Mode (Default)**: Root font-size 15.5px, 18px panel gap, generous padding, large titles for maximum call legibility.
- **Compact Mode**: High-density view for power users via the header toggle.
- **Call Focus Mode**: Multi-PNR tracker collapses cleanly behind a bottom tab to maximize screen space for the Live Runbook and Action Card during live calls.

---

## 🔒 Access & Privacy

- **Local Gate Credentials**: `dannyduong` / `Hoangkim123`
- **Zero Backend**: 100% client-side, offline-capable single-file bundle. No external telemetry or PII storage.
- **Private Repository**: Set repository visibility to Private in GitHub settings to safeguard local access credentials.

---

## 🚀 How to Run Locally

### Option 1: Direct Double-Click (Single HTML)
Open `fl-decision-copilot-voice-v2.html` or `dist/index.html` in any modern web browser.

### Option 2: Vite Dev Server
```bash
npm install
npm run dev
```

### Option 3: Production Build
```bash
npm run build
```
Generates a self-contained, inlined single-file `dist/index.html`.
