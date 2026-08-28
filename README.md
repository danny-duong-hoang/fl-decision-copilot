# FL Decision Copilot (V1 Chat + CXL)

A high-efficiency, offline-capable personal copilot designed for First Line chat agents handling flight cancellations, rebooking, ancillaries, and name changes.

Built in strict compliance with the **Concentrix / ETG FL Decision Copilot Product Spec** and **JSON Rule Pack** (Phase 1a & 1b).

---

## 🌟 Key Features

1. **CEP Coach Stepper (8-Step Framework)**
   - Tracks chat progression: `1. Opening` → `2. Acknowledgement` → `3. Commitment` → `4. Probing` → `5. Solution` → `6. Agreement` → `7. Summary` → `8. Closing`.
   - **Scorecard Pre-Close QA**: 8-point checklist modal with live percentage progress to guarantee scorecard compliance before closing chat.

2. **Progressive Decision Matrix (≤4–6 Clicks to Action Card)**
   - Dynamic, cascading dropdowns:
     - Customer Request (Cancel / Rebook / Ancillary / Name Change / Refund Status)
     - Ticket State, Disruption (Force Majeure / SC), GDS/Booking System, Timing Windows (<48h, Same day void), Fare Rules, Ancillary Products (CFAR).
   - Instant matching against `paths.json`.

3. **First Line Action Card**
   - **Path Name & Criteria**: Clear identification of matched policy.
   - **FL Do Now**: Specific steps strictly within First Line authority.
   - **Say / Paste (Chat Scripts)**: 1-click preview and clipboard copy.
   - **Valid Alternatives**: Pre-approved alternatives (e.g. airport purchase, void & rebook).
   - **CRITICAL DO NOT (STOP)**: High-visibility red alert cards with forbidden actions (no false guarantees, no waiver promises, split passenger requirements).
   - **Handoff & Routing**: Target queue + 1-click formatted Zendesk Errand note.
   - **Source of Truth & Verification**: Shelf / OPS Blog reference with `last_verified` date and `needs_shelf_check` caution badges.

4. **Snippet Engine (Unikey-Improved with Fuse.js)**
   - **Trigger & Alias matching**: `@ack`, `@rebook`, `@naco`, `@void`, `@comm`, `@toolate`, `@hold`, `@idle`, `cxl`, `refund`, etc.
   - **Keyboard Navigation**: Press `/` to focus, `↑` `↓` to navigate, `Enter` to select, `Esc` to close.
   - **Variable Auto-Substitution**: Instant interactive popup for `{currency}`, `{amount}`, `{date}`, `{request}`, `{order_num}` with live preview.
   - **Auto-Copy & Toast**: 1-click copy with toast notification.

5. **Zero Hardcoded SOP Text (100% Dynamic In-Memory JSON Data)**
   - Loaded from `data/paths.json` and `data/snippets.json`.
   - Built-in **SOP & JSON Data Manager**: Edit, import, export, or reset rules and snippets directly in the browser with `localStorage` persistence.
   - 100% offline, zero backend, zero PII storage.

---

## 🚀 How to Run Locally

### Option 1: Direct Double-Click (Single HTML)
Open `dist/index.html` in any browser. Zero installation, zero server required.

### Option 2: Vite Dev Server
```bash
npm install
npm run dev
```

### Option 3: Build Singlefile Artifact
```bash
npm run build
```
Generates `dist/index.html`.
