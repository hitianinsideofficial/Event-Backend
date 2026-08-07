import { EventModel, sampleEvents } from '../models/event.model.js';
export const getEvents = async (req, res) => {
    try {
        const dbEvents = await EventModel.find().sort({ createdAt: -1 });
        if (dbEvents && dbEvents.length > 0) {
            return res.status(200).json({
                success: true,
                count: dbEvents.length,
                data: dbEvents
            });
        }
        return res.status(200).json({
            success: true,
            count: sampleEvents.length,
            data: sampleEvents
        });
    }
    catch (error) {
        return res.status(200).json({
            success: true,
            count: sampleEvents.length,
            data: sampleEvents
        });
    }
};
export const getEventById = async (req, res) => {
    try {
        const { id } = req.params;
        let event = null;
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            event = await EventModel.findById(id);
        }
        if (!event) {
            event = await EventModel.findOne({ id });
        }
        if (!event) {
            const sample = sampleEvents.find(e => e.id === id);
            if (sample) {
                return res.status(200).json({ success: true, data: sample });
            }
            return res.status(404).json({
                success: false,
                message: `Event with id ${id} not found`
            });
        }
        return res.status(200).json({
            success: true,
            data: event
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error retrieving event',
            error: error.message
        });
    }
};
export const createEvent = async (req, res) => {
    try {
        const { title, description, date, location, organizer, hasAttendance, requireFileUpload, highlights, customFields } = req.body;
        if (!title || !description || !date) {
            return res.status(400).json({
                success: false,
                message: 'Please provide title, description, and date for the event.'
            });
        }
        try {
            const newDoc = await EventModel.create({
                title,
                description,
                date,
                location: location || 'Main Campus',
                organizer: organizer || 'HITian Inside',
                hasAttendance: hasAttendance !== undefined ? Boolean(hasAttendance) : true,
                requireFileUpload: requireFileUpload !== undefined ? Boolean(requireFileUpload) : false,
                highlights: highlights || [],
                customFields: customFields || []
            });
            return res.status(201).json({
                success: true,
                message: 'Event created and saved to MongoDB Atlas!',
                data: newDoc
            });
        }
        catch (dbErr) {
            // In-memory fallback
            const newEvent = {
                id: Date.now().toString(),
                title,
                description,
                date,
                location: location || 'Main Campus',
                organizer: organizer || 'HITian Inside',
                hasAttendance: hasAttendance !== undefined ? Boolean(hasAttendance) : true,
                requireFileUpload: requireFileUpload !== undefined ? Boolean(requireFileUpload) : false,
                highlights: highlights || [],
                customFields: customFields || [],
                createdAt: new Date().toISOString()
            };
            sampleEvents.unshift(newEvent);
            return res.status(201).json({
                success: true,
                message: 'Event created in memory',
                data: newEvent
            });
        }
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create event',
            error: error.message
        });
    }
};
