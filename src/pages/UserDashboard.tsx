
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Order, ServicePackage, OrderStatus, Transaction, TransactionType, Category, SupportInfo, PaymentInfo, ServiceType, DepositRequest, DepositStatus, AdminMessage, MaintenanceStatus } from '../types';
import { getServicePackages, getUserOrders, placeOrderAndCreateTransaction, getCategories, getSupportInfo, getPaymentInfo, addMockOrderToStorage, getMockOrdersFromStorage, getMockServicesFromStorage, getMockSupportInfoFromStorage, getMockPaymentInfoFromStorage, getMockUserFromStorage, getMockCategoriesFromStorage, getTransactions, getMockTransactionsFromStorage, updateUser, uploadFile, changeUserPassword, getUserDepositRequests, getMockDepositRequestsFromStorage, getUser, getUserMessages, getMockUserMessagesFromStorage, getMaintenanceStatus, getMockMaintenanceStatusFromStorage } from '../firebase/services';
import { PlusIcon, UserCircleIcon, LifebuoyIcon, MagnifyingGlassIcon, XMarkIcon, iconMap, iconColorMap, PhoneIcon, EnvelopeIcon, InstagramIcon, FacebookIcon, TelegramIcon, WhatsAppIcon, CurrencyRupeeIcon, ArrowTrendingUpIcon, GlobeAltIcon, ClockIcon, ArrowTrendingDownIcon, RocketLaunchIcon, EyeIcon, HeartIcon, UserPlusIcon, UsersIcon, AdjustmentsHorizontalIcon, CheckCircleIcon, PencilSquareIcon, DocumentArrowUpIcon, ChatBubbleBottomCenterTextIcon, PaperAirplaneIcon, ChevronDownIcon, ShareIcon, GoogleIcon, ArrowRightOnRectangleIcon, BellIcon, MegaphoneIcon, Cog6ToothIcon, ShoppingBagIcon, YouTubeIcon, TagIcon, LockClosedIcon, StarIcon } from '../components/Icons';
import OrderModal from '../components/OrderModal';
import AddFundsModal from '../components/AddFundsModal';
import BottomNavBar from '../components/BottomNavBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ThemeToggle from '../components/ThemeToggle';
import MockModeBanner from '../components/MockModeBanner';
import { SERVICE_TYPES_ORDER } from '../constants';

type ActiveTab = 'home' | 'orders' | 'history' | 'profile';

// --- Unlock Timer for Locked Buttons ---
const UnlockTimer: React.FC<{ unlockDate: number }> = ({ unlockDate }) => {
    const [timeLeft, setTimeLeft] = useState(unlockDate - Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            const remaining = unlockDate - Date.now();
            setTimeLeft(remaining);
            if (remaining <= 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [unlockDate]);

    if (timeLeft <= 0) return <span>UNLOCKED</span>;

    const hours = Math.floor((timeLeft / (1000 * 60 * 60)));
    const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);

    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return (
        <span className="flex items-center gap-1">
            <LockClosedIcon className="w-3 h-3" /> Unlock in {timeString}
        </span>
    );
};

// --- Service Card Countdown Component (Expiry) ---
const ServiceCardCountdown: React.FC<{ expiryDate: Date }> = ({ expiryDate }) => {
    const [timeLeft, setTimeLeft] = useState(expiryDate.getTime() - Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            const diff = expiryDate.getTime() - Date.now();
            setTimeLeft(diff);
            if (diff <= 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [expiryDate]);

    if (timeLeft <= 0) return <span className="text-red-500 font-bold text-[10px] uppercase bg-red-500/10 px-2 py-1 rounded">Offer Expired</span>;

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);

    let timeString = '';
    if (days > 0) timeString += `${days}d `;
    timeString += `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

    return (
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-500/20 to-orange-500/20 px-2 py-1 rounded-lg border border-red-500/30">
            <ClockIcon className="w-3 h-3 text-red-400 animate-pulse" />
            <span className="font-mono text-[10px] font-black text-red-400 tracking-wider">
                {timeString}
            </span>
        </div>
    );
};

// --- Inbox Modal ---
const InboxModal: React.FC<{ messages: AdminMessage[]; onClose: () => void }> = ({ messages, onClose }) => {
    return (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-base-100 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-base-300 overflow-hidden transform transition-all scale-100 flex flex-col max-h-[80vh]">
                <div className="p-5 border-b border-gray-200 dark:border-base-300 flex justify-between items-center bg-gray-50 dark:bg-base-200">
                    <h3 className="text-xl font-black text-gray-900 dark:text-text-primary flex items-center gap-2">
                        <BellIcon className="w-6 h-6 text-secondary" /> Inbox
                    </h3>
                    <button onClick={onClose} className="text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <EnvelopeIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p className="text-xs font-bold uppercase tracking-widest opacity-60">No messages yet</p>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className="bg-gray-100 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/5 hover:border-secondary/50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                        {msg.target === 'ALL' && <MegaphoneIcon className="w-4 h-4 text-blue-500"/>}
                                        {msg.subject}
                                    </h4>
                                    <span className="text-[10px] font-mono text-gray-500 dark:text-slate-400">{msg.createdAt.toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Order Success Popup Component ---
const OrderSuccessModal: React.FC<{
    details: { id: string; serviceDisplayId: string; service: string; link: string; quantity: number; unit: string; amount: number; date: Date; user: string; whatsapp: string; estimatedTime: string };
    onClose: () => void;
}> = ({ details, onClose }) => {
    
    const handleShare = async () => {
        const shareData = {
            title: 'Order Receipt',
            text: `Order #${details.id}\nPlan: #${details.serviceDisplayId}\nService: ${details.service}\nQty: ${details.quantity} ${details.unit}\nAmount: ₹${details.amount.toFixed(2)}\nStatus: Successful`,
            url: window.location.href
        };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch(e) {}
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(shareData.text);
            alert("Receipt copied to clipboard!");
        }
    }

    return (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-base-300 overflow-hidden transform transition-all scale-100">
                <div className="bg-green-500 p-6 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 skew-y-12 transform origin-bottom-left"></div>
                    <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-lg relative z-10 animate-bounce">
                        <CheckCircleIcon className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-wider relative z-10">Order Successful!</h3>
                    <p className="text-green-100 text-xs font-bold mt-1 relative z-10">Your order has been placed.</p>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-400">Order ID</p>
                            <p className="font-bold text-gray-800 dark:text-gray-200">#{details.id}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-gray-400">Date</p>
                            <p className="font-bold text-gray-800 dark:text-gray-200">{details.date.toLocaleDateString()}</p>
                        </div>
                        
                        <div className="col-span-2 border-t border-dashed border-gray-200 dark:border-gray-700 my-1"></div>

                        <div className="col-span-2">
                            <p className="text-[10px] uppercase font-bold text-gray-400">Service</p>
                            <p className="font-bold text-secondary">{details.service}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase mt-0.5">Plan ID: #{details.serviceDisplayId}</p>
                        </div>

                        <div className="col-span-2">
                            <p className="text-[10px] uppercase font-bold text-gray-400">Link</p>
                            <p className="font-mono text-xs text-blue-500 truncate">{details.link}</p>
                        </div>

                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-400">Quantity</p>
                            <p className="font-bold text-gray-800 dark:text-gray-200">{details.quantity} <span className="text-[10px] text-gray-500 font-bold uppercase">{details.unit}</span></p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-gray-400">Total Amount</p>
                            <p className="font-black text-lg text-gray-800 dark:text-gray-200">₹{details.amount.toFixed(2)}</p>
                        </div>

                        <div className="col-span-2 bg-gray-5 dark:bg-base-200 p-3 rounded-xl mt-2 border border-gray-100 dark:border-base-300">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Estimated Time</span>
                                <div className="flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-gray-300">
                                    <ClockIcon className="w-3 h-3 text-secondary" />
                                    <span>{details.estimatedTime} Hours</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mb-1 border-t border-gray-200 dark:border-base-300 pt-1 mt-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">User</span>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{details.user}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">WhatsApp</span>
                                <span className="text-xs font-bold text-green-500">{details.whatsapp || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-base-200/50 flex gap-3">
                    <button onClick={handleShare} className="flex-1 py-3 bg-white dark:bg-base-300 text-gray-900 dark:text-white font-bold rounded-xl shadow border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-base-200 transition-all uppercase text-xs tracking-widest active:scale-95 duration-200 flex items-center justify-center gap-2">
                        <ShareIcon className="w-4 h-4" /> Share
                    </button>
                    <button onClick={onClose} className="flex-[2] py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-lg hover:opacity-90 transition-all uppercase text-xs tracking-widest active:scale-95 duration-200">
                        Close Receipt
                    </button>
                </div>
            </div>
        </div>
    );
};

// FIX: Define MaintenancePage component
const MaintenancePage: React.FC<{
    user: User;
    supportInfo: SupportInfo | null;
    onLogout: () => void;
    message?: string;
}> = ({ user, supportInfo, onLogout, message }) => {
    const contactLinks = [
        { key: 'whatsapp', icon: WhatsAppIcon, base: 'https://wa.me/', name: 'WhatsApp' },
        { key: 'telegram', icon: TelegramIcon, base: 'https://t.me/', name: 'Telegram' },
        { key: 'instagram', icon: InstagramIcon, base: 'https://instagram.com/', name: 'Instagram' },
        { key: 'facebook', icon: FacebookIcon, base: '', name: 'Facebook' },
        { key: 'youtube', icon: YouTubeIcon, base: '', name: 'YouTube' },
        { key: 'email', icon: EnvelopeIcon, base: 'mailto:', name: 'Email' },
        { key: 'mobile', icon: PhoneIcon, base: 'tel:', name: 'Call Us' },
    ];

    const availableContacts = supportInfo ? contactLinks.filter(link => {
        const value = supportInfo[link.key as keyof SupportInfo];
        return value && typeof value === 'string' && value.trim() !== '';
    }) : [];
    
    const getHref = (link: typeof contactLinks[0], value: string) => {
        if (!link.base) return value;
        if (link.key === 'whatsapp' || link.key === 'mobile') return link.base + value.replace(/\D/g, '');
        return link.base + value;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] text-center py-12 px-4 animate-fade-in">
            <div className="w-full max-w-md mb-8">
                 <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center shadow-inner">
                    <p className="text-sm font-bold text-slate-400 leading-none mb-1">Welcome, {user.name}</p>
                    <p className="text-[10px] uppercase font-black text-slate-500 leading-none mb-2">Current Balance</p>
                    <p className="text-3xl font-black text-secondary">₹{user.walletBalance.toFixed(2)}</p>
                </div>
            </div>

            <Cog6ToothIcon className="w-16 h-16 text-secondary mb-4 animate-spin-slow" />
            <h2 className="text-3xl font-black text-white mb-2">Under Maintenance</h2>
            <p className="text-slate-400 max-w-md mx-auto mb-8">
                {message || "We're currently performing scheduled maintenance. We'll be back online shortly. Thank you for your patience."}
            </p>

            {availableContacts.length > 0 && (
                <div className="w-full max-w-md mb-8">
                    <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-widest">Contact Support</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {availableContacts.map(link => {
                            const value = supportInfo![link.key as keyof SupportInfo] as string;
                            const Icon = link.icon;
                            return (
                                <a
                                    key={link.key}
                                    href={getHref(link, value)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center justify-center gap-2 px-4 py-3 bg-base-100 border border-white/10 text-white font-bold rounded-lg text-xs hover:bg-white/20 hover:border-secondary/50 transition-all"
                                >
                                    <Icon className="w-5 h-5"/>
                                    <span>{link.name}</span>
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}

            <button onClick={onLogout} className="text-slate-400 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest">
                Logout
            </button>
        </div>
    );
};

// FIX: Define HomePage component
const HomePage: React.FC<{
    user: User;
    services: ServicePackage[];
    categories: Category[];
    userOrders: Order[];
    onAddFunds: () => void;
    handleOrderClick: (service: ServicePackage, visualId: string) => void;
}> = ({ user, services, categories, userOrders, onAddFunds, handleOrderClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedServiceType, setSelectedServiceType] = useState<string>('all');
    const [currentTime, setCurrentTime] = useState(Date.now());
    
    // Update timer every second to force re-render for countdowns
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);
    
    // UI State for Custom Modals
    const [isServiceTypeMenuOpen, setIsServiceTypeMenuOpen] = useState(false);

    // Custom sort order for the modal display
    const sortedServiceTypesForDisplay = useMemo(() => {
        // Defined strictly as per user request, REMOVED 'Limited Offers' from dropdown as requested
        return ['all', ...SERVICE_TYPES_ORDER];
    }, []);

    // 2. Filter services based on Category AND Service Type AND Search
    // MODIFIED: Also Sorts Limited Offers to Top
    const filteredServices = useMemo(() => {
        const filtered = services.filter(service => {
            const matchesCategory = selectedCategory === 'all' || service.categoryId === selectedCategory;
            
            let matchesType = true;
            if (selectedServiceType === 'Limited Offers') {
                matchesType = service.isLimitedOffer === true;
            } else {
                matchesType = selectedServiceType === 'all' || service.serviceType === selectedServiceType;
            }

            const term = searchTerm.toLowerCase().trim();
            // Search by Title OR by ID (handling optional '#' prefix in search term)
            const matchesSearch = searchTerm === '' || 
                                  service.title.toLowerCase().includes(term) ||
                                  service.id.toLowerCase().includes(term) ||
                                  service.id.toLowerCase().includes(term.replace('#', ''));

            return matchesCategory && matchesType && matchesSearch;
        });

        // SORT: Limited Offers First
        return filtered.sort((a, b) => {
            if (a.isLimitedOffer && !b.isLimitedOffer) return -1;
            if (!a.isLimitedOffer && b.isLimitedOffer) return 1;
            return 0;
        });
    }, [services, selectedCategory, selectedServiceType, searchTerm]);

    const getSelectedServiceTypeName = () => {
        if (selectedServiceType === 'all') return 'ALL SERVICES';
        if (selectedServiceType === 'Limited Offers') return 'LIMITED OFFERS';
        // Check if the name already contains 'service' to avoid duplication
        const typeName = selectedServiceType.toUpperCase();
        return typeName.includes('SERVICE') ? typeName : `${typeName} SERVICES`;
    };

    // --- COOLDOWN CHECKER ---
    // Checks if the service is currently locked due to user's previous order + cooldown time
    const getServiceLockStatus = (service: ServicePackage) => {
        if (!service.isLimitedOffer || !service.cooldownMinutes || service.cooldownMinutes <= 0) return null;

        // Find the most recent order for this service by this user
        // Order must NOT be Cancelled to trigger cooldown (Rejected orders usually reset or don't count, assuming Cancelled = Rejected)
        const lastOrder = userOrders
            .filter(o => o.serviceId === service.id && o.status !== OrderStatus.Cancelled)
            .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

        if (!lastOrder) return null;

        const lastOrderTime = lastOrder.date.getTime();
        const cooldownMs = service.cooldownMinutes * 60 * 1000;
        const unlockTime = lastOrderTime + cooldownMs;

        if (currentTime < unlockTime) {
            return unlockTime; // Return the timestamp when it unlocks
        }
        
        return null; // Not locked
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Stats Grid - Matches the user's image request */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#1e293b] p-6 rounded-3xl flex items-center gap-4 border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-colors"></div>
                     <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-500 relative z-10 border border-emerald-500/20">
                        <CurrencyRupeeIcon className="w-8 h-8" />
                     </div>
                     <div className="relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Wallet Balance</p>
                        <p className="text-3xl font-black text-emerald-500">₹{user.walletBalance.toFixed(2)}</p>
                     </div>
                </div>
                <div className="bg-[#1e293b] p-6 rounded-3xl flex items-center gap-4 border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-colors"></div>
                     <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-500 relative z-10 border border-blue-500/20">
                        <ArrowTrendingUpIcon className="w-8 h-8" />
                     </div>
                     <div className="relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Spent</p>
                        <p className="text-3xl font-black text-blue-500">₹{user.totalSpent.toFixed(2)}</p>
                     </div>
                </div>
            </div>

            {/* Blue Add Funds Button - Requested */}
            <button 
                onClick={onAddFunds} 
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 rounded-3xl font-black text-xl text-white shadow-xl shadow-blue-500/20 hover:scale-[1.01] transition-transform active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></div>
                <PlusIcon className="w-6 h-6" /> Add Balance
            </button>

            {/* Sticky Filter Section */}
            <div className="sticky top-16 z-10 bg-base-200/95 backdrop-blur-md pt-2 pb-2 -mx-4 px-4 border-b border-white/5 shadow-lg">
                <div className="space-y-3">
                    {/* Search */}
                    <div className="relative w-full">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                        <input 
                            type="text"
                            placeholder="Search services or Plan ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1e293b] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                        />
                    </div>
                    
                    {/* Category Filter (Horizontal Pills) */}
                    <div>
                        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                            <button 
                                onClick={() => setSelectedCategory('all')}
                                className={`whitespace-nowrap px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${selectedCategory === 'all' ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-[#1e293b] text-slate-400 border-white/10 hover:border-white/30 hover:text-white'}`}
                            >
                                All
                            </button>
                            {categories.map(cat => {
                                const Icon = cat.iconName ? iconMap[cat.iconName] : undefined;
                                return (
                                    <button 
                                        key={cat.id} 
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`whitespace-nowrap px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 ${selectedCategory === cat.id ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-[#1e293b] text-slate-400 border-white/10 hover:border-white/30 hover:text-white'}`}
                                    >
                                        {Icon && <Icon className={`w-4 h-4 ${selectedCategory === cat.id ? 'text-black' : (iconColorMap[cat.iconName] || 'text-slate-400')}`} />}
                                        {cat.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Service Type Filter Button */}
                     <div 
                        onClick={() => setIsServiceTypeMenuOpen(true)} 
                        className="bg-[#1e293b] p-4 rounded-2xl border border-white/5 flex justify-between items-center cursor-pointer hover:border-white/10 transition-all group active:scale-95"
                    >
                        <span className={`font-black uppercase tracking-wide text-xs truncate pr-2 ${selectedServiceType === 'Limited Offers' ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-slate-200'}`}>
                            {getSelectedServiceTypeName()}
                        </span>
                        <ChevronDownIcon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors flex-shrink-0" />
                    </div>
                </div>
            </div>

            {/* --- CUSTOM SERVICE TYPE MODAL --- */}
            {isServiceTypeMenuOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsServiceTypeMenuOpen(false)}>
                    <div className="bg-[#1e293b] w-full max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="sticky top-0 bg-[#1e293b] p-4 border-b border-white/5 flex justify-between items-center z-10">
                            <h3 className="font-black text-white text-lg">SELECT SERVICE TYPE</h3>
                            <button onClick={() => setIsServiceTypeMenuOpen(false)}><XMarkIcon className="w-6 h-6 text-slate-400"/></button>
                        </div>
                        <div className="flex flex-col">
                            {sortedServiceTypesForDisplay.map(type => {
                                const isSelected = selectedServiceType === type;
                                // const isLimited = type === 'Limited Offers'; // REMOVED
                                
                                const getDisplayName = () => {
                                    if (type === 'all') return 'ALL SERVICES';
                                    // if (isLimited) return 'LIMITED OFFERS';
                                    const upperType = type.toUpperCase();
                                    return upperType.includes('SERVICE') ? upperType : `${upperType} SERVICES`;
                                }

                                return (
                                    <button
                                        key={type}
                                        onClick={() => { setSelectedServiceType(type); setIsServiceTypeMenuOpen(false); }}
                                        className="flex items-center justify-between p-5 border-b border-white/5 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* {isLimited && <RocketLaunchIcon className="w-4 h-4 text-yellow-400 animate-pulse" />} */}
                                            <span className={`font-bold text-sm text-slate-200`}>{getDisplayName()}</span>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-secondary' : 'border-slate-600'}`}>
                                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-secondary" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}


            {/* Service Grid - Compact & Redesigned */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                {filteredServices.length === 0 ? (
                    <div className="col-span-full text-center py-10">
                        <p className="text-slate-500 text-sm font-bold">No services found for this selection.</p>
                    </div>
                ) : (
                    filteredServices.map(service => {
                        const Icon = service.icon || HeartIcon;
                        const lockedUntil = getServiceLockStatus(service);
                        const isLocked = !!lockedUntil;

                        return (
                            <div key={service.id} className={`bg-[#1e293b] rounded-2xl p-4 border shadow-lg relative group overflow-hidden transition-all duration-300 hover:-translate-y-1 ${service.isLimitedOffer ? 'border-warning/30 hover:border-warning/50' : 'border-white/5 hover:border-white/10'} ${isLocked ? 'grayscale opacity-75' : ''}`}>
                                {/* Top Section: Icon & Title */}
                                <div className="flex items-start gap-3 mb-3">
                                    {/* Glowing Logo Icon */}
                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-[#0f172a] to-[#1e293b] flex items-center justify-center flex-shrink-0 border shadow-[0_0_15px_rgba(34,197,94,0.1)] group-hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-shadow ${service.isLimitedOffer ? 'border-warning/30' : 'border-white/10'}`}>
                                        <Icon className={`w-5 h-5 ${service.isLimitedOffer ? 'text-warning' : 'text-green-500'}`} />
                                    </div>
                                    
                                    {/* Title & Badge */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white text-sm leading-tight truncate">{service.title}</h3>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className={`inline-block px-1.5 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wide border ${service.isLimitedOffer ? 'bg-warning/10 text-warning border-warning/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                {service.isLimitedOffer ? 'LIMITED OFFER' : (service.serviceType ? service.serviceType.toUpperCase() : 'SERVICE')}
                                            </span>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">#{service.id}</p>
                                            
                                            {/* COUNTDOWN TIMER FOR LIMITED OFFERS EXPIRY */}
                                            {service.isLimitedOffer && service.expiryDate && (
                                                <ServiceCardCountdown expiryDate={service.expiryDate} />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Highlighted Description Box */}
                                <div className="bg-[#0f172a]/60 rounded-lg p-2.5 mb-3 border border-white/5">
                                    <p className="text-[10px] text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">
                                        {service.description}
                                    </p>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-white/5 w-full mb-3"></div>

                                {/* Bottom Section: Price & Action */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Rate</p>
                                        <p className="text-lg font-black text-white">
                                            ₹{service.rate} <span className="text-[11px] text-slate-400 font-bold">/ {service.ratePerQuantity} {service.unitName.toUpperCase()}</span>
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => !isLocked && handleOrderClick(service, service.id)}
                                        disabled={isLocked}
                                        className={`px-5 py-2 text-white font-bold rounded-xl shadow-lg transition-all text-[10px] tracking-widest uppercase flex items-center gap-1
                                            ${isLocked 
                                                ? 'bg-gray-700 cursor-not-allowed text-gray-400 border border-gray-600' 
                                                : service.isLimitedOffer 
                                                    ? 'bg-gradient-to-r from-orange-600 to-yellow-500 hover:shadow-yellow-500/20 hover:scale-105 active:scale-95' 
                                                    : 'bg-gradient-to-r from-purple-600 to-green-500 hover:shadow-green-500/20 hover:scale-105 active:scale-95'
                                            }
                                        `}
                                    >
                                        {isLocked ? (
                                            <UnlockTimer unlockDate={lockedUntil} />
                                        ) : (
                                            'ORDER'
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

// FIX: Define OrdersPage component
const OrdersPage: React.FC<{ orders: Order[] }> = ({ orders }) => {
    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl font-black text-white">My Orders</h2>
            {orders.length === 0 ? (
                <div className="text-center py-20 bg-base-100 rounded-2xl">
                    <ShoppingBagIcon className="w-12 h-12 mx-auto text-slate-500 mb-2"/>
                    <p className="text-slate-400">You haven't placed any orders yet.</p>
                </div>
            ) : (
                <div className="bg-base-100 rounded-2xl p-4 border border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs text-slate-400 uppercase">
                                <tr>
                                    <th className="p-3">ID</th>
                                    <th className="p-3">Service</th>
                                    <th className="p-3">Link/Target</th>
                                    <th className="p-3">Amount</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {orders.map(order => (
                                    <tr key={order.id}>
                                        <td className="p-3 font-mono text-xs">#{order.displayId}</td>
                                        <td className="p-3 font-bold">{order.service}</td>
                                        <td className="p-3 text-blue-400 truncate max-w-xs">{order.targetUrl}</td>
                                        <td className="p-3 font-mono text-secondary">₹{order.amount.toFixed(2)}</td>
                                        <td className="p-3 text-slate-400">{order.date.toLocaleDateString()}</td>
                                        <td className="p-3">
                                            <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${order.status === OrderStatus.Completed ? 'bg-secondary/10 text-secondary' : order.status === OrderStatus.Pending || order.status === OrderStatus.InProgress ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// FIX: Define HistoryPage component
const HistoryPage: React.FC<{ transactions: Transaction[], depositRequests: DepositRequest[] }> = ({ transactions, depositRequests }) => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h2 className="text-2xl font-black text-white mb-4">Transaction History</h2>
                <div className="bg-base-100 rounded-2xl p-4 border border-white/5">
                    {transactions.length === 0 ? <p className="text-slate-400 text-center py-8">No transactions yet.</p> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs text-slate-400 uppercase">
                                    <tr><th className="p-3">Date</th><th className="p-3">Description</th><th className="p-3">Amount</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {transactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td className="p-3 text-slate-400">{tx.date.toLocaleDateString()}</td>
                                            <td className="p-3">{tx.description}</td>
                                            <td className={`p-3 font-mono font-bold ${tx.type === TransactionType.Credit ? 'text-green-400' : 'text-red-400'}`}>
                                                {tx.type === TransactionType.Credit ? '+' : '-'}₹{tx.amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <div>
                <h2 className="text-2xl font-black text-white mb-4">Deposit Requests</h2>
                 <div className="bg-base-100 rounded-2xl p-4 border border-white/5">
                    {depositRequests.length === 0 ? <p className="text-slate-400 text-center py-8">No deposit requests found.</p> : (
                        <div className="overflow-x-auto">
                             <table className="w-full text-left text-sm">
                                <thead className="text-xs text-slate-400 uppercase">
                                    <tr><th className="p-3">ID</th><th className="p-3">Amount</th><th className="p-3">Date</th><th className="p-3">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {depositRequests.map(req => (
                                        <tr key={req.id}>
                                            <td className="p-3 font-mono text-xs">#{req.displayId}</td>
                                            <td className="p-3 font-mono text-secondary">₹{req.amount.toFixed(2)}</td>
                                            <td className="p-3 text-slate-400">{req.date.toLocaleDateString()}</td>
                                            <td className="p-3">
                                                 <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${req.status === DepositStatus.Approved ? 'bg-secondary/10 text-secondary' : req.status === DepositStatus.Pending ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// FIX: Define ProfilePage component
const ProfilePage: React.FC<{
    user: User;
    onLogout: () => void;
    supportInfo: SupportInfo | null;
    isMockMode: boolean;
    onUserUpdate: () => void;
}> = ({ user, onLogout, supportInfo, isMockMode, onUserUpdate }) => {
    const [name, setName] = useState(user.name);
    const [whatsapp, setWhatsapp] = useState(user.whatsapp || '');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updateMessage, setUpdateMessage] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');

    const handleProfileUpdate = async () => {
        if(isMockMode) return alert("Cannot update profile in mock mode.");
        setUpdateMessage('Updating...');
        try {
            await updateUser(user.id, { name, whatsapp });
            setUpdateMessage('Profile updated successfully!');
            onUserUpdate();
            setTimeout(() => setUpdateMessage(''), 3000);
        } catch (error) {
            setUpdateMessage('Failed to update profile.');
            setTimeout(() => setUpdateMessage(''), 3000);
        }
    };
    
    const handlePasswordChange = async () => {
        if(isMockMode) return alert("Cannot change password in mock mode.");
        setPasswordMessage('');
        
        // Strict Check for Old Password
        if (!oldPassword) {
            setPasswordMessage("Please enter your current password.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage("New passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMessage("Password must be at least 6 characters.");
            return;
        }
        
        setPasswordMessage('Verifying & Updating...');
        try {
            // This function handles re-authentication with oldPassword internally
            await changeUserPassword(oldPassword, newPassword);
            setPasswordMessage('Password changed successfully!');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPasswordMessage(''), 3000);
        } catch (error: any) {
            console.error("Password Change Error:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setPasswordMessage('Current password is incorrect.');
            } else {
                setPasswordMessage(error.message || 'Failed to change password. Try again.');
            }
            setTimeout(() => setPasswordMessage(''), 3000);
        }
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto animate-fade-in">
            {/* Profile Header */}
            <div className="flex flex-col items-center text-center">
                <img src={user.avatarUrl} alt="avatar" className="w-24 h-24 rounded-full border-4 border-primary shadow-lg mb-4"/>
                <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                <p className="text-slate-400">{user.email}</p>
                 <div className="mt-2 text-xs font-mono bg-base-100 px-3 py-1 rounded-full text-slate-300 border border-white/10">User ID: #{user.displayId || user.id.substring(0,6)}</div>
            </div>

            {/* Profile Edit Form */}
            <div className="bg-base-100 p-6 rounded-2xl border border-white/5 space-y-4">
                 <h3 className="font-bold text-white">Edit Profile</h3>
                 <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full bg-base-200 p-2 rounded-lg text-sm" />
                 <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="WhatsApp Number" className="w-full bg-base-200 p-2 rounded-lg text-sm" />
                 <button onClick={handleProfileUpdate} className="w-full py-2 bg-secondary text-white font-bold rounded-lg text-sm">Update Profile</button>
                 {updateMessage && <p className="text-xs text-center text-green-400">{updateMessage}</p>}
            </div>

            {/* Password Change Form - Conditional Rendering */}
            <div className="bg-base-100 p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <LockClosedIcon className="w-5 h-5 text-secondary" /> Security Settings
                </h3>
                
                {user.password ? (
                    // MANUAL USER: Show Password Change Form
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase ml-1">Current Password</label>
                            <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="••••••••" className="w-full bg-base-200 p-3 rounded-xl text-sm border border-white/5 focus:border-secondary outline-none transition-colors" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-bold uppercase ml-1">New Password</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" className="w-full bg-base-200 p-3 rounded-xl text-sm border border-white/5 focus:border-secondary outline-none transition-colors" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-bold uppercase ml-1">Confirm</label>
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm New" className="w-full bg-base-200 p-3 rounded-xl text-sm border border-white/5 focus:border-secondary outline-none transition-colors" />
                            </div>
                        </div>
                        
                        <button onClick={handlePasswordChange} className="w-full py-3 bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary hover:text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-lg">Change Password</button>
                        
                        {passwordMessage && (
                            <p className={`text-xs text-center font-bold ${passwordMessage.includes('successfully') ? 'text-green-400' : 'text-red-400 animate-pulse'}`}>
                                {passwordMessage}
                            </p>
                        )}
                    </div>
                ) : (
                    // GOOGLE USER: Show Info Box
                    <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex items-start gap-3">
                        <div className="bg-white p-1.5 rounded-full mt-0.5">
                            <GoogleIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Google Account Linked</p>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                You signed in securely via Google. You do not need to manage a password for this account.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Support Section */}
            {supportInfo && (
                 <div className="bg-base-100 p-6 rounded-2xl border border-white/5">
                     <h3 className="font-bold text-white mb-4">Support Channels</h3>
                     <div className="grid grid-cols-2 gap-3 text-sm">
                         <a href={`https://wa.me/${supportInfo.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10"><WhatsAppIcon className="w-5 h-5 text-green-400"/> WhatsApp</a>
                         <a href={`https://t.me/${supportInfo.telegram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10"><TelegramIcon className="w-5 h-5 text-sky-400"/> Telegram</a>
                         <a href={`mailto:${supportInfo.email}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10"><EnvelopeIcon className="w-5 h-5 text-slate-400"/> Email</a>
                         {supportInfo.mobile && <a href={`tel:${supportInfo.mobile}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10"><PhoneIcon className="w-5 h-5 text-slate-400"/> Call Us</a>}
                     </div>
                 </div>
            )}
            
            <button onClick={onLogout} className="w-full py-3 bg-red-600/20 text-red-400 font-bold rounded-lg hover:bg-red-600/40 transition-colors uppercase text-xs tracking-widest">Logout Account</button>
        </div>
    );
};


const UserDashboard: React.FC<{ user: User; onLogout: () => void; onUserUpdate: (user: User) => void; theme: string; onToggleTheme: () => void; setProfileError: (error: string) => void; }> = ({ user, onLogout, onUserUpdate, theme, onToggleTheme, setProfileError }) => {
    const [currentUser, setCurrentUser] = useState<User>(user);
    const [services, setServices] = useState<ServicePackage[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [userOrders, setUserOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
    const [supportInfo, setSupportInfo] = useState<SupportInfo | null>(null);
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
    const [inboxMessages, setInboxMessages] = useState<AdminMessage[]>([]);
    const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOrderModalOpen, setOrderModalOpen] = useState(false);
    const [isFundsModalOpen, setFundsModalOpen] = useState(false);
    const [isInboxOpen, setInboxOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<ServicePackage | null>(null);
    const [selectedVisualId, setSelectedVisualId] = useState<string>('');
    const [isMockMode, setIsMockMode] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>('home');
    
    const [lastOrderDetails, setLastOrderDetails] = useState<{ id: string; serviceDisplayId: string; service: string; link: string; quantity: number; unit: string; amount: number; date: Date; user: string; whatsapp: string; estimatedTime: string } | null>(null);

    const fetchData = useCallback(async (forceRefresh = false) => {
        if (services.length === 0 || forceRefresh) setLoading(true);
    
        // Separated logic for Mock Mode
        if (isMockMode) {
            try {
                const updatedUser = getMockUserFromStorage(currentUser.id);
                if (updatedUser) setCurrentUser(updatedUser);
                setMaintenanceStatus(getMockMaintenanceStatusFromStorage());
                setUserOrders(getMockOrdersFromStorage().filter(o => o.userId === currentUser.id));
                setTransactions(getMockTransactionsFromStorage().filter(t => t.userId === currentUser.id));
                setDepositRequests(getMockDepositRequestsFromStorage().filter(d => d.userId === currentUser.id));
                setServices(getMockServicesFromStorage());
                setCategories(getMockCategoriesFromStorage());
                setSupportInfo(getMockSupportInfoFromStorage());
                setPaymentInfo(getMockPaymentInfoFromStorage());
                setInboxMessages(getMockUserMessagesFromStorage(currentUser.id));
            } catch (e) {
                console.error("Error fetching mock data on refresh:", e);
            } finally {
                setLoading(false);
            }
            return;
        }
    
        // Live Mode logic
        try {
            const [fetchedServices, fetchedOrders, fetchedCategories, fetchedSupportInfo, fetchedPaymentInfo, freshUser, fetchedTransactions, fetchedDeposits, fetchedMessages, fetchedMaintenance] = await Promise.all([
                getServicePackages(), 
                getUserOrders(currentUser.id), 
                getCategories(), 
                getSupportInfo(), 
                getPaymentInfo(), 
                getUser(currentUser.id),
                getTransactions(currentUser.id), 
                getUserDepositRequests(currentUser.id),
                getUserMessages(currentUser.id),
                getMaintenanceStatus(),
            ]);
            
            setServices(fetchedServices);
            setUserOrders(fetchedOrders);
            setTransactions(fetchedTransactions);
            setDepositRequests(fetchedDeposits);
            setCategories(fetchedCategories);
            setSupportInfo(fetchedSupportInfo);
            setPaymentInfo(fetchedPaymentInfo);
            setInboxMessages(fetchedMessages);
            setMaintenanceStatus(fetchedMaintenance);
            
            if (freshUser) {
                if (freshUser.walletBalance !== currentUser.walletBalance || freshUser.totalSpent !== currentUser.totalSpent || freshUser.status !== currentUser.status) {
                    setCurrentUser(freshUser);
                    onUserUpdate(freshUser);
                }
            } else {
                console.warn("Could not fetch fresh user data, using cached user.");
            }
    
            setIsMockMode(false);
        } catch (error: any) {
            console.error("Dashboard data fetch failed:", error);
            if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
                setProfileError("Firestore permission denied. Please configure security rules.");
                return;
            }
    
            console.warn("Falling back to mock data for User Dashboard.");
            setMaintenanceStatus(getMockMaintenanceStatusFromStorage());
            setServices(getMockServicesFromStorage());
            setCategories(getMockCategoriesFromStorage());
            setUserOrders(getMockOrdersFromStorage().filter(o => o.userId === currentUser.id));
            setTransactions(getMockTransactionsFromStorage().filter(t => t.userId === currentUser.id));
            setDepositRequests(getMockDepositRequestsFromStorage().filter(d => d.userId === currentUser.id));
            setSupportInfo(getMockSupportInfoFromStorage());
            setPaymentInfo(getMockPaymentInfoFromStorage());
            setInboxMessages(getMockUserMessagesFromStorage(currentUser.id));
            const updatedUser = getMockUserFromStorage(currentUser.id);
            if(updatedUser) setCurrentUser(updatedUser);
            setIsMockMode(true);
        } finally {
            setLoading(false);
        }
    }, [currentUser.id, currentUser.walletBalance, currentUser.totalSpent, currentUser.status, isMockMode, onUserUpdate, setProfileError, services.length]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    useEffect(() => { 
        if(user.id !== currentUser.id) setCurrentUser(user); 
    }, [user, currentUser.id]);
    
    const handlePlaceOrder = async (orderData: { amount: number; quantity: number; target: string; couponCode?: string }) => {
        if (!selectedService) return;
        
        const commonOrderData = {
            userId: currentUser.id,
            userName: currentUser.name,
            userWhatsapp: currentUser.whatsapp || '',
            service: selectedService.title,
            serviceId: selectedService.id,
            serviceDisplayId: selectedVisualId,
            targetUrl: orderData.target,
            quantity: orderData.quantity,
            unit: selectedService.unitName,
            amount: orderData.amount,
            couponCode: orderData.couponCode,
            isLimitedOffer: selectedService.isLimitedOffer,
        };

        let estimatedTime = 'As per description';
        if (selectedService.minCompletionTime && selectedService.maxCompletionTime) {
            estimatedTime = `${selectedService.minCompletionTime} - ${selectedService.maxCompletionTime}`;
        } else if (selectedService.minCompletionTime) {
            estimatedTime = selectedService.minCompletionTime;
        } else if (selectedService.maxCompletionTime) {
            estimatedTime = selectedService.maxCompletionTime;
        }

        if (isMockMode) {
            const displayId = addMockOrderToStorage({
                id: `mock-order-${Date.now()}`,
                ...commonOrderData,
                date: new Date(),
                status: OrderStatus.Pending,
            }); 
            const updatedUser = getMockUserFromStorage(currentUser.id);
            if (updatedUser) {
                setCurrentUser(updatedUser);
                onUserUpdate(updatedUser);
            }
            fetchData(true);
            setOrderModalOpen(false);
            
            setLastOrderDetails({
                id: displayId,
                serviceDisplayId: selectedVisualId,
                service: selectedService.title,
                link: orderData.target,
                quantity: orderData.quantity,
                unit: selectedService.unitName,
                amount: orderData.amount,
                date: new Date(),
                user: currentUser.name,
                whatsapp: currentUser.whatsapp || 'N/A',
                estimatedTime: estimatedTime
            });
            return;
        }

        try {
            const displayId = await placeOrderAndCreateTransaction(
                commonOrderData, 
                { userId: currentUser.id, type: TransactionType.Debit, amount: orderData.amount, description: `Order for ${selectedService.title}`, status: OrderStatus.Completed }
            );
            
            await fetchData(true);
            setOrderModalOpen(false);

            setLastOrderDetails({
                id: displayId,
                serviceDisplayId: selectedVisualId,
                service: selectedService.title,
                link: orderData.target,
                quantity: orderData.quantity,
                unit: selectedService.unitName,
                amount: orderData.amount,
                date: new Date(),
                user: currentUser.name,
                whatsapp: currentUser.whatsapp || 'N/A',
                estimatedTime: estimatedTime
            });

        } catch (error: any) {
            console.error("Order Failure:", error);
            if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
                alert("Order Failed: Database permission denied. Please update Firebase Rules (see main screen).");
                setProfileError("Permission Error: Please update rules to allow order creation.");
            } else {
                alert(`Order failed: ${error.message || 'Check your balance and try again.'}`);
            }
        }
    };

    const handleFundsRequested = (newRequest: DepositRequest) => {
        // Optimistically add the new request to the top of the list for an instant UI update
        setDepositRequests(prevRequests => [newRequest, ...prevRequests.filter(r => r.id !== newRequest.id)]);
        // Also trigger a full refresh to catch any other potential changes and ensure consistency.
        fetchData(true);
    };

    const renderContent = () => {
        if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
        
        if (maintenanceStatus?.isEnabled) {
            return <MaintenancePage user={currentUser} supportInfo={supportInfo} onLogout={onLogout} message={maintenanceStatus.message} />;
        }

        switch(activeTab) {
            case 'home':
                return <HomePage user={currentUser} services={services} categories={categories} userOrders={userOrders} onAddFunds={() => setFundsModalOpen(true)} handleOrderClick={(s, vid) => { setSelectedService(s); setSelectedVisualId(vid); setOrderModalOpen(true); }} />;
            case 'orders':
                return <OrdersPage orders={userOrders} />;
            case 'history':
                return <HistoryPage transactions={transactions} depositRequests={depositRequests} />;
            case 'profile':
                return <ProfilePage user={currentUser} onLogout={onLogout} supportInfo={supportInfo} isMockMode={isMockMode} onUserUpdate={() => fetchData(true)} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-base-200 flex flex-col text-slate-100 transition-all duration-300">
            {lastOrderDetails && <OrderSuccessModal details={lastOrderDetails} onClose={() => setLastOrderDetails(null)} />}
            {isOrderModalOpen && selectedService && <OrderModal service={selectedService} visualId={selectedVisualId} onClose={() => setOrderModalOpen(false)} onOrder={handlePlaceOrder} walletBalance={currentUser.walletBalance} />}
            {isFundsModalOpen && <AddFundsModal user={currentUser} isMockMode={isMockMode} onClose={() => setFundsModalOpen(false)} onFundsRequested={handleFundsRequested} paymentInfo={paymentInfo} />}
            {isInboxOpen && <InboxModal messages={inboxMessages} onClose={() => setInboxOpen(false)} />}
            
            <header className="bg-base-100/95 backdrop-blur-xl sticky top-0 z-20 border-b border-white/5 shadow-2xl transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                    
                    {/* CODED LOGO - No Image File Needed */}
                    <div className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform" onClick={() => setActiveTab('home')}>
                        <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                            <StarIcon className="w-6 h-6 text-pink-500" solid />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-black text-lg leading-none tracking-tighter text-white">STAR</span>
                            <span className="font-bold text-[10px] leading-none tracking-widest text-pink-500 uppercase">SMM PANEL</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                        
                        <button onClick={() => setInboxOpen(true)} className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
                            <BellIcon className="w-5 h-5 text-gray-400 hover:text-white" />
                            {inboxMessages.length > 0 && (
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-base-100 animate-pulse"></span>
                            )}
                        </button>

                        <div className="bg-white/5 px-4 py-1.5 rounded-xl border border-white/10 text-right shadow-inner hover:bg-white/10 transition-colors duration-300">
                            <p className="text-[9px] uppercase font-black text-slate-500 leading-none mb-1">My Balance</p>
                            <p className="text-sm font-black text-secondary">₹{currentUser.walletBalance.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-7xl mx-auto w-full py-8 px-4 pb-28">
                {isMockMode && <MockModeBanner />}
                {renderContent()}
            </main>
            
            {!(maintenanceStatus?.isEnabled) && <BottomNavBar user={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} />}
        </div>
    );
};

export default UserDashboard;
