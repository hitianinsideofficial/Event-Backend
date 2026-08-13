import { Request, Response } from 'express';
import { EventModel, sampleEvents } from '../models/event.model.js';
import { EventItem, EventStatus, EventMode } from '../types/backend.types.js';

export const getEvents = async (req: Request, res: Response) => {
  try {
    const includeDone = req.query.includeDone === 'true';
    const isAdmin = req.query.admin === 'true' || includeDone;

    const filter: any = {};
    if (!isAdmin) {
      filter.status = { $ne: 'DONE' };
      filter.isHidden = { $ne: true };
    }

    const dbEvents = await EventModel.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: dbEvents.length,
      data: dbEvents
    });
  } catch (error: any) {
    const includeDone = req.query.includeDone === 'true';
    const isAdmin = req.query.admin === 'true' || includeDone;
    const filteredSamples = isAdmin 
      ? sampleEvents 
      : sampleEvents.filter(e => e.status !== 'DONE' && !e.isHidden);

    return res.status(200).json({
      success: true,
      count: filteredSamples.length,
      data: filteredSamples
    });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  const { id } = req.params;

  // 1. First check in-memory sampleEvents list (for non-Mongo IDs or instant lookup)
  const sampleMatch = sampleEvents.find(e => e.id === id || (e as any)._id === id);

  try {
    let event = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      event = await EventModel.findById(id);
    }

    if (!event && sampleMatch) {
      return res.status(200).json({
        success: true,
        data: sampleMatch
      });
    }

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
    // 2. Fallback to sampleMatch if MongoDB query times out or errors
    if (sampleMatch) {
      return res.status(200).json({
        success: true,
        data: sampleMatch
      });
    }

    return res.status(404).json({
      success: false,
      message: `Event with id ${id} not found`,
      error: error.message
    });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { 
      title, 
      description, 
      date, 
      location, 
      organizer, 
      status,
      mode,
      bannerUrl,
      coverUrl,
      hasAttendance, 
      requireFileUpload, 
      highlights,
      customFields 
    } = req.body;

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
        location: location || (mode === 'ONLINE' ? 'Online Event' : 'Main Campus'),
        organizer: organizer || 'HITian Inside',
        status: status || 'UPCOMING',
        mode: mode || 'OFFLINE',
        bannerUrl: bannerUrl || '',
        coverUrl: coverUrl || '',
        hasAttendance: hasAttendance !== undefined ? Boolean(hasAttendance) : false,
        requireFileUpload: requireFileUpload !== undefined ? Boolean(requireFileUpload) : false,
        highlights: highlights || [],
        customFields: customFields || []
      });

      return res.status(201).json({
        success: true,
        message: 'Event created and saved to MongoDB Atlas!',
        data: newDoc
      });
    } catch (dbErr) {
      const newEvent: EventItem = {
        id: Date.now().toString(),
        title,
        description,
        date,
        location: location || (mode === 'ONLINE' ? 'Online Event' : 'Main Campus'),
        organizer: organizer || 'HITian Inside',
        status: status || 'UPCOMING',
        mode: mode || 'OFFLINE',
        bannerUrl: bannerUrl || '',
        coverUrl: coverUrl || '',
        hasAttendance: hasAttendance !== undefined ? Boolean(hasAttendance) : false,
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
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message
    });
  }
};

export const updateEventDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    let updated = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      updated = await EventModel.findByIdAndUpdate(id, updateData, { new: true });
    }

    if (!updated) {
      const sample = sampleEvents.find(e => e.id === id);
      if (sample) {
        Object.assign(sample, updateData);
        return res.status(200).json({ success: true, message: 'Event updated', data: sample });
      }
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Event details and images updated successfully!',
      data: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEventStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: EventStatus };

    if (!['UPCOMING', 'LIVE', 'DONE'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed values: UPCOMING, LIVE, DONE'
      });
    }

    let event = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      event = await EventModel.findByIdAndUpdate(id, { status }, { new: true });
    }

    if (!event) {
      const sample = sampleEvents.find(e => e.id === id);
      if (sample) {
        sample.status = status;
        return res.status(200).json({ success: true, message: 'Status updated', data: sample });
      }
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Event status updated to ${status}`,
      data: event
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEventForm = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customFields } = req.body;

    let event = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      event = await EventModel.findByIdAndUpdate(id, { customFields }, { new: true });
    }

    if (!event) {
      const sample = sampleEvents.find(e => e.id === id);
      if (sample) {
        sample.customFields = customFields;
        return res.status(200).json({ success: true, message: 'Form updated', data: sample });
      }
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Event registration form updated successfully',
      data: event
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let deleted = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      deleted = await EventModel.findByIdAndDelete(id);
    }

    if (!deleted) {
      const idx = sampleEvents.findIndex(e => e.id === id || (e as any)._id === id);
      if (idx !== -1) {
        sampleEvents.splice(idx, 1);
        return res.status(200).json({ success: true, message: 'Event deleted from memory' });
      }

      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Event permanently deleted from MongoDB Atlas!'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleEventVisibility = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isHidden } = req.body;

    let updated = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      updated = await EventModel.findByIdAndUpdate(id, { isHidden: Boolean(isHidden) }, { new: true });
    }

    if (!updated) {
      const sample = sampleEvents.find(e => e.id === id || (e as any)._id === id);
      if (sample) {
        sample.isHidden = Boolean(isHidden);
        return res.status(200).json({
          success: true,
          message: `Event visibility updated to ${isHidden ? 'HIDDEN' : 'SHOWN ON WEBSITE'}`,
          data: sample
        });
      }

      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Event visibility updated to ${isHidden ? 'HIDDEN' : 'SHOWN ON WEBSITE'}`,
      data: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
