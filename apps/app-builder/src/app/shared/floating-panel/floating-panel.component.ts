import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-floating-panel',
  standalone: true,
  imports: [CommonModule, AvatarModule, ButtonModule],
  templateUrl: './floating-panel.component.html',
})
export class FloatingPanelComponent {
  /** Optional title for the panel header */
  title = input<string>();

  /** Whether the panel is visible (for toggle behavior) */
  visible = input<boolean>(true);

  /** 'right' = full height flush right, 'default' = floating card */
  variant = input<'right' | 'default'>('default');
}
