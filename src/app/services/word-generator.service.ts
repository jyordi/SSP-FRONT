import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { saveAs } from 'file-saver';

// Se evitan problemas con TypeScript importando librerías via TS require si no tienen @types listos
declare var window: any;
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

@Injectable({
  providedIn: 'root'
})
export class WordGeneratorService {

  constructor(private http: HttpClient) { }

  /**
   * Genera y descarga un documento Word (.docx) a partir de una plantilla almacenada en la carpeta assets.
   * 
   * @param nombrePlantilla Nombre del archivo de plantilla (ej. 'f3_plantilla.docx')
   * @param datos Objeto JSON con los datos a reemplazar en las variables de la plantilla
   * @param nombreSalida Nombre que tendrá el archivo generado que se descargará
   */
  async generarDesdePlantilla(nombrePlantilla: string, datos: any, nombreSalida: string = 'documento.docx') {
    try {
      // 1. Descargar la plantilla desde la app (/assets/plantillas/...)
      // La convertimos a ArrayBuffer para que PizZip la pueda procesar
      const urlPlantilla = `/assets/plantillas/${nombrePlantilla}`;
      const unzippedBlob = await firstValueFrom(this.http.get(urlPlantilla, { responseType: 'arraybuffer' }));

      // 2. Inicializar PizZip (motor de compresión del .docx)
      const zip = new PizZip(unzippedBlob);

      // 3. Inicializar Docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        // Handler para variables undefined: Retornamos línea vacía '' en vez de crashear el doc
        nullGetter: function(part) {
            if (!part.module) {
                return '';
            }
            if (part.module === "rawxml") {
                return '';
            }
            return '';
        }
      });

      // 4. Inyectar datos
      doc.render(datos);

      // 5. Generar archivo Blob final
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // 6. Descargar en el disco de la persona usando FileSaver
      saveAs(output, nombreSalida);
      
    } catch (error: any) {
      console.error('Error generando documento Word:', error);
      // Extraer errores específicos de docxtemplater que a veces no se lanzan directo
      if (error.properties && error.properties.errors instanceof Array) {
        const errMessages = error.properties.errors.map((e: any) => e.properties.explanation).join('\n');
        throw new Error('Error renderizando plantilla: ' + errMessages);
      }
      throw error;
    }
  }
}
