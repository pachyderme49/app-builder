import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';

interface Project {
  id: string;
  name: string;
  createdAt: string;
}

const STORAGE_KEY = 'app-builder:projects';

type ProjectTab = 'pages' | 'components' | 'data' | 'configuration';

@Component({
  selector: 'app-project-edit-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TabsModule],
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
