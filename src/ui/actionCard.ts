import { DecisionPath } from '../types';
import { ScriptCueEngine } from './scriptCue';

export class ActionCardRenderer {
  private container!: HTMLElement;
  private scriptCueEngine: ScriptCueEngine;
  private onSelectRunbookCallback?: (runbookId: string) => void;

  constructor(scriptCueEngine: ScriptCueEngine, onSelectRunbook?: (runbookId: string) => void) {
    this.scriptCueEngine = scriptCueEngine;
    this.onSelectRunbookCallback = onSelectRunbook;
    this.container = document.getElementById('actionCardContainer') as HTMLElement;
  }

  public init(): void {
    this.renderEmpty();
  }

  public renderEmpty(): void {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="empty-action-card">
        <div class="empty-icon">🔀</div>
        <h3>No Path Selected</h3>
        <p>Select criteria in the Decision Matrix to display the authoritative First Line Action Card, FL steps, and forbidden rules.</p>
      </div>
    `;
  }

  public render(path: DecisionPath, contextData: any = {}): void {
    if (!this.container) return;

    // Check cross-cutting rules
    const isPhoneVoluntaryChange = (
      (contextData.request === 'Rebook' || contextData.request === 'Cancel' || contextData.request === 'Name Change') &&
      contextData.ticketState !== 'Just booked (within void window)'
    );

    const isBcom = contextData.brand === 'BCOM';
    const isPartialPax = contextData.partialPax || contextData.scope === 'Partial pax / split';

    let runbookTargetId = '';
    if (path.id.includes('rebook_partial') || isPartialPax) {
      runbookTargetId = 'amadeus_rebook_partial_pax';
    } else if (path.id.includes('amadeus_rebooking') || path.id.includes('unused')) {
      runbookTargetId = 'amadeus_rebook_unused_atc';
    } else if (path.id.includes('sabre_rebook') || path.id.includes('sabre')) {
      runbookTargetId = 'sabre_rebook_partial_pax';
    } else if (path.id.includes('cxl_void_partial')) {
      runbookTargetId = 'gds_cxl_void_partial_pax_manual';
    } else if (path.id.includes('fare_rules_voluntary') || path.id.includes('cxl')) {
      runbookTargetId = 'gds_cxl_fare_rules_voluntary';
    } else if (path.id.includes('ancillary')) {
      runbookTargetId = 'gds_ancillary_paid';
    }

    this.container.innerHTML = `
      <div class="action-card-content">
        <!-- Header & Status Badges -->
        <div class="card-top-meta">
          <div class="card-path-identity">
            <span class="path-badge-id">${path.id}</span>
            <span class="path-authority-tag">FL AUTHORITY</span>
          </div>
          <div class="card-status-badges">
            ${path.needs_shelf_check ? '<span class="badge-shelf-warn">⚠️ NEEDS SHELF CHECK</span>' : '<span class="badge-verified">✓ Verified Shelf</span>'}
            <span class="badge-date">Date: ${path.last_verified}</span>
          </div>
        </div>

        <h2 class="card-path-title">${path.title || path.id}</h2>

        <!-- Cross-cutting Phone Email Verification Alert -->
        ${isPhoneVoluntaryChange ? `
          <div class="alert-box alert-warning email-gate-banner">
            <div class="alert-icon">🔒</div>
            <div class="alert-body">
              <strong>MANDATORY PHONE EMAIL VERIFICATION GATE:</strong>
              <div>Before charging or ticketing voluntary change on issued ticket, verify registered customer email in Edvin (Verify email button). Do not proceed without verification!</div>
            </div>
          </div>
        ` : ''}

        <!-- Cross-cutting Service Fee & Booking.com Banner -->
        ${isBcom ? `
          <div class="alert-box alert-info">
            <div class="alert-icon">🛡️</div>
            <div class="alert-body">
              <strong>BOOKING.COM ORDER RULES:</strong> NO ETG service fee · NO airline penalty quote path · No fees to charge.
            </div>
          </div>
        ` : ''}

        <!-- FL Do Now Steps -->
        <div class="card-section">
          <h4 class="section-title"><span class="icon">⚡</span> FL DO NOW (Sequential Steps):</h4>
          <ol class="fl-steps-list">
            ${path.fl_steps.map((step, idx) => `
              <li class="fl-step-item">
                <span class="step-badge">${idx + 1}</span>
                <span class="step-text">${this.formatStepText(step)}</span>
              </li>
            `).join('')}
          </ol>
        </div>

        <!-- Forbidden / Do Not in prominent red/amber -->
        ${path.forbidden && path.forbidden.length > 0 ? `
          <div class="card-section forbidden-section">
            <h4 class="section-title text-danger"><span class="icon">🚫</span> STRICTLY FORBIDDEN (DO NOT):</h4>
            <ul class="forbidden-list">
              ${path.forbidden.map(item => `
                <li class="forbidden-item">${this.escapeHtml(item)}</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- Speak Cues -->
        ${path.snippets && path.snippets.length > 0 ? `
          <div class="card-section">
            <h4 class="section-title"><span class="icon">🎙️</span> RECOMMENDED SPEAK CUES:</h4>
            <div class="cues-chip-row">
              ${path.snippets.map(snipId => `
                <button type="button" class="btn btn-sm btn-cue-link" data-snip-id="${snipId}">
                  <span>🗣️ @${snipId}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Alternatives -->
        ${path.alternatives && path.alternatives.length > 0 ? `
          <div class="card-section">
            <h4 class="section-title"><span class="icon">💡</span> PERMITTED ALTERNATIVES:</h4>
            <ul class="alternatives-list">
              ${path.alternatives.map(alt => `
                <li class="alt-item">${this.escapeHtml(alt)}</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- Bottom Handoff & Runbook Trigger -->
        <div class="card-footer-grid">
          <div class="handoff-box">
            <span class="handoff-label">Handoff Queue:</span>
            <span class="handoff-value">${this.escapeHtml(path.handoff || 'None (FL Resolution)')}</span>
          </div>

          <div class="source-box">
            <span class="source-label">Source Documentation:</span>
            <span class="source-value">${this.escapeHtml(path.source)}</span>
          </div>
        </div>

        ${runbookTargetId ? `
          <div class="runbook-cta-bar">
            <button type="button" class="btn btn-primary btn-runbook-jump" data-runbook-id="${runbookTargetId}">
              <span>📖 Open GDS Runbook for this Path (Amadeus/Sabre) →</span>
            </button>
          </div>
        ` : ''}

      </div>
    `;

    // Bind snippet jump buttons
    this.container.querySelectorAll('.btn-cue-link').forEach(btn => {
      btn.addEventListener('click', () => {
        const snipId = btn.getAttribute('data-snip-id');
        if (snipId) {
          this.scriptCueEngine.selectSnippetById(snipId);
          this.scriptCueEngine.focus();
        }
      });
    });

    // Bind runbook jump button
    const runbookJumpBtn = this.container.querySelector('.btn-runbook-jump');
    if (runbookJumpBtn && this.onSelectRunbookCallback) {
      runbookJumpBtn.addEventListener('click', () => {
        const rbId = runbookJumpBtn.getAttribute('data-runbook-id');
        if (rbId) {
          this.onSelectRunbookCallback!(rbId);
        }
      });
    }
  }

  private formatStepText(text: string): string {
    let escaped = this.escapeHtml(text);
    // Highlight GDS commands, Rebooking Wizard, Modify Order
    escaped = escaped.replace(/(Rebooking Wizard|Modify Order|FXQ|FXO|FQP|SP\d+|TRDC\/ALL|WV|WFRFTR|WFRTR|RTTN|Verify email)/g, '<code class="step-inline-cmd">$1</code>');
    return escaped;
  }

  private escapeHtml(str: string): string {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
