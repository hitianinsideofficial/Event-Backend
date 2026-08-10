import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ObserverModel, sampleObservers } from '../models/observer.model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hitian_secret_key_2026';

export interface AuthenticatedRequest extends Request {
  admin?: any;
  observer?: any;
}

export const verifyAdminToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Admin token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const verifyObserverToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Observer token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.role !== 'observer' || !decoded.email) {
      return res.status(401).json({ success: false, message: 'Invalid observer token format.' });
    }

    const email = decoded.email.toLowerCase();

    // Verify in MongoDB or memory that observer is ACTIVE and NOT DELETED
    try {
      const observer = await ObserverModel.findOne({ email });
      if (!observer || !observer.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'Access revoked. Your observer account has been deactivated or removed by Admin.' 
        });
      }
      req.observer = observer;
    } catch (dbErr) {
      const sampleMatch = sampleObservers.find(o => o.email.toLowerCase() === email);
      if (!sampleMatch || !sampleMatch.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'Access revoked. Your observer account has been deactivated or removed by Admin.' 
        });
      }
      req.observer = sampleMatch;
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired observer token.' });
  }
};

