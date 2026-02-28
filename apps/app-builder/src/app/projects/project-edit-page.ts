import {
  Component,
  viewChild,
  HostListener,
  inject,
  OnInit,
  signal,
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
  FFlowModule,
  FCreateConnectionEvent,
  FCreateNodeEvent,
  FReassignConnectionEvent,
  FSelectionChangeEvent,
} from '@foblex/flow';

interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export interface FlowNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type?: string;
  modules?: string[];
}

export interface FlowConnection {
  id: string;
  outputId: string;
  inputId: string;
}

export interface PagePrefaite {
  id: string;
  name: string;
  type: string;
}

export interface ModuleItem {
  id: string;
  name: string;
}

const PAGES_PREFAITES: PagePrefaite[] = [
  { id: 'formulaire', name: 'Formulaire', type: 'formulaire' },
  { id: 'connexion', name: 'Connexion', type: 'connexion' },
];

const MODULES: ModuleItem[] = [
  { id: 'champs', name: 'Champs' },
  { id: 'bouton', name: 'Bouton' },
  { id: 'tableau', name: 'Tableau' },
];

function generateId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateConnectionId(): string {
  return `conn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const STORAGE_KEY = 'app-builder:projects';

type ProjectTab = 'pages' | 'components' | 'data' | 'configuration';

const DEFAULT_PAGES_NODES: FlowNode[] = [
  { id: 'auth', name: 'auth', x: 0, y: 0 },
  { id: 'home', name: 'home', x: 220, y: 0 },
  { id: 'contact', name: 'Contact', x: 440, y: 120 },
  { id: 'products', name: 'Products', x: 440, y: -120 },
];

const DEFAULT_PAGES_CONNECTIONS: FlowConnection[] = [
  { id: 'conn-auth-home', outputId: 'auth-out', inputId: 'home-in' },
  { id: 'conn-home-contact', outputId: 'home-out', inputId: 'contact-in' },
  { id: 'conn-home-products', outputId: 'home-out', inputId: 'products-in' },
];

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
  styleUrl: './project-edit-page.css',
})
export class ProjectEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  project: Project | null = null;
  isEditingName = false;
  editedName = '';
  activeTab: ProjectTab = 'pages';

  pagesNodes = signal<FlowNode[]>(DEFAULT_PAGES_NODES);
  pagesConnections = signal<FlowConnection[]>(DEFAULT_PAGES_CONNECTIONS);
  componentsNodes = signal<FlowNode[]>([]);
  componentsConnections = signal<FlowConnection[]>([]);

  selectedPagesNodeId = signal<string | null>(null);
  selectedComponentsNodeId = signal<string | null>(null);
  selectedPagesConnectionIds = signal<string[]>([]);
  selectedComponentsConnectionIds = signal<string[]>([]);
  editingNodeName = signal('');
  newConnectionSource = signal<string | null>(null);
  newConnectionTarget = signal<string | null>(null);

  private readonly pagesFlowRef = viewChild<FFlowComponent>('pagesFlow');
  private readonly componentsFlowRef = viewChild<FFlowComponent>('componentsFlow');

  pagesPanelCollapsed = signal(false);
  pagesPanelWidth = signal(260);
  isResizing = signal(false);
  private resizeStartX = 0;
  private resizeStartWidth = 0;
  readonly PAGES_PREFAITES = PAGES_PREFAITES;
  readonly MODULES = MODULES;

  get hasProject(): boolean {
    return !!this.project;
  }

  get projectName(): string {
    return this.project?.name ?? '';
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

    const project = this.loadProject(id);
    if (!project) {
      this.router.navigate(['/projects']);
      return;
    }

    this.project = project;
    this.editedName = project.name;
  }

  startEditName(): void {
    if (!this.project) {
      return;
    }
    this.isEditingName = true;
    this.editedName = this.project.name;
  }

  cancelEditName(): void {
    this.isEditingName = false;
    this.editedName = this.project?.name ?? '';
  }

  commitEditName(): void {
    if (!this.project) {
      return;
    }

    const name = this.editedName.trim();
    if (!name || name === this.project.name) {
      this.cancelEditName();
      return;
    }

    this.project = { ...this.project, name };
    this.saveProject(this.project);
    this.isEditingName = false;
  }

  deleteProject(): void {
    if (!this.project) {
      return;
    }

    const id = this.project.id;
    const projects = this.loadAllProjects().filter(
      (project) => project.id !== id,
    );
    this.saveAllProjects(projects);
    this.router.navigate(['/projects']);
  }

  onPagesSelectionChange(event: FSelectionChangeEvent): void {
    const nodeIds = event.nodeIds ?? [];
    const connectionIds = event.connectionIds ?? [];
    const id = nodeIds.length === 1 ? nodeIds[0] : null;
    this.selectedPagesNodeId.set(id);
    this.selectedPagesConnectionIds.set(connectionIds);
    if (id) {
      const node = this.pagesNodes().find((n) => n.id === id);
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
      const node = this.componentsNodes().find((n) => n.id === id);
      this.editingNodeName.set(node?.name ?? '');
      this.newConnectionSource.set(id);
      this.newConnectionTarget.set(null);
    }
  }

  onPagesCreateConnection(event: FCreateConnectionEvent): void {
    const inputId = event.fInputId;
    if (!inputId) return;
    const conn: FlowConnection = {
      id: generateConnectionId(),
      outputId: event.fOutputId,
      inputId,
    };
    this.pagesConnections.update((c) => [...c, conn]);
  }

  onComponentsCreateConnection(event: FCreateConnectionEvent): void {
    const inputId = event.fInputId;
    if (!inputId) return;
    const conn: FlowConnection = {
      id: generateConnectionId(),
      outputId: event.fOutputId,
      inputId,
    };
    this.componentsConnections.update((c) => [...c, conn]);
  }

  onPagesReassignConnection(event: FReassignConnectionEvent): void {
    if (!event.newTargetId && !event.newSourceId) return;
    this.pagesConnections.update((connections) =>
      connections.map((c) => {
        if (c.outputId !== event.oldSourceId || c.inputId !== event.oldTargetId)
          return c;
        return {
          ...c,
          outputId: event.newSourceId ?? c.outputId,
          inputId: event.newTargetId ?? c.inputId,
        };
      })
    );
  }

  onComponentsReassignConnection(event: FReassignConnectionEvent): void {
    if (!event.newTargetId && !event.newSourceId) return;
    this.componentsConnections.update((connections) =>
      connections.map((c) => {
        if (c.outputId !== event.oldSourceId || c.inputId !== event.oldTargetId)
          return c;
        return {
          ...c,
          outputId: event.newSourceId ?? c.outputId,
          inputId: event.newTargetId ?? c.inputId,
        };
      })
    );
  }

  addPagesConnection(): void {
    const source = this.newConnectionSource();
    const target = this.newConnectionTarget();
    if (!source || !target || source === target) return;
    const conn: FlowConnection = {
      id: generateConnectionId(),
      outputId: source + '-out',
      inputId: target + '-in',
    };
    this.pagesConnections.update((c) => [...c, conn]);
    this.newConnectionTarget.set(null);
  }

  addComponentsConnection(): void {
    const source = this.newConnectionSource();
    const target = this.newConnectionTarget();
    if (!source || !target || source === target) return;
    const conn: FlowConnection = {
      id: generateConnectionId(),
      outputId: source + '-out',
      inputId: target + '-in',
    };
    this.componentsConnections.update((c) => [...c, conn]);
    this.newConnectionTarget.set(null);
  }

  deletePagesConnections(): void {
    const ids = this.selectedPagesConnectionIds();
    if (ids.length === 0) return;
    this.pagesConnections.update((c) => c.filter((conn) => !ids.includes(conn.id)));
    this.selectedPagesConnectionIds.set([]);
    this.pagesFlowRef()?.clearSelection();
  }

  deleteComponentsConnections(): void {
    const ids = this.selectedComponentsConnectionIds();
    if (ids.length === 0) return;
    this.componentsConnections.update((c) =>
      c.filter((conn) => !ids.includes(conn.id))
    );
    this.selectedComponentsConnectionIds.set([]);
    this.componentsFlowRef()?.clearSelection();
  }

  deleteSelectedConnections(): void {
    if (this.activeTab === 'pages') {
      this.deletePagesConnections();
    } else if (this.activeTab === 'components') {
      this.deleteComponentsConnections();
    }
  }

  pagesConnectionsForNode(nodeId: string | null): FlowConnection[] {
    if (!nodeId) return [];
    return this.pagesConnections().filter(
      (c) =>
        c.outputId === nodeId + '-out' || c.inputId === nodeId + '-in'
    );
  }

  componentsConnectionsForNode(nodeId: string | null): FlowConnection[] {
    if (!nodeId) return [];
    return this.componentsConnections().filter(
      (c) =>
        c.outputId === nodeId + '-out' || c.inputId === nodeId + '-in'
    );
  }

  getNodeName(connectorId: string, nodes: FlowNode[]): string {
    const nodeId = connectorId.replace(/-out$|-in$/, '');
    const node = nodes.find((n) => n.id === nodeId);
    return node?.name ?? nodeId;
  }

  deleteConnectionById(id: string, tab: 'pages' | 'components'): void {
    if (tab === 'pages') {
      this.pagesConnections.update((c) => c.filter((conn) => conn.id !== id));
      this.selectedPagesConnectionIds.update((ids) => ids.filter((i) => i !== id));
      this.pagesFlowRef()?.clearSelection();
    } else {
      this.componentsConnections.update((c) => c.filter((conn) => conn.id !== id));
      this.selectedComponentsConnectionIds.update((ids) => ids.filter((i) => i !== id));
      this.componentsFlowRef()?.clearSelection();
    }
  }

  savePagesNodeName(): void {
    const id = this.selectedPagesNodeId();
    const name = this.editingNodeName().trim();
    if (!id || !name) return;
    this.pagesNodes.update((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, name } : n))
    );
  }

  saveComponentsNodeName(): void {
    const id = this.selectedComponentsNodeId();
    const name = this.editingNodeName().trim();
    if (!id || !name) return;
    this.componentsNodes.update((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, name } : n))
    );
  }

  onPagesNodePositionChange(nodeId: string, x: number, y: number): void {
    this.pagesNodes.update((nodes) =>
      nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n))
    );
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
    const minW = 180;
    const maxW = 400;
    const w = Math.max(minW, Math.min(maxW, this.resizeStartWidth + delta));
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
    if (
      document.activeElement &&
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        document.activeElement.tagName
      )
    ) {
      return;
    }
    this.deleteSelectedConnections();
  }

  onCreatePageNode(event: FCreateNodeEvent<{ type: string; name: string }>): void {
    const data = event.data;
    const isModule = data?.type === 'module';
    const targetNodeId = event.fTargetNode;

    if (isModule && targetNodeId) {
      this.addModuleToPage(targetNodeId, data.name);
      return;
    }

    const name = data?.name ?? 'Page';
    const id = generateId();
    const x = event.rect?.x ?? 0;
    const y = event.rect?.y ?? 0;
    const newNode: FlowNode = { id, name, x, y, type: data?.type, modules: [] };

    this.pagesNodes.update((nodes) => [...nodes, newNode]);
  }

  addModuleToPage(pageNodeId: string, moduleName: string): void {
    this.pagesNodes.update((nodes) =>
      nodes.map((n) => {
        if (n.id !== pageNodeId) return n;
        const modules = [...(n.modules ?? []), moduleName];
        return { ...n, modules };
      })
    );
  }

  onComponentsNodePositionChange(nodeId: string, x: number, y: number): void {
    this.componentsNodes.update((nodes) =>
      nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n))
    );
  }

  private loadProject(id: string): Project | null {
    const projects = this.loadAllProjects();
    return projects.find((project) => project.id === id) ?? null;
  }

  private saveProject(project: Project): void {
    const projects = this.loadAllProjects();
    const index = projects.findIndex((item) => item.id === project.id);

    if (index === -1) {
      projects.push(project);
    } else {
      projects[index] = project;
    }

    this.saveAllProjects(projects);
  }

  private loadAllProjects(): Project[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

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
}
