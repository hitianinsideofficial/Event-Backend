import { Request, Response } from 'express';
import { LoginLogModel, sampleLoginLogs } from '../models/log.model.js';
import { SubmissionModel, sampleSubmissions } from '../models/submission.model.js';

export const recordLoginLog = async (email: string, role: 'admin' | 'observer', status: 'SUCCESS' | 'FAILED', req?: Request) => {
  try {
    const ip = (req?.headers['x-forwarded-for'] as string) || req?.socket.remoteAddress || '127.0.0.1';
    const userAgent = req?.headers['user-agent'] || 'Unknown Browser';

    try {
      await LoginLogModel.create({
        email: email.toLowerCase(),
        role,
        status,
        ip,
        userAgent
      });
    } catch (dbErr) {
      sampleLoginLogs.unshift({
        id: 'log_' + Date.now(),
        email: email.toLowerCase(),
        role,
        status,
        ip,
        userAgent,
        createdAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Failed to record login log:', err);
  }
};

export const getLogsAndAnalytics = async (req: Request, res: Response) => {
  try {
    // 1. Fetch Login Logs
    let loginLogs: any[] = [];
    try {
      loginLogs = await LoginLogModel.find().sort({ createdAt: -1 }).limit(100);
    } catch (dbErr) {
      loginLogs = sampleLoginLogs;
    }

    // 2. Fetch Submissions for Analytics
    let submissions: any[] = [];
    try {
      submissions = await SubmissionModel.find().sort({ createdAt: -1 });
    } catch (dbErr) {
      submissions = sampleSubmissions;
    }

    // 3. Department Pie Chart Aggregation
    const deptCounts: Record<string, number> = {};
    const yearCounts: Record<string, number> = {};
    const timeMap: Record<string, number> = {};

    submissions.forEach(sub => {
      // Dept
      const rawDept = sub.answers?.['Department'] || sub.answers?.['Dept'] || 'General';
      const dept = rawDept.trim();
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;

      // Year
      const rawYear = sub.answers?.['Academic Year'] || sub.answers?.['Year'] || 'Unspecified';
      const year = rawYear.trim();
      yearCounts[year] = (yearCounts[year] || 0) + 1;

      // Time Series (formatted YYYY-MM-DD or HH:00)
      const dateObj = new Date(sub.createdAt);
      const dateStr = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'Recent';
      timeMap[dateStr] = (timeMap[dateStr] || 0) + 1;
    });

    const deptPieData = Object.entries(deptCounts).map(([name, count]) => ({
      name,
      value: count
    })).sort((a, b) => b.value - a.value);

    const yearPieData = Object.entries(yearCounts).map(([name, count]) => ({
      name,
      value: count
    })).sort((a, b) => b.value - a.value);

    const timeGraphData = Object.entries(timeMap).map(([date, count]) => ({
      date,
      submissions: count
    }));

    return res.status(200).json({
      success: true,
      data: {
        loginLogs,
        deptPieData,
        yearPieData,
        timeGraphData,
        totalSubmissions: submissions.length,
        totalLoginAttempts: loginLogs.length
      }
    });
  } catch (err: any) {
    console.error('Error fetching logs and analytics:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
