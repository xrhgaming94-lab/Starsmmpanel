
// FIX: Import React to resolve 'Cannot find namespace React' error.
import React from 'react';

export type UserRole = 'user' | 'admin';
export type UserStatus = 'Active' | 'Suspended';

export interface User {
  id: string;
  displayId?: string; // Sequential ID (e.g. 000001)
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  walletBalance: number;
  totalSpent: number;
  status: UserStatus;
  password?: string;
  whatsapp?: string;
  isVerified?: boolean; // New field for OTP verification
  createdAt?: string; // ISO string for creation time
}

export type ServiceInputType = 'username' | 'link';
export type ServiceType = 'Followers' | 'Likes' | 'Views' | 'Comments' | 'Shares' | 'Subscribers' | 'Members' | 'Other';

export interface Category {
  id:string;
  name: string;
  iconName: string;
}

export type CouponType = 'discount' | 'bonus';

export interface Coupon {
    id: string;
    code: string;
    discountPercent: number;
    usageLimit: number; // 0 for unlimited
    usedCount: number;
    expiresAt: Date | null; // Null means no expiration
    createdAt: Date;
    isAutoApply?: boolean; // New field
    type?: CouponType; // 'discount' (default) or 'bonus'
}

export interface ServicePackage {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  price: string;
  unitName: string;
  rate: number;
  ratePerQuantity: number;
  inputType: ServiceInputType;
  minQuantity: number;
  maxQuantity: number;
  categoryId: string;
  serviceType: ServiceType;
  
  // Speed / Completion Time Fields
  minCompletionTime?: string; // e.g. "1 Hour"
  maxCompletionTime?: string; // e.g. "24 Hours"

  // Limited Offer Fields
  isLimitedOffer?: boolean;
  expiryDate?: Date | null;
  totalLimit?: number; // Total global orders allowed
  dailyLimit?: number; // Total global orders per day
  userDailyLimit?: number; // Max orders per user per day
  cooldownMinutes?: number; // Timer between orders for a user
  currentOrdersCount?: number; // Track total orders for this plan
}

export enum OrderStatus {
    Pending = 'Pending',
    InProgress = 'In Progress',
    Completed = 'Completed',
    Cancelled = 'Cancelled'
}

export interface Order {
  id: string;
  displayId: string;
  userId: string;
  userName: string;
  userWhatsapp?: string;
  service: string;
  serviceId?: string; // Added to track specific service limits
  serviceDisplayId?: string; // Added for Admin display (Plan ID)
  targetUrl: string;
  quantity: number;
  unit?: string; // Added to show "Followers", "Likes" etc in receipt/admin
  amount: number;
  date: Date;
  status: OrderStatus;
  couponCode?: string;
  isLimitedOffer?: boolean; // To filter in Admin Limited Orders
}

export enum TransactionType {
  Credit = 'Credit',
  Debit = 'Debit',
}

export enum DepositStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: Date;
  status: DepositStatus | OrderStatus;
  relatedId: string;
}

export interface DepositRequest {
    id: string;
    displayId: string;
    userId: string;
    userName: string;
    userDisplayId?: string; // UID of the user making the request
    amount: number;
    utr: string;
    senderUpi: string;
    screenshotUrl: string;
    status: DepositStatus;
    date: Date;
    couponCode?: string;
    bonusAmount?: number;
}

export interface SupportInfo {
    id: string;
    whatsapp: string;
    telegram: string;
    email: string;
    instagram: string;
    facebook: string;
    mobile?: string;
    youtube?: string;
    promoVideoUrl?: string;
}

export interface PaymentInfo {
    id: string;
    qrCodeUrl: string;
    upiId: string;
    youtubeTutorialUrl?: string;
    minDeposit: number;
    maxDeposit: number;
}

export interface EmailConfig {
    serviceId: string;
    templateId: string;
    publicKey: string;
}

export interface TelegramConfig {
    botToken: string;
    channelId: string; // The channel to send notifications to (e.g. -100xxxxxxx)
    ownerChatId: string; // The admin's personal chat ID for verification (optional for now, handled by bot logic usually)
}

export interface AdminMessage {
    id: string;
    subject: string;
    body: string;
    target: 'ALL' | 'SPECIFIC';
    targetUserId?: string; // If target is SPECIFIC
    targetUserName?: string;
    targetEmail?: string;
    type: 'MANUAL' | 'AUTO';
    status: 'SENT' | 'SCHEDULED';
    scheduledDate?: string; // Changed from Day to specific Date (YYYY-MM-DD)
    scheduledTime?: string; // e.g., '14:30'
    createdAt: Date;
}

export interface MaintenanceStatus {
    isEnabled: boolean;
    message?: string;
}

export interface AdminSecurityConfig {
    pin: string; // The numeric pin
}
