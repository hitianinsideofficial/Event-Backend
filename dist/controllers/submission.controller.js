import QRCode from 'qrcode';
import { uploadFileToDriveOrLocal } from '../services/googledrive.service.js';
import { EventModel } from '../models/event.model.js';
import { SubmissionModel, sampleSubmissions } from '../models/submission.model.js';
export const submitRegistration = async (req, res) => {
    try {
        const { eventId, fullName, email, phone, answers } = req.body;
        if (!eventId || !fullName || !email) {
            return res.status(400).json({
                success: false,
                message: 'eventId, fullName, and email are required.'
            });
        }
        let eventTitle = 'Event Registration';
        try {
            if (eventId.match(/^[0-9a-fA-F]{24}$/)) {
                const ev = await EventModel.findById(eventId);
                if (ev)
                    eventTitle = ev.title;
            }
        }
        catch (e) { }
        const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
        const ticketId = `HIT-EVT-${randomHex}`;
        const files = [];
        if (req.file) {
            const fileData = await uploadFileToDriveOrLocal(req.file, req);
            if (fileData)
                files.push(fileData);
        }
        let parsedAnswers = {};
        if (typeof answers === 'string') {
            try {
                parsedAnswers = JSON.parse(answers);
            }
            catch (e) { }
        }
        else if (typeof answers === 'object' && answers !== null) {
            parsedAnswers = answers;
        }
        const qrPayload = JSON.stringify({ ticketId, eventId, name: fullName, email });
        const qrCodeUrl = await QRCode.toDataURL(qrPayload, {
            color: { dark: '#1e1b4b', light: '#ffffff' },
            width: 300
        });
        try {
            const newDoc = await SubmissionModel.create({
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
                checkedInAt: null
            });
            return res.status(201).json({
                success: true,
                message: 'Registration successful! Ticket saved to MongoDB Atlas.',
                data: newDoc
            });
        }
        catch (dbErr) {
            const newSubmission = {
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
            sampleSubmissions.unshift(newSubmission);
            return res.status(201).json({
                success: true,
                message: 'Registration successful! Ticket issued.',
                data: newSubmission
            });
        }
    }
    catch (error) {
        console.error('Submission Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process registration',
            error: error.message
        });
    }
};
export const getEventSubmissions = async (req, res) => {
    try {
        const eventId = req.params.eventId;
        let filter = {};
        if (eventId && eventId !== 'all') {
            filter.eventId = eventId;
        }
        const subs = await SubmissionModel.find(filter).sort({ createdAt: -1 });
        if (subs && subs.length > 0) {
            return res.status(200).json({
                success: true,
                count: subs.length,
                data: subs
            });
        }
        let sampleResult = sampleSubmissions;
        if (eventId && eventId !== 'all') {
            sampleResult = sampleSubmissions.filter(s => s.eventId === eventId);
        }
        return res.status(200).json({
            success: true,
            count: sampleResult.length,
            data: sampleResult
        });
    }
    catch (error) {
        return res.status(200).json({
            success: true,
            count: sampleSubmissions.length,
            data: sampleSubmissions
        });
    }
};
export const getSubmissionByTicket = async (req, res) => {
    try {
        const ticketId = req.params.ticketId.toUpperCase();
        const submission = await SubmissionModel.findOne({ ticketId });
        if (submission) {
            return res.status(200).json({ success: true, data: submission });
        }
        const sample = sampleSubmissions.find(s => s.ticketId.toUpperCase() === ticketId);
        if (sample) {
            return res.status(200).json({ success: true, data: sample });
        }
        return res.status(404).json({
            success: false,
            message: `Ticket ID ${ticketId} not found.`
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error looking up ticket',
            error: error.message
        });
    }
};
export const checkInAttendee = async (req, res) => {
    try {
        const { ticketId } = req.body;
        if (!ticketId) {
            return res.status(400).json({
                success: false,
                message: 'ticketId is required for check-in.'
            });
        }
        const targetTicket = ticketId.trim().toUpperCase();
        let submission = await SubmissionModel.findOne({ ticketId: targetTicket });
        if (submission) {
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
            await submission.save();
            return res.status(200).json({
                success: true,
                alreadyCheckedIn: false,
                message: `SUCCESS! Check-in confirmed for ${submission.fullName}`,
                data: submission
            });
        }
        // In-memory fallback
        const sample = sampleSubmissions.find(s => s.ticketId.toUpperCase() === targetTicket);
        if (sample) {
            if (sample.attendanceStatus === 'CHECKED_IN') {
                return res.status(200).json({
                    success: true,
                    alreadyCheckedIn: true,
                    message: `Attendee ${sample.fullName} was ALREADY checked in at ${new Date(sample.checkedInAt || '').toLocaleTimeString()}`,
                    data: sample
                });
            }
            sample.attendanceStatus = 'CHECKED_IN';
            sample.checkedInAt = new Date().toISOString();
            return res.status(200).json({
                success: true,
                alreadyCheckedIn: false,
                message: `SUCCESS! Check-in confirmed for ${sample.fullName}`,
                data: sample
            });
        }
        return res.status(404).json({
            success: false,
            message: `Ticket ${ticketId} is invalid or not registered.`
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Check-in failed',
            error: error.message
        });
    }
};
