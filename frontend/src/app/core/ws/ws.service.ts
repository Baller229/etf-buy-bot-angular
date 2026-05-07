import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import type { WsEnvelope, WsLogEntry, WsStatus } from './ws.types';

@Injectable({ providedIn: 'root' })
export class WsService implements OnDestroy {
  private ws: WebSocket | null = null;
  private readonly url = `ws://${location.host}/ws`;

  readonly status$ = new BehaviorSubject<WsStatus>('DISCONNECTED');
  readonly logs$ = new Subject<WsLogEntry>();
  readonly messages$ = new Subject<WsEnvelope>();

  connect(): void {
    if (
      this.ws?.readyState === WebSocket.OPEN ||
      this.ws?.readyState === WebSocket.CONNECTING
    ) return;

    this.logSys(`CONNECTING ${this.safeUrl(this.url)}`);
    this.status$.next('CONNECTING');
    this.ws = new WebSocket(this.url);

    this.ws.addEventListener('open', () => {
      this.status$.next('CONNECTED');
      this.logSys('CONNECTED');
    });

    this.ws.addEventListener('close', (e) => {
      this.status$.next('DISCONNECTED');
      this.logSys(`CLOSED code=${e.code} reason=${e.reason || '-'}`);
    });

    this.ws.addEventListener('error', () => {
      this.logSys('ERROR (see console)');
    });

    this.ws.addEventListener('message', (e) => {
      const raw = String(e.data ?? '');
      try {
        const msg = JSON.parse(raw) as WsEnvelope;
        this.logIn(String(msg.wsMsgType), raw);
        if (msg.wsMsgType === 'PING') {
          this.send({ wsMsgType: 'PONG' });
        } else {
          this.messages$.next(msg);
        }
      } catch { /* ignore non-JSON frames */ }
    });
  }

  send(msg: WsEnvelope): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(msg));
    this.logOut(String(msg.wsMsgType), JSON.stringify(msg));
    return true;
  }

  disconnect(): void {
    this.ws?.close(1000, 'cleanup');
    this.ws = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private logSys(text: string): void {
    this.logs$.next({ ts: Date.now(), dir: 'SYS', text });
  }

  private logIn(type: string, text: string): void {
    this.logs$.next({ ts: Date.now(), dir: 'IN', type, text });
  }

  private logOut(type: string, text: string): void {
    this.logs$.next({ ts: Date.now(), dir: 'OUT', type, text });
  }

  private safeUrl(raw: string): string {
    try {
      const u = new URL(raw);
      return `${u.protocol}//${u.host}${u.pathname}`;
    } catch {
      return raw;
    }
  }
}
