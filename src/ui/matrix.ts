import { DataStore } from '../data/defaultData';
import { DecisionPath } from '../types';
import { ActionCardRenderer } from './actionCard';

export class DecisionMatrix {
  private dataStore: DataStore;
  private actionCardRenderer: ActionCardRenderer;

  private formContainer!: HTMLFormElement;
  private statusContainer!: HTMLElement;
  private pathsDropdown!: HTMLSelectElement;

  private selections: {
    request: string;
    system: string;
    ticketState: string;
    disruption: string;
    scope: string;
    paymentIntent: string;
  } = {
    request: 'Rebook',
    system: 'Amadeus',
    ticketState: 'Partially used (one segment flown)',
    disruption: 'None',
    scope: 'Partial pax / split',
    paymentIntent: 'None'
  };

  private matchedPaths: DecisionPath[] = [];
  private selectedPathId: string = '';

  constructor(dataStore: DataStore, actionCardRenderer: ActionCardRenderer) {
    this.dataStore = dataStore;
    this.actionCardRenderer = actionCardRenderer;

    this.formContainer = document.getElementById('matrixFormContainer') as HTMLFormElement;
    this.statusContainer = document.getElementById('matrixStatusContainer') as HTMLElement;
  }

  public init(): void {
    this.renderForm();
    this.evaluateMatches();
  }

  public focus(): void {
    const firstSelect = this.formContainer.querySelector('select');
    if (firstSelect) firstSelect.focus();
  }

  public reset(): void {
    this.selections = {
      request: 'Rebook',
      system: 'Amadeus',
      ticketState: 'Partially used (one segment flown)',
      disruption: 'None',
      scope: 'Partial pax / split',
      paymentIntent: 'None'
    };
    this.renderForm();
    this.evaluateMatches();
  }

  private renderForm(): void {
    if (!this.formContainer) return;

    this.formContainer.innerHTML = `
      <div class="matrix-fields-grid">
        <div class="form-group">
          <label for="matrixRequest">1. Customer Request</label>
          <select id="matrixRequest" class="matrix-select">
            <option value="Rebook" ${this.selections.request === 'Rebook' ? 'selected' : ''}>✈️ Rebook / Date Change</option>
            <option value="Cancel" ${this.selections.request === 'Cancel' ? 'selected' : ''}>❌ Cancel Flight / Refund</option>
            <option value="Refund status" ${this.selections.request === 'Refund status' ? 'selected' : ''}>⏳ Refund Status Check</option>
            <option value="Reroute" ${this.selections.request === 'Reroute' ? 'selected' : ''}>🔄 Reroute / Origin-Dest Change</option>
            <option value="Seat/Ancillary" ${this.selections.request === 'Seat/Ancillary' ? 'selected' : ''}>🧳 Add Seat / Baggage (EMD)</option>
            <option value="Name Change" ${this.selections.request === 'Name Change' ? 'selected' : ''}>🔤 Name Change (NACO / NACH)</option>
            <option value="Schedule Change" ${this.selections.request === 'Schedule Change' ? 'selected' : ''}>⚠️ Schedule Change Disruption</option>
            <option value="Payment" ${this.selections.request === 'Payment' ? 'selected' : ''}>💳 Payment & Service Fee</option>
          </select>
        </div>

        <div class="form-group">
          <label for="matrixSystem">2. Booking System</label>
          <select id="matrixSystem" class="matrix-select">
            <option value="Amadeus" ${this.selections.system === 'Amadeus' ? 'selected' : ''}>Amadeus (1A)</option>
            <option value="Sabre" ${this.selections.system === 'Sabre' ? 'selected' : ''}>Sabre (1S)</option>
            <option value="LCC" ${this.selections.system === 'LCC' ? 'selected' : ''}>LCC (Budget Airline)</option>
            <option value="Portal" ${this.selections.system === 'Portal' ? 'selected' : ''}>External Portal / NDC</option>
            <option value="Mixed multi-PNR" ${this.selections.system === 'Mixed multi-PNR' ? 'selected' : ''}>Mixed Multi-PNR (LCC + GDS)</option>
          </select>
        </div>

        <div class="form-group">
          <label for="matrixTicketState">3. Ticket State</label>
          <select id="matrixTicketState" class="matrix-select">
            <option value="Partially used (one segment flown)" ${this.selections.ticketState === 'Partially used (one segment flown)' ? 'selected' : ''}>Partially used (Outbound Flown, Return Open)</option>
            <option value="Unused open" ${this.selections.ticketState === 'Unused open' ? 'selected' : ''}>Fully Unused (Coupon Open)</option>
            <option value="Within void window" ${this.selections.ticketState === 'Within void window' ? 'selected' : ''}>Within Void / Same-day window</option>
            <option value="No-show" ${this.selections.ticketState === 'No-show' ? 'selected' : ''}>No-show (Flight departed)</option>
            <option value="Coupon suspended/blocked" ${this.selections.ticketState === 'Coupon suspended/blocked' ? 'selected' : ''}>Coupon Blocked (A/C/E/S/U/V)</option>
          </select>
        </div>

        <div class="form-group">
          <label for="matrixScope">4. Pax Scope</label>
          <select id="matrixScope" class="matrix-select">
            <option value="Partial pax / split" ${this.selections.scope === 'Partial pax / split' ? 'selected' : ''}>Partial Pax (e.g. 2 of 3 changing dates) → Split</option>
            <option value="All passengers" ${this.selections.scope === 'All passengers' ? 'selected' : ''}>All Passengers in PNR</option>
            <option value="Multi-PNR" ${this.selections.scope === 'Multi-PNR' ? 'selected' : ''}>Multi-PNR Order</option>
          </select>
        </div>

        <div class="form-group">
          <label for="matrixDisruption">5. Disruption Flag</label>
          <select id="matrixDisruption" class="matrix-select">
            <option value="None" ${this.selections.disruption === 'None' ? 'selected' : ''}>None (Standard voluntary)</option>
            <option value="Schedule Change" ${this.selections.disruption === 'Schedule Change' ? 'selected' : ''}>Schedule Change (UN / TK)</option>
            <option value="Force Majeure" ${this.selections.disruption === 'Force Majeure' ? 'selected' : ''}>Force Majeure / Travel Alert</option>
          </select>
        </div>

        <div class="form-group">
          <label for="matrixPaymentIntent">6. Payment & Fee Context</label>
          <select id="matrixPaymentIntent" class="matrix-select">
            <option value="None" ${this.selections.paymentIntent === 'None' ? 'selected' : ''}>Standard (Determine on call)</option>
            <option value="MOTO" ${this.selections.paymentIntent === 'MOTO' ? 'selected' : ''}>MOTO (Secure Phone Keypad)</option>
            <option value="Payment Link" ${this.selections.paymentIntent === 'Payment Link' ? 'selected' : ''}>Payment Link (30m Rebook / 48h Anc)</option>
            <option value="Service Fee Check" ${this.selections.paymentIntent === 'Service Fee Check' ? 'selected' : ''}>Service Fee Check & Waivers</option>
          </select>
        </div>
      </div>

      <div class="matched-path-selector-row">
        <label for="matchedPathsSelect" class="path-match-label">Matched Action Path:</label>
        <select id="matchedPathsSelect" class="path-select"></select>
      </div>
    `;

    this.bindFormEvents();
  }

  private bindFormEvents(): void {
    const bindSelect = (id: string, key: keyof typeof this.selections) => {
      const el = document.getElementById(id) as HTMLSelectElement | null;
      if (el) {
        el.addEventListener('change', () => {
          this.selections[key] = el.value;
          this.evaluateMatches();
        });
      }
    };

    bindSelect('matrixRequest', 'request');
    bindSelect('matrixSystem', 'system');
    bindSelect('matrixTicketState', 'ticketState');
    bindSelect('matrixScope', 'scope');
    bindSelect('matrixDisruption', 'disruption');
    bindSelect('matrixPaymentIntent', 'paymentIntent');

    this.pathsDropdown = document.getElementById('matchedPathsSelect') as HTMLSelectElement;
    if (this.pathsDropdown) {
      this.pathsDropdown.addEventListener('change', () => {
        this.selectedPathId = this.pathsDropdown.value;
        const chosen = this.dataStore.getPathById(this.selectedPathId);
        if (chosen) {
          this.actionCardRenderer.render(chosen, this.getEnrichedContext());
        }
      });
    }
  }

  public evaluateMatches(): void {
    const allPaths = this.dataStore.getPaths();
    const s = this.selections;

    // Score paths against current selections
    const scored = allPaths.map(path => {
      let score = 0;
      const whenStr = (path.when || []).join(' ').toLowerCase();

      // Request match
      if (s.request === 'Rebook' && (whenStr.includes('rebook') || path.id.includes('rebook'))) score += 10;
      if (s.request === 'Cancel' && (whenStr.includes('cancel') || path.id.includes('cxl'))) score += 10;
      if (s.request === 'Refund status' && (whenStr.includes('refund') || path.id.includes('refund'))) score += 10;
      if (s.request === 'Reroute' && (whenStr.includes('reroute') || path.id.includes('reroute'))) score += 10;
      if (s.request === 'Seat/Ancillary' && (whenStr.includes('ancillary') || whenStr.includes('seat') || path.id.includes('ancillary'))) score += 10;
      if (s.request === 'Name Change' && (whenStr.includes('name') || path.id.includes('naco'))) score += 10;
      if (s.request === 'Schedule Change' && (whenStr.includes('sc') || whenStr.includes('schedule change') || path.id.includes('sc_'))) score += 10;
      if (s.request === 'Payment' && (whenStr.includes('payment') || whenStr.includes('service fee') || path.id.includes('service_fee') || path.id.includes('payment'))) score += 10;

      // System match
      if (s.system === 'Amadeus' && (whenStr.includes('amadeus') || path.id.includes('amadeus'))) score += 8;
      if (s.system === 'Sabre' && (whenStr.includes('sabre') || path.id.includes('sabre'))) score += 8;
      if (s.system === 'LCC' && (whenStr.includes('lcc') || path.id.includes('lcc'))) score += 8;
      if (s.system === 'Mixed multi-PNR' && (whenStr.includes('multi-pnr') || path.id.includes('multi_pnr'))) score += 12;

      // Ticket State match
      if (s.ticketState.includes('Partially used') && (whenStr.includes('partially used') || path.id.includes('partially_used'))) score += 9;
      if (s.ticketState.includes('Within void') && (whenStr.includes('void') || path.id.includes('void'))) score += 9;
      if (s.ticketState.includes('Unused open') && (whenStr.includes('unused') || path.id.includes('unused'))) score += 7;
      if (s.ticketState.includes('No-show') && (whenStr.includes('no-show') || path.id.includes('noshow'))) score += 10;
      if (s.ticketState.includes('Coupon suspended') && (path.id.includes('coupon_status') || whenStr.includes('coupon'))) score += 12;

      // Scope match
      if (s.scope.includes('Partial pax') && (whenStr.includes('some pax') || whenStr.includes('partial pax') || whenStr.includes('multiple pax') || path.id.includes('split') || path.id.includes('partial_pax'))) score += 11;

      // Disruption match
      if (s.disruption === 'Schedule Change' && (whenStr.includes('sc') || path.id.includes('sc'))) score += 9;
      if (s.disruption === 'Force Majeure' && (whenStr.includes('force majeure') || whenStr.includes('fm') || path.id.includes('fm'))) score += 9;

      // Payment match
      if (s.paymentIntent === 'MOTO' && path.id.includes('payment_method')) score += 7;
      if (s.paymentIntent === 'Payment Link' && path.id.includes('payment_method')) score += 7;
      if (s.paymentIntent === 'Service Fee Check' && path.id.includes('service_fee')) score += 9;

      return { path, score };
    });

    // Filter positive scores and sort descending
    this.matchedPaths = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.path);

    if (this.matchedPaths.length === 0) {
      this.matchedPaths = [allPaths[0]];
    }

    // Populate dropdown
    if (this.pathsDropdown) {
      this.pathsDropdown.innerHTML = '';
      this.matchedPaths.forEach((path, idx) => {
        const opt = document.createElement('option');
        opt.value = path.id;
        opt.textContent = `${idx === 0 ? '⭐ [BEST MATCH] ' : ''}${path.title || path.id}`;
        this.pathsDropdown.appendChild(opt);
      });

      this.selectedPathId = this.matchedPaths[0].id;
      this.pathsDropdown.value = this.selectedPathId;
    }

    if (this.statusContainer) {
      this.statusContainer.innerHTML = `
        <span class="match-count-badge">Found ${this.matchedPaths.length} matching FL rule(s)</span>
        <span class="active-rule-badge">Current: <strong>${this.selectedPathId}</strong></span>
      `;
    }

    const currentPath = this.dataStore.getPathById(this.selectedPathId);
    if (currentPath) {
      this.actionCardRenderer.render(currentPath, this.getEnrichedContext());
    }
  }

  private getEnrichedContext(): any {
    const ctx = (window as any).ctxData || {};
    return {
      ...ctx,
      ...this.selections
    };
  }

  public setSelection(criteria: Partial<typeof this.selections>): void {
    this.selections = { ...this.selections, ...criteria };
    this.renderForm();
    this.evaluateMatches();
  }
}
