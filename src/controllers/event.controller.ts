import { Request, Response } from 'express';
import { events } from '../models/event.model.js';
import { EventItem } from '../types/backend.types.js';

export const getEvents = (req: Request, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message
    });
  }
};

export const getEventById = (req: Request, res: Response) => {
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
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving event',
      error: error.message
    });
  }
};

export const createEvent = (req: Request, res: Response) => {
  try {
    const { title, description, date, location, organizer, hasAttendance, requireFileUpload, customFields } = req.body;

    if (!title || !description || !date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, and date for the event.'
      });
    }

    const newEvent: EventItem = {
      id: Date.now().toString(),
      title,
      description,
      date,
      location: location || 'Main Campus',
      organizer: organizer || 'HITian Inside',
      hasAttendance: hasAttendance !== undefined ? Boolean(hasAttendance) : true,
      requireFileUpload: requireFileUpload !== undefined ? Boolean(requireFileUpload) : false,
      customFields: customFields || [],
      createdAt: new Date().toISOString()
    };

    events.unshift(newEvent);

    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: newEvent
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message
    });
  }
};
