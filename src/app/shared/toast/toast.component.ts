import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="in-app-toast fade-in" 
         *ngIf="toast" 
         [class.toast-error]="toast.type === 'error'">
      <div class="toast-content">
        <span class="toast-icon">{{ toast.type === 'error' ? '❌' : '✅' }}</span>
        <p>{{ toast.msg }}</p>
      </div>
    </div>
  `,
  styles: [`
    .in-app-toast {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      background: #10b981;
      color: white;
      padding: 1.5rem 2.5rem;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      min-width: 350px;
      text-align: center;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .toast-error { 
      background: #ef4444; 
      box-shadow: 0 20px 50px rgba(239, 68, 68, 0.3);
    }
    .toast-content { display: flex; align-items: center; gap: 15px; }
    .toast-content p { margin: 0; font-weight: 600; font-size: 1.1rem; }
    .toast-icon { font-size: 1.8rem; }
    
    .fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { 
      from { opacity: 0; transform: translate(-50%, -40%); } 
      to { opacity: 1; transform: translate(-50%, -50%); } 
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toast: ToastMessage | null = null;
  private sub: Subscription | null = null;
  private timer: any;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.sub = this.toastService.toastState$.subscribe(state => {
      this.toast = state;
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.toast = null, 4000);
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
    if (this.timer) clearTimeout(this.timer);
  }
}
