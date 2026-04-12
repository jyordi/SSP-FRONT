const fs = require('fs');
const PizZip = require('pizzip');

function extractTags(text) {
  const regex = /\{([^{}]+)\}/g;
  const tags = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) {
    // Word sometimes splits tags with XML like <w:t>{</w:t><w:t>tag</w:t><w:t>}</w:t>
    // But since we are reading the XML directly, we might see the XML tags inside.
    // However, if we just look for { ... }, we might see things like {</w:t><w:t>tag}
    let tag = match[1].replace(/<[^>]+>/g, '');
    tags.add(tag.trim());
  }
  return Array.from(tags).sort();
}

try {
  const path = 'public/assets/plantillas/F1 entrevista-Psicologica.docx';
  const content = fs.readFileSync(path, 'binary');
  const zip = new PizZip(content);
  const xml = zip.file('word/document.xml').asText();
  
  // Also check header/footer
  let headerXml = '';
  try { headerXml = zip.file('word/header1.xml').asText(); } catch(e){}
  
  const tags = extractTags(xml + headerXml);
  console.log('=== EXACT TAGS FOUND ===');
  console.log(JSON.stringify(tags, null, 2));
  
} catch (error) {
  console.error('Error:', error.message);
}
