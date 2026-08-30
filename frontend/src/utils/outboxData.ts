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
  tags: ('Hot Lead' | 'Follow-up' | 'Cold lead' | 'Warm lead')[];
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
  openRateAvg: string;
  replyRateAvg: string;
}

export const INITIAL_CAMPAIGNS: CampaignItem[] = [
  {
    id: 'camp-1',
    name: 'Product Launch Outreach',
    recipients: 1250,
    sent: 1250,
    openRate: 48.3,
    replyRate: 9.2,
    status: 'Active',
    createdAt: '2 days ago',
    fromSender: 'gourav@outbox.com',
    type: 'Email Campaign',
    totalSteps: 4
  },
  {
    id: 'camp-2',
    name: 'Enterprise Solutions Campaign',
    recipients: 2500,
    sent: 2450,
    openRate: 41.8,
    replyRate: 7.6,
    status: 'Active',
    createdAt: '5 days ago',
    fromSender: 'sales@outbox.com',
    type: 'Multi-Step Sequence',
    totalSteps: 3
  },
  {
    id: 'camp-3',
    name: 'Partnership Outreach',
    recipients: 980,
    sent: 980,
    openRate: 36.2,
    replyRate: 6.5,
    status: 'Completed',
    createdAt: '1 week ago',
    fromSender: 'partnerships@outbox.com',
    type: 'Partner Sequence',
    totalSteps: 3
  },
  {
    id: 'camp-4',
    name: 'Follow-up Sequence',
    recipients: 1100,
    sent: 1050,
    openRate: 28.6,
    replyRate: 5.1,
    status: 'Paused',
    createdAt: '1 week ago',
    fromSender: 'gourav@outbox.com',
    type: 'Follow-up Drip',
    totalSteps: 2
  },
  {
    id: 'camp-5',
    name: 'Investor Outreach',
    recipients: 750,
    sent: 750,
    openRate: 44.0,
    replyRate: 10.3,
    status: 'Completed',
    createdAt: '2 weeks ago',
    fromSender: 'gourav@outbox.com',
    type: 'Investor Updates',
    totalSteps: 3
  },
  {
    id: 'camp-6',
    name: 'Customer Feedback Survey',
    recipients: 630,
    sent: 630,
    openRate: 33.1,
    replyRate: 4.2,
    status: 'Draft',
    createdAt: '2 weeks ago',
    fromSender: 'support@outbox.com',
    type: 'Survey Email',
    totalSteps: 1
  }
];

export const INITIAL_CONTACTS: ContactItem[] = [
  {
    id: 'con-1',
    name: 'John Smith',
    email: 'john@techcorp.com',
    company: 'TechCorp Solutions',
    status: 'Prospect',
    addedDate: '2 days ago',
    tags: ['Hot Lead']
  },
  {
    id: 'con-2',
    name: 'Sarah Johnson',
    email: 'sarah@innovate.co',
    company: 'Innovate Labs',
    status: 'Contacted',
    addedDate: '3 days ago',
    tags: ['Follow-up']
  },
  {
    id: 'con-3',
    name: 'Mike Wilson',
    email: 'mike@startups.io',
    company: 'StartupAI',
    status: 'Prospect',
    addedDate: '5 days ago',
    tags: ['Cold lead']
  },
  {
    id: 'con-4',
    name: 'Emily Davis',
    email: 'emily@growth.io',
    company: 'Growth Inc',
    status: 'Prospect',
    addedDate: '1 week ago',
    tags: ['Warm lead']
  },
  {
    id: 'con-5',
    name: 'David Brown',
    email: 'david@enterprise.com',
    company: 'Enterprise Ltd',
    status: 'Prospect',
    addedDate: '1 week ago',
    tags: ['Hot Lead']
  },
  {
    id: 'con-6',
    name: 'Lisa Chen',
    email: 'lisa@futuretech.com',
    company: 'Future Tech',
    status: 'Contacted',
    addedDate: '2 weeks ago',
    tags: ['Follow-up']
  },
  {
    id: 'con-7',
    name: 'Alex Taylor',
    email: 'alex@cloudscale.net',
    company: 'CloudScale Systems',
    status: 'Customer',
    addedDate: '3 weeks ago',
    tags: ['Warm lead']
  },
  {
    id: 'con-8',
    name: 'Rachel Green',
    email: 'rachel@apexventures.vc',
    company: 'Apex Ventures',
    status: 'Prospect',
    addedDate: '3 weeks ago',
    tags: ['Hot Lead']
  }
];

export const INITIAL_FOLLOWUPS: FollowUpItem[] = [
  {
    id: 'fol-1',
    task: 'Follow up on proposal',
    contact: 'John Smith',
    campaign: 'Product Launch Outreach',
    dueDate: 'Today',
    priority: 'High',
    status: 'Pending'
  },
  {
    id: 'fol-2',
    task: 'Check meeting availability',
    contact: 'Sarah Johnson',
    campaign: 'Enterprise Solutions',
    dueDate: 'Tomorrow',
    priority: 'Medium',
    status: 'Pending'
  },
  {
    id: 'fol-3',
    task: 'Send case studies',
    contact: 'Mike Wilson',
    campaign: 'Partnership Outreach',
    dueDate: 'Aug 27, 2026',
    priority: 'Low',
    status: 'Pending'
  },
  {
    id: 'fol-4',
    task: 'Follow up on demo',
    contact: 'Emily Davis',
    campaign: 'Product Launch Outreach',
    dueDate: 'Aug 28, 2026',
    priority: 'High',
    status: 'Overdue'
  },
  {
    id: 'fol-5',
    task: 'Re-review contract',
    contact: 'David Brown',
    campaign: 'Enterprise Solutions',
    dueDate: 'Aug 29, 2026',
    priority: 'High',
    status: 'Pending'
  }
];

export const INITIAL_INBOX: InboxThread[] = [
  {
    id: 'inbox-1',
    senderName: 'John Smith',
    senderEmail: 'john@techcorp.com',
    company: 'TechCorp Solutions',
    subject: 'Re: Quick question about TechCorp',
    snippet: "Yes, I'd love to jump on a quick 15-minute call this Thursday at 2:00 PM...",
    time: '15m ago',
    unread: true,
    tag: 'Interested',
    messages: [
      {
        sender: 'Gourav Vijayvargiya',
        timestamp: 'Yesterday at 10:00 AM',
        body: "Hi John,\n\nI came across TechCorp Solutions and was impressed by your team's expansion. Would you be open to a quick 15-minute sync this week to explore how Outbox can 3x your deliverability rates?\n\nBest regards,\nGourav Vijayvargiya",
        isUser: true
      },
      {
        sender: 'John Smith',
        timestamp: '15 minutes ago',
        body: "Hi Gourav,\n\nThanks for reaching out! Yes, I'd love to jump on a quick 15-minute call this Thursday at 2:00 PM EST. Let me know if that works for you or feel free to send a calendar invite directly.\n\nBest,\nJohn Smith\nVP of Growth, TechCorp",
        isUser: false
      }
    ]
  },
  {
    id: 'inbox-2',
    senderName: 'Sarah Johnson',
    senderEmail: 'sarah@innovate.co',
    company: 'Innovate Labs',
    subject: 'Re: Scaling outbound at Innovate',
    snippet: 'Thanks for reaching out Gourav. Can you send over your deck and pricing details first?',
    time: '1h ago',
    unread: true,
    tag: 'Question',
    messages: [
      {
        sender: 'Gourav Vijayvargiya',
        timestamp: '2 days ago',
        body: "Hi Sarah,\n\nLoved your recent post on distributed sales architectures. We recently helped Innovate Labs' peers automate their outreach pipeline with zero spam score.\n\nOpen to discussing?",
        isUser: true
      },
      {
        sender: 'Sarah Johnson',
        timestamp: '1 hour ago',
        body: "Hi Gourav,\n\nThanks for reaching out. We are reviewing our Q4 tooling right now. Can you send over your one-pager deck and pricing tiers first? If aligned, I'll loop in our Ops lead.\n\nBest,\nSarah",
        isUser: false
      }
    ]
  },
  {
    id: 'inbox-3',
    senderName: 'David Brown',
    senderEmail: 'david@enterprise.com',
    company: 'Enterprise Ltd',
    subject: 'Re: Outbox Enterprise Solutions',
    snippet: 'Meeting booked for Friday 10:00 AM on your calendar link.',
    time: '1d ago',
    unread: false,
    tag: 'Meeting Booked',
    messages: [
      {
        sender: 'David Brown',
        timestamp: 'Yesterday at 4:30 PM',
        body: "Hey Gourav,\n\nMeeting booked for Friday 10:00 AM on your calendar link. Looking forward to seeing the live demo.\n\nCheers,\nDavid",
        isUser: false
      }
    ]
  },
  {
    id: 'inbox-4',
    senderName: 'Mike Wilson',
    senderEmail: 'mike@startups.io',
    company: 'StartupAI',
    subject: 'Re: Partnership with Outbox',
    snippet: 'Not at the moment as we are locked in for the year, but feel free to check back in Q1.',
    time: '2d ago',
    unread: false,
    tag: 'Not Interested',
    messages: [
      {
        sender: 'Mike Wilson',
        timestamp: '2 days ago',
        body: "Hi Gourav,\n\nAppreciate the note. Not at the moment as we are locked into our current stack for the year, but feel free to check back in Q1.\n\nBest,\nMike",
        isUser: false
      }
    ]
  }
];

export const INITIAL_TEMPLATES: TemplateItem[] = [
  {
    id: 'tpl-1',
    title: 'SaaS Value Proposition',
    category: 'Sales Outreach',
    subject: 'Quick question about {{company}}',
    body: `Hi {{first_name}},\n\nI hope you're doing well. I came across {{company}} and was impressed by your work in {{industry}}.\n\nI'd love to connect and explore how we might help you achieve 3x cold email open rates with zero deliverability drops.\n\nWould you be open to a quick 15-minute call this week?\n\nBest regards,\nGourav Vijayvargiya`,
    openRateAvg: '52.4%',
    replyRateAvg: '11.8%'
  },
  {
    id: 'tpl-2',
    title: 'Friendly Follow-up (Day 2)',
    category: 'Follow-up',
    subject: 'Re: Quick question about {{company}}',
    body: `Hi {{first_name}},\n\nFloating this to the top of your inbox in case it got buried!\n\nHere is a quick 2-minute teardown of how peer companies in {{industry}} resolved their mailbox warmup issues.\n\nLet me know if you'd like to chat Thursday or Friday!\n\nBest,\nGourav`,
    openRateAvg: '46.1%',
    replyRateAvg: '8.4%'
  },
  {
    id: 'tpl-3',
    title: 'Executive Pitch & Case Study',
    category: 'Enterprise',
    subject: '{{first_name}}, how TechCorp scaled outreach to 10k/day',
    body: `Hi {{first_name}},\n\nWanted to share how our distributed Redis token-bucket system prevented 100% of domain burn issues for high-volume enterprise teams.\n\nWould this be relevant for {{company}}'s Q4 roadmap?\n\nBest,\nGourav`,
    openRateAvg: '49.8%',
    replyRateAvg: '9.7%'
  },
  {
    id: 'tpl-4',
    title: 'Break-up Email',
    category: 'Final Step',
    subject: 'Permission to close your file?',
    body: `Hi {{first_name}},\n\nI haven't heard back so I assume improving cold email deliverability isn't a priority for {{company}} right now.\n\nNo worries at all! I will stop following up. If anything changes down the road, feel free to reach out.\n\nAll the best,\nGourav`,
    openRateAvg: '61.2%',
    replyRateAvg: '14.5%'
  }
];
