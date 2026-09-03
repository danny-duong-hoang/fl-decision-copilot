import defaultPathsRaw from '../../content/paths.json';
import defaultSnippetsRaw from '../../content/snippets.json';
import defaultRunbooksRaw from '../../content/runbooks.json';
import defaultMetaRaw from '../../content/meta.json';
import { DecisionPath, Snippet, Runbook, MetaConfig } from '../types';

export const DEFAULT_PATHS: DecisionPath[] = defaultPathsRaw as DecisionPath[];
export const DEFAULT_SNIPPETS: Snippet[] = defaultSnippetsRaw as Snippet[];
export const DEFAULT_RUNBOOKS: Runbook[] = defaultRunbooksRaw as Runbook[];
export const DEFAULT_META: MetaConfig = defaultMetaRaw as MetaConfig;

const STORAGE_KEY_PATHS = 'fl_copilot_paths_v2_12';
const STORAGE_KEY_SNIPPETS = 'fl_copilot_snippets_v2_12';
const STORAGE_KEY_RUNBOOKS = 'fl_copilot_runbooks_v2_12';
const STORAGE_KEY_VERSION = 'fl_copilot_version';

export class DataStore {
  private paths: DecisionPath[] = [];
  private snippets: Snippet[] = [];
  private runbooks: Runbook[] = [];
  private meta: MetaConfig = DEFAULT_META;

  constructor() {
    this.load();
  }

  public load(): void {
    const currentVersion = localStorage.getItem(STORAGE_KEY_VERSION);
    if (currentVersion !== DEFAULT_META.content_version) {
      // Content version bump to V2.12: auto re-seed defaults with Section 18
      localStorage.removeItem(STORAGE_KEY_PATHS);
      localStorage.removeItem(STORAGE_KEY_SNIPPETS);
      localStorage.removeItem(STORAGE_KEY_RUNBOOKS);
      localStorage.setItem(STORAGE_KEY_VERSION, DEFAULT_META.content_version);
    }

    const savedPaths = localStorage.getItem(STORAGE_KEY_PATHS);
    const savedSnippets = localStorage.getItem(STORAGE_KEY_SNIPPETS);
    const savedRunbooks = localStorage.getItem(STORAGE_KEY_RUNBOOKS);

    if (savedPaths) {
      try {
        this.paths = JSON.parse(savedPaths);
      } catch {
        this.paths = [...DEFAULT_PATHS];
      }
    } else {
      this.paths = [...DEFAULT_PATHS];
    }

    if (savedSnippets) {
      try {
        this.snippets = JSON.parse(savedSnippets);
      } catch {
        this.snippets = [...DEFAULT_SNIPPETS];
      }
    } else {
      this.snippets = [...DEFAULT_SNIPPETS];
    }

    if (savedRunbooks) {
      try {
        this.runbooks = JSON.parse(savedRunbooks);
      } catch {
        this.runbooks = [...DEFAULT_RUNBOOKS];
      }
    } else {
      this.runbooks = [...DEFAULT_RUNBOOKS];
    }
  }

  public getPaths(): DecisionPath[] {
    return this.paths;
  }

  public getSnippets(): Snippet[] {
    return this.snippets;
  }

  public getVoiceSnippets(): Snippet[] {
    return this.snippets.filter(s => s.channel && s.channel.includes('voice'));
  }

  public getRunbooks(): Runbook[] {
    return this.runbooks;
  }

  public getMeta(): MetaConfig {
    return this.meta;
  }

  public getPathById(id: string): DecisionPath | undefined {
    return this.paths.find(p => p.id === id);
  }

  public getSnippetById(id: string): Snippet | undefined {
    return this.snippets.find(s => s.id === id);
  }

  public getRunbookById(id: string): Runbook | undefined {
    return this.runbooks.find(r => r.id === id);
  }

  public savePaths(newPaths: DecisionPath[]): void {
    this.paths = newPaths;
    localStorage.setItem(STORAGE_KEY_PATHS, JSON.stringify(newPaths, null, 2));
  }

  public saveSnippets(newSnippets: Snippet[]): void {
    this.snippets = newSnippets;
    localStorage.setItem(STORAGE_KEY_SNIPPETS, JSON.stringify(newSnippets, null, 2));
  }

  public saveRunbooks(newRunbooks: Runbook[]): void {
    this.runbooks = newRunbooks;
    localStorage.setItem(STORAGE_KEY_RUNBOOKS, JSON.stringify(newRunbooks, null, 2));
  }

  public resetToDefaults(): void {
    this.paths = [...DEFAULT_PATHS];
    this.snippets = [...DEFAULT_SNIPPETS];
    this.runbooks = [...DEFAULT_RUNBOOKS];
    localStorage.removeItem(STORAGE_KEY_PATHS);
    localStorage.removeItem(STORAGE_KEY_SNIPPETS);
    localStorage.removeItem(STORAGE_KEY_RUNBOOKS);
  }

  public exportData(): object {
    return {
      version: this.meta.content_version,
      exported_at: new Date().toISOString(),
      paths: this.paths,
      snippets: this.snippets,
      runbooks: this.runbooks,
      meta: this.meta
    };
  }

  public importData(dataObj: any): void {
    if (!dataObj || (!dataObj.paths && !dataObj.snippets && !dataObj.runbooks)) {
      throw new Error('Invalid data structure: missing paths, snippets, or runbooks.');
    }
    if (Array.isArray(dataObj.paths)) {
      this.savePaths(dataObj.paths);
    }
    if (Array.isArray(dataObj.snippets)) {
      this.saveSnippets(dataObj.snippets);
    }
    if (Array.isArray(dataObj.runbooks)) {
      this.saveRunbooks(dataObj.runbooks);
    }
  }
}
