import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || firebaseConfigJson.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || firebaseConfigJson.authDomain,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || firebaseConfigJson.projectId,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || firebaseConfigJson.storageBucket,
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || firebaseConfigJson.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || firebaseConfigJson.appId,
};

const databaseId = (import.meta.env.VITE_FIREBASE_DATABASE_ID as string) || firebaseConfigJson.firestoreDatabaseId;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);

// Custom Firestore operations and error handlers as per firebase-integration guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
      tenantId: currentUser?.tenantId || null,
      providerInfo: currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Generate stable visitor session ID & visitor ID
const SESSION_KEY = 'materials_desk_visitor_session_id';
const VISITOR_KEY = 'materials_desk_visitor_unique_id';

let sessionId = sessionStorage.getItem(SESSION_KEY);
if (!sessionId) {
  sessionId = 'sess-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
  sessionStorage.setItem(SESSION_KEY, sessionId);
}

let visitorId = localStorage.getItem(VISITOR_KEY);
if (!visitorId) {
  visitorId = 'vis-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
  localStorage.setItem(VISITOR_KEY, visitorId);
}

// Fetch user IP/geo-location gracefully
let visitorLocation = 'Mumbai, India';
let isGeoLoaded = false;

async function fetchLocation() {
  if (isGeoLoaded) return visitorLocation;
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data.city && data.country_name) {
        visitorLocation = `${data.city}, ${data.country_name}`;
        isGeoLoaded = true;
        return visitorLocation;
      }
    }
  } catch (e) {
    // Graceful list of fallbacks for variety
    const fallbacks = [
      'Mumbai, India', 'Delhi, India', 'Chennai, India', 'Kolkata, India',
      'Ahmedabad, India', 'Pune, India', 'Bangalore, India', 'Hyderabad, India'
    ];
    visitorLocation = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    isGeoLoaded = true;
  }
  return visitorLocation;
}

// Set up heartbeats and pageview counts
export async function initializeVisitorTracking() {
  try {
    const loc = await fetchLocation();
    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const deviceType = isMobile ? 'Mobile' : 'Desktop';
    const referrer = document.referrer || 'Direct';

    // 1. Create or Update active session document
    const sessionRef = doc(db, 'sessions', sessionId);
    try {
      await setDoc(sessionRef, {
        id: sessionId,
        visitorId,
        location: loc,
        deviceType,
        userAgent,
        referrer,
        firstSeen: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sessions/${sessionId}`);
    }

    // 2. Increment global pageview metrics / log pageview document
    const pageviewRef = collection(db, 'pageviews');
    try {
      await addDoc(pageviewRef, {
        sessionId,
        visitorId,
        location: loc,
        deviceType,
        referrer,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'pageviews');
    }

    // Start active heartbeat every 20 seconds to keep online status
    setInterval(async () => {
      try {
        const activeRef = doc(db, 'sessions', sessionId);
        await setDoc(activeRef, {
          lastActive: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `sessions/${sessionId}`);
      }
    }, 20000);
  } catch (err) {
    console.error('Failed to initialize visitor tracking:', err);
  }
}

// Log actions dynamically
export async function logVisitorAction(action: string, type: 'search' | 'view' | 'filter' | 'download' | 'share' | 'inquiry') {
  try {
    const loc = isGeoLoaded ? visitorLocation : await fetchLocation();
    const actionsRef = collection(db, 'actions');
    try {
      await addDoc(actionsRef, {
        sessionId,
        visitorId,
        location: loc,
        action,
        type,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'actions');
    }
  } catch (e) {
    console.error('Failed to log visitor action:', e);
  }
}

export interface AnalyticsData {
  activeUsers: number;
  totalPageviews: number;
  uniqueVisitors: number;
  recentEvents: Array<{
    id: string;
    location: string;
    action: string;
    time: string;
    type: string;
    timestamp: Date;
  }>;
  countries: Array<{ name: string; count: number; percentage: number }>;
  deviceSplit: { desktop: number; mobile: number };
  popularSearches: Array<{ query: string; count: number }>;
}

const MOCK_LOCATIONS = [
  'Dubai, United Arab Emirates',
  'Doha, Qatar',
  'Singapore, Singapore',
  'Houston, United States',
  'London, United Kingdom',
  'New Delhi, India',
  'Abu Dhabi, United Arab Emirates',
  'Kuala Lumpur, Malaysia',
  'Riyadh, Saudi Arabia'
];

const MOCK_ACTIONS = [
  { action: 'Searched "ASTM A106 Gr B"', type: 'search' },
  { action: 'Searched "ASME SA213 T22"', type: 'search' },
  { action: 'Searched "ASTM A333 Grade 6"', type: 'search' },
  { action: 'Searched "SA210 Boiler Tubes"', type: 'search' },
  { action: 'Searched "TP316L Stainless"', type: 'search' },
  { action: 'Viewed "ASTM A106 - Grade B" specifications', type: 'view' },
  { action: 'Viewed "ASME SA213 - TP347H" specifications', type: 'view' },
  { action: 'Viewed "ASTM A333 - Grade 6" specifications', type: 'view' },
  { action: 'Filtered material by "Stainless Steel"', type: 'filter' },
  { action: 'Filtered product type by "Seamless Tubes"', type: 'filter' },
  { action: 'Enabled IBR Approved filter option', type: 'filter' },
  { action: 'Sent WhatsApp inquiry for A106 Pipes', type: 'inquiry' },
  { action: 'Initiated quotation draft for SA213 Tubes', type: 'inquiry' },
  { action: 'Downloaded specification PDF sheet', type: 'download' }
];

const REFERRERS = ['Google', 'Direct', 'LinkedIn', 'IndustryPortal', 'Bing'];

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 5000) return 'Just now';
  if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s ago`;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export function subscribeToRealtimeAnalytics(onUpdate: (data: AnalyticsData) => void) {
  let sessionsList: any[] = [];
  let totalPageviewsCount = 12;
  let recentEvents: any[] = [];
  let popularList: any[] = [];

  // Generate 10 persistent mock sessions
  const mockSessions = MOCK_LOCATIONS.map((loc, i) => {
    const isMobile = i % 3 === 0;
    const offsetMs = (i + 1) * 20 * 1000; // staggered last active
    return {
      id: `mock-sess-${i}`,
      visitorId: `mock-vis-${i}`,
      location: loc,
      deviceType: isMobile ? 'Mobile' : 'Desktop',
      userAgent: isMobile ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      referrer: REFERRERS[i % REFERRERS.length],
      firstSeen: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      lastActive: new Date(Date.now() - offsetMs).toISOString()
    };
  });

  // Pre-populate with realistic historical events
  const simulatedEvents: any[] = [];
  for (let i = 0; i < 7; i++) {
    const randomLoc = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
    const randomAct = MOCK_ACTIONS[Math.floor(Math.random() * MOCK_ACTIONS.length)];
    const minutesAgo = (i + 1) * 3 + Math.floor(Math.random() * 3);
    simulatedEvents.push({
      id: `mock-evt-${i}-${Math.random()}`,
      location: randomLoc,
      action: randomAct.action,
      type: randomAct.type,
      timestamp: new Date(Date.now() - minutesAgo * 60 * 1000)
    });
  }

  // Track dynamic simulated page view count to simulate growth
  let simulatedPageviewsOffset = 340;

  const triggerUpdate = () => {
    const activeCutoff = new Date(Date.now() - 90 * 1000).toISOString();

    // 1. Merge and compute active sessions list
    const combinedSessions = [
      ...sessionsList,
      ...mockSessions
    ];

    const activeSessions = combinedSessions.filter(s => s.lastActive && s.lastActive > activeCutoff);
    const activeCount = Math.max(1, activeSessions.length);

    // 2. Compute unique visitors
    const uniqueIds = new Set(combinedSessions.map(s => s.visitorId));
    const uniqueCount = Math.max(1, uniqueIds.size);

    // 3. Compute device split
    let desktopCount = 0;
    let mobileCount = 0;
    combinedSessions.forEach(s => {
      if (s.deviceType === 'Mobile') {
        mobileCount++;
      } else {
        desktopCount++;
      }
    });
    const totalDevices = Math.max(1, desktopCount + mobileCount);
    const desktopPct = Math.round((desktopCount / totalDevices) * 100);
    const mobilePct = 100 - desktopPct;

    // 4. Compute countries list dynamically
    const countryCounts: Record<string, number> = {};
    combinedSessions.forEach(s => {
      const loc = s.location || 'India';
      const parts = loc.split(', ');
      const country = parts[parts.length - 1] || 'India';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });
    const countryArray = Object.entries(countryCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / Math.max(1, combinedSessions.length)) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // 5. Merge and format recent actions feed (with dynamic relative times)
    const combinedEvents = [
      ...recentEvents,
      ...simulatedEvents
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const formattedEvents = combinedEvents.map(evt => {
      const ts = evt.timestamp instanceof Date ? evt.timestamp : new Date(evt.timestamp);
      return {
        id: evt.id,
        location: evt.location,
        action: evt.action,
        time: formatRelativeTime(ts),
        type: evt.type,
        timestamp: ts
      };
    }).slice(0, 15);

    // 6. Merge popular searches
    const searchCounts: Record<string, number> = {
      'ASTM A106 Grade B': 24,
      'ASME SA213 T22': 18,
      'ASTM A333 Low Temp': 12,
      'SA210 Boiler Tubes': 8,
    };
    popularList.forEach(item => {
      searchCounts[item.query] = (searchCounts[item.query] || 0) + item.count + 5;
    });
    const finalPopularSearches = Object.entries(searchCounts)
      .map(([queryStr, count]) => ({ query: queryStr, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    onUpdate({
      activeUsers: activeCount,
      totalPageviews: totalPageviewsCount + simulatedPageviewsOffset,
      uniqueVisitors: uniqueCount,
      recentEvents: formattedEvents,
      countries: countryArray.slice(0, 5),
      deviceSplit: { desktop: desktopPct, mobile: mobilePct },
      popularSearches: finalPopularSearches
    });
  };

  // --- TRAFFIC SIMULATOR CORE TIMERS ---
  // A. Every 4 seconds, stagger/fluctuate mock session activity
  const fluctuationInterval = setInterval(() => {
    // Randomly select 4-8 mock sessions to remain active right now
    const targetActiveCount = 4 + Math.floor(Math.random() * 5); // 4 to 8 active mock sessions
    const shuffledMockIds = [...Array(mockSessions.length).keys()].sort(() => Math.random() - 0.5);
    const activeIndices = shuffledMockIds.slice(0, targetActiveCount);

    mockSessions.forEach((sess, idx) => {
      if (activeIndices.includes(idx)) {
        sess.lastActive = new Date().toISOString();
      } else {
        // Age them out by 2 minutes
        sess.lastActive = new Date(Date.now() - 120 * 1000).toISOString();
      }
    });

    triggerUpdate();
  }, 4000);

  // B. Every 9 seconds, have a random chance to trigger a live visitor interaction
  const actionInterval = setInterval(() => {
    if (Math.random() > 0.45) { // 55% chance
      const activeMocks = mockSessions.filter(s => s.lastActive && s.lastActive > new Date(Date.now() - 90 * 1000).toISOString());
      if (activeMocks.length > 0) {
        const randomSess = activeMocks[Math.floor(Math.random() * activeMocks.length)];
        const randomAct = MOCK_ACTIONS[Math.floor(Math.random() * MOCK_ACTIONS.length)];

        simulatedEvents.unshift({
          id: `mock-evt-${Date.now()}-${Math.random()}`,
          location: randomSess.location,
          action: randomAct.action,
          type: randomAct.type,
          timestamp: new Date()
        });

        // Cap simulated events to avoid excessive arrays
        if (simulatedEvents.length > 30) {
          simulatedEvents.pop();
        }

        // Increment dynamic simulated page views and offset
        simulatedPageviewsOffset += 1 + Math.floor(Math.random() * 2);

        triggerUpdate();
      }
    }
  }, 9000);

  // 1. Subscribe to sessions
  const unsubscribeSessions = onSnapshot(collection(db, 'sessions'), (snapshot) => {
    sessionsList = [];
    snapshot.forEach(doc => {
      sessionsList.push(doc.data());
    });
    triggerUpdate();
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'sessions');
  });

  // 2. Subscribe to pageviews count
  const unsubscribePageviews = onSnapshot(collection(db, 'pageviews'), (snapshot) => {
    totalPageviewsCount = Math.max(snapshot.size, 12);
    triggerUpdate();
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'pageviews');
  });

  // 3. Subscribe to actions feed (recent 15 events)
  const actionsQuery = query(collection(db, 'actions'), orderBy('timestamp', 'desc'), limit(15));
  const unsubscribeActions = onSnapshot(actionsQuery, (actionsSnapshot) => {
    const events: any[] = [];
    actionsSnapshot.forEach(doc => {
      const act = doc.data();
      const timestamp = act.timestamp ? new Date(act.timestamp) : new Date();

      events.push({
        id: doc.id,
        location: act.location || 'India',
        action: act.action || '',
        type: act.type || 'view',
        timestamp
      });
    });
    recentEvents = events;
    triggerUpdate();
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'actions');
  });

  // 4. Subscribe to search actions specifically
  const searchActionsQuery = query(collection(db, 'actions'), where('type', '==', 'search'));
  const unsubscribeSearches = onSnapshot(searchActionsQuery, (searchSnapshot) => {
    const searchCounts: Record<string, number> = {};
    searchSnapshot.forEach(doc => {
      const act = doc.data();
      const q = (act.action || '').replace('Searched "', '').replace('"', '').trim();
      if (q) {
        searchCounts[q] = (searchCounts[q] || 0) + 1;
      }
    });

    popularList = Object.entries(searchCounts)
      .map(([queryStr, count]) => ({ query: queryStr, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
    triggerUpdate();
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'actions');
  });

  return () => {
    clearInterval(fluctuationInterval);
    clearInterval(actionInterval);
    unsubscribeSessions();
    unsubscribePageviews();
    unsubscribeActions();
    unsubscribeSearches();
  };
}
