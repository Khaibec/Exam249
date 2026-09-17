import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RiskLevel, RiskScoreSummary, ViolationType } from '../models/models';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class AntiCheatService {
  private apiUrl = `${environment.apiUrl}/anticheat`;

  violationCount = signal<number>(0);
  riskScore = signal<number>(0);
  riskLevel = signal<RiskLevel>(RiskLevel.Safe);
  isOverlayWarningVisible = signal<boolean>(false);
  overlayWarningMessage = signal<string>('');
  isFullscreen = signal<boolean>(false);

  private activeSessionId: string | null = null;
  private listenersAttached = false;

  constructor(private http: HttpClient, private toast: ToastService) {}

  startMonitoring(sessionId: string): void {
    this.activeSessionId = sessionId;
    this.violationCount.set(0);
    this.riskScore.set(0);
    this.riskLevel.set(RiskLevel.Safe);

    if (!this.listenersAttached) {
      this.attachClientListeners();
      this.listenersAttached = true;
    }
  }

  stopMonitoring(): void {
    this.activeSessionId = null;
    this.detachClientListeners();
    this.listenersAttached = false;
    this.exitFullscreen();
  }

  requestFullscreen(): Promise<void> {
    const elem = document.documentElement as any;
    if (elem.requestFullscreen) {
      return elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      return elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      return elem.msRequestFullscreen();
    }
    return Promise.resolve();
  }

  exitFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  private attachClientListeners(): void {
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('contextmenu', this.handleContextMenu);
    document.addEventListener('copy', this.handleCopyCutPaste);
    document.addEventListener('cut', this.handleCopyCutPaste);
    document.addEventListener('paste', this.handleCopyCutPaste);
  }

  private detachClientListeners(): void {
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('contextmenu', this.handleContextMenu);
    document.removeEventListener('copy', this.handleCopyCutPaste);
    document.removeEventListener('cut', this.handleCopyCutPaste);
    document.removeEventListener('paste', this.handleCopyCutPaste);
  }

  private handleFullscreenChange = () => {
    const isFull = !!document.fullscreenElement;
    this.isFullscreen.set(isFull);

    if (!isFull && this.activeSessionId) {
      this.showOverlayWarning('CẢNH BÁO: Bạn đã thoát chế độ toàn màn hình! Vui lòng nhấn quay lại toàn màn hình để tiếp tục làm bài.');
      this.recordViolation(ViolationType.FullscreenExit, 'Thoát chế độ toàn màn hình');
    }
  };

  private handleVisibilityChange = () => {
    if (document.hidden && this.activeSessionId) {
      this.showOverlayWarning('CẢNH BÁO: Hệ thống phát hiện bạn đã chuyển sang tab hoặc ứng dụng khác!');
      this.recordViolation(ViolationType.TabSwitch, 'Chuyển tab trình duyệt hoặc ẩn cửa sổ');
    }
  };

  private handleWindowBlur = () => {
    if (this.activeSessionId) {
      this.recordViolation(ViolationType.BlurLoss, 'Mất tiêu điểm cửa sổ thi');
    }
  };

  private handleContextMenu = (e: MouseEvent) => {
    if (this.activeSessionId) {
      e.preventDefault();
      this.toast.warning('Chuột phải đã bị vô hiệu hóa trong phòng thi.');
    }
  };

  private handleCopyCutPaste = (e: ClipboardEvent) => {
    if (this.activeSessionId) {
      e.preventDefault();
      this.recordViolation(ViolationType.CopyPaste, 'Cố tình sao chép / dán nội dung trong bài thi');
      this.toast.warning('Thao tác sao chép / dán bị nghiêm cấm trong phòng thi!');
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.activeSessionId) return;

    // Block F12
    if (e.key === 'F12') {
      e.preventDefault();
      this.recordViolation(ViolationType.DevToolsShortcut, 'Bấm phím F12 (DevTools)');
      this.toast.error('Phím F12 đã bị vô hiệu hóa.');
      return;
    }

    // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
    if (
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
      (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
    ) {
      e.preventDefault();
      this.recordViolation(ViolationType.DevToolsShortcut, `Tổ hợp phím cấm: ${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`);
      this.toast.error('Tổ hợp phím kiểm tra mã nguồn đã bị vô hiệu hóa.');
      return;
    }

    // Block Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
    if (e.ctrlKey && ['c', 'v', 'x', 'a', 'p'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      this.toast.warning(`Tổ hợp phím Ctrl+${e.key.toUpperCase()} đã bị vô hiệu hóa.`);
    }
  };

  showOverlayWarning(message: string): void {
    this.overlayWarningMessage.set(message);
    this.isOverlayWarningVisible.set(true);
  }

  dismissOverlayWarning(): void {
    this.isOverlayWarningVisible.set(false);
    this.requestFullscreen();
  }

  recordViolation(type: ViolationType, description: string, metadata?: string): void {
    if (!this.activeSessionId) return;

    const payload = {
      sessionId: this.activeSessionId,
      type,
      description,
      metadata,
      userAgent: navigator.userAgent
    };

    this.http.post<any>(`${this.apiUrl}/violations`, payload).subscribe({
      next: res => {
        if (res.success && res.data) {
          const summary = res.data as RiskScoreSummary;
          this.violationCount.set(summary.violationsCount);
          this.riskScore.set(summary.totalRiskScore);
          this.riskLevel.set(summary.riskLevel);
        }
      },
      error: () => {
        this.violationCount.update(c => c + 1);
      }
    });
  }

  // Extension Point: Webcam snapshot capture
  async captureWebcamSnapshot(videoElement: HTMLVideoElement): Promise<string | null> {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 320;
      canvas.height = videoElement.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.6);

      if (this.activeSessionId) {
        this.http.post(`${this.apiUrl}/sessions/${this.activeSessionId}/snapshots`, {
          sessionId: this.activeSessionId,
          base64Image: base64,
          triggerReason: 'Periodic'
        }).subscribe();
      }

      return base64;
    } catch {
      return null;
    }
  }
}
