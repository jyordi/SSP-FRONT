import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsersService, Usuario } from '../../services/users.service';
import { SessionService } from '../../services/session';
import { NavbarReconectaComponent } from '../../shared/navbar-reconecta/navbar-reconecta';

@Component({
  selector: 'app-nuevo-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarReconectaComponent],
  templateUrl: './nuevo-usuario.html',
  styleUrls: ['./nuevo-usuario.css']
})
export class NuevoUsuarioComponent implements OnInit {

  form!: FormGroup;
  loading = false;
  usuarios: Usuario[] = [];

  toast: { msg: string; tipo: 'ok' | 'error' } | null = null;
  role: string = '';

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private session: SessionService,
    private router: Router
  ) {}

  ngOnInit() {
    // 🛡️ Protección de ruta: Solo admin
    this.role = this.session.getRole();
    if (this.role !== 'admin') {
      this.router.navigate(['/expedientes']);
      return;
    }

    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      nomUsuario: ['', [Validators.required, Validators.minLength(4)]],
      rol: ['psicologo', Validators.required],
      contrasena: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.usersService.obtenerUsuarios().subscribe({
      next: (data) => {
        // Ordenamos por fecha o ID para ver los recientes arriba
        this.usuarios = data.sort((a, b) => (b.id || 0) - (a.id || 0));
      },
      error: (err) => {
        console.error(err);
        this.mostrarToast('Error al cargar la lista de usuarios', 'error');
      }
    });
  }

  submit() {
    if (this.form.invalid) {
      this.mostrarToast('Por favor completa todos los campos correctamente', 'error');
      return;
    }

    this.loading = true;

    this.usersService.crearUsuario(this.form.value).subscribe({
      next: () => {
        this.loading = false;
        this.form.reset({ rol: 'psicologo' });
        this.cargarUsuarios();
        this.mostrarToast('✅ Usuario creado correctamente', 'ok');
      },
      error: (err) => {
        this.loading = false;
        const msg = err.status === 409
          ? 'El nombre de usuario ya existe'
          : (err.error?.message || 'Error al crear usuario');
        this.mostrarToast(msg, 'error');
      }
    });
  }

  mostrarToast(msg: string, tipo: 'ok' | 'error') {
    this.toast = { msg, tipo };
    setTimeout(() => this.toast = null, 3500);
  }

  regresar() {
    this.router.navigate(['/expedientes']);
  }

  getRoleLabel(rol: string): string {
    const roles: any = {
      admin: 'Administrador',
      psicologo: 'Psicología',
      trabajo_social: 'Trabajo Social',
      guia: 'Guía / Seguimiento',
      coordinador: 'Coordinación',
tallerista: 'Tallerista'

    };
    return roles[rol] || rol;
  }
}
