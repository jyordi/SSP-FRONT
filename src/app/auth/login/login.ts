
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { SessionService } from '../../services/session';


// CONFIG
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 30;
const SUCCESS_OVERLAY_DURATION_MS = 2200;
const DANGEROUS_CHARS_PATTERN = /[<>"'`;(){}\\]/;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit, OnDestroy {

  loginForm!: FormGroup;

  hasError = false;
  isLoading = false;
  isLocked = false;
  lockoutCountdown = 0;
  failedAttempts = 0;
  maxAttempts = MAX_FAILED_ATTEMPTS;
  showPassword = false;
  loginSuccess = false;

  private lockoutIntervalRef: any = null;
  private successTimeoutRef: any = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly authService: AuthService,
    private sessionService: SessionService
  ) {}

  ngOnInit(): void {
    this.buildForm();
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
  }

  private buildForm(): void {
    this.loginForm = this.fb.group({
      usuario: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          this.sanitizeInputValidator
        ]
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(128)
        ]
      ]
    });
  }

  get isFormReady(): boolean {
    const usuario = this.loginForm?.get('usuario')?.value ?? '';
    const password = this.loginForm?.get('password')?.value ?? '';
    return usuario.trim().length > 0 && password.trim().length > 0;
  }

  private sanitizeInputValidator(control: AbstractControl) {
    const value: string = control.value ?? '';
    return DANGEROUS_CHARS_PATTERN.test(value) ? { unsafeChars: true } : null;
  }

  // 🔥 LOGIN REAL
  onLogin(): void {
    if (this.isLocked || this.isLoading) return;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.hasError = false;

    const usuario = this.sanitizeString(this.loginForm.get('usuario')?.value.trim());
    const password = this.sanitizeString(this.loginForm.get('password')?.value.trim());

    this.authService.login({
      nomUsuario: usuario,   // 🔥 CORRECTO
      contrasena: password
    }).subscribe({
      next: (res) => {
        this.sessionService.setToken(res.access_token);
        this.onLoginSuccess();
      },
      error: (err) => {
        console.error('Login error:', err);
        this.onLoginFailure();
      }
    });
  }

  private onLoginSuccess(): void {
    this.isLoading = false;
    this.failedAttempts = 0;
    this.loginSuccess = true;

    this.successTimeoutRef = setTimeout(() => {
      const destino = this.sessionService.debeIniciarEnVoluntarios()
        ? '/voluntarios/personas'
        : '/expedientes';
      this.router.navigate([destino]);
    }, SUCCESS_OVERLAY_DURATION_MS);
  }

  private onLoginFailure(): void {
    this.isLoading = false;
    this.hasError = true;
    this.failedAttempts++;

    this.loginForm.get('password')?.reset();

    if (this.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      this.activateLockout();
    }
  }

  private activateLockout(): void {
    this.isLocked = true;
    this.lockoutCountdown = LOCKOUT_DURATION_SECONDS;
    this.hasError = false;

    this.loginForm.disable();

    this.lockoutIntervalRef = setInterval(() => {
      this.lockoutCountdown--;

      if (this.lockoutCountdown <= 0) {
        this.deactivateLockout();
      }
    }, 1000);
  }

  private deactivateLockout(): void {
    clearInterval(this.lockoutIntervalRef);

    this.isLocked = false;
    this.failedAttempts = 0;
    this.lockoutCountdown = 0;

    this.loginForm.enable();
    this.loginForm.reset();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private sanitizeString(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  private clearAllTimers(): void {
    if (this.lockoutIntervalRef) clearInterval(this.lockoutIntervalRef);
    if (this.successTimeoutRef) clearTimeout(this.successTimeoutRef);
  }
}

