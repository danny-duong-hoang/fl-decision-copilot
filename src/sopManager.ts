import { DataStore } from './data/defaultData';
import { DecisionMatrix } from './decisionMatrix';
import { SnippetEngine } from './snippetEngine';

export class SopManager {
  private dataStore: DataStore;
  private snippetEngine: SnippetEngine;
  private decisionMatrix: DecisionMatrix;
  private showToast: (msg: string) => void;
  private activeSopTab: 'paths' | 'snippets' = 'paths';

  private sopModal!: HTMLElement;
  private openSopBtn!: HTMLButtonElement;
  private sopCloseBtn!: HTMLButtonElement;
  private sopTabPaths!: HTMLButtonElement;
  private sopTabSnippets!: HTMLButtonElement;
  private sopJsonEditor!: HTMLTextAreaElement;
  private saveSopBtn!: HTMLButtonElement;
  private exportSopBtn!: HTMLButtonElement;
  private importSopFileInput!: HTMLInputElement;
  private resetSopBtn!: HTMLButtonElement;

  constructor(
    dataStore: DataStore,
    snippetEngine: SnippetEngine,
    decisionMatrix: DecisionMatrix,
    showToast: (msg: string) => void
  ) {
    this.dataStore = dataStore;
    this.snippetEngine = snippetEngine;
    this.decisionMatrix = decisionMatrix;
    this.showToast = showToast;

    this.sopModal = document.getElementById('sopManagerModal') as HTMLElement;
    this.openSopBtn = document.getElementById('openSopManagerBtn') as HTMLButtonElement;
    this.sopCloseBtn = document.getElementById('sopModalClose') as HTMLButtonElement;
    this.sopTabPaths = document.getElementById('sopTabPaths') as HTMLButtonElement;
    this.sopTabSnippets = document.getElementById('sopTabSnippets') as HTMLButtonElement;
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
        this.activeSopTab = 'paths';
        this.sopTabPaths.classList.add('active');
        this.sopTabSnippets.classList.remove('active');
        this.loadSopEditorContent();
      });
    }

    if (this.sopTabSnippets) {
      this.sopTabSnippets.addEventListener('click', () => {
        this.activeSopTab = 'snippets';
        this.sopTabSnippets.classList.add('active');
        this.sopTabPaths.classList.remove('active');
        this.loadSopEditorContent();
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
          this.snippetEngine.initFuse();
          this.snippetEngine.search('');
          this.decisionMatrix.reset();
          this.loadSopEditorContent();
          this.showToast('Reset to Notion defaults completed!');
        }
      });
    }
  }

  public openSopModal(): void {
    if (this.sopModal) {
      this.sopModal.classList.add('active');
      this.loadSopEditorContent();
    }
  }

  public closeSopModal(): void {
    if (this.sopModal) {
      this.sopModal.classList.remove('active');
    }
  }

  private loadSopEditorContent(): void {
    if (!this.sopJsonEditor) return;

    if (this.activeSopTab === 'paths') {
      this.sopJsonEditor.value = JSON.stringify(this.dataStore.getPaths(), null, 2);
    } else {
      this.sopJsonEditor.value = JSON.stringify(this.dataStore.getSnippets(), null, 2);
    }
  }

  private saveSopEditorContent(): void {
    if (!this.sopJsonEditor) return;

    try {
      const parsed = JSON.parse(this.sopJsonEditor.value);
      if (!Array.isArray(parsed)) {
        throw new Error('Data must be a JSON array of objects.');
      }

      if (this.activeSopTab === 'paths') {
        this.dataStore.savePaths(parsed);
        this.decisionMatrix.reset();
      } else {
        this.dataStore.saveSnippets(parsed);
        this.snippetEngine.initFuse();
        this.snippetEngine.search('');
      }

      this.showToast(`Saved updated ${this.activeSopTab} successfully!`);
    } catch (e: any) {
      alert('JSON Syntax Error: ' + e.message);
    }
  }

  private exportSopData(): void {
    const exportObj = this.dataStore.exportData();
    const jsonStr = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fl_decision_copilot_data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Data exported successfully!');
  }

  private handleImportFile(e: Event): void {
    const target = e.target as HTMLInputElement;
    const file = target.files && target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const dataObj = JSON.parse(event.target?.result as string);
        this.dataStore.importData(dataObj);
        this.snippetEngine.initFuse();
        this.snippetEngine.search('');
        this.decisionMatrix.reset();
        this.loadSopEditorContent();
        this.showToast('Imported new SOP pack successfully!');
      } catch (err: any) {
        alert('Failed to import JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }
}
