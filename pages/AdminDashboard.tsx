
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Order, OrderStatus, ServicePackage, DepositRequest, DepositStatus, Category, SupportInfo, PaymentInfo, Coupon, CouponType, AdminMessage, EmailConfig, MaintenanceStatus, TelegramConfig, AdminSecurityConfig } from '../types';
// FIX: Added 'getMockSupportInfoFromStorage' to the import list to resolve 'Cannot find name' errors.
import { 
    getOrders, getServicePackages, updateServicePackage, getDepositRequests, processDepositRequest, 
    getCategories, getSupportInfo, updateSupportInfo, getAllUsers, updateUser, addCategory, deleteCategory, 
    getDashboardStats, adjustUserWalletBalance, addServicePackage, getMockOrdersFromStorage,
    getMockServicesFromStorage, getMockDepositRequestsFromStorage, getMockCategoriesFromStorage,
    updateMockOrderInStorage, seedDatabase, migrateDataIds, deleteServicePackage, deleteMockServiceFromStorage, deleteMockCategoryFromStorage,
    getCoupons, createCoupon, deleteCoupon, getMockCouponsFromStorage, createMockCoupon, deleteMockCoupon, getPaymentInfo, updatePaymentInfo,
    updateMockDepositRequestInStorage, adjustMockUserWalletBalance, getMockUsersFromStorage,
    getAdminMessages, sendAdminMessage, deleteAdminMessage, getMockMessagesFromStorage, sendMockMessage, deleteMockMessage,
    getEmailConfig, updateEmailConfig, getMaintenanceStatus, updateMaintenanceStatus, getMockMaintenanceStatusFromStorage, saveMockMaintenanceStatusToStorage,
    getTelegramConfig, updateTelegramConfig, getAdminSecurity, updateAdminSecurity, getMockAdminSecurityFromStorage, saveMockAdminSecurityToStorage,
    updateMockServiceInStorage, addMockServiceToStorage, getMockSupportInfoFromStorage, saveMockSupportInfoToStorage
} from '../firebase/services';
import { MOCK_USERS } from '../constants';
import { ChartBarIcon, UsersIcon, CurrencyRupeeIcon, ArrowRightOnRectangleIcon, PencilSquareIcon, PlusIcon, MagnifyingGlassIcon, XMarkIcon, ShoppingBagIcon, Cog6ToothIcon, iconMap, iconColorMap, ClipboardDocumentListIcon, Bars3Icon, TrashIcon, TagIcon, ClockIcon, ShieldExclamationIcon, ArrowTopRightOnSquareIcon, PaperAirplaneIcon, DocumentArrowUpIcon, CheckCircleIcon, RocketLaunchIcon, MegaphoneIcon, CalendarIcon, ArrowTrendingDownIcon, EnvelopeIcon, ChatBubbleBottomCenterTextIcon, LockClosedIcon, UserPlusIcon, HeartIcon, PlayCircleIcon, VideoCameraIcon, ArrowTrendingUpIcon, EyeIcon, EyeSlashIcon, LifebuoyIcon,
    // Social
    LinkedInIcon, SpotifyIcon, DiscordIcon, TwitchIcon, RedditIcon, PinterestIcon, ThreadsIcon, TwitterIcon, InstagramIcon, YouTubeIcon, FacebookIcon, TelegramIcon, TikTokIcon, SnapchatIcon,
    // New Additions
    XingIcon, IndeedIcon, LikeeIcon, KwaiIcon, TrillerIcon, ChingariIcon, MojIcon, SignalIcon, MessengerIcon, ViberIcon, WeChatIcon, LineIcon, KakaoTalkIcon, ShareChatIcon, KooIcon, JoshIcon, RoposoIcon, MitronIcon, KickIcon, SteamIcon, OmletArcadeIcon, FlickrIcon, BehanceIcon, DribbbleIcon, QuoraIcon, TumblrIcon, MediumIcon, TinderIcon, BumbleIcon, HingeIcon, OkCupidIcon
} from '../components/Icons';
import AdminOrderDetailsModal from '../components/AdminOrderDetailsModal';
import PlanEditorModal from '../components/PlanEditorModal';
import DepositRequestModal from '../components/DepositRequestModal';
import UserEditModal from '../components/UserEditModal';
import LoadingSpinner from '../components/LoadingSpinner';
import ThemeToggle from '../components/ThemeToggle';
import MockModeBanner from '../components/MockModeBanner';

type AdminTab = 'dashboard' | 'users' | 'standard_orders' | 'limited_orders' | 'services' | 'deposits' | 'offers' | 'messages' | 'settings';

const AdminDashboard: React.FC<{ user: User; onLogout: () => void; theme: string; onToggleTheme: () => void; }> = ({ user, onLogout, theme, onToggleTheme }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [users, setUsers] = useState<User[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [services, setServices] = useState<ServicePackage[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [messages, setMessages] = useState<AdminMessage[]>([]);
    const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null);
    const [supportInfo, setSupportInfo] = useState<SupportInfo | null>(null);
    const [stats, setStats] = useState({ 
        totalRevenue: 0, totalOrders: 0, todaysRevenue: 0, todaysOrders: 0, monthlyRevenue: 0, 
        pendingOrders: 0, completedOrders: 0, 
        limitedOrders: 0, limitedPending: 0, limitedCompleted: 0, limitedRejected: 0,
        limitedRevenue: 0, limitedMonthlyRevenue: 0 
    });
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMockMode, setIsMockMode] = useState(false);
    
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<ServicePackage | null | undefined>(undefined);
    const [selectedDepositRequest, setSelectedDepositRequest] = useState<DepositRequest | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [showManualDepositModal, setShowManualDepositModal] = useState(false);
    
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'coupon' | 'plan' | 'category' | 'message'; id: string; title: string } | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [fetchedUsers, fetchedOrders, fetchedServices, fetchedDeposits, fetchedCategories, fetchedCoupons, fetchedMaintenance, fetchedSupportInfo] = await Promise.all([
                getAllUsers(), 
                getOrders(), 
                getServicePackages(), 
                getDepositRequests(), 
                getCategories(), 
                getCoupons(),
                getMaintenanceStatus(),
                getSupportInfo()
            ]);

            let fetchedMessages: AdminMessage[] = [];
            try { fetchedMessages = await getAdminMessages(); } catch (e) {}

            setUsers(fetchedUsers);
            setOrders(fetchedOrders);
            setServices(fetchedServices);
            setDepositRequests(fetchedDeposits);
            setCategories(fetchedCategories);
            setCoupons(fetchedCoupons);
            setMessages(fetchedMessages);
            setMaintenanceStatus(fetchedMaintenance);
            setSupportInfo(fetchedSupportInfo);
            
            const calculatedStats = await getDashboardStats(fetchedOrders);
            setStats(calculatedStats);
            setIsMockMode(false);

        } catch (error: any) {
            console.error("Failed to fetch critical admin data:", error);
            if (error.code === 'permission-denied') setShowPermissionModal(true);

            console.warn("Falling back to mock data for Admin Dashboard.");
            setIsMockMode(true);
            
            setUsers(getMockUsersFromStorage());
            const mockOrders = getMockOrdersFromStorage();
            setOrders(mockOrders);
            setServices(getMockServicesFromStorage());
            setDepositRequests(getMockDepositRequestsFromStorage());
            setCategories(getMockCategoriesFromStorage());
            setCoupons(getMockCouponsFromStorage());
            setMessages(getMockMessagesFromStorage());
            setMaintenanceStatus(getMockMaintenanceStatusFromStorage());
            setSupportInfo(getMockSupportInfoFromStorage());
            const calculatedStats = await getDashboardStats(mockOrders);
            setStats(calculatedStats);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleStatusUpdated = (orderId?: string, newStatus?: OrderStatus) => {
        if (isMockMode && orderId && newStatus) {
            const orderToUpdate = orders.find(o => o.id === orderId);
            if (orderToUpdate) {
                updateMockOrderInStorage({ ...orderToUpdate, status: newStatus });
            }
        }
        fetchData(); 
    };

    const handleProcessDeposit = async (req: DepositRequest, status: DepositStatus.Approved | DepositStatus.Rejected) => {
        if (isMockMode) {
            try {
                updateMockDepositRequestInStorage({ ...req, status });
                alert(`Mock Mode: Deposit request ${status} successfully.`);
                fetchData();
                setSelectedDepositRequest(null);
            } catch (e: any) {
                alert("Mock update failed: " + e.message);
            }
            return;
        }

        try {
            await processDepositRequest(req, status);
            alert(`Deposit request ${status} successfully!`);
            fetchData();
            setSelectedDepositRequest(null);
        } catch (error: any) {
            console.error("Failed to process deposit:", error);
            if (error.code === 'permission-denied') setShowPermissionModal(true);
            else alert(`Error processing request: ${error.message}`);
        }
    };

    const handleSaveUser = async (userId: string, data: Partial<User>, balanceAdjustment: number, adjustmentReason: string) => {
        if(isMockMode) {
            alert("Cannot modify users in offline/mock mode.");
            setSelectedUser(null);
            return;
        }
        try {
            if(Object.keys(data).length > 0) await updateUser(userId, data);
            if(balanceAdjustment !== 0 && adjustmentReason) {
                await adjustUserWalletBalance(userId, balanceAdjustment, adjustmentReason);
            }
            await fetchData();
            setSelectedUser(null);
        } catch (e: any) {
            if (e.code === 'permission-denied') setShowPermissionModal(true);
            else alert("Failed to update user: " + e.message);
        }
    }
    
    const handleSavePlan = async (plan: ServicePackage) => {
        if(isMockMode) {
            if (plan.id && !plan.id.startsWith('new-')) {
                 updateMockServiceInStorage(plan);
            } else {
                 addMockServiceToStorage(plan);
            }
            fetchData();
            setSelectedPlan(undefined);
            alert("Plan saved in Mock Mode!");
            return;
        }

        try {
            const existingService = services.find(s => s.id === plan.id);
            if (existingService && !plan.id.startsWith('new-')) {
                 await updateServicePackage(plan);
            } else {
                await addServicePackage(plan);
            }
            fetchData();
            setSelectedPlan(undefined);
        } catch (error: any) {
            console.error("Failed to save plan:", error);
            if (error.code === 'permission-denied') setShowPermissionModal(true);
            else alert("An error occurred while saving the plan.");
        }
    };

    const initiateDeletePlan = (id: string, title: string) => {
        setDeleteConfirmation({ type: 'plan', id, title: `Service Plan '${title}'` });
    };

    const initiateDeleteCategory = (id: string, name: string) => {
        setDeleteConfirmation({ type: 'category', id, title: `Category '${name}'` });
    };

    const initiateDeleteCoupon = (id: string, code: string) => {
        setDeleteConfirmation({ type: 'coupon', id, title: `Coupon (${code})` });
    };

    const initiateDeleteMessage = (id: string) => {
        setDeleteConfirmation({ type: 'message', id, title: 'Message' });
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirmation) return;
        const { type, id } = deleteConfirmation;
        setDeleteConfirmation(null);

        try {
            if (type === 'coupon') {
                if (isMockMode) {
                    deleteMockCoupon(id);
                } else {
                    await deleteCoupon(id);
                }
            } else if (type === 'plan') {
                if (isMockMode) {
                    deleteMockServiceFromStorage(id);
                } else {
                    await deleteServicePackage(id);
                }
            } else if (type === 'category') {
                if(isMockMode) {
                    deleteMockCategoryFromStorage(id);
                } else {
                    await deleteCategory(id); 
                }
            } else if (type === 'message') {
                if(isMockMode) {
                    deleteMockMessage(id);
                } else {
                    await deleteAdminMessage(id);
                }
            }
            fetchData();
        } catch (error: any) {
            console.error("Backend delete failed:", error);
            if (error.code === 'permission-denied') setShowPermissionModal(true);
            else alert(`Failed to delete: ${error.message}`);
        }
    };

    const handleCreateCoupon = async (code: string, percent: number, limit: number, expiresAt: Date | null, isAutoApply: boolean, type: CouponType) => {
        try {
            if (isMockMode) {
                createMockCoupon(code, percent, limit, expiresAt, isAutoApply, type);
            } else {
                await createCoupon(code, percent, limit, expiresAt, isAutoApply, type);
            }
            await fetchData();
        } catch (e: any) {
            console.error("Failed to create coupon", e);
            if (e.code === 'permission-denied') setShowPermissionModal(true);
            else alert(`Failed to create coupon: ${e.message || 'Unknown error'}`);
        }
    };

    const handleSendMessage = async (msgData: any) => {
        try {
            if(isMockMode) {
                sendMockMessage(msgData);
            } else {
                await sendAdminMessage(msgData);
            }
            alert(msgData.type === 'AUTO' ? 'Message Scheduled Successfully' : 'Message Sent Successfully');
            await fetchData();
        } catch (e: any) {
            console.error("Message send failed:", e);
            if (e.message && e.message.includes('EmailJS Error')) {
                const specificError = e.message.replace('EmailJS Error: ', '');
                alert(`Email Failed: ${specificError}\n\nPlease go to Settings -> Email Server Settings and double-check your credentials.`);
            } else if (e.code === 'permission-denied') {
                setShowPermissionModal(true);
            } else {
                alert("Failed to send message: " + e.message);
            }
        }
    };

    const handleManualDeposit = async (userId: string, amount: number, reason: string) => {
        const description = reason || "Manual Admin Adjustment";
        if(isMockMode) {
             adjustMockUserWalletBalance(userId, amount, description);
             setTimeout(async () => {
                 await fetchData();
                 setShowManualDepositModal(false);
                 alert("Mock Balance Adjusted Successfully!");
             }, 200);
             return;
        }
        try {
            await adjustUserWalletBalance(userId, amount, description);
            await fetchData();
            setShowManualDepositModal(false);
            alert("Wallet balance updated successfully!");
        } catch (e: any) {
            if(e.code === 'permission-denied') setShowPermissionModal(true);
            else alert("Failed to update wallet: " + e.message);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#0f172a] text-slate-100 font-sans">
            {deleteConfirmation && <ConfirmationModal title={deleteConfirmation.title} message="Are you sure? This action cannot be undone." onConfirm={handleConfirmDelete} onCancel={() => setDeleteConfirmation(null)} />}
            {showPermissionModal && <PermissionErrorModal onClose={() => setShowPermissionModal(false)} />}
            {showManualDepositModal && <ManualDepositModal users={users} onClose={() => setShowManualDepositModal(false)} onConfirm={handleManualDeposit} />}
            {selectedOrder && <AdminOrderDetailsModal order={selectedOrder} isMockMode={isMockMode} onClose={() => setSelectedOrder(null)} onStatusUpdated={handleStatusUpdated} />}
            {(selectedPlan !== undefined) && <PlanEditorModal plan={selectedPlan} categories={categories} onClose={() => setSelectedPlan(undefined)} onSave={handleSavePlan} />}
            {selectedDepositRequest && <DepositRequestModal request={selectedDepositRequest} onClose={() => setSelectedDepositRequest(null)} onProcess={handleProcessDeposit} />}
            {selectedUser && <UserEditModal user={selectedUser} onClose={() => setSelectedUser(null)} onSave={handleSaveUser} />}
            
            <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <main className="flex-1 p-4 lg:p-8 overflow-y-auto h-screen relative">
                <div className="lg:hidden mb-4 flex items-center gap-4">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white bg-white/10 rounded-lg hover:bg-white/20 transition-colors"><Bars3Icon className="w-6 h-6" /></button>
                    <h1 className="text-xl font-black brand-glow">ADMIN PANEL</h1>
                </div>

                {isMockMode && <MockModeBanner />}
                
                {loading ? (
                    <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>
                ) : (
                    <>
                         <div className="flex justify-between items-center mb-8">
                            <h1 className="hidden lg:block text-3xl font-black text-white tracking-tight brand-glow">
                                {activeTab.replace('_', ' ').toUpperCase()}
                            </h1>
                            <div className="flex items-center gap-4">
                                <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                                <div className="text-right hidden sm:block"><p className="text-xs font-bold text-slate-400">Welcome,</p><p className="text-sm font-black text-white">{user.name}</p></div>
                                <img src={user.avatarUrl} alt="Admin" className="w-10 h-10 rounded-full border-2 border-primary" />
                            </div>
                        </div>

                        {maintenanceStatus?.isEnabled && (
                            <div className="bg-warning/20 border-l-4 border-warning text-white p-4 mb-6 rounded-r-lg shadow-lg animate-fade-in" role="alert">
                                <div className="flex items-center gap-3">
                                    <ShieldExclamationIcon className="w-6 h-6 text-warning animate-pulse"/>
                                    <div>
                                        <p className="font-black uppercase tracking-wider text-sm">Maintenance Mode is ON</p>
                                        <p className="text-xs text-slate-300">The user panel is currently disabled for all users.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="animate-fade-in">
                            {activeTab === 'dashboard' && <DashboardContent stats={stats} orders={orders} users={users} />}
                            {activeTab === 'users' && <UsersContent users={users} onEditUser={setSelectedUser} />}
                            {activeTab === 'standard_orders' && <OrdersContent title="Standard Orders" orders={orders.filter(o => !o.isLimitedOffer)} onSelectOrder={setSelectedOrder} />}
                            {activeTab === 'limited_orders' && <LimitedOrdersContent orders={orders} stats={stats} onSelectOrder={setSelectedOrder} />}
                            {activeTab === 'services' && <ServicesContent services={services} categories={categories} onEditPlan={setSelectedPlan} onCreatePlan={() => setSelectedPlan(null)} onDeletePlan={initiateDeletePlan} />}
                            {activeTab === 'deposits' && <DepositsContent requests={depositRequests} onSelectRequest={setSelectedDepositRequest} onOpenManualDeposit={() => setShowManualDepositModal(true)} />}
                            {activeTab === 'offers' && <OffersContent coupons={coupons} onCreate={handleCreateCoupon} onDelete={initiateDeleteCoupon} />}
                            {activeTab === 'messages' && <MessagesContent users={users} messages={messages} onSendMessage={handleSendMessage} onDeleteMessage={initiateDeleteMessage} />}
                            {activeTab === 'settings' && <SettingsContent maintenanceStatus={maintenanceStatus} categories={categories} supportInfo={supportInfo} onDeleteCategory={initiateDeleteCategory} onDataChange={fetchData} isMockMode={isMockMode} setShowPermissionModal={setShowPermissionModal} />}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

const ConfirmationModal: React.FC<{title: string, message: string, onConfirm: () => void, onCancel: () => void}> = ({title, message, onConfirm, onCancel}) => (
    <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in">
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm border border-white/10 p-6 transform transition-all scale-100">
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-400 mb-6">{message}</p>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-bold text-xs uppercase">Cancel</button>
                <button onClick={onConfirm} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold text-xs uppercase">Confirm</button>
            </div>
        </div>
    </div>
);

const PermissionErrorModal: React.FC<{onClose: () => void}> = ({onClose}) => (
    <div className="fixed inset-0 bg-black/80 z-[80] flex justify-center items-center p-4 backdrop-blur-md">
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg border border-red-500/30 p-8 text-center relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
            <ShieldExclamationIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Permission Denied</h2>
            <p className="text-gray-400 mb-6">Database access blocked. Please check your Firestore Security Rules in the Firebase Console.</p>
            <button onClick={onClose} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold uppercase tracking-wider text-sm hover:bg-red-700 transition-colors">Dismiss</button>
        </div>
    </div>
);

const AdminSidebar: React.FC<{activeTab: AdminTab, setActiveTab: (t: AdminTab) => void, onLogout: () => void, isOpen: boolean, setIsOpen: (o: boolean) => void}> = ({activeTab, setActiveTab, onLogout, isOpen, setIsOpen}) => {
    const NavItem = ({ id, icon: Icon, label }: { id: AdminTab, icon: any, label: string }) => (
        <button onClick={() => { setActiveTab(id); setIsOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${activeTab === id ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === id ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
            <span className="font-bold text-sm tracking-wide">{label}</span>
            {activeTab === id && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full"></div>}
        </button>
    );

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>}
            <aside className={`fixed lg:static top-0 left-0 h-full w-72 bg-[#0f172a] border-r border-white/5 p-6 z-50 transform transition-transform duration-300 lg:translate-x-0 overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center shadow-lg shadow-secondary/20">
                        <ShoppingBagIcon className="w-6 h-6 text-white" />
                    </div>
                    <div><h1 className="text-xl font-black text-white tracking-tight">STAR SMM PANEL</h1><p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Admin Portal</p></div>
                </div>
                <nav className="space-y-2">
                    <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 mt-2">Main</p>
                    <NavItem id="dashboard" icon={ChartBarIcon} label="Dashboard" />
                    <NavItem id="users" icon={UsersIcon} label="Users Manager" />
                    <NavItem id="standard_orders" icon={ShoppingBagIcon} label="Standard Orders" />
                    <NavItem id="limited_orders" icon={RocketLaunchIcon} label="Limited Orders" />
                    <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 mt-6">Management</p>
                    <NavItem id="services" icon={ClipboardDocumentListIcon} label="Services & Plans" />
                    <NavItem id="deposits" icon={CurrencyRupeeIcon} label="Deposits" />
                    <NavItem id="offers" icon={TagIcon} label="Coupons" />
                    <NavItem id="messages" icon={EnvelopeIcon} label="Broadcast" />
                    <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 mt-6">System</p>
                    <NavItem id="settings" icon={Cog6ToothIcon} label="Settings" />
                </nav>
                <div className="mt-auto pt-8"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all group"><ArrowRightOnRectangleIcon className="w-5 h-5" /><span className="font-bold text-sm">Logout</span></button></div>
            </aside>
        </>
    );
};

const DashboardContent: React.FC<{stats: any, orders: Order[], users: User[]}> = ({stats, orders, users}) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Revenue" value={`₹${stats.totalRevenue.toFixed(2)}`} icon={CurrencyRupeeIcon} color="text-green-500" bg="bg-green-500/10" />
            <StatCard title="Total Orders" value={stats.totalOrders} icon={ShoppingBagIcon} color="text-blue-500" bg="bg-blue-500/10" />
            <StatCard title="Total Users" value={users.length} icon={UsersIcon} color="text-purple-500" bg="bg-purple-500/10" />
            <StatCard title="Pending Orders" value={stats.pendingOrders} icon={ClockIcon} color="text-yellow-500" bg="bg-yellow-500/10" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-base-100 p-6 rounded-2xl border border-white/5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">Recent Orders</h3>
                <div className="space-y-3">{orders.slice(0, 5).map(o => (<div key={o.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5"><div className="flex flex-col"><span className="text-xs font-bold text-secondary">{o.service}</span><span className="text-[10px] text-slate-400">{o.userName} • {o.date.toLocaleDateString()}</span></div><span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${o.status === 'Completed' ? 'text-green-400 bg-green-400/10' : o.status === 'Pending' ? 'text-yellow-400 bg-yellow-400/10' : 'text-red-400 bg-red-400/10'}`}>{o.status}</span></div>))}</div>
            </div>
            <div className="bg-base-100 p-6 rounded-2xl border border-white/5 shadow-xl">
                 <h3 className="text-lg font-bold text-white mb-4">New Users</h3>
                 <div className="space-y-3">{users.slice(0, 5).map(u => (<div key={u.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5"><img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full" /><div><p className="text-xs font-bold text-white">{u.name}</p><p className="text-[10px] text-slate-400">{u.email}</p></div></div>))}</div>
            </div>
        </div>
    </div>
);

const StatCard = ({ title, value, icon: Icon, color, bg }: any) => (
    <div className="bg-base-100 p-5 rounded-2xl border border-white/5 shadow-lg flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}><Icon className={`w-6 h-6 ${color}`} /></div>
        <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</p><p className="text-2xl font-black text-white">{value}</p></div>
    </div>
);

const UsersContent: React.FC<{users: User[], onEditUser: (u: User) => void}> = ({users, onEditUser}) => {
    const [search, setSearch] = useState('');
    const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
    return (
        <div className="bg-base-100 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-white">All Users ({users.length})</h3>
                <div className="relative"><MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/><input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:border-secondary outline-none w-48"/></div>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-300"><thead className="bg-white/5 text-xs uppercase font-black text-slate-500"><tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Balance</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody className="divide-y divide-white/5">{filtered.map(u => (<tr key={u.id} className="hover:bg-white/5 transition-colors"><td className="p-4 flex items-center gap-3"><img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full" /><div><p className="font-bold text-white">{u.name}</p><p className="text-[10px] text-slate-500">{u.email}</p></div></td><td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-300'}`}>{u.role}</span></td><td className="p-4 font-mono text-green-400">₹{u.walletBalance.toFixed(2)}</td><td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${u.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{u.status}</span></td><td className="p-4"><button onClick={() => onEditUser(u)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"><PencilSquareIcon className="w-4 h-4 text-secondary"/></button></td></tr>))}</tbody></table></div>
        </div>
    );
};

const OrdersContent: React.FC<{orders: Order[], title?: string, onSelectOrder: (o: Order) => void}> = ({orders, title = "All Orders", onSelectOrder}) => {
    const [search, setSearch] = useState('');
    const filtered = orders.filter(o => o.id.includes(search) || o.userName.toLowerCase().includes(search.toLowerCase()));
    return (
        <div className="bg-base-100 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-white">{title}</h3>
                <div className="relative"><MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/><input type="text" placeholder="Search ID or User..." value={search} onChange={e => setSearch(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:border-secondary outline-none w-48"/></div>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-300"><thead className="bg-white/5 text-xs uppercase font-black text-slate-500"><tr><th className="p-4">Order ID</th><th className="p-4">User</th><th className="p-4">Service</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody className="divide-y divide-white/5">{filtered.map(o => (<tr key={o.id} className="hover:bg-white/5 transition-colors"><td className="p-4 font-mono text-xs">#{o.displayId}</td><td className="p-4 font-bold">{o.userName}</td><td className="p-4 text-xs max-w-[150px] truncate">{o.service}</td><td className="p-4 font-mono text-secondary">₹{o.amount.toFixed(2)}</td><td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${o.status === 'Completed' ? 'bg-green-500/20 text-green-400' : o.status === 'Pending' || o.status === 'In Progress' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{o.status}</span></td><td className="p-4"><button onClick={() => onSelectOrder(o)} className="text-xs font-bold text-blue-400 hover:text-blue-300">Details</button></td></tr>))}</tbody></table></div>
        </div>
    );
};

const LimitedOrdersContent: React.FC<{orders: Order[], stats: any, onSelectOrder: (o: Order) => void}> = ({orders, stats, onSelectOrder}) => {
    const limitedOrders = orders.filter(o => o.isLimitedOffer);
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Limited Revenue" value={`₹${stats.limitedRevenue.toFixed(2)}`} icon={CurrencyRupeeIcon} color="text-yellow-400" bg="bg-yellow-400/10" />
                <StatCard title="Limited Orders" value={stats.limitedOrders} icon={RocketLaunchIcon} color="text-orange-400" bg="bg-orange-400/10" />
                <StatCard title="Pending Ltd" value={stats.limitedPending} icon={ClockIcon} color="text-blue-400" bg="bg-blue-400/10" />
                <StatCard title="Rejected Ltd" value={stats.limitedRejected} icon={XMarkIcon} color="text-red-400" bg="bg-red-400/10" />
            </div>
            <OrdersContent title="Limited Offer Orders" orders={limitedOrders} onSelectOrder={onSelectOrder} />
        </div>
    );
};

const ServicesContent: React.FC<{services: ServicePackage[], categories: Category[], onEditPlan: (p: ServicePackage) => void, onCreatePlan: () => void, onDeletePlan: (id: string, title: string) => void}> = ({services, categories, onEditPlan, onCreatePlan, onDeletePlan}) => {
    return (
        <div className="bg-base-100 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-white">Service Plans ({services.length})</h3>
                <button onClick={onCreatePlan} className="bg-secondary text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-2 hover:brightness-110 transition-all"><PlusIcon className="w-4 h-4"/> New Plan</button>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-300"><thead className="bg-white/5 text-xs uppercase font-black text-slate-500"><tr><th className="p-4">ID</th><th className="p-4">Service</th><th className="p-4">Rate</th><th className="p-4">Type</th><th className="p-4">Limits</th><th className="p-4">Actions</th></tr></thead><tbody className="divide-y divide-white/5">{services.map(s => (<tr key={s.id} className="hover:bg-white/5 transition-colors"><td className="p-4 font-mono text-xs">#{s.id}</td><td className="p-4"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">{s.icon && <s.icon className={`w-4 h-4 ${s.isLimitedOffer ? 'text-warning' : 'text-slate-400'}`} />}</div><div><p className="font-bold text-white">{s.title}</p><p className="text-[10px] text-slate-500 uppercase">{categories.find(c => c.id === s.categoryId)?.name || 'Unknown'}</p></div></div></td><td className="p-4 text-xs">₹{s.rate} / {s.ratePerQuantity}</td><td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${s.isLimitedOffer ? 'bg-warning/20 text-warning' : 'bg-blue-500/20 text-blue-400'}`}>{s.isLimitedOffer ? 'Limited' : 'Standard'}</span></td><td className="p-4 text-[10px] text-slate-400">{s.isLimitedOffer ? `Global: ${s.totalLimit || 'Inf'} | Daily: ${s.dailyLimit || 'Inf'}` : '-'}</td><td className="p-4 flex gap-2"><button onClick={() => onEditPlan(s)} className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg"><PencilSquareIcon className="w-4 h-4"/></button><button onClick={() => onDeletePlan(s.id, s.title)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg"><TrashIcon className="w-4 h-4"/></button></td></tr>))}</tbody></table></div>
        </div>
    );
};

const DepositsContent: React.FC<{requests: DepositRequest[], onSelectRequest: (r: DepositRequest) => void, onOpenManualDeposit: () => void}> = ({requests, onSelectRequest, onOpenManualDeposit}) => {
    return (
        <div className="bg-base-100 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
             <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-white">Deposit Requests</h3>
                <button onClick={onOpenManualDeposit} className="bg-white/10 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-2 hover:bg-white/20 transition-all"><CurrencyRupeeIcon className="w-4 h-4"/> Manual Adjustment</button>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-300"><thead className="bg-white/5 text-xs uppercase font-black text-slate-500"><tr><th className="p-4">Req ID</th><th className="p-4">User</th><th className="p-4">Amount</th><th className="p-4">UTR</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody className="divide-y divide-white/5">{requests.map(r => (<tr key={r.id} className="hover:bg-white/5 transition-colors"><td className="p-4 font-mono text-xs">#{r.displayId}</td><td className="p-4 font-bold">{r.userName}</td><td className="p-4 font-mono text-green-400">₹{r.amount.toFixed(2)}</td><td className="p-4 font-mono text-xs text-slate-500">{r.utr}</td><td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${r.status === 'Approved' ? 'bg-green-500/20 text-green-400' : r.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{r.status}</span></td><td className="p-4"><button onClick={() => onSelectRequest(r)} className="text-xs font-bold text-blue-400 hover:text-blue-300">View</button></td></tr>))}</tbody></table></div>
        </div>
    );
};

const OffersContent: React.FC<{coupons: Coupon[], onCreate: (c: string, p: number, l: number, e: Date|null, a: boolean, t: CouponType) => void, onDelete: (id: string, code: string) => void}> = ({coupons, onCreate, onDelete}) => {
    const [code, setCode] = useState('');
    const [percent, setPercent] = useState('');
    const [limit, setLimit] = useState('');
    const [type, setType] = useState<CouponType>('discount');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(code && percent) { onCreate(code, Number(percent), Number(limit)||0, null, false, type); setCode(''); setPercent(''); setLimit(''); } };
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-base-100 p-6 rounded-2xl border border-white/5 h-fit">
                <h3 className="font-bold text-white mb-4">Create Coupon</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <InputField label="Code" name="code" value={code} onChange={e => setCode(e.target.value)} placeholder="SAVE10" />
                    <InputField label="Percentage %" name="percent" type="number" value={percent} onChange={e => setPercent(e.target.value)} />
                    <InputField label="Usage Limit (0=Inf)" name="limit" type="number" value={limit} onChange={e => setLimit(e.target.value)} />
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Type</label><select value={type} onChange={(e) => setType(e.target.value as CouponType)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-secondary outline-none"><option value="discount">Discount (Order)</option><option value="bonus">Bonus (Deposit)</option></select></div>
                    <button type="submit" className="w-full py-2 bg-secondary text-white font-bold rounded-xl text-xs uppercase tracking-wide hover:brightness-110 mt-2">Create</button>
                </form>
            </div>
            <div className="lg:col-span-2 bg-base-100 rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5"><h3 className="font-bold text-white">Active Coupons</h3></div>
                <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-300"><thead className="bg-white/5 text-xs uppercase font-black text-slate-500"><tr><th className="p-4">Code</th><th className="p-4">Type</th><th className="p-4">Value</th><th className="p-4">Used</th><th className="p-4">Action</th></tr></thead><tbody className="divide-y divide-white/5">{coupons.map(c => (<tr key={c.id} className="hover:bg-white/5 transition-colors"><td className="p-4 font-mono font-bold text-secondary">{c.code}</td><td className="p-4 text-xs uppercase">{c.type || 'discount'}</td><td className="p-4 text-green-400">{c.discountPercent}%</td><td className="p-4 text-xs">{c.usedCount} / {c.usageLimit || '∞'}</td><td className="p-4"><button onClick={() => onDelete(c.id, c.code)} className="text-red-400 hover:text-red-300"><TrashIcon className="w-4 h-4"/></button></td></tr>))}</tbody></table></div>
            </div>
        </div>
    );
};

const MessagesContent: React.FC<{ users: User[], messages: AdminMessage[], onSendMessage: (msg: any) => void, onDeleteMessage: (id: string) => void }> = ({ users, messages, onSendMessage, onDeleteMessage }) => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [targetType, setTargetType] = useState<'ALL' | 'SPECIFIC'>('ALL');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [isAuto, setIsAuto] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('10:00');
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingPayload, setPendingPayload] = useState<any>(null);
    const [userSearch, setUserSearch] = useState('');
    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));
    const handleSubmit = () => { if (!subject || !body) return alert("Subject and Body are required."); if (targetType === 'SPECIFIC' && !selectedUserId) return alert("Please select a user."); if (isAuto && !scheduledDate) return alert("Please select a date for the scheduled message."); const targetUser = users.find(u => u.id === selectedUserId); const payload = { subject, body, target: targetType, targetUserId: targetType === 'SPECIFIC' ? selectedUserId : undefined, targetUserName: targetType === 'SPECIFIC' ? targetUser?.name : undefined, targetEmail: targetType === 'SPECIFIC' ? targetUser?.email : undefined, type: isAuto ? 'AUTO' : 'MANUAL', status: isAuto ? 'SCHEDULED' : 'SENT', scheduledDate: isAuto ? scheduledDate : undefined, scheduledTime: isAuto ? scheduledTime : undefined, }; setPendingPayload(payload); setShowConfirm(true); };
    const handleConfirmSend = () => { if (pendingPayload) { onSendMessage(pendingPayload); setSubject(''); setBody(''); setIsAuto(false); setScheduledDate(''); setPendingPayload(null); setShowConfirm(false); } };
    return (<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">{showConfirm && (<div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700 p-6 transform transition-all scale-100 animate-fade-in-up text-center"><div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4"><PaperAirplaneIcon className="w-8 h-8 text-blue-500" /></div><h3 className="text-xl font-bold text-white mb-2">Are you sure?</h3><p className="text-sm text-gray-400 mb-6">You are about to {pendingPayload?.type === 'AUTO' ? 'schedule' : 'send'} this message to <strong className="text-white ml-1">{pendingPayload?.target === 'ALL' ? 'All Users' : pendingPayload?.targetUserName}</strong>.</p><div className="flex gap-3"><button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors active:scale-95">Cancel</button><button onClick={handleConfirmSend} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg active:scale-95">Confirm</button></div></div></div>)}<div className="lg:col-span-1 space-y-6"><div className="bg-base-100 p-6 rounded-[2rem] border border-white/5 shadow-2xl"><h2 className="text-xl font-black uppercase text-secondary tracking-widest mb-6 flex items-center gap-2"><MegaphoneIcon className="w-5 h-5"/> Broadcast</h2><div className="space-y-4"><div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">To</label><div className="flex bg-white/5 rounded-xl p-1 border border-white/10"><button onClick={() => setTargetType('ALL')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${targetType === 'ALL' ? 'bg-secondary text-white' : 'text-slate-400 hover:text-white'}`}>All Users</button><button onClick={() => setTargetType('SPECIFIC')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${targetType === 'SPECIFIC' ? 'bg-secondary text-white' : 'text-slate-400 hover:text-white'}`}>Select User</button></div></div>{targetType === 'SPECIFIC' && (<div className="relative"><MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/><input type="text" placeholder="Search user..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs mb-2 focus:border-secondary outline-none"/><select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-secondary outline-none"><option value="">-- Select User --</option>{filteredUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}</select></div>)}<InputField label="Subject" name="subject" value={subject} onChange={e => setSubject(e.target.value)} /><div><label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Message Body</label><textarea value={body} onChange={e => setBody(e.target.value)} rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 resize-none transition-all"></textarea></div><div className="bg-white/5 p-4 rounded-xl border border-white/5"><label className="flex items-center justify-between cursor-pointer mb-2"><span className="text-xs font-bold text-slate-300 flex items-center gap-2"><CalendarIcon className="w-4 h-4"/> Auto-Pilot Schedule</span><input type="checkbox" checked={isAuto} onChange={e => setIsAuto(e.target.checked)} className="toggle toggle-sm toggle-secondary" /></label>{isAuto && (<div className="grid grid-cols-2 gap-2 mt-2 animate-fade-in"><div><label className="text-[9px] font-bold text-slate-500 block mb-1">Date</label><input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="w-full bg-base-200 text-xs py-1.5 px-2 rounded border border-white/10 text-white"/></div><div><label className="text-[9px] font-bold text-slate-500 block mb-1">Time</label><input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-full bg-base-200 text-xs py-1.5 px-2 rounded border border-white/10 text-white"/></div></div>)}</div><button onClick={handleSubmit} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg">{isAuto ? 'Schedule Auto-Message' : 'Send Message Now'}</button></div></div></div><div className="lg:col-span-2"><div className="bg-base-100 p-8 rounded-[2rem] border border-white/5 shadow-2xl h-full"><h2 className="text-xl font-black uppercase text-secondary tracking-widest mb-6">Message History</h2><div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">{messages.length === 0 ? <div className="text-center py-20 text-slate-600 font-black uppercase text-xs tracking-[0.3em] opacity-50">No messages sent yet.</div> : messages.map(msg => (<div key={msg.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group"><div className="flex justify-between items-start mb-2"><div className="flex items-center gap-2"><span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${msg.type === 'AUTO' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{msg.type === 'AUTO' ? 'Auto-Pilot' : 'Manual'}</span>{msg.type === 'AUTO' && (<span className="text-[9px] text-slate-400 font-bold flex items-center gap-1"><ClockIcon className="w-3 h-3"/> {msg.scheduledDate} @ {msg.scheduledTime}</span>)}</div><button onClick={() => onDeleteMessage(msg.id)} className="text-slate-500 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4"/></button></div><h3 className="font-bold text-white text-sm mb-1">{msg.subject}</h3><p className="text-xs text-slate-400 mb-3 line-clamp-2">{msg.body}</p><div className="flex justify-between items-center border-t border-white/5 pt-2"><span className="text-[10px] font-bold text-slate-500 uppercase">To: <span className="text-secondary">{msg.target === 'ALL' ? 'All Users' : msg.targetUserName || msg.targetEmail}</span></span><span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${msg.status === 'SENT' ? 'text-green-500' : 'text-yellow-500'}`}>{msg.status}</span></div></div>))}</div></div></div></div>);
};

// Map object for dynamic icon selection in Settings
const categoryIcons = {
    HeartIcon, UsersIcon, EyeIcon, RocketLaunchIcon, VideoCameraIcon, ArrowTrendingUpIcon, 
    UserPlusIcon, PlayCircleIcon, ShoppingBagIcon, ChatBubbleBottomCenterTextIcon, 
    EnvelopeIcon, PaperAirplaneIcon, TagIcon, ClockIcon, 
    LinkedInIcon, SpotifyIcon, DiscordIcon, TwitchIcon, RedditIcon, PinterestIcon, ThreadsIcon, TwitterIcon,
    InstagramIcon, YouTubeIcon, FacebookIcon, TelegramIcon, TikTokIcon, SnapchatIcon,
    XingIcon, IndeedIcon, LikeeIcon, KwaiIcon, TrillerIcon, ChingariIcon, MojIcon, SignalIcon, MessengerIcon, ViberIcon, WeChatIcon, LineIcon, KakaoTalkIcon, ShareChatIcon, KooIcon, JoshIcon, RoposoIcon, MitronIcon, KickIcon, SteamIcon, OmletArcadeIcon, FlickrIcon, BehanceIcon, DribbbleIcon, QuoraIcon, TumblrIcon, MediumIcon, TinderIcon, BumbleIcon, HingeIcon, OkCupidIcon
};

const SettingsContent: React.FC<{
    maintenanceStatus: MaintenanceStatus|null, 
    categories: Category[], 
    supportInfo: SupportInfo|null,
    onDeleteCategory: (id: string, name: string) => void, 
    onDataChange: () => void, 
    isMockMode: boolean, 
    setShowPermissionModal: (b: boolean) => void
}> = ({maintenanceStatus, categories, supportInfo, onDeleteCategory, onDataChange, isMockMode, setShowPermissionModal}) => {
    const [catName, setCatName] = useState('');
    const [catIcon, setCatIcon] = useState('HeartIcon');
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [emailServiceId, setEmailServiceId] = useState('');
    const [emailTemplateId, setEmailTemplateId] = useState('');
    const [emailPublicKey, setEmailPublicKey] = useState('');
    const [support, setSupport] = useState<Partial<SupportInfo>>({
        whatsapp: '', telegram: '', email: '', instagram: '', facebook: '', mobile: '', youtube: '', promoVideoUrl: ''
    });

    useEffect(() => {
        const loadConfigs = async () => {
            if (isMockMode) {
                 const sec = getMockAdminSecurityFromStorage();
                 if (sec) setPin(sec.pin);
                 const mockSupport = getMockSupportInfoFromStorage();
                 if (mockSupport) setSupport(mockSupport);
                 return;
            }
            try {
                const [sec, email] = await Promise.all([getAdminSecurity(), getEmailConfig()]);
                if (sec) setPin(sec.pin);
                if (email) { setEmailServiceId(email.serviceId); setEmailTemplateId(email.templateId); setEmailPublicKey(email.publicKey); }
                if (supportInfo) setSupport(supportInfo);
            } catch (e) {}
        };
        loadConfigs();
    }, [isMockMode, supportInfo]);

    const handleSupportInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSupport(prev => ({ ...prev, [name]: value }));
    };

    const saveSupportInfo = async () => {
        const { id, ...dataToSave } = support;
        try {
            if(isMockMode) {
                saveMockSupportInfoToStorage(dataToSave as SupportInfo);
            } else {
                await updateSupportInfo(dataToSave as Omit<SupportInfo, 'id'>);
            }
            alert("Support Info Saved!");
            onDataChange();
        } catch(e:any) {
            if(e.code === 'permission-denied') setShowPermissionModal(true); else alert(e.message);
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => { e.preventDefault(); if(!catName) return; try { if(isMockMode) { await deleteMockCategoryFromStorage('fake'); addCategory(catName, catIcon); } else { await addCategory(catName, catIcon); } onDataChange(); setCatName(''); setCatIcon('HeartIcon'); } catch(e:any) { if(e.code==='permission-denied') setShowPermissionModal(true); } };
    const toggleMaintenance = async () => { try { const newState = { isEnabled: !maintenanceStatus?.isEnabled, message: maintenanceStatus?.message || "We'll be back soon!" }; if(isMockMode) { saveMockMaintenanceStatusToStorage(newState); } else { await updateMaintenanceStatus(newState); } onDataChange(); } catch(e:any) { if(e.code==='permission-denied') setShowPermissionModal(true); } };
    
    const saveEmailConfig = async () => { if(isMockMode) return alert("Cannot save Email config in mock mode"); try { await updateEmailConfig({ serviceId: emailServiceId, templateId: emailTemplateId, publicKey: emailPublicKey }); alert("Email Config Saved!"); } catch(e:any) { if(e.code==='permission-denied') setShowPermissionModal(true); else alert(e.message); } };
    const savePin = async () => { if (pin.length < 4) return alert("PIN must be at least 4 digits"); try { if(isMockMode) { saveMockAdminSecurityToStorage(pin); } else { await updateAdminSecurity(pin); } alert("Security PIN Updated!"); } catch(e:any) { if(e.code==='permission-denied') setShowPermissionModal(true); else alert(e.message); } };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                <div className="bg-base-100 p-6 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white mb-4">Maintenance Mode</h3>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Enable/Disable User Panel Access</span>
                        <input type="checkbox" className="toggle toggle-secondary" checked={maintenanceStatus?.isEnabled || false} onChange={toggleMaintenance} />
                    </div>
                </div>
                <div className="bg-base-100 p-6 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><LockClosedIcon className="w-5 h-5 text-secondary"/> Admin Security</h3>
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Access PIN</label>
                            <div className="relative">
                                <input type={showPin ? "text" : "password"} value={pin} onChange={e => setPin(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-10 py-2 text-sm text-white" placeholder="Enter 4-6 digit PIN" />
                                <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">{showPin ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}</button>
                            </div>
                        </div>
                        <button onClick={savePin} className="bg-secondary text-white px-4 py-2 rounded-xl text-xs font-bold uppercase h-10 hover:brightness-110">Save</button>
                    </div>
                </div>
                <div className="bg-base-100 p-6 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><EnvelopeIcon className="w-5 h-5 text-orange-400"/> EmailJS Config</h3>
                    <div className="space-y-3">
                        <InputField label="Service ID" name="serviceId" value={emailServiceId} onChange={e => setEmailServiceId(e.target.value)} />
                        <InputField label="Template ID" name="templateId" value={emailTemplateId} onChange={e => setEmailTemplateId(e.target.value)} />
                        <InputField label="Public Key" name="publicKey" value={emailPublicKey} onChange={e => setEmailPublicKey(e.target.value)} />
                        <button onClick={saveEmailConfig} className="w-full py-2 bg-orange-600/20 text-orange-400 font-bold rounded-xl text-xs uppercase hover:bg-orange-600/40">Save Email Settings</button>
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <div className="bg-base-100 p-6 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><LifebuoyIcon className="w-5 h-5 text-green-400"/> Support Desk Links</h3>
                    <div className="space-y-3">
                        <InputField label="WhatsApp Number (with country code)" name="whatsapp" value={support.whatsapp || ''} onChange={handleSupportInfoChange} />
                        <InputField label="Telegram Username" name="telegram" value={support.telegram || ''} onChange={handleSupportInfoChange} />
                        <InputField label="Support Email" name="email" value={support.email || ''} onChange={handleSupportInfoChange} />
                        <InputField label="Instagram Username" name="instagram" value={support.instagram || ''} onChange={handleSupportInfoChange} />
                        <InputField label="Mobile Number" name="mobile" value={support.mobile || ''} onChange={handleSupportInfoChange} />
                        <InputField label="YouTube Channel URL" name="youtube" value={support.youtube || ''} onChange={handleSupportInfoChange} />
                        <InputField label="Promo Video URL (Floating Widget)" name="promoVideoUrl" value={support.promoVideoUrl || ''} onChange={handleSupportInfoChange} />
                        <button onClick={saveSupportInfo} className="w-full py-2 bg-green-600/20 text-green-400 font-bold rounded-xl text-xs uppercase hover:bg-green-600/40">Save Support Info</button>
                    </div>
                </div>
                <div className="bg-base-100 p-6 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white mb-4">Categories</h3>
                    <form onSubmit={handleAddCategory} className="mb-4 space-y-3">
                        <div className="flex gap-2"><input type="text" value={catName} onChange={e => setCatName(e.target.value)} placeholder="New Category Name" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-secondary outline-none"/><button type="submit" className="bg-white/10 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-white/20">Add</button></div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Select Icon</label>
                            <div className="grid grid-cols-7 gap-2">{Object.entries(categoryIcons).map(([name, IconComponent]) => (<button key={name} type="button" onClick={() => setCatIcon(name)} className={`p-2 rounded-lg flex items-center justify-center transition-all ${catIcon === name ? 'bg-secondary text-white shadow-lg scale-110' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`} title={name}><IconComponent className="w-4 h-4" /></button>))}</div>
                        </div>
                    </form>
                    <div className="flex flex-wrap gap-2 mt-4">{categories.map(c => { const Icon = iconMap[c.iconName] || HeartIcon; return (<div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5"><Icon className="w-3 h-3 text-slate-400"/><span className="text-xs text-slate-300">{c.name}</span><button onClick={() => onDeleteCategory(c.id, c.name)} className="text-red-400 hover:text-red-300 ml-1"><TrashIcon className="w-3 h-3"/></button></div>); })}</div>
                </div>
            </div>
        </div>
    );
};

const ManualDepositModal: React.FC<{users: User[], onClose: () => void, onConfirm: (userId: string, amount: number, reason: string) => void}> = ({users, onClose, onConfirm}) => { const [searchTerm, setSearchTerm] = useState(''); const [selectedUser, setSelectedUser] = useState<User | null>(null); const [amount, setAmount] = useState(''); const [reason, setReason] = useState(''); const [mode, setMode] = useState<'credit' | 'debit'>('credit'); const [isConfirming, setIsConfirming] = useState(false); const filteredUsers = users.filter(u => !searchTerm || u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()) || (u.displayId && u.displayId.includes(searchTerm))).slice(0, 5); const handleInitialSubmit = () => { if(!selectedUser || !amount || parseFloat(amount) <= 0) return alert("Select a user and enter a valid positive amount."); if (!reason.trim()) return alert("Please enter a reason."); setIsConfirming(true); }; const handleConfirm = () => { if(selectedUser && amount) { const finalAmount = mode === 'debit' ? -parseFloat(amount) : parseFloat(amount); onConfirm(selectedUser.id, finalAmount, reason); } }; return (<div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm"><div className="bg-white dark:bg-base-100 rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-base-300 animate-fade-in-up overflow-hidden">{isConfirming ? (<div className="p-6 text-center"><div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${mode === 'credit' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>{mode === 'credit' ? <CurrencyRupeeIcon className="w-8 h-8 text-green-600 dark:text-green-400" /> : <ArrowTrendingDownIcon className="w-8 h-8 text-red-600 dark:text-red-400" />}</div><h3 className="text-xl font-black text-gray-900 dark:text-text-primary mb-2">Confirm {mode === 'credit' ? 'Deposit' : 'Deduction'}?</h3><p className="text-gray-500 dark:text-text-secondary text-sm mb-6">Are you sure you want to {mode === 'credit' ? 'add' : 'deduct'} <span className={`font-bold ${mode === 'credit' ? 'text-green-600' : 'text-red-600'}`}>₹{parseFloat(amount).toFixed(2)}</span> {mode === 'credit' ? 'to' : 'from'} <span className="font-bold text-gray-900 dark:text-white">{selectedUser?.name}'s</span> wallet?</p><div className="bg-gray-100 dark:bg-base-200 p-2 rounded mb-6 text-xs text-left"><span className="font-bold uppercase text-gray-500">Reason: </span><span className="text-gray-900 dark:text-white">{reason}</span></div><div className="flex gap-3"><button onClick={() => setIsConfirming(false)} className="flex-1 py-3 bg-gray-200 dark:bg-base-300 text-gray-800 dark:text-white font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-base-200 transition-all active:scale-95">No, Cancel</button><button onClick={handleConfirm} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 ${mode === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Yes, Confirm</button></div></div>) : (<div className="p-6 space-y-4"><h3 className="text-xl font-bold text-gray-900 dark:text-text-primary mb-4">Manual Wallet Adjustment</h3><div className="flex gap-2 p-1 bg-gray-100 dark:bg-base-200 rounded-xl mb-4"><button onClick={() => setMode('credit')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${mode === 'credit' ? 'bg-white dark:bg-base-100 text-green-600 shadow-sm' : 'text-gray-400'}`}>Credit (+)</button><button onClick={() => setMode('debit')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${mode === 'debit' ? 'bg-white dark:bg-base-100 text-red-600 shadow-sm' : 'text-gray-400'}`}>Debit (-)</button></div><div className="space-y-3"><div><label className="text-[10px] font-bold text-gray-500 uppercase">Search User</label><div className="relative"><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Name, Email or ID..." className="w-full bg-gray-100 dark:bg-base-200 border border-gray-300 dark:border-base-300 rounded-xl px-3 py-2 text-sm focus:border-primary outline-none" /><div className="absolute top-full left-0 w-full bg-white dark:bg-base-100 border border-gray-200 dark:border-base-300 rounded-xl mt-1 max-h-40 overflow-y-auto z-20 shadow-xl">{searchTerm && filteredUsers.map(u => (<div key={u.id} onClick={() => { setSelectedUser(u); setSearchTerm(u.name); }} className="p-2 hover:bg-gray-100 dark:hover:bg-base-200 cursor-pointer text-xs border-b border-gray-100 dark:border-white/5 last:border-0"><p className="font-bold">{u.name}</p><p className="text-gray-500">{u.email}</p></div>))}</div></div></div>{selectedUser && (<div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex justify-between items-center"><span className="text-xs font-bold text-blue-600 dark:text-blue-400">Current Balance:</span><span className="font-mono font-black text-blue-700 dark:text-blue-300">₹{selectedUser.walletBalance.toFixed(2)}</span></div>)}<div><label className="text-[10px] font-bold text-gray-500 uppercase">Amount (₹)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-gray-100 dark:bg-base-200 border border-gray-300 dark:border-base-300 rounded-xl px-3 py-2 text-sm font-bold focus:border-primary outline-none" /></div><div><label className="text-[10px] font-bold text-gray-500 uppercase">Reason</label><textarea value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-gray-100 dark:bg-base-200 border border-gray-300 dark:border-base-300 rounded-xl px-3 py-2 text-xs focus:border-primary outline-none resize-none" rows={2} placeholder="e.g. Bonus, Refund..."></textarea></div></div><div className="flex gap-3 mt-4"><button onClick={onClose} className="flex-1 py-3 bg-gray-200 dark:bg-base-300 text-gray-800 dark:text-text-primary font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-base-200 transition-colors">Cancel</button><button onClick={handleInitialSubmit} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-lg">Next</button></div></div>)}</div></div>); };

const InputField: React.FC<{label: string, name: string, value: any, onChange: (e: any) => void, type?: string, placeholder?: string}> = ({ label, name, value, onChange, type = 'text', placeholder }) => (
    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</label><input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-secondary transition-colors" /></div>
);

export default AdminDashboard;