import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  msg: string;
  type: 'success' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<ToastMessage>();
  toastState$ = this.toastSubject.asObservable();

  showSuccess(msg: string) {
    this.toastSubject.next({ msg, type: 'success' });
  }

  showError(msg: string) {
    this.toastSubject.next({ msg, type: 'error' });
  }
}
