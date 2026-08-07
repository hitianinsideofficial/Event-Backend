// In-memory events data store
export let events = [
  {
    id: '1',
    title: 'HITian Tech Symposium 2026',
    description: 'Annual technical symposium featuring workshops, hackathons, and guest lectures. Upload your project proposal or presentation slides upon registration.',
    date: '2026-09-15',
    location: 'Main Auditorium',
    organizer: 'HITian Tech Club',
    hasAttendance: true,
    requireFileUpload: true,
    customFields: [
      { id: 'field_dept', label: 'Department / Year', type: 'text', required: true },
      { id: 'field_phone', label: 'WhatsApp / Phone Number', type: 'tel', required: true }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Design-a-Thon UI/UX Contest',
    description: '24-hour UI/UX design challenge. Submit your portfolio link and past design samples PNG or PDF.',
    date: '2026-10-02',
    location: 'Lab 3, IT Building',
    organizer: 'Creative Wing',
    hasAttendance: true,
    requireFileUpload: true,
    customFields: [
      { id: 'field_portfolio', label: 'Portfolio Link (Behance/Figma)', type: 'text', required: false }
    ],
    createdAt: new Date().toISOString()
  }
];

export const getEvents = (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
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
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving event',
      error: error.message
    });
  }
};

export const createEvent = (req, res) => {
  try {
    const { title, description, date, location, organizer, hasAttendance, requireFileUpload, customFields } = req.body;

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
      customFields: customFields || [],
      createdAt: new Date().toISOString()
    };

    events.unshift(newEvent);

    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: newEvent
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message
    });
  }
};
