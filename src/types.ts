export interface PipeItem {
  id: string;
  itemName: string;
  specification: string;
  grade: string;
  normalizedItemName: string;
  normalizedSpec: string;
  normalizedGrade: string;
  isIbr: boolean;
  material: string;
  imageUrl?: string;
}

export interface ConsolidateItem {
  id: string;
  itemName: string;
  specification: string;
  grade: string;
  isIbr: boolean;
  material: string;
  count: number; // Number of duplicates in original sheet
  imageUrl?: string;
}

export interface FilterState {
  searchQuery: string;
  material: string; // 'All', 'Stainless Steel', 'Carbon Steel', 'Alloy Steel', 'Duplex', 'Super Duplex', 'Other'
  itemType: string; // 'All', 'Pipe', 'Tube', 'U-Tube', 'Riffle Tube', 'Other'
  ibrOnly: boolean;
  consolidate: boolean;
}

export interface ActivityLog {
  id: string;
  action: 'add' | 'edit' | 'delete' | 'reset';
  itemName: string;
  specification: string;
  grade: string;
  timestamp: string;
}

export interface Feedback {
  id: string;
  name: string;
  email?: string;
  type: 'bug' | 'suggestion' | 'inquiry' | 'other';
  message: string;
  timestamp: string;
  status: 'pending' | 'resolved' | 'ignored';
  attachmentName?: string;
  attachmentType?: string;
  attachmentData?: string; // base64 string
  emailStatus?: 'pending' | 'success' | 'failed';
  emailErrorMessage?: string;
}

export interface AppSettings {
  id: string;
  web3FormsKey?: string;
  emailNotificationsEnabled: boolean;
  notificationRecipient?: string;
}



