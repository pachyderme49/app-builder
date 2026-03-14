import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import type { Project } from '../models';
import { createGuid } from '../models/id.util';
import { createDefaultPagesAndLinks } from '../models/mock-data';

const STORAGE_KEY = 'app-builder:projects';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule],
  templateUrl: './projects-page.html',
  styleUrl: './projects-page.css',
})
export class ProjectsPage implements OnInit {
  private readonly router = inject(Router);
  projects: Project[] = [];
  newProjectName = '';

  ngOnInit(): void {
    this.loadProjects();
  }

  get hasProjects(): boolean {
    return this.projects.length > 0;
  }

  addProject(): void {
    const name = this.newProjectName.trim();
    if (!name) {
      return;
    }

    const { pages, pageLinks, moduleLinks } = createDefaultPagesAndLinks();
    const project: Project = {
      id: createGuid(),
      name,
      createdAt: new Date().toISOString(),
      pages,
      pageLinks,
      moduleLinks,
    };

    this.projects = [...this.projects, project];
    this.newProjectName = '';
    this.saveProjects();
    this.navigateToProject(project.id);
  }

  removeProject(id: string): void {
    this.projects = this.projects.filter((project) => project.id !== id);
    this.saveProjects();
  }

  onDelete(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.removeProject(id);
  }

  openProject(id: string): void {
    this.navigateToProject(id);
  }

  private navigateToProject(id: string): void {
    this.router.navigate(['/projects', id]);
  }

  private loadProjects(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Project[];
      if (Array.isArray(parsed)) {
        this.projects = parsed;
      }
    } catch {
      // ignore malformed local storage
    }
  }

  private saveProjects(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.projects));
  }
}
