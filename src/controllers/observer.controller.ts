import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ObserverModel, sampleObservers } from '../models/observer.model.js';
import { recordLoginLog } from './log.controller.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hitian_secret_key_2026';

// Observer Login API
export const observerLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const targetEmail = email.trim().toLowerCase();

    let observerMatch: any = null;

    try {
      observerMatch = await ObserverModel.findOne({ email: targetEmail });
    } catch (dbErr) {
      observerMatch = sampleObservers.find(o => o.email.toLowerCase() === targetEmail);
    }

    if (!observerMatch) {
      recordLoginLog(targetEmail, 'observer', 'FAILED', req);
      return res.status(401).json({ success: false, message: 'Invalid Observer email or password.' });
    }

    if (!observerMatch.isActive) {
      recordLoginLog(targetEmail, 'observer', 'FAILED', req);
      return res.status(401).json({ success: false, message: 'Access Revoked. Your observer account is disabled.' });
    }

    if (observerMatch.password !== password) {
      recordLoginLog(targetEmail, 'observer', 'FAILED', req);
      return res.status(401).json({ success: false, message: 'Invalid Observer email or password.' });
    }

    recordLoginLog(targetEmail, 'observer', 'SUCCESS', req);

    const token = jwt.sign(
      { role: 'observer', email: observerMatch.email, name: observerMatch.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Observer authentication successful',
      token,
      observer: {
        id: observerMatch._id || observerMatch.id,
        name: observerMatch.name,
        email: observerMatch.email
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Admin: Get All Observers
export const getObservers = async (req: Request, res: Response) => {
  try {
    let list = [];
    try {
      list = await ObserverModel.find().sort({ createdAt: -1 });
    } catch (dbErr) {
      list = sampleObservers;
    }

    return res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Admin: Create New Observer Credentials
export const createObserver = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'Name, Email, and Password are required for Observer.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      const existing = await ObserverModel.findOne({ email: cleanEmail });
      if (existing) {
        return res.status(400).json({ success: false, message: `Observer with email ${cleanEmail} already exists.` });
      }

      const newObs = await ObserverModel.create({
        email: cleanEmail,
        password,
        name: name.trim(),
        isActive: true
      });

      return res.status(201).json({ success: true, message: 'Observer account created', data: newObs });
    } catch (dbErr) {
      const existingSample = sampleObservers.find(o => o.email.toLowerCase() === cleanEmail);
      if (existingSample) {
        return res.status(400).json({ success: false, message: `Observer with email ${cleanEmail} already exists.` });
      }

      const newSample = {
        id: Date.now().toString(),
        email: cleanEmail,
        password,
        name: name.trim(),
        isActive: true,
        createdAt: new Date().toISOString()
      };
      sampleObservers.unshift(newSample);

      return res.status(201).json({ success: true, message: 'Observer account created in memory', data: newSample });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Admin: Toggle Observer Active Status
export const toggleObserverStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    try {
      const updated = await ObserverModel.findByIdAndUpdate(id, { isActive }, { new: true });
      if (updated) {
        return res.status(200).json({ success: true, message: `Observer status updated to ${isActive ? 'Active' : 'Disabled'}`, data: updated });
      }
    } catch (dbErr) {}

    const sampleIdx = sampleObservers.findIndex(o => o.id === id || (o as any)._id === id);
    if (sampleIdx !== -1) {
      sampleObservers[sampleIdx].isActive = isActive;
      return res.status(200).json({ success: true, message: `Observer status updated to ${isActive ? 'Active' : 'Disabled'}`, data: sampleObservers[sampleIdx] });
    }

    return res.status(404).json({ success: false, message: 'Observer not found' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Admin: Remove / Delete Observer Credentials (Instantly revokes access)
export const deleteObserver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    try {
      const deleted = await ObserverModel.findByIdAndDelete(id);
      if (deleted) {
        return res.status(200).json({ success: true, message: 'Observer credentials permanently removed. Access revoked.' });
      }
    } catch (dbErr) {}

    const sampleIdx = sampleObservers.findIndex(o => o.id === id || (o as any)._id === id);
    if (sampleIdx !== -1) {
      sampleObservers.splice(sampleIdx, 1);
      return res.status(200).json({ success: true, message: 'Observer credentials permanently removed from memory.' });
    }

    return res.status(404).json({ success: false, message: 'Observer not found' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
