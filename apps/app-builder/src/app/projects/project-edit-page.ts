import {
  Component,
  viewChild,
  HostListener,
  inject,
  OnInit,
  AfterViewInit,
  signal,
  effect,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FFlowComponent } from '@foblex/flow';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import {
  FCanvasComponent,
  FFlowModule,
  FCreateConnectionEvent,
  FCreateNodeEvent,
  FReassignConnectionEvent,
  FSelectionChangeEvent,
} from '@foblex/flow';

import type { Project, Page, Module, PageLink, ModuleLink } from '../models';
import type { PageType } from '../models';
import { createGuid } from '../models/id.util';
import {
  MOCK_PAGE_TEMPLATES,
  MOCK_MODULE_TEMPLATES,
  createDefaultPagesAndLinks,
  createPageFromTemplate,
  createModuleFromTemplate,
} from '../models/mock-data';
import type { PageTemplate, ModuleTemplate } from '../models/mock-data';
import { isModuleLinkToModule } from '../models';
import { WebContainer } from '@webcontainer/api';
import type { FileSystemTree } from '@webcontainer/api';

/** Noeud affiché dans le flow (pages ou modules). */
export interface FlowNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type?: string;
  modules?: string[];
}

/** Connexion affichée dans le flow. */
export interface FlowConnection {
  id: string;
  outputId: string;
  inputId: string;
}

const STORAGE_KEY = 'app-builder:projects';
type ProjectTab = 'pages' | 'components' | 'data' | 'configuration';

function projectToPagesFlowNodes(pages: Page[]): FlowNode[] {
  return pages.map((p) => ({
    id: p.id,
    name: p.name,
    x: p.position?.x ?? 0,
    y: p.position?.y ?? 0,
    type: p.type,
    modules: p.modules.map((m) => m.name),
  }));
}

function projectToPagesFlowConnections(links: PageLink[]): FlowConnection[] {
  return links.map((l) => ({
    id: l.id,
    outputId: l.sourcePageId + '-out',
    inputId: l.targetPageId + '-in',
  }));
}

function pageModulesToFlowNodes(modules: Module[]): FlowNode[] {
  return modules.map((m) => ({
    id: m.id,
    name: m.name,
    x: m.position?.x ?? 0,
    y: m.position?.y ?? 0,
    type: m.type,
  }));
}

function moduleLinksToFlowConnections(links: ModuleLink[]): FlowConnection[] {
  return links.filter(isModuleLinkToModule).map((l) => ({
    id: l.id,
    outputId: l.sourceModuleId + '-out',
    inputId: l.targetModuleId! + '-in',
  }));
}

@Component({
  selector: 'app-project-edit-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TabsModule,
    FFlowModule,
  ],
  templateUrl: './project-edit-page.html',
})
export class ProjectEditPage implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private _project = signal<Project | null>(null);
  private _webcontainerInstance: WebContainer | null = null;
  get project(): Project | null {
    return this._project();
  }

  isEditingName = false;
  editedName = '';

  private _activeTabSignal = signal<ProjectTab>('pages');
  get activeTab(): ProjectTab {
    return this._activeTabSignal();
  }
  set activeTab(v: ProjectTab) {
    this._activeTabSignal.set(v);
  }

  /** Pour l’onglet Composants : page dont on édite les modules. */
  selectedPageIdForComponents = signal<string | null>(null);

  /** Graphe pages : dérivé du modèle. */
  pagesNodes = computed(() => {
    const p = this._project();
    return p ? projectToPagesFlowNodes(p.pages) : [];
  });

  pagesConnections = computed(() => {
    const p = this._project();
    return p ? projectToPagesFlowConnections(p.pageLinks) : [];
  });

  /** Graphe composants : modules de la page sélectionnée + liens module-module. */
  componentsNodes = computed(() => {
    const p = this._project();
    const pageId = this.selectedPageIdForComponents();
    if (!p || !pageId) return [];
    const page = p.pages.find((pg) => pg.id === pageId);
    return page ? pageModulesToFlowNodes(page.modules) : [];
  });

  componentsConnections = computed(() => {
    const p = this._project();
    const pageId = this.selectedPageIdForComponents();
    if (!p || !pageId) return [];
    const links = p.moduleLinks.filter((l) => l.sourcePageId === pageId);
    return moduleLinksToFlowConnections(links);
  });

  /** Options pour le select "page cible" (connexions pages). */
  pagesForSelect = computed(() => this._project()?.pages ?? []);

  /** Options pour le select "page" (onglet composants) et "cible" (connexions modules). */
  selectedPagesNodeId = signal<string | null>(null);
  selectedComponentsNodeId = signal<string | null>(null);
  selectedPagesConnectionIds = signal<string[]>([]);
  selectedComponentsConnectionIds = signal<string[]>([]);
  editingNodeName = signal('');
  newConnectionSource = signal<string | null>(null);
  newConnectionTarget = signal<string | null>(null);

  private readonly pagesFlowRef = viewChild<FFlowComponent>('pagesFlow');
  private readonly pagesCanvasRef = viewChild<FCanvasComponent>('pagesCanvas');
  private readonly componentsFlowRef = viewChild<FFlowComponent>('componentsFlow');
  private readonly componentsCanvasRef = viewChild<FCanvasComponent>('componentsCanvas');

  pagesPanelCollapsed = signal(false);
  pagesPanelWidth = signal(260);
  isResizing = signal(false);
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  readonly PAGES_PREFAITES: PageTemplate[] = MOCK_PAGE_TEMPLATES;
  readonly MODULES: ModuleTemplate[] = MOCK_MODULE_TEMPLATES;

  getNodeIcon(node: FlowNode): string {
    return this.getPageTypeIcon(node.type);
  }

  getModuleIcon(type?: string): string {
    const map: Record<string, string> = {
      component: 'pi-box',
      data: 'pi-database',
      formulaire: 'pi-file-edit',
      input: 'pi-pencil',
      bouton: 'pi-check',
      tableau: 'pi-table',
      connexion: 'pi-sign-in',
      liste: 'pi-list',
    };
    return map[type ?? ''] ?? 'pi-box';
  }

  getPageTypeIcon(type?: PageType | string): string {
    const map: Record<string, string> = {
      formulaire: 'pi-file-edit',
      connexion: 'pi-sign-in',
      liste: 'pi-list',
    };
    return map[type ?? ''] ?? 'pi-file';
  }

  get hasProject(): boolean {
    return !!this._project();
  }

  get projectName(): string {
    return this._project()?.name ?? '';
  }

  goBackToProjects(): void {
    this.router.navigate(['/projects']);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/projects']);
      return;
    }

    let project = this.loadProject(id);
    if (!project) {
      this.router.navigate(['/projects']);
      return;
    }

    const hadPages = !!(project.pages?.length);
    project = this.ensureProjectWithPages(project);
    this._project.set(project);
    this.editedName = project.name;
    if (!hadPages) this.persistProject();
  }

  private ensureProjectWithPages(project: Project): Project {
    if (project.pages?.length) return project;
    const { pages, pageLinks, moduleLinks } = createDefaultPagesAndLinks();
    return {
      ...project,
      pages,
      pageLinks,
      moduleLinks,
    };
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.pagesCanvasRef()?.resetScaleAndCenter(false));
  }

  private _centerOnTabChange = effect(() => {
    if (this._activeTabSignal() === 'components') {
      const pid = this.selectedPageIdForComponents();
      if (!pid && this._project()?.pages?.length) {
        this.selectedPageIdForComponents.set(this._project()!.pages[0].id);
      }
      setTimeout(() => this.componentsCanvasRef()?.resetScaleAndCenter(false), 50);
    }
  });

  startEditName(): void {
    if (!this._project()) return;
    this.isEditingName = true;
    this.editedName = this._project()!.name;
  }

  cancelEditName(): void {
    this.isEditingName = false;
    this.editedName = this._project()?.name ?? '';
  }

  commitEditName(): void {
    const p = this._project();
    if (!p) return;
    const name = this.editedName.trim();
    if (!name || name === p.name) {
      this.cancelEditName();
      return;
    }
    this.updateProject({ ...p, name });
    this.saveProject(this._project()!);
    this.isEditingName = false;
  }

  deleteProject(): void {
    const p = this._project();
    if (!p) return;
    const projects = this.loadAllProjects().filter((proj) => proj.id !== p.id);
    this.saveAllProjects(projects);
    this.router.navigate(['/projects']);
  }

  private updateProject(project: Project): void {
    this._project.set(project);
  }

  private persistProject(): void {
    const p = this._project();
    if (p) this.saveProject(p);
  }

  onPagesSelectionChange(event: FSelectionChangeEvent): void {
    const nodeIds = event.nodeIds ?? [];
    const connectionIds = event.connectionIds ?? [];
    const id = nodeIds.length === 1 ? nodeIds[0] : null;
    this.selectedPagesNodeId.set(id);
    this.selectedPagesConnectionIds.set(connectionIds);
    if (id) {
      const nodes = this.pagesNodes();
      const node = nodes.find((n) => n.id === id);
      this.editingNodeName.set(node?.name ?? '');
      this.newConnectionSource.set(id);
      this.newConnectionTarget.set(null);
    }
  }

  onComponentsSelectionChange(event: FSelectionChangeEvent): void {
    const nodeIds = event.nodeIds ?? [];
    const connectionIds = event.connectionIds ?? [];
    const id = nodeIds.length === 1 ? nodeIds[0] : null;
    this.selectedComponentsNodeId.set(id);
    this.selectedComponentsConnectionIds.set(connectionIds);
    if (id) {
      const nodes = this.componentsNodes();
      const node = nodes.find((n) => n.id === id);
      this.editingNodeName.set(node?.name ?? '');
      this.newConnectionSource.set(id);
      this.newConnectionTarget.set(null);
    }
  }

  onPagesCreateConnection(event: FCreateConnectionEvent): void {
    const inputId = event.fInputId;
    if (!inputId) return;
    const targetPageId = inputId.replace(/-in$/, '');
    const sourcePageId = event.fOutputId.replace(/-out$/, '');
    const link: PageLink = {
      id: createGuid(),
      sourcePageId,
      targetPageId,
    };
    this.updateProject({
      ...this._project()!,
      pageLinks: [...this._project()!.pageLinks, link],
    });
    this.persistProject();
  }

  onComponentsCreateConnection(event: FCreateConnectionEvent): void {
    const inputId = event.fInputId;
    if (!inputId) return;
    const targetModuleId = inputId.replace(/-in$/, '');
    const sourceModuleId = event.fOutputId.replace(/-out$/, '');
    const pageId = this.selectedPageIdForComponents();
    if (!pageId) return;
    const link: ModuleLink = {
      id: createGuid(),
      sourcePageId: pageId,
      sourceModuleId,
      targetModuleId,
    };
    this.updateProject({
      ...this._project()!,
      moduleLinks: [...this._project()!.moduleLinks, link],
    });
    this.persistProject();
  }

  onPagesReassignConnection(event: FReassignConnectionEvent): void {
    if (!event.newTargetId && !event.newSourceId) return;
    const oldSource = event.oldSourceId.replace(/-out$/, '');
    const oldTarget = event.oldTargetId.replace(/-in$/, '');
    const newSource = event.newSourceId?.replace(/-out$/, '');
    const newTarget = event.newTargetId?.replace(/-in$/, '');
    const links = this._project()!.pageLinks.map((l) => {
      if (l.sourcePageId !== oldSource || l.targetPageId !== oldTarget) return l;
      return {
        ...l,
        sourcePageId: newSource ?? l.sourcePageId,
        targetPageId: newTarget ?? l.targetPageId,
      };
    });
    this.updateProject({ ...this._project()!, pageLinks: links });
    this.persistProject();
  }

  onComponentsReassignConnection(event: FReassignConnectionEvent): void {
    if (!event.newTargetId && !event.newSourceId) return;
    const oldSource = event.oldSourceId.replace(/-out$/, '');
    const oldTarget = event.oldTargetId.replace(/-in$/, '');
    const newSource = event.newSourceId?.replace(/-out$/, '');
    const newTarget = event.newTargetId?.replace(/-in$/, '');
    const pageId = this.selectedPageIdForComponents();
    if (!pageId) return;
    const links = this._project()!.moduleLinks.map((l) => {
      if (l.sourcePageId !== pageId || l.sourceModuleId !== oldSource || l.targetModuleId !== oldTarget) return l;
      return {
        ...l,
        sourceModuleId: newSource ?? l.sourceModuleId,
        targetModuleId: newTarget ?? l.targetModuleId,
      };
    });
    this.updateProject({ ...this._project()!, moduleLinks: links });
    this.persistProject();
  }

  addPagesConnection(): void {
    const source = this.newConnectionSource();
    const target = this.newConnectionTarget();
    if (!source || !target || source === target) return;
    const link: PageLink = { id: createGuid(), sourcePageId: source, targetPageId: target };
    this.updateProject({
      ...this._project()!,
      pageLinks: [...this._project()!.pageLinks, link],
    });
    this.persistProject();
    this.newConnectionTarget.set(null);
  }

  addComponentsConnection(): void {
    const source = this.newConnectionSource();
    const target = this.newConnectionTarget();
    if (!source || !target || source === target) return;
    const pageId = this.selectedPageIdForComponents();
    if (!pageId) return;
    const link: ModuleLink = {
      id: createGuid(),
      sourcePageId: pageId,
      sourceModuleId: source,
      targetModuleId: target,
    };
    this.updateProject({
      ...this._project()!,
      moduleLinks: [...this._project()!.moduleLinks, link],
    });
    this.persistProject();
    this.newConnectionTarget.set(null);
  }

  deletePagesConnections(): void {
    const ids = this.selectedPagesConnectionIds();
    if (ids.length === 0) return;
    const pageLinks = this._project()!.pageLinks.filter((l) => !ids.includes(l.id));
    this.updateProject({ ...this._project()!, pageLinks });
    this.persistProject();
    this.selectedPagesConnectionIds.set([]);
    this.pagesFlowRef()?.clearSelection();
  }

  deleteComponentsConnections(): void {
    const ids = this.selectedComponentsConnectionIds();
    if (ids.length === 0) return;
    const moduleLinks = this._project()!.moduleLinks.filter((l) => !ids.includes(l.id));
    this.updateProject({ ...this._project()!, moduleLinks });
    this.persistProject();
    this.selectedComponentsConnectionIds.set([]);
    this.componentsFlowRef()?.clearSelection();
  }

  deleteSelectedConnections(): void {
    if (this.activeTab === 'pages') this.deletePagesConnections();
    else if (this.activeTab === 'components') this.deleteComponentsConnections();
  }

  pagesConnectionsForNode(nodeId: string | null): FlowConnection[] {
    if (!nodeId) return [];
    return this.pagesConnections().filter(
      (c) => c.outputId === nodeId + '-out' || c.inputId === nodeId + '-in'
    );
  }

  componentsConnectionsForNode(nodeId: string | null): FlowConnection[] {
    if (!nodeId) return [];
    return this.componentsConnections().filter(
      (c) => c.outputId === nodeId + '-out' || c.inputId === nodeId + '-in'
    );
  }

  getNodeName(connectorId: string, nodes: FlowNode[]): string {
    const nodeId = connectorId.replace(/-out$|-in$/, '');
    const node = nodes.find((n) => n.id === nodeId);
    return node?.name ?? nodeId;
  }

  deleteConnectionById(id: string, tab: 'pages' | 'components'): void {
    if (tab === 'pages') {
      const pageLinks = this._project()!.pageLinks.filter((l) => l.id !== id);
      this.updateProject({ ...this._project()!, pageLinks });
      this.selectedPagesConnectionIds.update((ids) => ids.filter((i) => i !== id));
      this.pagesFlowRef()?.clearSelection();
    } else {
      const moduleLinks = this._project()!.moduleLinks.filter((l) => l.id !== id);
      this.updateProject({ ...this._project()!, moduleLinks });
      this.selectedComponentsConnectionIds.update((ids) => ids.filter((i) => i !== id));
      this.componentsFlowRef()?.clearSelection();
    }
    this.persistProject();
  }

  savePagesNodeName(): void {
    const id = this.selectedPagesNodeId();
    const name = this.editingNodeName().trim();
    if (!id || !name) return;
    const pages = this._project()!.pages.map((p) => (p.id === id ? { ...p, name } : p));
    this.updateProject({ ...this._project()!, pages });
    this.persistProject();
  }

  saveComponentsNodeName(): void {
    const id = this.selectedComponentsNodeId();
    const name = this.editingNodeName().trim();
    const pageId = this.selectedPageIdForComponents();
    if (!id || !name || !pageId) return;
    const pages = this._project()!.pages.map((p) => {
      if (p.id !== pageId) return p;
      return { ...p, modules: p.modules.map((m) => (m.id === id ? { ...m, name } : m)) };
    });
    this.updateProject({ ...this._project()!, pages });
    this.persistProject();
  }

  onPagesNodePositionChange(nodeId: string, x: number, y: number): void {
    const pages = this._project()!.pages.map((p) =>
      p.id === nodeId ? { ...p, position: { x, y } } : p
    );
    this.updateProject({ ...this._project()!, pages });
    this.persistProject();
  }

  togglePagesPanel(): void {
    this.pagesPanelCollapsed.update((v) => !v);
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.pagesPanelWidth();
    this.isResizing.set(true);
    document.body.classList.add('resizing-panel');
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isResizing()) return;
    const delta = event.clientX - this.resizeStartX;
    const w = Math.max(180, Math.min(400, this.resizeStartWidth + delta));
    this.pagesPanelWidth.set(w);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isResizing.set(false);
    document.body.classList.remove('resizing-panel');
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    this.deleteSelectedConnections();
  }

  onCreatePageNode(event: FCreateNodeEvent<{ type: string; name: string }>): void {
    const data = event.data;
    const isModule = data?.type === 'module';
    const targetNodeId = event.fTargetNode;

    if (isModule && targetNodeId) {
      this.addModuleToPage(targetNodeId, data?.name ?? '');
      return;
    }

    const template = MOCK_PAGE_TEMPLATES.find((t) => t.type === data?.type) ?? MOCK_PAGE_TEMPLATES[0];
    const pos = { x: event.rect?.x ?? 0, y: event.rect?.y ?? 0 };
    const newPage = createPageFromTemplate(
      { id: template.id, name: template.name, type: template.type },
      pos
    );
    this.updateProject({
      ...this._project()!,
      pages: [...this._project()!.pages, newPage],
    });
    this.persistProject();
  }

  addModuleToPage(pageId: string, moduleName: string): void {
    const template = MOCK_MODULE_TEMPLATES.find((t) => t.name === moduleName) ?? MOCK_MODULE_TEMPLATES[0];
    const newModule = createModuleFromTemplate({ id: template.id, name: template.name, type: template.type });
    const pages = this._project()!.pages.map((p) =>
      p.id === pageId ? { ...p, modules: [...p.modules, newModule] } : p
    );
    this.updateProject({ ...this._project()!, pages });
    this.persistProject();
  }

  deletePagesNode(nodeId: string): void {
    const project = this._project()!;
    const pages = project.pages.filter((p) => p.id !== nodeId);
    const pageLinks = project.pageLinks.filter(
      (l) => l.sourcePageId !== nodeId && l.targetPageId !== nodeId
    );
    const moduleLinks = project.moduleLinks.filter((l) => l.sourcePageId !== nodeId && l.targetPageId !== nodeId);
    this.updateProject({ ...project, pages, pageLinks, moduleLinks });
    this.persistProject();
    if (this.selectedPagesNodeId() === nodeId) this.selectedPagesNodeId.set(null);
    if (this.selectedPageIdForComponents() === nodeId) this.selectedPageIdForComponents.set(null);
    this.pagesFlowRef()?.clearSelection();
  }

  onComponentsNodePositionChange(nodeId: string, x: number, y: number): void {
    const pageId = this.selectedPageIdForComponents();
    if (!pageId) return;
    const pages = this._project()!.pages.map((p) => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        modules: p.modules.map((m) => (m.id === nodeId ? { ...m, position: { x, y } } : m)),
      };
    });
    this.updateProject({ ...this._project()!, pages });
    this.persistProject();
  }

  private loadProject(id: string): Project | null {
    const projects = this.loadAllProjects();
    return projects.find((p) => p.id === id) ?? null;
  }

  private saveProject(project: Project): void {
    const projects = this.loadAllProjects();
    const index = projects.findIndex((p) => p.id === project.id);
    if (index === -1) projects.push(project);
    else projects[index] = project;
    this.saveAllProjects(projects);
  }

  private loadAllProjects(): Project[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as Project[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveAllProjects(projects: Project[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  async buildProject(): Promise<void> {
    const project = this._project();
    if (!project) {
      console.warn('buildProject: aucun projet chargé.');
      return;
    }
    console.log('Project (build) — projet à jour avec pages, modules, liens:', project);
    console.log('Détail — pages:', project.pages.length, '| liens pages:', project.pageLinks.length, '| liens modules:', project.moduleLinks.length);

    await this.setupWebContainer();
    await this.cloneApp();
    await this.startDevServer();
  }

  async setupWebContainer() {
    this._webcontainerInstance = await WebContainer.boot();
    // await this._webcontainerInstance!.mount({
    //   'package.json': {
    //     file: {
    //       contents: `
    //         {
    //           "name": "my-angular-app",
    //           "dependencies": {
    //             "@angular/core": "^21.0.0",
    //             "@angular/cli": "^21.0.0"
    //           },
    //           "scripts": {
    //             "start": "ng serve --port 4200"
    //           }
    //         }
    //       `,
    //     },
    //   },

    // });
  }

  async cloneApp() {
    const owner = 'pachyderme49';
    const repo = 'app-builder-angular-nx-template';
    const ref = 'main';
    const archiveUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${ref}.zip`;

    // Téléchargement et extraction dans le WebContainer (Node, pas de CORS)
    const wc = this._webcontainerInstance!;
    const fetchScript = `
const url = process.argv[2];
(async () => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(buf);
  zip.extractAllTo('.', true);
  const fs = require('fs');
  const names = fs.readdirSync('.');
  const topDir = names.find(n => fs.statSync(n).isDirectory());
  if (topDir) {
    for (const n of fs.readdirSync(topDir)) {
      fs.renameSync(topDir + '/' + n, n);
    }
    fs.rmdirSync(topDir);
  }
})().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
`.trim();

    const tree: FileSystemTree = {
      'package.json': {
        file: {
          contents: JSON.stringify({
            name: 'clone-temp',
            private: true,
            dependencies: { 'adm-zip': '^0.5.16' },
          }),
        },
      },
      'fetch-archive.js': { file: { contents: fetchScript } },
    };
    await wc.mount(tree);

    const install = await wc.spawn('npm', ['install']);
    install.output.pipeTo(new WritableStream({ write: (d) => console.log(d) }));
    if ((await install.exit) !== 0) throw new Error('npm install failed');

    const run = await wc.spawn('node', ['fetch-archive.js', archiveUrl]);
    run.output.pipeTo(new WritableStream({ write: (d) => console.log(d) }));
    if ((await run.exit) !== 0) throw new Error('Clone failed');

    console.log('Repo cloné (dans le WebContainer, sans CORS).');
    const filesList = await this.getFullTree(wc);
    console.log('files:', filesList);
  }

  async startDevServer() {
    console.log("installing dependencies...");
    const installProcess = await this._webcontainerInstance!.spawn('npm', ['install']);

    installProcess.output.pipeTo(new WritableStream({
      write(data) {
        console.log(data);
      }
    }));

    const installExitCode = await installProcess.exit;

    if (installExitCode !== 0) {
      throw new Error('Unable to run npm install');
    }

    console.log("installing dependencies... done");

    console.log("starting dev server...");
    const serverocess = await this._webcontainerInstance!.spawn('npm', ['run', 'start']);
    this._webcontainerInstance!.on('server-ready', (port, url) => {
      console.log("server ready on port:", port, "url:", url);
      const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = url;
      }
    });

    serverocess.output.pipeTo(new WritableStream({
      write(data) {
        console.log(data);
      }
    }));
    const serverExitCode = await serverocess.exit;
    if (serverExitCode !== 0) {
      throw new Error('Unable to run npm start');
    }
    console.log("starting dev server... done");
  }

  async getFullTree(webcontainer: WebContainer, path = '/') {
    const entries = await webcontainer.fs.readdir(path, { withFileTypes: true });
    const tree = [];

    for (const entry of entries) {
      const entryPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;
      const item = {
        name: entry.name,
        path: entryPath,
        isDirectory: entry.isDirectory,
        children: [],
      };

      if (entry.isDirectory()) {
        // Récursivement lister les sous-dossiers
        item.children = (await this.getFullTree(webcontainer, entryPath)) as any;
      }

      tree.push(item);
    }

    return tree;
  }
}
