
import fs from 'fs';
import {
  processPDF,
  processCSV,
  processURL,
  processTXT
} from '../services/documentService.js';
import { storeDocuments } from '../services/vectorService.js';


export async function uploadPDF(req, res, next) {
  try {
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const filePath = req.file.path;

    const metadata = {
      filename: req.file.originalname,
      uploadedAt: new Date().toISOString(),
      userId: req.user.id,
      type: 'pdf',
    };
    const documents = await processPDF(filePath, metadata);
    console.log(` PDF processed: ${documents.length} chunks created`);

    await storeDocuments(documents, req.user.id);
    console.log(' Stored in Qdrant');

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'PDF processed successfully',
      documentCount: documents.length,
      filename: req.file.originalname,
    });
  } catch (error) {
    console.error(' PDF Upload Error:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
}


  // Handle CSV upload

export async function uploadCSV(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const filePath = req.file.path;

    const metadata = {
      filename: req.file.originalname,
      uploadedAt: new Date().toISOString(),
      userId: req.user.id,
      type: 'csv',
    };

    const documents = await processCSV(filePath, metadata);

    await storeDocuments(documents, req.user.id);

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'CSV processed successfully',
      documentCount: documents.length,
      filename: req.file.originalname,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
}

  // Handle TXT upload
 
export async function uploadTXT(req, res, next) {
  try {
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const filePath = req.file.path;

    const metadata = {
      filename: req.file.originalname,
      uploadedAt: new Date().toISOString(),
      userId: req.user.id,
      type: 'txt',
    };

  
    const documents = await processTXT(filePath, metadata);
    console.log(` TXT processed: ${documents.length} chunks created`);

    await storeDocuments(documents, req.user.id);
    console.log(' Stored in Qdrant');

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'TXT processed successfully',
      documentCount: documents.length,
      filename: req.file.originalname,
    });
  } catch (error) {
    console.error(' TXT Upload Error:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
}


  // Handle URL upload
 
export async function uploadURLHandler(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required',
      });
    }

    const metadata = {
      url,
      uploadedAt: new Date().toISOString(),
      userId: req.user.id,
      type: 'url',
      source: url,
    };

    const documents = await processURL(url, metadata);

    await storeDocuments(documents, req.user.id);

    res.json({
      success: true,
      message: 'URL processed successfully',
      documentCount: documents.length,
      url,
    });
  } catch (error) {
    next(error);
  }
}

