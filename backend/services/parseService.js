import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractText(filePath, mimetype, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.txt' || mimetype === 'text/plain') {
    return fs.readFileSync(filePath, 'utf8');
  }

  if (ext === '.pdf' || mimetype === 'application/pdf') {
    const buffer = fs.readFileSync(filePath);
    const data   = await pdfParse(buffer);
    return data.text;
  }

  if (
    ext === '.docx' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if (ext === '.doc' || mimetype === 'application/msword') {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch {
      throw new Error('.doc not fully supported — convert to .docx or .pdf first');
    }
  }

  throw new Error(`Unsupported file type: ${ext}`);
}
