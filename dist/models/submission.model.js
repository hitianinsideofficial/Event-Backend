export let submissions = [
    {
        id: 'sub-101',
        eventId: '1',
        eventTitle: 'HITian Tech Symposium 2026',
        ticketId: 'HIT-EVT-98214A',
        fullName: 'Alex Johnson',
        email: 'alex.johnson@hit.edu',
        phone: '+91 98765 43210',
        answers: {
            field_dept: 'Computer Science, 3rd Year',
            field_phone: '+91 98765 43210'
        },
        files: [
            {
                originalName: 'project_abstract.pdf',
                mimeType: 'application/pdf',
                driveLink: 'https://drive.google.com/sample',
                localUrl: '/uploads/sample.pdf'
            }
        ],
        qrCodeUrl: '',
        attendanceStatus: 'PENDING',
        createdAt: new Date().toISOString()
    }
];
