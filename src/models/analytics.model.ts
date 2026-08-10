import mongoose, { Schema, Document } from 'mongoose';

export interface PageViewItem {
  id?: string;
  path: string;
  visitorId: string;
  userAgent?: string;
  referrer?: string;
  timestamp: string;
}

export interface ClickEventItem {
  id?: string;
  elementId: string;
  label: string;
  category?: string;
  path: string;
  visitorId: string;
  timestamp: string;
}

export interface PageViewDocument extends Document {
  path: string;
  visitorId: string;
  userAgent?: string;
  referrer?: string;
  timestamp: Date;
}

export interface ClickEventDocument extends Document {
  elementId: string;
  label: string;
  category?: string;
  path: string;
  visitorId: string;
  timestamp: Date;
}

const PageViewSchema = new Schema<PageViewDocument>({
  path: { type: String, required: true },
  visitorId: { type: String, required: true },
  userAgent: { type: String, default: '' },
  referrer: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const ClickEventSchema = new Schema<ClickEventDocument>({
  elementId: { type: String, required: true },
  label: { type: String, required: true },
  category: { type: String, default: 'interaction' },
  path: { type: String, default: '/' },
  visitorId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export const PageViewModel = mongoose.model<PageViewDocument>('PageView', PageViewSchema);
export const ClickEventModel = mongoose.model<ClickEventDocument>('ClickEvent', ClickEventSchema);

// In-Memory Fallback Store
export const samplePageViews: PageViewItem[] = [];
export const sampleClickEvents: ClickEventItem[] = [];
