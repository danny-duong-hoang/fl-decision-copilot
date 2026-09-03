import { DataStore } from './data/defaultData';
import { DecisionMatrix } from './ui/matrix';
import { ScriptCueEngine } from './ui/scriptCue';
import { GdsRunbookEngine } from './ui/runbook';

export class SopManager {
  private dataStore: DataStore;
  private scriptCueEngine: ScriptCueEngine;
  private decisionMatrix: DecisionMatrix;
  private runbookEngine: GdsRunbookEngine;
  private showToast: (msg: string) => void;
  private activeSopTab: 'paths' | 'snippets' | 'runbooks' | 'meta' = 'paths';

  private sopModal!: HTMLElement;
  private openSopBtn!: HTMLButtonElement;
  private sopCloseBtn!: HTMLButtonElement;
  private sopTabPaths!: HTMLButtonElement;
  private sopTabSnippets!: HTMLButtonElement;
  private sopTabRunbooks!: HTMLButtonElement;
  private sopJsonEditor!: HTMLTextAreaElement;
  private saveSopBtn!: HTMLButtonElement;
  private exportSopBtn!: HTMLButtonElement;
  private importSopFileInput!: HTMLInputElement;
  private resetSopBtn!: HTMLButtonElement;

  constructor(
    dataStore: DataStore,
    scriptCueEngine: ScriptCueEngine,
    decisionMatrix: DecisionMatrix,
    runbookEngine: GdsRunbookEngine,
    showToast: (msg: string) => void
  ) {
    this.dataStore = dataStore;
    this.scriptCueEngine = scriptCueEngine;
    this.decisionMatrix = decisionMatrix;
    this.runbookEngine = runbookEngine;
    this.showToast = showToast;

    this.sopModal = document.getElementById('sopManagerModal') as HTMLElement;
    this.openSopBtn = document.getElementById('openSopManagerBtn') as HTMLButtonElement;
    this.sopCloseBtn = document.getElementById('sopModalClose') as HTMLButtonElement;
    this.sopTabPaths = document.getElementById('sopTabPaths') as HTMLButtonElement;
    this.sopTabSnippets = document.getElementById('sopTabSnippets') as HTMLButtonElement;
    this.sopTabRunbooks = document.getElementById('sopTabRunbooks') as HTMLButtonElement;
    this.sopJsonEditor = document.getElementById('sopJsonEditor') as HTMLTextAreaElement;
    this.saveSopBtn = document.getElementById('saveSopJsonBtn') as HTMLButtonElement;
    this.exportSopBtn = document.getElementById('exportSopBtn') as HTMLButtonElement;
    this.importSopFileInput = document.getElementById('importSopFileInput') as HTMLInputElement;
    this.resetSopBtn = document.getElementById('resetSopDefaultsBtn') as HTMLButtonElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    if (this.openSopBtn) {
      this.openSopBtn.addEventListener('click', () => this.openSopModal());
    }
    if (this.sopCloseBtn) {
      this.sopCloseBtn.addEventListener('click', () => this.closeSopModal());
    }

    if (this.sopTabPaths) {
      this.sopTabPaths.addEventListener('click', () => {
        this.switchTab('paths');
      });
    }

    if (this.sopTabSnippets) {
      this.sopTabSnippets.addEventListener('click', () => {
        this.switchTab('snippets');
      });
    }

    if (this.sopTabRunbooks) {
      this.sopTabRunbooks.addEventListener('click', () => {
        this.switchTab('runbooks');
      });
    }

    if (this.saveSopBtn) {
      this.saveSopBtn.addEventListener('click', () => this.saveSopEditorContent());
    }

    if (this.exportSopBtn) {
      this.exportSopBtn.addEventListener('click', () => this.exportSopData());
    }

    if (this.importSopFileInput) {
      this.importSopFileInput.addEventListener('change', (e) => this.handleImportFile(e));
    }

    if (this.resetSopBtn) {
      this.resetSopBtn.addEventListener('click', () => {
        if (confirm('Reset all SOP rules and snippets back to default Notion seed?')) {
          this.dataStore.resetToDefaults();
          this.scriptCueEngine.initFuse();
          this.scriptCueEngine.search('');
          this.decisionMatrix.reset();
          this.runbookEngine.init();
          this.loadSopEditorContent();
          this.showToast('Reset to Notion defaults completed!');
        }
      });
    }
  }

  private switchTab(tab: 'paths' | 'snippets' | 'runbooks'): void {
    this.activeSopTab = tab;
    if (this.sopTabPaths) this.sopTabPaths.classList.toggle('active', tab === 'paths');
    if (this.sopTabSnippets) this.sopTabSnippets.classList.toggle('active', tab === 'snippets');
    if (this.sopTabRunbooks) this.sopTabRunbooks.classList.toggle('active', tab === 'runbooks');
    this.loadSopEditorContent();
  }

  public openSopModal(): void {
    if (!this.sopModal) return;
    this.loadSopEditorContent();
    this.sopModal.classList.add('active');
  }

  public closeSopModal(): void {
    if (this.sopModal) {
      this.sopModal.classList.remove('active');
    }
  }

  private loadSopEditorContent(): void {
    if (!this.sopJsonEditor) return;
    let data: any;
    if (this.activeSopTab === 'paths') {
      data = this.dataStore.getPaths();
    } else if (this.activeSopTab === 'snippets') {
      data = this.dataStore.getSnippets();
    } else if (this.activeSopTab === 'runbooks') {
      data = this.dataStore.getRunbooks();
    }
    this.sopJsonEditor.value = JSON.stringify(data, null, 2);
  }

  private saveSopEditorContent(): void {
    if (!this.sopJsonEditor) return;
    try {
      const parsed = JSON.parse(this.sopJsonEditor.value);
      if (!Array.isArray(parsed)) {
        alert('Invalid JSON: Must be an array of objects.');
        return;
      }

      if (this.activeSopTab === 'paths') {
        this.dataStore.savePaths(parsed);
        this.decisionMatrix.evaluateMatches();
        this.showToast(`Updated ${parsed.length} Decision Matrix paths!`);
      } else if (this.activeSopTab === 'snippets') {
        this.dataStore.saveSnippets(parsed);
        this.scriptCueEngine.initFuse();
        this.scriptCueEngine.search('');
        this.showToast(`Updated ${parsed.length} Script Cues!`);
      } else if (this.activeSopTab === 'runbooks') {
        this.dataStore.saveRunbooks(parsed);
        this.runbookEngine.init();
        this.showToast(`Updated ${parsed.length} GDS Runbooks!`);
      }

      this.closeSopModal();
    } catch (e: any) {
      alert(`JSON Parse Error: ${e.message}`);
    }
  }

  private exportSopData(): void {
    const data = this.dataStore.exportData();
    const str = JSON.stringify(data, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fl_decision_copilot_v2_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Downloaded SOP JSON data backup.');
  }

  private handleImportFile(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        this.dataStore.importData(json);
        this.scriptCueEngine.initFuse();
        this.scriptCueEngine.search('');
        this.decisionMatrix.evaluateMatches();
        this.runbookEngine.init();
        this.loadSopEditorContent();
        this.showToast('Successfully imported JSON rules!');
      } catch (err: any) {
        alert(`Failed to import JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
    (e.target as HTMLInputElement).value = '';
  }
}
