import { User, Inquiry, Conveyance, AppSettings, Role, UserStatus } from '../types';

// Mock Data / Storage Keys
const KEYS = {
  USERS: 'sfo_users',
  INQUIRIES: 'sfo_inquiries',
  CONVEYANCES: 'sfo_conveyances',
  SETTINGS: 'sfo_settings',
  CURRENT_USER: 'sfo_current_user'
};

// Hardcoded Google Apps Script URL as requested
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx0JIH9WQswiuc8B7rud0rkpZ2VgdWxT-PKbxA6dks1l5x8oa9uNwAEc6Xuyzln2kMm/exec";

const DEFAULT_SETTINGS: AppSettings = {
  perKmRate: 10, // Default 10 currency units per KM
};

// --- Helpers ---
const get = <T,>(key: string, defaultValue: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) return defaultValue;
  try {
    return JSON.parse(stored) as T;
  } catch (e) {
    return defaultValue;
  }
};

const set = <T,>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// --- Google Sheets Sync Logic ---
export const getSettings = (): AppSettings => get<AppSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);

export const syncToGoogleSheets = async (): Promise<boolean> => {
  // We no longer check settings for the URL since it is hardcoded
  if (!GOOGLE_SCRIPT_URL) {
    return false;
  }

  const payload = {
    users: getUsers(),
    inquiries: getInquiries(),
    conveyances: getConveyances()
  };

  console.log("Auto-Syncing to Google Sheet...");

  try {
    // IMPORTANT: 
    // 1. We use 'no-cors' because Google Apps Script endpoints don't standardly return CORS headers for POST from client-side.
    // 2. We use 'text/plain' as Content-Type to prevent the browser from sending a Preflight (OPTIONS) request which would fail.
    
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload)
    });
    
    console.log("Auto-Sync request sent.");
    return true;
  } catch (error) {
    console.error("Auto-Sync failed:", error);
    // We don't throw here to prevent disrupting the user flow if internet is down
    return false;
  }
};

// Internal helper to trigger sync without blocking UI
const triggerAutoSync = () => {
  // We run this asynchronously
  setTimeout(() => {
    syncToGoogleSheets().catch(e => console.log("Background sync error", e));
  }, 100);
};

// --- Users ---
export const getUsers = (): User[] => get<User[]>(KEYS.USERS, []);

export const saveUser = (user: User): void => {
  const users = getUsers();
  // Check if update or new
  const existingIndex = users.findIndex(u => u.id === user.id);
  if (existingIndex >= 0) {
    users[existingIndex] = user;
    set(KEYS.USERS, users);
  } else {
    set(KEYS.USERS, [...users, user]);
  }
  triggerAutoSync(); // Auto Sync
};

export const updateUserStatus = (userId: string, status: UserStatus): void => {
  const users = getUsers().map(u => u.id === userId ? { ...u, status } : u);
  set(KEYS.USERS, users);
  triggerAutoSync(); // Auto Sync
};

export const loginUser = (username: string): User | null => {
  const users = getUsers();
  return users.find(u => u.username === username) || null;
};

export const registerUser = (username: string, fullName: string): User => {
  const users = getUsers();
  if (users.find(u => u.username === username)) {
    throw new Error("Username already exists");
  }
  // First user is always OWNER, others are USER (Pending)
  const isFirstUser = users.length === 0;
  const newUser: User = {
    id: crypto.randomUUID(),
    username,
    fullName,
    role: isFirstUser ? Role.OWNER : Role.USER,
    status: isFirstUser ? UserStatus.APPROVED : UserStatus.PENDING,
    createdAt: new Date().toISOString()
  };
  saveUser(newUser); // saveUser triggers sync
  return newUser;
};

// --- Inquiries ---
export const getInquiries = (): Inquiry[] => get<Inquiry[]>(KEYS.INQUIRIES, []);

export const addInquiry = (inquiry: Inquiry): void => {
  const list = getInquiries();
  set(KEYS.INQUIRIES, [...list, inquiry]);
  triggerAutoSync(); // Auto Sync
};

// --- Conveyance ---
export const getConveyances = (): Conveyance[] => get<Conveyance[]>(KEYS.CONVEYANCES, []);

export const addConveyance = (conveyance: Conveyance): void => {
  const list = getConveyances();
  set(KEYS.CONVEYANCES, [...list, conveyance]);
  triggerAutoSync(); // Auto Sync
};

export const approveConveyance = (id: string): void => {
  const list = getConveyances().map(c => c.id === id ? { ...c, approved: true } : c);
  set(KEYS.CONVEYANCES, list);
  triggerAutoSync(); // Auto Sync
};

// --- Settings ---
export const saveSettings = (settings: AppSettings): void => {
  set(KEYS.SETTINGS, settings);
  triggerAutoSync(); // Auto Sync when settings change
};

// --- Session ---
export const getCurrentUser = (): User | null => get<User | null>(KEYS.CURRENT_USER, null);
export const setCurrentUser = (user: User | null): void => set(KEYS.CURRENT_USER, user);