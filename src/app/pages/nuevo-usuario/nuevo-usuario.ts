import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsersService, Usuario } from '../../services/users.service';

@Component({
  selector: 'app-nuevo-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './nuevo-usuario.html',
  styleUrls: ['./nuevo-usuario.css']
})
export class NuevoUsuarioComponent implements OnInit {

  form!: FormGroup;
  loading = false;
  usuarios: Usuario[] = [];
  expandedUser: number | null = null;

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private router: Router
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      nomUsuario: ['', Validators.required],
      rol: ['psicologo', Validators.required],
      contrasena: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.usersService.obtenerUsuarios().subscribe({
      next: (data) => this.usuarios = data,
      error: (err) => console.error(err)
    });
  }

  submit() {
    if (this.form.invalid) return;

    this.loading = true;

    this.usersService.crearUsuario(this.form.value).subscribe({
      next: () => {
        this.loading = false;
        this.form.reset();
        this.cargarUsuarios();
        alert('✅ Usuario creado correctamente');
      },
      error: (err) => {
        this.loading = false;
        alert(err.error?.message || 'Error al crear usuario');
      }
    });
  }

  toggleUser(id: number) {
    this.expandedUser = this.expandedUser === id ? null : id;
  }

  regresar() {
    this.router.navigate(['/expedientes']);
  }
}