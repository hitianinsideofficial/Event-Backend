import fs from 'fs';
import QRCode from 'qrcode';
import { uploadFileToDriveOrLocal } from '../services/googledrive.service.js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';
import { EventModel } from '../models/event.model.js';
import { SubmissionModel, sampleSubmissions } from '../models/submission.model.js';
import { sendRegistrationConfirmationEmail } from '../services/brevo.service.js';
// Helper to normalize roll number strings e.g. 26/CSE/092 -> 26/CSE/92
function normalizeRollString(rollStr) {
    if (!rollStr)
        return '';
    const parts = rollStr.trim().split('/');
    if (parts.length === 3) {
        const yearCode = parts[0].trim();
        const deptCode = parts[1].trim();
        const cleanNum = parts[2].trim().replace(/^0+/, '') || '0';
        return `${yearCode}/${deptCode}/${cleanNum}`;
    }
    return rollStr.trim().toLowerCase();
}
export const submitRegistration = async (req, res) => {
    try {
        const { eventId, fullName, email, phone, answers } = req.body;
        if (!eventId || !fullName || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'eventId, fullName, email, and Mobile Phone Number are required.'
            });
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
        const selectedDomain = parsedAnswers['Selected Domain'];
        const collegeRoll = parsedAnswers['College Roll Number'];
        // Check duplicate domain submission for the normalized roll number (092 === 92)
        if (selectedDomain && collegeRoll) {
            const normRoll = normalizeRollString(collegeRoll);
            try {
                const existingSubs = await SubmissionModel.find({ eventId });
                const duplicate = existingSubs.find(sub => {
                    const subRoll = normalizeRollString(sub.answers?.['College Roll Number'] || '');
                    const subDomain = sub.answers?.['Selected Domain'];
                    return subRoll === normRoll && subDomain === selectedDomain;
                });
                if (duplicate) {
                    return res.status(400).json({
                        success: false,
                        message: `You have ALREADY submitted an entry for ${selectedDomain} (Roll: ${collegeRoll}). Each domain allows only 1 submission.`
                    });
                }
            }
            catch (checkErr) {
                const sampleDup = sampleSubmissions.find(sub => {
                    const subRoll = normalizeRollString(sub.answers?.['College Roll Number'] || '');
                    const subDomain = sub.answers?.['Selected Domain'];
                    return sub.eventId === eventId && subRoll === normRoll && subDomain === selectedDomain;
                });
                if (sampleDup) {
                    return res.status(400).json({
                        success: false,
                        message: `You have ALREADY submitted an entry for ${selectedDomain} (Roll: ${collegeRoll}). Each domain allows only 1 submission.`
                    });
                }
            }
        }
        let eventTitle = 'Event Registration';
        let eventDate = 'TBD';
        let location = 'Main Campus';
        try {
            if (eventId.match(/^[0-9a-fA-F]{24}$/)) {
                const ev = await EventModel.findById(eventId);
                if (ev) {
                    eventTitle = ev.title;
                    eventDate = ev.date;
                    location = ev.location;
                }
            }
        }
        catch (e) { }
        const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
        const ticketId = `HIT-EVT-${randomHex}`;
        const files = [];
        if (req.file) {
            // If uploaded file is an image (Artwork or Photograph), upload to Cloudinary
            if (req.file.mimetype.startsWith('image/')) {
                const buffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
                if (buffer) {
                    const cloudRes = await uploadToCloudinary(buffer, req.file.originalname, 'swaraj_e_hind');
                    if (cloudRes) {
                        files.push({
                            provider: 'cloudinary',
                            fileId: cloudRes.publicId,
                            driveLink: cloudRes.secureUrl,
                            downloadLink: cloudRes.secureUrl,
                            localUrl: cloudRes.secureUrl,
                            originalName: req.file.originalname,
                            mimeType: req.file.mimetype,
                            size: cloudRes.bytes
                        });
                    }
                    else {
                        const fileData = await uploadFileToDriveOrLocal(req.file, req);
                        if (fileData)
                            files.push(fileData);
                    }
                }
            }
            else {
                // PDF/DOC files upload to Google Drive / Local
                const fileData = await uploadFileToDriveOrLocal(req.file, req);
                if (fileData)
                    files.push(fileData);
            }
        }
        const qrPayload = JSON.stringify({ ticketId, eventId, name: fullName, email });
        const qrCodeUrl = await QRCode.toDataURL(qrPayload, {
            color: { dark: '#1e1b4b', light: '#ffffff' },
            width: 300
        });
        // Fire Brevo Email Confirmation asynchronously
        sendRegistrationConfirmationEmail({
            toEmail: email,
            toName: fullName,
            ticketId,
            eventTitle,
            eventDate,
            location,
            phone,
            answers: parsedAnswers,
            qrCodeUrl
        }).catch(err => console.error('Background Email Dispatch Error:', err));
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
                message: 'Registration successful! Ticket saved to MongoDB Atlas & Confirmation Email sent.',
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
                message: 'Registration successful! Ticket issued & Confirmation Email sent.',
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
