import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);

//  Convert PDF pages to images

export async function pdfToImages(pdfPath) {
  const sessionDir = path.join(process.cwd(), 'temp_ocr', `ocr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);

  try {
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    await execFilePromise('pdftoppm', ['-png', pdfPath, path.join(sessionDir, 'page')]);

    return fs
      .readdirSync(sessionDir)
      .filter(f => f.endsWith('.png'))
      .map(f => path.join(sessionDir, f));
  } catch (error) {
    console.warn(`[OCR Warning] pdftoppm conversion failed or is not installed: ${error.message}`);
    // Clean up empty/partial directory if created
    try {
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup error
    }
    return [];
  }
}

// Run OCR on images
export async function runOCR(imagePaths) {
  if (!imagePaths || imagePaths.length === 0) return '';
  let fullText = '';

  for (const image of imagePaths) {
    try {
      const { data } = await Tesseract.recognize(image, 'eng');
      fullText += '\n' + data.text;
    } catch (err) {
      console.error(`Tesseract OCR failed for image ${image}:`, err.message);
    }
  }

  // Clean up temp images and their parent directories
  const directoriesToClean = new Set();
  for (const image of imagePaths) {
    try {
      if (fs.existsSync(image)) {
        fs.unlinkSync(image);
      }
      directoriesToClean.add(path.dirname(image));
    } catch (e) {
      console.error(`Failed to delete temp image ${image}:`, e);
    }
  }

  // Remove empty session directories
  for (const dir of directoriesToClean) {
    try {
      if (fs.existsSync(dir) && path.basename(dir).startsWith('ocr_')) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup error
    }
  }

  return fullText.trim();
}
