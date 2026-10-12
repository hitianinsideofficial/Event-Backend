import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import indexRoutes from './routes/index.route.js';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to HITian Inside Event API (TypeScript Engine)',
    endpoints: {
      health: '/api/health',
      events: '/api/events',
      submissions: '/api/submissions',
      certificates: '/api/certificates'
    }
  });
});

app.use('/api', indexRoutes);
app.use('/', indexRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error [', req.method, req.path, ']:', err);

  // 1. Multer Specific Upload Errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        errorCode: 'FILE_TOO_LARGE',
        message: 'Uploaded file size exceeds the server limit (Maximum 100 MB). Please compress your photo/document or attach a public Google Drive link.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        errorCode: 'TOO_MANY_FILES',
        message: 'Too many files uploaded in a single submission. Please attach only the required files.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        errorCode: 'UNEXPECTED_FIELD',
        message: `Unexpected file field received: "${err.field || 'unknown'}". Please refresh the page and try again.`
      });
    }
    return res.status(400).json({
      success: false,
      errorCode: `UPLOAD_ERROR_${err.code}`,
      message: `File upload error: ${err.message}`
    });
  }

  // 2. Body Parser JSON Syntax Error
  if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_JSON_PAYLOAD',
      message: 'Invalid registration form data format received by server.'
    });
  }

  // 3. Payload Too Large (Express body parser)
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      errorCode: 'PAYLOAD_TOO_LARGE',
      message: 'Registration submission payload is too large. Please compress uploaded files or use a Google Drive link.'
    });
  }

  // 4. Default Internal Server Error
  res.status(err.status || 500).json({
    success: false,
    errorCode: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Internal Server Error encountered while processing submission.'
  });
});

export default app;
