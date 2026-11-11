import { Component, Input, OnChanges, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-secure-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    <img *ngIf="blobUrl()" [src]="blobUrl()" [alt]="alt" [class]="imgClass" />
    <div *ngIf="!blobUrl() && !failed()" [class]="placeholderClass">
      <i class="fa-solid fa-camera text-slate-400"></i>
    </div>
    <div *ngIf="failed()" [class]="placeholderClass">
      <i class="fa-solid fa-image-slash text-rose-400"></i>
    </div>
  `
})
export class SecureImageComponent implements OnChanges, OnDestroy {
  private http = inject(HttpClient);

  @Input() src?: string | null;
  @Input() alt = 'Ảnh giám sát';
  @Input() imgClass = 'w-full h-full object-cover';
  @Input() placeholderClass = 'w-full h-full flex items-center justify-center bg-slate-100';

  blobUrl = signal<string | null>(null);
  failed = signal<boolean>(false);

  private currentObjectUrl: string | null = null;

  ngOnChanges(): void {
    this.revokeCurrentUrl();
    this.failed.set(false);

    if (!this.src) {
      this.blobUrl.set(null);
      return;
    }

    if (this.src.startsWith('data:image')) {
      this.blobUrl.set(this.src);
      return;
    }

    const baseHost = environment.apiUrl.replace(/\/api\/?$/, '');
    const fullUrl = this.src.startsWith('http') ? this.src : `${baseHost}${this.src}`;

    this.http.get(fullUrl, { responseType: 'blob' }).subscribe({
      next: blob => {
        const objectUrl = URL.createObjectURL(blob);
        this.currentObjectUrl = objectUrl;
        this.blobUrl.set(objectUrl);
      },
      error: () => {
        this.failed.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.revokeCurrentUrl();
  }

  private revokeCurrentUrl(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }
}
