import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

//  Convert PDF pages to images

export async function pdfToImages(pdfPath) {
  const outputDir = path.join(process.cwd(), 'temp_ocr');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const command = `pdftoppm -png "${pdfPath}" "${outputDir}/page"`;
  await execPromise(command);

  return fs
    .readdirSync(outputDir)
    .filter(f => f.endsWith('.png'))
    .map(f => path.join(outputDir, f));
}

// Run OCR on images

export async function runOCR(imagePaths) {
  let fullText = '';

  for (const image of imagePaths) {
    const { data } = await Tesseract.recognize(image, 'eng');
    fullText += '\n' + data.text;
  }

  return fullText.trim();
}
