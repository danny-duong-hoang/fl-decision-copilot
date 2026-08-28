import defaultPathsRaw from '../../data/paths.json';
import defaultSnippetsRaw from '../../data/snippets.json';
import { DecisionPath, Snippet } from '../types';

export const DEFAULT_PATHS: DecisionPath[] = defaultPathsRaw as DecisionPath[];
export const DEFAULT_SNIPPETS: Snippet[] = defaultSnippetsRaw as Snippet[];

const STORAGE_KEY_PATHS = 'fl_copilot_paths_v1';
const STORAGE_KEY_SNIPPETS = 'fl_copilot_snippets_v1';

export class DataStore {
  private paths: DecisionPath[] = [];
  private snippets: Snippet[] = [];

  constructor() {
    this.load();
  }

  public load(): void {
    const savedPaths = localStorage.getItem(STORAGE_KEY_PATHS);
    const savedSnippets = localStorage.getItem(STORAGE_KEY_SNIPPETS);

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
  }

  public getPaths(): DecisionPath[] {
    return this.paths;
  }

  public getSnippets(): Snippet[] {
    return this.snippets;
  }

  public getPathById(id: string): DecisionPath | undefined {
    return this.paths.find(p => p.id === id);
  }

  public getSnippetById(id: string): Snippet | undefined {
    return this.snippets.find(s => s.id === id);
  }

  public savePaths(newPaths: DecisionPath[]): void {
    this.paths = newPaths;
    localStorage.setItem(STORAGE_KEY_PATHS, JSON.stringify(newPaths, null, 2));
  }

  public saveSnippets(newSnippets: Snippet[]): void {
    this.snippets = newSnippets;
    localStorage.setItem(STORAGE_KEY_SNIPPETS, JSON.stringify(newSnippets, null, 2));
  }

  public resetToDefaults(): void {
    this.paths = [...DEFAULT_PATHS];
    this.snippets = [...DEFAULT_SNIPPETS];
    localStorage.removeItem(STORAGE_KEY_PATHS);
    localStorage.removeItem(STORAGE_KEY_SNIPPETS);
  }

  public exportData(): object {
    return {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      paths: this.paths,
      snippets: this.snippets
    };
  }

  public importData(dataObj: any): void {
    if (!dataObj || (!dataObj.paths && !dataObj.snippets)) {
      throw new Error('Invalid data structure: missing paths or snippets array.');
    }
    if (Array.isArray(dataObj.paths)) {
      this.savePaths(dataObj.paths);
    }
    if (Array.isArray(dataObj.snippets)) {
      this.saveSnippets(dataObj.snippets);
    }
  }
}
