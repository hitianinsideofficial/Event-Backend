import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { recordLoginLog } from '../analytics/index.js';

const getAdminEmail = () => process.env.ADMIN_EMAIL || 'admin@hitianinside.org';
const getAdminPassword = () => process.env.ADMIN_PASSWORD || 'admin123';
const getJwtSecret = () => process.env.JWT_SECRET || 'hitian_secret_key_2026';

export const adminLogin = (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const targetEmail = getAdminEmail();
    const targetPassword = getAdminPassword();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Both Admin Email and Password are required.'
      });
    }

    if (email.trim().toLowerCase() !== targetEmail.trim().toLowerCase()) {
      recordLoginLog(email, 'admin', 'FAILED', req);
      return res.status(401).json({
        success: false,
        message: 'Admin email not found. Please verify your address.'
      });
    }

    if (password !== targetPassword) {
      recordLoginLog(email, 'admin', 'FAILED', req);
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please re-enter your password.'
      });
    }

    recordLoginLog(targetEmail, 'admin', 'SUCCESS', req);

    const token = jwt.sign(
      { role: 'admin', email: targetEmail, authTime: new Date().toISOString() },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Admin Authentication Successful',
      token
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// GET /api/admin/mail-stats - Returns remaining daily Brevo email credits out of 300
export const getBrevoEmailStats = async (req: Request, res: Response) => {
  try {
    const { getBrevoAccountQuota } = await import('../email/index.js');
    const quota = await getBrevoAccountQuota();

    return res.status(200).json({
      success: true,
      message: 'Brevo email quota retrieved successfully',
      data: quota
    });
  } catch (error: any) {
    console.error('Failed to get Brevo email stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve email quota statistics',
      error: error.message
    });
  }
};
