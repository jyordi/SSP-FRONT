import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators,ReactiveFormsModule } from '@angular/forms';
@Component({
  selector: 'app-sele-perfil',
  imports: [ReactiveFormsModule],
  templateUrl: './sele-perfil.html',
  styleUrl: './sele-perfil.css',
})
export class SelePerfil {


// Controla qué pantalla mostrar. Null = Selector de perfiles
  perfilSeleccionado: string | null = null;
  loginForm: FormGroup;

  // Diccionario para mostrar el ícono y nombre correcto en el formulario
  perfilesInfo: { [key: string]: { nombre: string, icono: string } } = {
    psicologo: { nombre: 'Psicólogo', icono: '🧠' },
    guia: { nombre: 'Guía', icono: '🧭' },
    comandante: { nombre: 'Comandante', icono: '🪖' },
    admin: { nombre: 'Administrador', icono: '⚙️' }
  };

  constructor(private fb: FormBuilder) {
    // Inicializamos el formulario de login
    this.loginForm = this.fb.group({
      usuario: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  // Método que se llama al hacer clic en una tarjeta
  irLogin(perfil: string) {
    this.perfilSeleccionado = perfil;
    this.loginForm.reset(); // Limpia campos anteriores
  }

  // Método para el botón de regresar
  volver() {
    this.perfilSeleccionado = null;
  }

  // Método para enviar el login
  onLogin() {
    if (this.loginForm.valid) {
      console.log(`Intentando acceder como ${this.perfilSeleccionado}:`, this.loginForm.value);
      // Aquí conectarás con tu API en Laravel
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
