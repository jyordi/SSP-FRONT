import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Civico } from '../../services/civico';
import { NavbarReconectaComponent } from "../../shared/navbar-reconecta/navbar-reconecta";

@Component({
  selector: 'app-nuevo-expediente-civico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarReconectaComponent],
  templateUrl: './nuevo-expediente-civico.html',
  styleUrls: ['./nuevo-expediente-civico.css']
})
export class NuevoExpedienteCivicoComponent {

  paso = 1;
  loading = false;
  error = '';
  mensaje = '';

  beneficiarioId!: number;

  previewUrl: string | null = null;
  fotoBase64: string | null = null;

  beneficiarioForm: FormGroup;
  civicoForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private service: Civico,
    private router: Router
  ) {

    this.beneficiarioForm = this.fb.group({
      nombre: ['', Validators.required],
      tiempoAsignado: [1, Validators.required],
      unidadTiempo: ['HORAS', Validators.required],
      urlFoto: ['']
    });

    this.civicoForm = this.fb.group({

      curp: ['', [
        Validators.required,
        Validators.pattern(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]{2}$/)
      ]],

      fechaNacimiento: ['', Validators.required],
      genero: ['', Validators.required],

      domicilioCompleto: ['', Validators.required],
      municipio: ['', Validators.required],
      codigoPostal: ['', Validators.required],
      telefonoContacto: ['', Validators.required],

      escolaridadActual: [''],
      estadoCivil: [''],
      ocupacionActual: [''],
      nacionalidad: ['Mexicana'],

      madreNombre: ['', Validators.required],
      madreTelefono: ['', Validators.required],

      padreNombre: [''],
      padreTelefono: [''],

      folioExpediente: ['', Validators.required],
      numJuzgadoCivico: ['', Validators.required],
      juezControl: ['', Validators.required],
      generoJuez: ['M'],

      causaPenal: ['', Validators.required],
      delitoImputado: [''],
      agraviado: [''],

      fechaDetencion: [''],
      modalidadFalta: [''],

      horasSentencia: [{ value: 0, disabled: true }, Validators.required],
      horasPorDia: [4],

      fechaInicioBeneficio: [''],
      fechaTerminoBeneficio: [''],
      fechaOficioCanalizacion: [''],
      oficioCanalizacion: ['']
    });
  }

  // LIMPIAR + VALIDAR CURP
  onCurpChange() {
    let curp = this.civicoForm.value.curp || '';

    curp = curp.toUpperCase().replace(/\s/g, '');

    this.civicoForm.patchValue({ curp });

    if (curp.length === 18) {
      this.autocompletarDesdeCURP(curp);
    }
  }

  //  AUTOCOMPLETAR DESDE CURP
  autocompletarDesdeCURP(curp: string) {

    const fecha = curp.substring(4, 10); // YYMMDD
    const genero = curp.substring(10, 11);

    const year = parseInt(fecha.substring(0, 2), 10);
    const month = fecha.substring(2, 4);
    const day = fecha.substring(4, 6);

    const fullYear = year < 50 ? 2000 + year : 1900 + year;

    const fechaISO = `${fullYear}-${month}-${day}`;

    this.civicoForm.patchValue({
      fechaNacimiento: fechaISO,
      genero: genero === 'H' ? 'masculino' : 'femenino'
    });
  }

  //  COMPRESIÓN
  onFileChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e: any) => {
      const img = new Image();
      img.src = e.target.result;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 300 / img.width;

        canvas.width = 300;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressed = canvas.toDataURL('image/jpeg', 0.5);

        this.previewUrl = compressed;
        this.fotoBase64 = compressed;

        this.beneficiarioForm.patchValue({
          urlFoto: compressed
        });
      };
    };

    reader.readAsDataURL(file);
  }

  //  PASO 1
  crearBeneficiario() {

    if (this.beneficiarioForm.invalid) {
      this.error = 'Completa los campos';
      return;
    }

    this.loading = true;

    const data = {
      ...this.beneficiarioForm.value,
      nombre: this.beneficiarioForm.value.nombre.toUpperCase()
    };

    this.service.crearBeneficiario(data).subscribe({
      next: (res) => {
        this.beneficiarioId = res.id;

        //  AUTORELLENO
        this.civicoForm.patchValue({
          horasSentencia: this.beneficiarioForm.value.tiempoAsignado
        });

        this.loading = false;
        this.paso = 2;
      },
      error: () => {
        this.loading = false;
        this.error = 'Error al crear beneficiario';
      }
    });
  }

  //  CREAR EXPEDIENTE (LIMPIO PARA BACKEND)
  crearExpediente() {

    this.loading = true;

    const raw = this.civicoForm.getRawValue();

    const data = {
      beneficiarioId: this.beneficiarioId,

      ...raw,

      horasPorDia: Number(raw.horasPorDia) || 4,
      horasSentencia: Number(raw.horasSentencia) || 0,

      genero: raw.genero === 'masculino' ? 'M' : 'F',

      fechaDetencion: raw.fechaDetencion || null,
      fechaInicioBeneficio: raw.fechaInicioBeneficio || null,
      fechaTerminoBeneficio: raw.fechaTerminoBeneficio || null,
      fechaOficioCanalizacion: raw.fechaOficioCanalizacion || null,

      contactosFamiliares: {
        madre: {
          nombre: raw.madreNombre,
          telefono: raw.madreTelefono
        },
        padre: {
          nombre: raw.padreNombre || '',
          telefono: raw.padreTelefono || ''
        }
      }
    };

    this.service.crearCivico(data).subscribe({
      next: () => {
        this.mensaje = 'Expediente creado ';

        setTimeout(() => {
          this.router.navigate(['/expedientes']);
        }, 1500);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Error en backend';
      }
    });
  }
}