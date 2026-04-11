const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

try {
  // Load the docx file as binary content
  const content = fs.readFileSync('src/assets/plantillas/f2_plantilla.docx', 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true
  });

  // Get the structural AST of the document
  const text = doc.getFullText();
  
  console.log("=== INICIO DEL TEXTO DEL DOCUMENTO ===");
  console.log(text.substring(0, 5000)); // Imprimir hasta 5000 caracteres para ver qué hay
  console.log("=== FIN ===");
  
} catch (error) {
  console.error("Error leyendo el documento:", error.message);
}
