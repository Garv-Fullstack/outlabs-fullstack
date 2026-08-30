export interface CampaignItem {
  id: string;
  name: string;
  recipients: number;
  sent: number;
  openRate: number;
  replyRate: number;
  status: 'Active' | 'Completed' | 'Paused' | 'Draft';
  createdAt: string;
  fromSender: string;
  type: string;
  totalSteps: number;
}

export interface ContactItem {
  id: string;
  name: string;
  email: string;
  company: string;
  status: 'Prospect' | 'Contacted' | 'Customer' | 'Lead';
  addedDate: string;
  tags: ('Hot Lead' | 'Follow-up' | 'Cold lead' | 'Warm lead' | 'Contacted' | 'Prospect')[];
}

export interface FollowUpItem {
  id: string;
  task: string;
  contact: string;
  campaign: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Completed' | 'Overdue';
}

export interface InboxThread {
  id: string;
  senderName: string;
  senderEmail: string;
  company: string;
  subject: string;
  snippet: string;
  time: string;
  unread: boolean;
  tag: 'Interested' | 'Meeting Booked' | 'Question' | 'Not Interested';
  messages: {
    sender: string;
    avatar?: string;
    timestamp: string;
    body: string;
    isUser: boolean;
  }[];
}

export interface TemplateItem {
  id: string;
  title: string;
  category: string;
  subject: string;
  body: string;
}

export const STARTER_TEMPLATES: TemplateItem[] = [
  {
    id: 'tpl-1',
    title: 'SaaS Value Proposition',
    category: 'Sales Outreach',
    subject: 'Quick question about {{company}}',
    body: `Hi {{first_name}},\n\nI hope you're doing well. I came across {{company}} and was impressed by your work in {{industry}}.\n\nI'd love to connect and explore how we might help you scale cold email delivery with zero rate-limit issues.\n\nWould you be open to a quick 15-minute intro this week?\n\nBest regards,\nYour Name`
  },
  {
    id: 'tpl-2',
    title: 'Friendly Follow-up',
    category: 'Follow-up',
    subject: 'Re: Quick question about {{company}}',
    body: `Hi {{first_name}},\n\nFloating this to the top of your inbox in case it got buried!\n\nLet me know if you have 10 minutes to chat Thursday or Friday.\n\nBest,\nYour Name`
  },
  {
    id: 'tpl-3',
    title: 'Executive Pitch & Case Study',
    category: 'Enterprise',
    subject: '{{first_name}}, scaling outreach infrastructure for {{company}}',
    body: `Hi {{first_name}},\n\nWanted to share how our distributed Redis token-bucket system prevented 100% of domain burn issues for high-volume enterprise outreach.\n\nWould this be relevant for {{company}}'s upcoming roadmap?\n\nBest,\nYour Name`
  },
  {
    id: 'tpl-4',
    title: 'Permission to Close File',
    category: 'Final Step',
    subject: 'Permission to close your file?',
    body: `Hi {{first_name}},\n\nI haven't heard back so I assume cold outreach optimization isn't a priority for {{company}} right now.\n\nNo worries at all! If anything changes down the road, feel free to reach out anytime.\n\nAll the best,\nYour Name`
  }
];

// Deprecated demo aliases for backward compatibility if any
export const INITIAL_CAMPAIGNS: CampaignItem[] = [];
export const INITIAL_CONTACTS: ContactItem[] = [];
export const INITIAL_FOLLOWUPS: FollowUpItem[] = [];
export const INITIAL_INBOX: InboxThread[] = [];
export const INITIAL_TEMPLATES: TemplateItem[] = STARTER_TEMPLATES;

