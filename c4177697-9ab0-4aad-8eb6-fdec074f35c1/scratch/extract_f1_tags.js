const fs = require('fs');
const PizZip = require('pizzip');

function extractTags(text) {
  const regex = /\{([^}]+)\}/g;
  const tags = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) {
    tags.add(match[1].trim());
  }
  return Array.from(tags).sort();
}

try {
  const path = 'public/assets/plantillas/F1 entrevista-Psicologica.docx';
  if (!fs.existsSync(path)) {
     console.error('File not found:', path);
     process.exit(1);
  }
  const content = fs.readFileSync(path, 'binary');
  const zip = new PizZip(content);
  // We can read word/document.xml directly from the zip to find tags
  const xml = zip.file('word/document.xml').asText();
  
  const tags = extractTags(xml);
  console.log('=== TAGS ENCONTRADOS en F1 entrevista-Psicologica.docx ===');
  console.log(JSON.stringify(tags, null, 2));
  
} catch (error) {
  console.error('Error reading docx tags:', error.message);
}
