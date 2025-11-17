import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { LMDICalculator, LMDIConfig } from '../services/lmdiCalculator';

const router = Router();
const calculator = new LMDICalculator();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// LMDI calculation endpoint
router.post('/calculate-lmdi', upload.single('file'), async (req: Request, res: Response) => {
  try {
    console.log('LMDI calculation request received');
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded',
        details: 'Please upload an Excel file with the required data'
      });
    }

    console.log('File received:', req.file.originalname, 'Size:', req.file.size);

    const config: LMDIConfig = {
      startYear: parseInt(req.body.startYear) || 2012,
      endYear: parseInt(req.body.endYear) || 2023,
      sheetName: req.body.sheetName || 'Sheet1',
      epsilon: parseFloat(req.body.epsilon) || 1e-9
    };

    console.log('Configuration:', config);

    // Validate configuration
    if (config.startYear >= config.endYear) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year range',
        details: 'Start year must be less than end year'
      });
    }

    if (config.startYear < 1900 || config.endYear > 2100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year range',
        details: 'Years must be between 1900 and 2100'
      });
    }

    console.log(`Processing LMDI calculation for ${config.startYear}-${config.endYear}`);
    
    const result = await calculator.processExcelFile(req.file.buffer, config);

    console.log('LMDI calculation completed successfully');
    
    res.json({
      success: true,
      data: result,
      config: config
    });

  } catch (error) {
    console.error('LMDI calculation error:', error);
    
    let errorMessage = 'Failed to process LMDI calculation';
    let errorDetails = 'An unexpected error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || error.message;
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: errorDetails
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'LMDI Calculator API',
    timestamp: new Date().toISOString()
  });
});

export default router;