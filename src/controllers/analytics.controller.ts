import { Request, Response } from 'express';
import { 
  PageViewModel, 
  ClickEventModel, 
  samplePageViews, 
  sampleClickEvents 
} from '../models/analytics.model.js';

// Record Page View
export const trackPageView = async (req: Request, res: Response) => {
  try {
    const { path, visitorId, referrer } = req.body;
    const userAgent = req.headers['user-agent'] || '';

    if (!path || !visitorId) {
      return res.status(400).json({ success: false, message: 'path and visitorId are required' });
    }

    try {
      await PageViewModel.create({
        path,
        visitorId,
        userAgent,
        referrer: referrer || ''
      });
    } catch (dbErr) {
      samplePageViews.push({
        path,
        visitorId,
        userAgent,
        referrer: referrer || '',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({ success: true, message: 'Pageview recorded' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Record Button / Element Click
export const trackClick = async (req: Request, res: Response) => {
  try {
    const { elementId, label, category, path, visitorId } = req.body;

    if (!elementId || !label || !visitorId) {
      return res.status(400).json({ success: false, message: 'elementId, label, and visitorId are required' });
    }

    try {
      await ClickEventModel.create({
        elementId,
        label,
        category: category || 'interaction',
        path: path || '/',
        visitorId
      });
    } catch (dbErr) {
      sampleClickEvents.push({
        elementId,
        label,
        category: category || 'interaction',
        path: path || '/',
        visitorId,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({ success: true, message: 'Click event recorded' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Admin Analytics Dashboard Summary API
export const getAnalyticsSummary = async (req: Request, res: Response) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let totalPageViews = 0;
    let todayPageViews = 0;
    let uniqueVisitorsCount = 0;
    let totalClicks = 0;
    let topClickedElements: { _id: string; count: number; label: string; category: string }[] = [];
    let topPages: { _id: string; count: number }[] = [];

    try {
      totalPageViews = await PageViewModel.countDocuments();
      todayPageViews = await PageViewModel.countDocuments({ timestamp: { $gte: startOfToday } });
      
      const distinctVisitors = await PageViewModel.distinct('visitorId');
      uniqueVisitorsCount = distinctVisitors.length;

      totalClicks = await ClickEventModel.countDocuments();

      topClickedElements = await ClickEventModel.aggregate([
        { 
          $group: { 
            _id: '$elementId', 
            count: { $sum: 1 }, 
            label: { $first: '$label' },
            category: { $first: '$category' }
          } 
        },
        { $sort: { count: -1 } },
        { $limit: 6 }
      ]);

      topPages = await PageViewModel.aggregate([
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
    } catch (dbErr) {
      // In-Memory Calculation Fallback
      totalPageViews = samplePageViews.length;
      todayPageViews = samplePageViews.filter(p => new Date(p.timestamp) >= startOfToday).length;
      
      const uniqueSet = new Set(samplePageViews.map(p => p.visitorId));
      uniqueVisitorsCount = uniqueSet.size;

      totalClicks = sampleClickEvents.length;

      const clickCounts: Record<string, { count: number; label: string; category: string }> = {};
      sampleClickEvents.forEach(c => {
        if (!clickCounts[c.elementId]) {
          clickCounts[c.elementId] = { count: 0, label: c.label, category: c.category || 'interaction' };
        }
        clickCounts[c.elementId].count += 1;
      });

      topClickedElements = Object.entries(clickCounts)
        .map(([id, data]) => ({ _id: id, count: data.count, label: data.label, category: data.category }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      const pageCounts: Record<string, number> = {};
      samplePageViews.forEach(p => {
        pageCounts[p.path] = (pageCounts[p.path] || 0) + 1;
      });

      topPages = Object.entries(pageCounts)
        .map(([path, count]) => ({ _id: path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }

    return res.status(200).json({
      success: true,
      data: {
        totalPageViews,
        todayPageViews,
        uniqueVisitorsCount,
        totalClicks,
        topClickedElements,
        topPages
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
