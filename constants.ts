
import { User, Category, ServicePackage, Order, Transaction, DepositRequest, OrderStatus, TransactionType, DepositStatus, ServiceInputType, SupportInfo, PaymentInfo, ServiceType, Coupon } from './types';
import { UsersIcon, HeartIcon, EyeIcon, UserPlusIcon, PlayCircleIcon } from './components/Icons';

export const MOCK_USERS = {
  user: {
    id: 'user-001',
    displayId: '000001',
    name: 'Alex Doe',
    email: 'alex.doe@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=alexdoe',
    role: 'user',
    walletBalance: 253.00, // Updated to reflect mock transactions
    totalSpent: 247.00,
    status: 'Active',
    password: 'password123',
  } as User,
  admin: {
    id: 'admin-001',
    displayId: '000000',
    name: 'Admin',
    email: 'xrhgaming94@gmail.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=admin001',
    role: 'admin',
    walletBalance: 99999.99,
    totalSpent: 0,
    status: 'Active',
    password: 'WDRFrikd12845!@#',
  } as User,
};

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-instagram', name: 'Instagram', iconName: 'InstagramIcon' },
  { id: 'cat-youtube', name: 'YouTube', iconName: 'YouTubeIcon' },
  { id: 'cat-facebook', name: 'Facebook', iconName: 'FacebookIcon' },
  { id: 'cat-telegram', name: 'Telegram', iconName: 'TelegramIcon' },
];

// Defined order strictly matching the user's request image
export const SERVICE_TYPES_ORDER: ServiceType[] = [
    'Followers',
    'Likes',
    'Views',
    'Comments',
    'Subscribers',
    'Shares',
    'Members',
    'Other'
];

export const MOCK_COUPONS: Coupon[] = [
    {
        id: 'coupon-1',
        code: 'WELCOME10',
        discountPercent: 10,
        usageLimit: 100,
        usedCount: 5,
        expiresAt: null, // Unlimited time
        createdAt: new Date(),
    },
    {
        id: 'coupon-2',
        code: 'SAVE50',
        discountPercent: 50,
        usageLimit: 10,
        usedCount: 1,
        expiresAt: new Date(Date.now() + 86400000 * 7), // Expires in 7 days
        createdAt: new Date(),
    }
];

export const MOCK_SERVICES: ServicePackage[] = [
    {
        id: '0001',
        title: 'Instagram Followers',
        description: 'Get high-quality, real-looking followers.',
        icon: UserPlusIcon,
        price: 'Starting at ₹99',
        rate: 99,
        ratePerQuantity: 100,
        unitName: 'follower',
        inputType: 'username' as ServiceInputType,
        minQuantity: 100,
        maxQuantity: 5000,
        categoryId: 'cat-instagram',
        serviceType: 'Followers' as ServiceType,
    },
    {
        id: '0002',
        title: 'Instagram Likes',
        description: 'Boost your posts with instant likes.',
        icon: HeartIcon,
        price: 'Starting at ₹49',
        rate: 49,
        ratePerQuantity: 100,
        unitName: 'like',
        inputType: 'link' as ServiceInputType,
        minQuantity: 100,
        maxQuantity: 10000,
        categoryId: 'cat-instagram',
        serviceType: 'Likes' as ServiceType,
    },
    {
        id: '0003',
        title: 'Instagram Views',
        description: 'Increase views on your Reels and videos.',
        icon: PlayCircleIcon,
        price: 'Starting at ₹29',
        rate: 29,
        ratePerQuantity: 1000,
        unitName: 'view',
        inputType: 'link' as ServiceInputType,
        minQuantity: 100,
        maxQuantity: 100000,
        categoryId: 'cat-instagram',
        serviceType: 'Views' as ServiceType,
    },
    {
        id: '0004',
        title: 'YouTube Subscribers',
        description: 'Grow your channel with genuine subscribers.',
        icon: UsersIcon,
        price: 'Starting at ₹199',
        rate: 199,
        ratePerQuantity: 100,
        unitName: 'subscriber',
        inputType: 'link' as ServiceInputType,
        minQuantity: 100,
        maxQuantity: 200,
        categoryId: 'cat-youtube',
        serviceType: 'Subscribers' as ServiceType,
    },
    {
        id: '0005',
        title: 'Facebook Page Likes',
        description: 'Increase your Facebook page authority.',
        icon: HeartIcon,
        price: 'Starting at ₹149',
        rate: 149,
        ratePerQuantity: 100,
        unitName: 'page like',
        inputType: 'link' as ServiceInputType,
        minQuantity: 100,
        maxQuantity: 3000,
        categoryId: 'cat-facebook',
        serviceType: 'Likes' as ServiceType,
    },
];

export const MOCK_ORDERS: Order[] = [
    {
        id: 'order-1',
        displayId: '00002',
        userId: 'user-001',
        userName: 'Alex Doe',
        service: 'Instagram Followers',
        targetUrl: '@alexdoe_official',
        quantity: 200,
        amount: 198,
        date: new Date(),
        status: OrderStatus.Completed,
    },
    {
        id: 'order-2',
        displayId: '00001',
        userId: 'user-001',
        userName: 'Alex Doe',
        service: 'Instagram Likes',
        targetUrl: 'https://instagram.com/p/Cxyz...',
        quantity: 100,
        amount: 49,
        date: new Date(Date.now() - 86400000), // Yesterday
        status: OrderStatus.InProgress,
    }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
    {
        id: 'tx-1',
        userId: 'user-001',
        type: TransactionType.Credit,
        amount: 500,
        description: 'Deposit #0000001 via MOCK_UTR123',
        date: new Date(Date.now() - 86400000 * 2), // 2 days ago
        status: DepositStatus.Approved,
        relatedId: 'deposit-1',
    },
    {
        id: 'tx-2',
        userId: 'user-001',
        type: TransactionType.Debit,
        amount: 198,
        description: 'Order #00002 for Instagram Followers',
        date: new Date(),
        status: OrderStatus.Completed,
        relatedId: 'order-1',
    },
    {
        id: 'tx-3',
        userId: 'user-001',
        type: TransactionType.Debit,
        amount: 49,
        description: 'Order #00001 for Instagram Likes',
        date: new Date(Date.now() - 86400000),
        status: OrderStatus.InProgress,
        relatedId: 'order-2',
    }
];


export const MOCK_DEPOSIT_REQUESTS: DepositRequest[] = [
    {
        id: 'deposit-2',
        displayId: '0000002',
        userId: 'user-001',
        userName: 'Alex Doe',
        amount: 1000,
        utr: 'MOCK_UTR456',
        senderUpi: 'alex@upi',
        screenshotUrl: 'https://i.imgur.com/gA203wV.png',
        status: DepositStatus.Pending,
        date: new Date(),
    }
];

export const MOCK_SUPPORT_INFO: SupportInfo = {
    id: 'support-info-001',
    whatsapp: '911234567890',
    telegram: 'YourSupportTG',
    email: 'support@starsmmpanel.pro',
    instagram: 'StarsmmPanelSupport',
    youtube: 'YourSupportChannel',
    facebook: 'YourSupportPage',
    mobile: '911234567890',
    promoVideoUrl: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
};

export const MOCK_PAYMENT_INFO: PaymentInfo = {
    id: 'payment-info-001',
    qrCodeUrl: 'https://i.imgur.com/gA203wV.png',
    upiId: 'your-business-upi@okhdfcbank',
    youtubeTutorialUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    minDeposit: 30,
    maxDeposit: 100000,
};
