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
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});
export default app;
