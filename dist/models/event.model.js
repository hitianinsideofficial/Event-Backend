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
        highlights: [
            { icon: '🏆', title: 'Prize Pool', description: '₹50,000 Cash Prizes & Schwag Kits' },
            { icon: '💻', title: 'Tracks', description: 'AI/ML, Web3, & Fullstack Innovation' },
            { icon: '👥', title: 'Mentorship', description: '1-on-1 guidance from industry leaders' }
        ],
        customFields: [
            { id: 'field_dept', label: 'Department / Year', type: 'text', required: true, description: 'e.g. CSE 3rd Year' },
            {
                id: 'field_track',
                label: 'Select Competition Track',
                type: 'select',
                required: true,
                options: ['AI/ML Challenge', 'Web3 & Blockchain', 'Open Innovation']
            },
            {
                id: 'field_diet',
                label: 'Dietary Preference',
                type: 'radio',
                required: false,
                options: ['Vegetarian', 'Non-Vegetarian', 'Vegan']
            },
            {
                id: 'field_github',
                label: 'GitHub Profile Link',
                type: 'url',
                required: false,
                description: 'Provide a link to your code repositories'
            }
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
        highlights: [
            { icon: '🎨', title: 'Design Sprint', description: '24-hour rapid prototyping challenge' },
            { icon: '🚀', title: 'Tools Allowed', description: 'Figma, Adobe XD, Rive, Framer' }
        ],
        customFields: [
            { id: 'field_portfolio', label: 'Portfolio Link (Behance/Figma)', type: 'url', required: false },
            {
                id: 'field_experience',
                label: 'Design Experience Level',
                type: 'select',
                required: true,
                options: ['Beginner', 'Intermediate', 'Advanced / Professional']
            }
        ],
        createdAt: new Date().toISOString()
    }
];
