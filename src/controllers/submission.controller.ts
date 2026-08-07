import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { uploadFileToDriveOrLocal } from '../services/googledrive.service.js';
import { events } from '../models/event.model.js';
import { submissions } from '../models/submission.model.js';
import { SubmissionItem, UploadedFile } from '../types/backend.types.js';

// Pre-generate QR code for sample submission
QRCode.toDataURL(JSON.stringify({ ticketId: 'HIT-EVT-98214A', eventId: '1' }))
  .then(url => { if (submissions[0]) submissions[0].qrCodeUrl = url; })
  .catch(() => {});

export const submitRegistration = async (req: Request, res: Response) => {
  try {
    const { eventId, fullName, email, phone, answers } = req.body;

    if (!eventId || !fullName || !email) {
      return res.status(400).json({
        success: false,
        message: 'eventId, fullName, and email are required.'
      });
    }

    const targetEvent = events.find(e => e.id === eventId);
    const eventTitle = targetEvent ? targetEvent.title : 'Event Registration';

    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const ticketId = `HIT-EVT-${randomHex}`;

    const files: UploadedFile[] = [];
    if (req.file) {
      const fileData = await uploadFileToDriveOrLocal(req.file, req);
      if (fileData) files.push(fileData);
    }

    let parsedAnswers: Record<string, any> = {};
    if (typeof answers === 'string') {
      try { parsedAnswers = JSON.parse(answers); } catch (e) {}
    } else if (typeof answers === 'object' && answers !== null) {
      parsedAnswers = answers;
    }

    const qrPayload = JSON.stringify({ ticketId, eventId, name: fullName, email });
    const qrCodeUrl = await QRCode.toDataURL(qrPayload, {
      color: { dark: '#1e1b4b', light: '#ffffff' },
      width: 300
    });

    const newSubmission: SubmissionItem = {
      id: Date.now().toString(),
      eventId,
      eventTitle,
      ticketId,
      fullName,
      email,
      phone: phone || '',
      answers: parsedAnswers,
      files,
      qrCodeUrl,
      attendanceStatus: 'PENDING',
      checkedInAt: null,
      createdAt: new Date().toISOString()
    };

    submissions.unshift(newSubmission);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Ticket issued.',
      data: newSubmission
    });
  } catch (error: any) {
    console.error('Submission Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process registration',
      error: error.message
    });
  }
};

export const getEventSubmissions = (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;
    
    let result = submissions;
    if (eventId && eventId !== 'all') {
      result = submissions.filter(s => s.eventId === eventId);
    }

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
};

export const getSubmissionByTicket = (req: Request, res: Response) => {
  try {
    const ticketId = req.params.ticketId as string;
    const submission = submissions.find(s => s.ticketId.toUpperCase() === ticketId.toUpperCase());

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: `Ticket ID ${ticketId} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Error looking up ticket',
      error: error.message
    });
  }
};

export const checkInAttendee = (req: Request, res: Response) => {
  try {
    const { ticketId } = req.body;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: 'ticketId is required for check-in.'
      });
    }

    const submission = submissions.find(s => s.ticketId.toUpperCase() === (ticketId as string).trim().toUpperCase());

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: `Ticket ${ticketId} is invalid or not registered.`
      });
    }

    if (submission.attendanceStatus === 'CHECKED_IN') {
      return res.status(200).json({
        success: true,
        alreadyCheckedIn: true,
        message: `Attendee ${submission.fullName} was ALREADY checked in at ${new Date(submission.checkedInAt || '').toLocaleTimeString()}`,
        data: submission
      });
    }

    submission.attendanceStatus = 'CHECKED_IN';
    submission.checkedInAt = new Date().toISOString();

    return res.status(200).json({
      success: true,
      alreadyCheckedIn: false,
      message: `SUCCESS! Check-in confirmed for ${submission.fullName}`,
      data: submission
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Check-in failed',
      error: error.message
    });
  }
};
