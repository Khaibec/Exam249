import { Injectable, inject, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { LiveSessionMonitor, RiskLevel, SessionStatus, ViolationEvent } from '../models/models';

export interface LiveViolationAlert {
  sessionId: string;
  examId: string;
  studentId: string;
  studentName: string;
  totalRiskScore: number;
  riskLevel: RiskLevel;
  violationsCount: number;
  violation: ViolationEvent;
}

@Injectable({
  providedIn: 'root'
})
export class ProctoringSignalRService {
  private authService = inject(AuthService);
  private connection: signalR.HubConnection | null = null;

  connectionState = signal<'disconnected' | 'connecting' | 'connected'>('disconnected');
  liveSessions = signal<LiveSessionMonitor[]>([]);
  liveAlerts = signal<LiveViolationAlert[]>([]);

  private getHubUrl(): string {
    const base = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${base}/hubs/anticheat`;
  }

  private buildConnection(): signalR.HubConnection {
    return new signalR.HubConnectionBuilder()
      .withUrl(this.getHubUrl(), {
        accessTokenFactory: () => this.authService.token() || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();
  }

  async connectStudent(
    examId: string,
    sessionId: string,
    totalQuestions: number,
    onDisqualified: (reason: string) => void
  ): Promise<void> {
    await this.disconnect();

    this.connectionState.set('connecting');
    const conn = this.buildConnection();
    this.connection = conn;

    conn.on('ForceDisqualified', (payload: { sessionId: string; reason: string }) => {
      if (payload?.sessionId === sessionId) {
        onDisqualified(payload.reason || 'Phiên thi đã bị giám thị đình chỉ.');
      }
    });

    conn.onreconnected(async () => {
      this.connectionState.set('connected');
      try {
        await conn.invoke('JoinExamAsStudent', examId, sessionId, totalQuestions);
      } catch {}
    });

    conn.onclose(() => {
      this.connectionState.set('disconnected');
    });

    try {
      await conn.start();
      this.connectionState.set('connected');
      await conn.invoke('JoinExamAsStudent', examId, sessionId, totalQuestions);
    } catch (err) {
      this.connectionState.set('disconnected');
      console.warn('SignalR student connection unavailable:', err);
    }
  }

  async sendStudentProgress(
    examId: string,
    sessionId: string,
    answeredCount: number,
    totalQuestions: number,
    webcamActive: boolean
  ): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('UpdateStudentProgress', examId, sessionId, answeredCount, totalQuestions, webcamActive);
      } catch {}
    }
  }

  async connectProctor(examId: string): Promise<void> {
    await this.disconnect();

    this.connectionState.set('connecting');
    this.liveSessions.set([]);
    this.liveAlerts.set([]);

    const conn = this.buildConnection();
    this.connection = conn;

    conn.on('ActiveSessionsSnapshot', (sessions: LiveSessionMonitor[]) => {
      this.liveSessions.set(sessions || []);
    });

    conn.on('StudentJoined', (session: LiveSessionMonitor) => {
      this.upsertSession(session);
    });

    conn.on('StudentProgressUpdated', (session: LiveSessionMonitor) => {
      this.upsertSession(session);
    });

    conn.on('StudentConnectionChanged', (payload: { sessionId: string; isOnline: boolean }) => {
      this.liveSessions.update(list =>
        list.map(s => s.sessionId === payload.sessionId ? { ...s, isOnline: payload.isOnline } : s)
      );
    });

    conn.on('ViolationAlert', (alert: LiveViolationAlert) => {
      this.liveAlerts.update(alerts => [alert, ...alerts].slice(0, 50));
      this.liveSessions.update(list =>
        list.map(s =>
          s.sessionId === alert.sessionId
            ? {
                ...s,
                totalRiskScore: alert.totalRiskScore,
                riskLevel: alert.riskLevel,
                violationsCount: alert.violationsCount,
                lastHeartbeatUtc: new Date().toISOString()
              }
            : s
        )
      );
    });

    conn.on('SnapshotCaptured', (payload: { sessionId: string; imageUrl: string; timestampUtc: string }) => {
      this.liveSessions.update(list =>
        list.map(s =>
          s.sessionId === payload.sessionId
            ? { ...s, latestSnapshotUrl: payload.imageUrl, webcamActive: true, lastHeartbeatUtc: payload.timestampUtc }
            : s
        )
      );
    });

    conn.on('StudentSubmitted', (payload: { sessionId: string }) => {
      this.liveSessions.update(list =>
        list.map(s =>
          s.sessionId === payload.sessionId
            ? { ...s, status: SessionStatus.Submitted, isOnline: false }
            : s
        )
      );
    });

    conn.on('SessionDisqualified', (payload: { sessionId: string }) => {
      this.liveSessions.update(list =>
        list.map(s =>
          s.sessionId === payload.sessionId
            ? { ...s, status: SessionStatus.Disqualified, isOnline: false }
            : s
        )
      );
    });

    conn.onreconnected(async () => {
      this.connectionState.set('connected');
      try {
        await conn.invoke('JoinExamAsProctor', examId);
      } catch {}
    });

    conn.onclose(() => {
      this.connectionState.set('disconnected');
    });

    try {
      await conn.start();
      this.connectionState.set('connected');
      await conn.invoke('JoinExamAsProctor', examId);
    } catch (err) {
      this.connectionState.set('disconnected');
      console.warn('SignalR proctor connection unavailable:', err);
    }
  }

  private upsertSession(session: LiveSessionMonitor): void {
    this.liveSessions.update(list => {
      const idx = list.findIndex(x => x.sessionId === session.sessionId);
      if (idx >= 0) {
        const copy = [...list];
        copy[idx] = { ...copy[idx], ...session };
        return copy;
      }
      return [session, ...list];
    });
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch {}
      this.connection = null;
    }
    this.connectionState.set('disconnected');
  }
}
