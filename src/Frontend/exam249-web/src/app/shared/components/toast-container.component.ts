import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      <div *ngFor="let t of toastService.toasts()"
           class="p-4 rounded-2xl shadow-xl border backdrop-blur-md pointer-events-auto flex items-start space-x-3 transition-all animate-bounce"
           [ngClass]="{
             'bg-emerald-900/90 border-emerald-700 text-white': t.type === 'success',
             'bg-rose-900/90 border-rose-700 text-white': t.type === 'error',
             'bg-amber-900/90 border-amber-700 text-white': t.type === 'warning',
             'bg-slate-900/90 border-slate-700 text-white': t.type === 'info'
           }">
        <div class="text-base mt-0.5">
          <i class="fa-solid"
             [ngClass]="{
               'fa-circle-check text-emerald-400': t.type === 'success',
               'fa-triangle-exclamation text-rose-400': t.type === 'error',
               'fa-bell text-amber-400': t.type === 'warning',
               'fa-circle-info text-blue-400': t.type === 'info'
             }"></i>
        </div>
        <div class="flex-1 text-xs font-semibold leading-relaxed">
          {{ t.message }}
        </div>
        <button (click)="toastService.remove(t.id)" class="text-slate-400 hover:text-white text-xs">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  `
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
