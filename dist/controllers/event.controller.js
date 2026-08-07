import { events } from '../models/event.model.js';
export const getEvents = (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            count: events.length,
            data: events
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch events',
            error: error.message
        });
    }
};
export const getEventById = (req, res) => {
    try {
        const { id } = req.params;
        const event = events.find(e => e.id === id);
        if (!event) {
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
export const createEvent = (req, res) => {
    try {
        const { title, description, date, location, organizer, hasAttendance, requireFileUpload, highlights, customFields } = req.body;
        if (!title || !description || !date) {
            return res.status(400).json({
                success: false,
                message: 'Please provide title, description, and date for the event.'
            });
        }
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
        events.unshift(newEvent);
        return res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: newEvent
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create event',
            error: error.message
        });
    }
};
