export enum Role {
  OWNER = 'OWNER',
  USER = 'USER'
}

export enum UserStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum CustomerType {
  HOT = 'HOT',
  COLD = 'COLD',
  NOT_NEEDED = 'NOT_NEEDED'
}

export enum TravelType {
  BUS = 'BUS',
  TRAIN = 'TRAIN',
  BIKE = 'BIKE',
  AUTO = 'AUTO',
  CAR = 'CAR'
}

export interface User {
  id: string;
  username: string;
  role: Role;
  status: UserStatus;
  fullName: string;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  userId: string;
  date: string;
  customerType: CustomerType;
  customerName: string; // or School Name
  contactPerson: string;
  mobile1: string;
  mobile2?: string;
  feedback: string;
  aiSentiment?: string;
}

export interface Conveyance {
  id: string;
  userId: string;
  date: string;
  description: string;
  travelType: TravelType;
  fromKm: number;
  toKm: number;
  totalKm: number;
  ratePerKm: number;
  foodingCost: number;
  loadingCost: number;
  otherCost: number;
  subTotal: number;
  approved: boolean; // Owner approval for reimbursement
}

export interface AppSettings {
  perKmRate: number;
}