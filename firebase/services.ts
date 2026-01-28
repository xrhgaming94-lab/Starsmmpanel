
import { Order, OrderStatus, ServicePackage, User, Transaction, DepositRequest, TransactionType, DepositStatus, Category, SupportInfo, PaymentInfo, ServiceInputType, Coupon, CouponType, AdminMessage, EmailConfig, MaintenanceStatus, TelegramConfig, AdminSecurityConfig } from '../types';
import { db, storage, auth } from './config';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, Timestamp, getDoc, writeBatch, increment, setDoc, deleteDoc, runTransaction, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, deleteUser } from '@firebase/auth';
import { UsersIcon, HeartIcon, EyeIcon, RocketLaunchIcon, ArrowTrendingUpIcon, VideoCameraIcon, UserPlusIcon, PlayCircleIcon } from '../components/Icons';
import React from 'react';
import { MOCK_ORDERS, MOCK_DEPOSIT_REQUESTS, MOCK_SERVICES, MOCK_SUPPORT_INFO, MOCK_PAYMENT_INFO, MOCK_USERS, MOCK_CATEGORIES, MOCK_TRANSACTIONS, MOCK_COUPONS } from '../constants';
// FIX: Use named import for better compatibility
import { send } from '@emailjs/browser';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  HeartIcon, UsersIcon, EyeIcon, RocketLaunchIcon, ArrowTrendingUpIcon, VideoCameraIcon, UserPlusIcon, PlayCircleIcon,
};

const getIconComponent = (iconName: string): React.ComponentType<{ className?: string }> => ICONS[iconName] || HeartIcon;
const getIconName = (iconComponent: React.ComponentType<{ className?: string }>): string => Object.keys(ICONS).find(key => ICONS[key] === iconComponent) || 'HeartIcon';

// --- CORE FIREBASE SERVICES ---

// MODIFIED: Added 'limited_orders' to allowed counter types
const getNextSequenceValue = async (counterName: 'orders' | 'deposits' | 'services' | 'users' | 'limited_orders'): Promise<number> => {
    const counterRef = doc(db, 'counters', counterName);
    let nextValue = 1;
    await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
            transaction.set(counterRef, { current_value: 1 });
        } else {
            nextValue = counterDoc.data().current_value + 1;
            transaction.update(counterRef, { current_value: nextValue });
        }
    });
    return nextValue;
};

// --- ADMIN SECURITY SERVICES ---

export const getAdminSecurity = async (): Promise<AdminSecurityConfig | null> => {
    const docRef = doc(db, 'settings', 'security');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as AdminSecurityConfig;
    }
    return null;
};

export const updateAdminSecurity = async (pin: string): Promise<void> => {
    await setDoc(doc(db, 'settings', 'security'), { pin }, { merge: true });
};

// --- TELEGRAM CONFIG SERVICES ---

export const getTelegramConfig = async (): Promise<TelegramConfig | null> => {
    const docRef = doc(db, 'settings', 'telegramConfig');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as TelegramConfig;
    }
    return null;
};

export const updateTelegramConfig = async (config: TelegramConfig): Promise<void> => {
    await setDoc(doc(db, 'settings', 'telegramConfig'), config, { merge: true });
};

// NOTE: Direct frontend Telegram alerts removed. 
// We now rely on the Node.js `bot.js` to listen to Firestore changes and send notifications.
// This prevents duplicate messages and improves security/reliability.

// HELPER: Get existing user profile or create one if it doesn't exist (Used by Google Auth & App.tsx)
export const getOrCreateUserProfile = async (firebaseUser: any): Promise<User> => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    
    try {
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            const isAdminEmail = firebaseUser.email === 'xrhgaming94@gmail.com';
            
            // Auto-promote admin if email matches but role is wrong
            if (isAdminEmail && userData.role !== 'admin') {
                await updateDoc(userRef, { role: 'admin' });
                userData.role = 'admin';
            }
            return { id: userSnap.id, ...userData } as User;
        } else {
            // User doesn't exist, create new
            const nextId = await getNextSequenceValue('users');
            const displayId = nextId.toString().padStart(6, '0');
            const isAdminEmail = firebaseUser.email === 'xrhgaming94@gmail.com';

            // Google Sign In users are auto-verified
            const isGoogleUser = firebaseUser.providerData?.[0]?.providerId === 'google.com';

            const newUser: User = {
                id: firebaseUser.uid,
                displayId: displayId,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
                email: firebaseUser.email!,
                whatsapp: '', // Google login doesn't provide phone
                avatarUrl: firebaseUser.photoURL || `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
                role: isAdminEmail ? 'admin' : 'user',
                walletBalance: 0,
                totalSpent: 0,
                status: 'Active',
                isVerified: isGoogleUser, // Auto-verify Google users
                createdAt: new Date().toISOString(), // Add timestamp
            };

            await setDoc(userRef, newUser);
            
            return newUser;
        }
    } catch (error) {
        console.error("CRITICAL: getOrCreateUserProfile failed to get or create user profile:", error);
        // Re-throw the error so App.tsx can handle it (e.g., show connection error)
        throw error;
    }
};

export const createUser = async (userData: Omit<User, 'id' | 'role' | 'walletBalance' | 'status' | 'avatarUrl' | 'totalSpent' | 'displayId' | 'isVerified' | 'createdAt'>): Promise<User> => {
    // Step 1: Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password!);
    const firebaseUser = userCredential.user;

    // Step 2: Use helper to create profile (handles ID generation and Telegram Alert via the else block above)
    // Note: This returns a user object WITHOUT the password field initially as it fetches/creates the basic doc
    const user = await getOrCreateUserProfile(firebaseUser);
    
    // Update specifics including password
    await updateDoc(doc(db, 'users', user.id), {
        name: userData.name,
        whatsapp: userData.whatsapp,
        password: userData.password, 
        isVerified: false,
        createdAt: new Date().toISOString() // Ensure creation time is recorded
    });
    
    // Return the complete user object including the password so the UI knows it's a manual user
    return { 
        ...user, 
        name: userData.name, 
        whatsapp: userData.whatsapp, 
        isVerified: false,
        password: userData.password // IMPORTANT: Return password so UI can show "Change Password" button
    };
};

// --- ACCOUNT CLEANUP (5 Minute Rule) ---
export const deleteUserAccount = async (userId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Delete Firestore Data
    await deleteDoc(doc(db, 'users', userId));
    
    // 2. Delete Auth Account
    await deleteUser(user);
};

export const authenticateUser = async (usernameOrEmail: string, password: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, usernameOrEmail, password);
    return await getOrCreateUserProfile(userCredential.user);
};

export const handleGoogleSignIn = async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return await getOrCreateUserProfile(result.user);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
};

export const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const getUser = async (userId: string): Promise<User | null> => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;
    const { ...user } = userDoc.data();
    return { id: userDoc.id, ...user } as User;
}

export const getAllUsers = async (): Promise<User[]> => {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => {
        const { ...user } = doc.data();
        return { id: doc.id, ...user } as User;
    });
};

export const changeUserPassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("No authenticated user found.");
    
    // 1. Re-authenticate
    const credential = EmailAuthProvider.credential(user.email, oldPassword);
    await reauthenticateWithCredential(user, credential);
    
    // 2. Update Firebase Auth Password
    await updatePassword(user, newPassword);

    // 3. Update Firestore (if we are storing it, though discouraged, keeping consistent with app structure)
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { password: newPassword });
};

export const getOrders = async (): Promise<Order[]> => {
    const snapshot = await getDocs(collection(db, 'orders'));
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate() } as Order));
    return orders.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const getUserOrders = async (userId: string): Promise<Order[]> => {
    const q = query(collection(db, 'orders'), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate() } as Order));
    return orders.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
    const q = query(collection(db, 'transactions'), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate() } as Transaction));
    return txs.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const getServicePackages = async (): Promise<ServicePackage[]> => {
    const snapshot = await getDocs(collection(db, 'services'));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data, 
            icon: getIconComponent(data.iconName),
            expiryDate: data.expiryDate ? (data.expiryDate as Timestamp).toDate() : null 
        } as ServicePackage;
    });
};

export const addServicePackage = async (plan: Partial<ServicePackage>) => {
    const { icon, id, ...dataToSave } = plan;
    let finalId = id;

    if (!finalId || finalId.startsWith('new-')) {
        const nextId = await getNextSequenceValue('services');
        // INCREASED TO 6 DIGITS to support up to 999,999 plans
        finalId = nextId.toString().padStart(6, '0');
    }
    
    const iconName = icon ? getIconName(icon) : 'HeartIcon';
    
    // Ensure date objects are converted if present
    const payload = { ...dataToSave, id: finalId, iconName };
    if (plan.expiryDate) {
        // @ts-ignore
        payload.expiryDate = Timestamp.fromDate(plan.expiryDate);
    }

    return setDoc(doc(db, 'services', finalId), payload);
};

export const updateServicePackage = (plan: ServicePackage) => {
    const { icon, ...dataToSave } = plan;
    const payload = { ...dataToSave, iconName: getIconName(plan.icon) };
    if (plan.expiryDate) {
        // @ts-ignore
        payload.expiryDate = Timestamp.fromDate(plan.expiryDate);
    }
    return updateDoc(doc(db, 'services', plan.id), payload);
};

export const deleteServicePackage = (id: string) => deleteDoc(doc(db, 'services', id));

export const placeOrderAndCreateTransaction = async (orderData: Omit<Order, 'id' | 'date' | 'status' | 'displayId'>, transactionData: Omit<Transaction, 'id' | 'date' | 'relatedId'>): Promise<string> => {
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', orderData.userId);
    const newOrderRef = doc(collection(db, 'orders'));
    const newTransactionRef = doc(collection(db, 'transactions'));
    
    // CHANGE: Separate counters for Limited Orders vs Standard Orders
    const isLimited = orderData.isLimitedOffer;
    const counterName = isLimited ? 'limited_orders' : 'orders';
    const nextDisplayId = await getNextSequenceValue(counterName);

    // 1. Update User Balance & Stats
    // IMPORTANT: amount passed is positive, so we decrement walletBalance
    batch.update(userRef, { 
        walletBalance: increment(-orderData.amount),
        totalSpent: increment(orderData.amount),
    });

    // 2. Create Order
    // Sanitize orderData to ensure no undefined values are passed (Firestore throws error on undefined)
    const sanitizedOrderData = { ...orderData };
    if (sanitizedOrderData.couponCode === undefined) delete sanitizedOrderData.couponCode;
    if (sanitizedOrderData.userWhatsapp === undefined) delete sanitizedOrderData.userWhatsapp;
    if (sanitizedOrderData.isLimitedOffer === undefined) delete sanitizedOrderData.isLimitedOffer;
    if (sanitizedOrderData.serviceId === undefined) delete sanitizedOrderData.serviceId;

    let displayIdStr = nextDisplayId.toString().padStart(5, '0');
    // Prefix Limited Orders with 'L' to easily distinguish them in mixed lists like transactions
    if (isLimited) {
        displayIdStr = `L${displayIdStr}`;
    }

    batch.set(newOrderRef, { ...sanitizedOrderData, date: Timestamp.now(), status: OrderStatus.Pending, displayId: displayIdStr });
    
    // 3. Create Transaction
    batch.set(newTransactionRef, { ...transactionData, date: Timestamp.now(), relatedId: newOrderRef.id });

    // 4. Update Coupon Usage if applicable
    if (orderData.couponCode) {
        // Need to find the coupon doc by code (assuming code is unique)
        const q = query(collection(db, 'coupons'), where('code', '==', orderData.couponCode));
        const couponSnap = await getDocs(q);
        if (!couponSnap.empty) {
            const couponRef = couponSnap.docs[0].ref;
            batch.update(couponRef, { usedCount: increment(1) });
        }
    }
    
    // 5. Update Limited Plan Counter
    if (orderData.isLimitedOffer && orderData.serviceId) {
        const serviceRef = doc(db, 'services', orderData.serviceId);
        batch.update(serviceRef, { currentOrdersCount: increment(1) });
    }

    await batch.commit();

    return displayIdStr;
};

export const updateOrderStatus = async (orderId: string, newStatus: OrderStatus): Promise<void> => {
    // Get current user (Admin)
    const currentUser = auth.currentUser;
    const adminName = currentUser ? (currentUser.displayName || 'Admin') : 'System';

    return runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', orderId);
        const orderDoc = await transaction.get(orderRef);

        if (!orderDoc.exists()) {
            throw new Error("Order does not exist");
        }

        const orderData = orderDoc.data() as Order;
        const currentStatus = orderData.status;

        // If status isn't changing, do nothing
        if (currentStatus === newStatus) return;

        // Perform refund logic if status is changing TO Cancelled and wasn't already Cancelled
        if (newStatus === OrderStatus.Cancelled && currentStatus !== OrderStatus.Cancelled) {
            const userRef = doc(db, 'users', orderData.userId);
            const newTransactionRef = doc(collection(db, 'transactions'));

            // 1. Refund the user
            transaction.update(userRef, {
                walletBalance: increment(orderData.amount),
                totalSpent: increment(-orderData.amount)
            });

            // 2. Create Refund Transaction
            transaction.set(newTransactionRef, {
                userId: orderData.userId,
                type: TransactionType.Credit,
                amount: orderData.amount,
                description: `Refund for Cancelled Order #${orderData.displayId}`,
                date: Timestamp.now(),
                status: DepositStatus.Approved,
                relatedId: orderId
            });
        }

        // Finally update the order status with admin name
        transaction.update(orderRef, { 
            status: newStatus,
            lastUpdatedBy: adminName 
        });
    });
};

export const getDepositRequests = async (): Promise<DepositRequest[]> => {
    const snapshot = await getDocs(collection(db, 'deposit_requests'));
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate() } as DepositRequest));
    return requests.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const getUserDepositRequests = async (userId: string): Promise<DepositRequest[]> => {
    const q = query(collection(db, 'deposit_requests'), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate() } as DepositRequest));
    return requests.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const createDepositRequestAndTransaction = async (requestData: Omit<DepositRequest, 'id' | 'status' | 'date' | 'displayId'>): Promise<DepositRequest> => {
    const nextDisplayId = await getNextSequenceValue('deposits');
    const displayIdStr = nextDisplayId.toString().padStart(7, '0');
    
    // Sanitize to remove undefined bonusAmount if present
    const cleanData = { ...requestData };
    if (!cleanData.bonusAmount) delete cleanData.bonusAmount;
    if (!cleanData.couponCode) delete cleanData.couponCode;

    const newDocRef = await addDoc(collection(db, 'deposit_requests'), { 
        ...cleanData, 
        status: DepositStatus.Pending, 
        date: Timestamp.now(), 
        displayId: displayIdStr 
    });
    
    const newRequest: DepositRequest = {
        ...(requestData as any),
        id: newDocRef.id,
        status: DepositStatus.Pending,
        date: new Date(),
        displayId: displayIdStr,
    };

    return newRequest;
};

export const processDepositRequest = async (request: DepositRequest, newStatus: DepositStatus.Approved | DepositStatus.Rejected) => {
    const batch = writeBatch(db);
    const requestRef = doc(db, 'deposit_requests', request.id);
    batch.update(requestRef, { status: newStatus });

    if (newStatus === DepositStatus.Approved) {
        const userRef = doc(db, 'users', request.userId);
        // Calculate total amount including bonus
        const bonus = request.bonusAmount || 0;
        const totalCredit = request.amount + bonus;

        batch.update(userRef, { walletBalance: increment(totalCredit) });
        
        const newTransactionRef = doc(collection(db, 'transactions'));
        batch.set(newTransactionRef, {
            userId: request.userId, type: TransactionType.Credit, amount: totalCredit,
            description: `Deposit #${request.displayId} (Incl. ₹${bonus} Bonus) via ${request.utr}`, date: Timestamp.now(),
            status: newStatus, relatedId: request.id
        });
    }
    await batch.commit();
};

export const updateUser = (userId: string, data: Partial<User>) => updateDoc(doc(db, 'users', userId), data);

export const adjustUserWalletBalance = async (userId: string, amount: number, description: string): Promise<void> => {
    if (amount === 0) return;
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { walletBalance: increment(amount) });

    const newTransactionRef = doc(collection(db, 'transactions'));
    const transactionType = amount > 0 ? TransactionType.Credit : TransactionType.Debit;
    const status = amount > 0 ? DepositStatus.Approved : OrderStatus.Completed; // Generic status

    batch.set(newTransactionRef, {
        userId: userId,
        type: transactionType,
        amount: Math.abs(amount),
        description: `Admin: ${description}`,
        date: Timestamp.now(),
        status: status,
        relatedId: 'admin_adjustment'
    });
    
    await batch.commit();
};

export const getCategories = async (): Promise<Category[]> => (await getDocs(collection(db, 'categories'))).docs.map(d => ({ id: d.id, ...d.data() } as Category));
export const addCategory = (name: string, iconName: string) => addDoc(collection(db, 'categories'), { name, iconName });
export const deleteCategory = (id: string) => deleteDoc(doc(db, 'categories', id));

export const getSupportInfo = async (): Promise<SupportInfo | null> => (await getDoc(doc(db, 'settings', 'supportInfo'))).data() as SupportInfo || null;
export const updateSupportInfo = (data: Omit<SupportInfo, 'id'>) => setDoc(doc(db, 'settings', 'supportInfo'), data, { merge: true });
export const getPaymentInfo = async (): Promise<PaymentInfo | null> => (await getDoc(doc(db, 'settings', 'paymentInfo'))).data() as PaymentInfo || null;
export const updatePaymentInfo = (data: Omit<PaymentInfo, 'id'>) => setDoc(doc(db, 'settings', 'paymentInfo'), data, { merge: true });

// --- MAINTENANCE MODE SERVICES ---
export const getMaintenanceStatus = async (): Promise<MaintenanceStatus | null> => (await getDoc(doc(db, 'settings', 'maintenance'))).data() as MaintenanceStatus || null;
export const updateMaintenanceStatus = (data: MaintenanceStatus) => setDoc(doc(db, 'settings', 'maintenance'), data, { merge: true });

// --- EMAIL CONFIG SERVICES (EMAILJS) ---

export const getEmailConfig = async (): Promise<EmailConfig | null> => {
    const docRef = doc(db, 'settings', 'emailConfig');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as EmailConfig;
    }
    return null;
};

export const updateEmailConfig = async (config: EmailConfig): Promise<void> => {
    await setDoc(doc(db, 'settings', 'emailConfig'), config, { merge: true });
};

// --- ADMIN MESSAGING SERVICES ---

export const getAdminMessages = async (): Promise<AdminMessage[]> => {
    const q = query(collection(db, 'admin_messages'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate()
    } as AdminMessage));
};

export const getUserMessages = async (userId: string): Promise<AdminMessage[]> => {
    const allQ = query(collection(db, 'admin_messages'), where('target', '==', 'ALL'));
    const userQ = query(collection(db, 'admin_messages'), where('targetUserId', '==', userId));

    const [allSnap, userSnap] = await Promise.all([getDocs(allQ), getDocs(userQ)]);
    
    const msgs: AdminMessage[] = [];
    allSnap.forEach(d => msgs.push({id: d.id, ...d.data(), createdAt: (d.data().createdAt as Timestamp).toDate()} as AdminMessage));
    userSnap.forEach(d => msgs.push({id: d.id, ...d.data(), createdAt: (d.data().createdAt as Timestamp).toDate()} as AdminMessage));
    
    // Sort descending
    return msgs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export const sendAdminMessage = async (msg: Omit<AdminMessage, 'id' | 'createdAt'>): Promise<void> => {
    // 1. Save to Firestore (In-App Messaging)
    // IMPORTANT: Sanitize msg to remove undefined values which Firestore addDoc hates
    const cleanMsg = Object.entries(msg).reduce((acc, [key, value]) => {
        if (value !== undefined) {
            acc[key] = value;
        }
        return acc;
    }, {} as any);

    await addDoc(collection(db, 'admin_messages'), {
        ...cleanMsg,
        createdAt: Timestamp.now()
    });

    // 2. Try sending Real Email via EmailJS (if configured and targeting specific user)
    // We only send real emails to SPECIFIC users to avoid hitting EmailJS limits with a loop
    if (msg.target === 'SPECIFIC' && msg.targetEmail) {
        try {
            const emailConfig = await getEmailConfig();
            if (emailConfig && emailConfig.serviceId && emailConfig.templateId && emailConfig.publicKey) {
                
                // FIX: Trim credentials to avoid "The Public Key is invalid" errors caused by whitespace
                await send(
                    emailConfig.serviceId.trim(),
                    emailConfig.templateId.trim(),
                    {
                        to_name: msg.targetUserName || 'User',
                        to_email: msg.targetEmail,
                        subject: msg.subject,
                        message: msg.body,
                        reply_to: 'support@starsmmpanel.pro'
                    },
                    emailConfig.publicKey.trim()
                );
                console.log("Email sent successfully via EmailJS");
            } else {
                console.log("Email config missing, skipping email send.");
            }
        } catch (emailErr: any) {
            console.error("Failed to send email via EmailJS (Raw):", emailErr);
            // Re-throw a specific, useful error message for the UI to catch.
            if (emailErr && emailErr.text) {
                throw new Error(`EmailJS Error: ${emailErr.text}`);
            } else {
                // Fallback for unexpected EmailJS error format
                throw new Error('An unknown error occurred while sending the email via EmailJS.');
            }
        }
    }
};

export const deleteAdminMessage = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'admin_messages', id));
};

// --- COUPON SERVICES ---

export const getCoupons = async (): Promise<Coupon[]> => {
    const snapshot = await getDocs(collection(db, 'coupons'));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate(),
            expiresAt: data.expiresAt ? (data.expiresAt as Timestamp).toDate() : null
        } as Coupon;
    });
};

export const createCoupon = async (code: string, discountPercent: number, usageLimit: number, expiresAt: Date | null, isAutoApply: boolean, type: CouponType = 'discount'): Promise<void> => {
    let expiresTimestamp = null;
    if (expiresAt && !isNaN(expiresAt.getTime())) {
        expiresTimestamp = Timestamp.fromDate(expiresAt);
    }

    await addDoc(collection(db, 'coupons'), {
        code: code.toUpperCase(),
        discountPercent,
        usageLimit,
        usedCount: 0,
        expiresAt: expiresTimestamp,
        isAutoApply,
        type, // Added type
        createdAt: Timestamp.now(),
    });
};

export const deleteCoupon = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'coupons', id));
};

export const validateCoupon = async (code: string): Promise<Coupon> => {
    const q = query(collection(db, 'coupons'), where('code', '==', code.toUpperCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        throw new Error('Invalid coupon code.');
    }

    const couponDoc = snapshot.docs[0];
    const data = couponDoc.data();
    const coupon: Coupon = { 
        id: couponDoc.id, 
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
        expiresAt: data.expiresAt ? (data.expiresAt as Timestamp).toDate() : null,
    } as Coupon;

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
        throw new Error('Coupon usage limit reached.');
    }
    
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new Error('This coupon has expired.');
    }

    return coupon;
};


export const getDashboardStats = async (orders: Order[]) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); // 1st day of current month

    const stats = {
        totalRevenue: 0,
        totalOrders: orders.length,
        todaysRevenue: 0,
        todaysOrders: 0,
        monthlyRevenue: 0, 
        pendingOrders: 0,
        completedOrders: 0,
        // Limited Stats
        limitedOrders: 0,
        limitedPending: 0,
        limitedCompleted: 0,
        limitedRejected: 0,
        limitedRevenue: 0, // NEW
        limitedMonthlyRevenue: 0, // NEW
    };

    orders.forEach(order => {
        if(order.status === OrderStatus.Completed) {
             stats.totalRevenue += order.amount;
             
             // Check for Monthly Revenue
             if (order.date >= startOfMonth) {
                 stats.monthlyRevenue += order.amount;
             }

             // Check for Today's Revenue
             if (order.date >= startOfDay) {
                stats.todaysRevenue += order.amount;
            }
        }
       
        if (order.date >= startOfDay) {
            stats.todaysOrders++;
        }
        
        if (order.status === OrderStatus.Pending || order.status === OrderStatus.InProgress) {
            stats.pendingOrders++;
        }
        if (order.status === OrderStatus.Completed) {
            stats.completedOrders++;
        }

        // Limited Stats
        if (order.isLimitedOffer) {
            stats.limitedOrders++;
            if (order.status === OrderStatus.Pending) stats.limitedPending++;
            if (order.status === OrderStatus.Completed) {
                stats.limitedCompleted++;
                stats.limitedRevenue += order.amount; // Add to Limited Revenue
                if (order.date >= startOfMonth) {
                    stats.limitedMonthlyRevenue += order.amount; // Add to Limited Monthly Revenue
                }
            }
            if (order.status === OrderStatus.Cancelled) stats.limitedRejected++;
        }
    });

    return stats;
};

// --- DATA SEEDING SERVICE ---
export const seedDatabase = async () => {
    try {
        const batch = writeBatch(db);

        MOCK_CATEGORIES.forEach(cat => batch.set(doc(db, 'categories', cat.id), cat));
        MOCK_SERVICES.forEach(service => {
            const { icon, ...data } = service;
            batch.set(doc(db, 'services', service.id), { ...data, iconName: getIconName(service.icon) });
        });
        batch.set(doc(db, 'settings', 'supportInfo'), MOCK_SUPPORT_INFO);
        batch.set(doc(db, 'settings', 'paymentInfo'), MOCK_PAYMENT_INFO);
        // Initialize Counters to prevent collision with seeded data
        batch.set(doc(db, 'counters', 'services'), { current_value: 5 });

        await batch.commit();
        return true;
    } catch (error) {
        console.error("Seeding failed:", error);
        throw error;
    }
}


// --- DATA MIGRATION SERVICE ---
export const migrateDataIds = async (): Promise<{ usersUpdated: number; servicesUpdated: number }> => {
    const batch = writeBatch(db);
    let usersUpdated = 0;
    let servicesUpdated = 0;

    const usersSnapshot = await getDocs(collection(db, 'users'));
    // Relaxed check: Update only if displayId is missing or NOT numeric
    const usersToUpdate = usersSnapshot.docs.filter(doc => !doc.data().displayId || !/^\d+$/.test(doc.data().displayId));

    for (const userDoc of usersToUpdate) {
        const nextId = await getNextSequenceValue('users');
        const displayId = nextId.toString().padStart(6, '0');
        batch.update(doc(db, 'users', userDoc.id), { displayId });
        usersUpdated++;
    }

    const servicesSnapshot = await getDocs(collection(db, 'services'));
    // Relaxed check: Migrate only if ID is NOT numeric (e.g. random strings, but keep existing numeric ones)
    const servicesToMigrate = servicesSnapshot.docs.filter(doc => !/^\d+$/.test(doc.id));

    for (const serviceDoc of servicesToMigrate) {
        const oldId = serviceDoc.id;
        const oldData = serviceDoc.data();
        const nextId = await getNextSequenceValue('services');
        // INCREASED TO 6 DIGITS for capacity
        const newId = nextId.toString().padStart(6, '0');
        
        batch.set(doc(db, 'services', newId), { ...oldData, id: newId });
        batch.delete(doc(db, 'services', oldId));
        servicesUpdated++;
    }

    if (usersUpdated > 0 || servicesUpdated > 0) {
        await batch.commit();
    }
    
    return { usersUpdated, servicesUpdated };
};

// --- MOCK DATA SERVICES (for offline/dev mode) ---
const getFromStorage = <T>(key: string, fallback: T): T => JSON.parse(localStorage.getItem(key) || 'null') || fallback;
const saveToStorage = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

const updateMockUserBalance = (userId: string, amountChange: number, spentChange: number = 0) => {
    const users = getMockUsersFromStorage();
    const updatedUsers = users.map(u => {
        if (u.id === userId) {
            const newBalance = parseFloat((u.walletBalance + amountChange).toFixed(2));
            const newSpent = parseFloat((u.totalSpent + spentChange).toFixed(2));
            return { ...u, walletBalance: newBalance, totalSpent: newSpent };
        }
        return u;
    });
    saveMockUsersToStorage(updatedUsers);
};

// EXPORTED MOCK WALLET ADJUSTMENT (Updated)
export const adjustMockUserWalletBalance = (userId: string, amount: number, description: string) => {
    const users = getMockUsersFromStorage();
    const updatedUsers = users.map(u => {
        if (u.id === userId) {
            const newBalance = parseFloat((u.walletBalance + amount).toFixed(2));
            return { ...u, walletBalance: newBalance };
        }
        return u;
    });
    saveMockUsersToStorage(updatedUsers);

    const transactions = getMockTransactionsFromStorage();
    const newTransaction: Transaction = {
        id: `mock-tx-${Date.now()}`,
        userId: userId,
        type: amount > 0 ? TransactionType.Credit : TransactionType.Debit,
        amount: Math.abs(amount),
        description: `Admin: ${description}`,
        date: new Date(),
        status: amount > 0 ? DepositStatus.Approved : OrderStatus.Completed,
        relatedId: 'admin_adjustment_mock'
    };
    saveMockTransactionsToStorage([newTransaction, ...transactions]);
};


export const getMockServicesFromStorage = (): ServicePackage[] => {
    const stored = getFromStorage<ServicePackage[]>('mock_services', MOCK_SERVICES);
    // Relaxed check: Only reset if the list is empty (unlikely if defaults exist) or corrupted structure.
    // Removed strict regex check that caused reset on alphanumeric IDs (like 'new-123')
    if (!Array.isArray(stored) || stored.length === 0) {
        const freshMock = MOCK_SERVICES.map(s => ({ ...s, iconName: getIconName(s.icon) }));
        saveToStorage('mock_services', freshMock);
        return freshMock;
    }
    return stored.map(s => ({
        ...s,
        expiryDate: s.expiryDate ? new Date(s.expiryDate) : null
    }));
};

export const saveMockServicesToStorage = (services: ServicePackage[]) => saveToStorage('mock_services', services.map(s => ({ ...s, iconName: getIconName(s.icon) })));
export const deleteMockServiceFromStorage = (id: string) => saveToStorage('mock_services', getMockServicesFromStorage().filter(s => s.id !== id));

// UPDATED: Create mock service with proper numeric ID generation to simulate live behavior
export const addMockServiceToStorage = (plan: Partial<ServicePackage>) => {
    const services = getMockServicesFromStorage();
    // Find max numeric ID to increment
    const maxId = services.reduce((max, s) => {
        const num = parseInt(s.id);
        return !isNaN(num) && num > max ? num : max;
    }, 0);
    
    const newId = (maxId + 1).toString().padStart(6, '0'); // 6-digit ID like live
    const iconName = plan.icon ? getIconName(plan.icon) : 'HeartIcon';
    
    // @ts-ignore
    const newService: ServicePackage = { ...plan, id: newId, iconName };
    saveMockServicesToStorage([...services, newService]);
    return newService;
};

export const updateMockServiceInStorage = (plan: ServicePackage) => {
    const services = getMockServicesFromStorage();
    const iconName = getIconName(plan.icon);
    const updated = services.map(s => s.id === plan.id ? { ...plan, iconName } : s);
    saveMockServicesToStorage(updated);
};

export const getMockOrdersFromStorage = (): Order[] => getFromStorage('mock_orders', MOCK_ORDERS).map((o: any) => ({...o, date: new Date(o.date)}));

export const addMockOrderToStorage = (order: Omit<Order, 'displayId'>): string => {
    const orders = getMockOrdersFromStorage();
    
    // Separate Counters Logic for Mock
    const isLimited = order.isLimitedOffer;
    const sameTypeOrders = orders.filter(o => !!o.isLimitedOffer === !!isLimited);
    let maxId = 0;
    
    sameTypeOrders.forEach(o => {
        const idStr = o.displayId.replace('L', ''); // Remove 'L' prefix if present to get number
        const idNum = parseInt(idStr, 10);
        if (!isNaN(idNum) && idNum > maxId) maxId = idNum;
    });
    
    const nextId = maxId + 1;
    let displayId = nextId.toString().padStart(5, '0');
    if (isLimited) displayId = 'L' + displayId;

    saveToStorage('mock_orders', [{ ...order, displayId }, ...orders]);
    updateMockUserBalance(order.userId, -order.amount, order.amount);

    if (order.couponCode) {
        const coupons = getMockCouponsFromStorage();
        const updatedCoupons = coupons.map(c => c.code === order.couponCode ? { ...c, usedCount: c.usedCount + 1 } : c);
        saveMockCouponsToStorage(updatedCoupons);
    }
    
    // Update Mock Service Counter
    if (order.isLimitedOffer && order.serviceId) {
        const services = getMockServicesFromStorage();
        const updatedServices = services.map(s => s.id === order.serviceId ? { ...s, currentOrdersCount: (s.currentOrdersCount || 0) + 1 } : s);
        saveMockServicesToStorage(updatedServices);
    }

    const transactions = getMockTransactionsFromStorage();
    const newTransaction: Transaction = {
        id: `mock-tx-${Date.now()}`,
        userId: order.userId,
        type: TransactionType.Debit,
        amount: order.amount,
        description: `Order #${displayId} for ${order.service}`,
        date: new Date(),
        status: OrderStatus.Completed, 
        relatedId: order.id,
    };
    saveMockTransactionsToStorage([newTransaction, ...transactions]);

    return displayId;
};
export const updateMockOrderInStorage = (updatedOrder: Order) => {
    const orders = getMockOrdersFromStorage();
    const originalOrder = orders.find(o => o.id === updatedOrder.id);
    
    // Logic for mock refund
    if (updatedOrder.status === OrderStatus.Cancelled && originalOrder?.status !== OrderStatus.Cancelled) {
        updateMockUserBalance(updatedOrder.userId, updatedOrder.amount, -updatedOrder.amount);
        
        const transactions = getMockTransactionsFromStorage();
        const newTransaction: Transaction = {
            id: `mock-tx-${Date.now()}`,
            userId: updatedOrder.userId,
            type: TransactionType.Credit,
            amount: updatedOrder.amount,
            description: `Refund for Cancelled Order #${updatedOrder.displayId}`,
            date: new Date(),
            status: DepositStatus.Approved,
            relatedId: updatedOrder.id,
        };
        saveMockTransactionsToStorage([newTransaction, ...transactions]);
    }

    saveToStorage('mock_orders', orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
}

export const getMockDepositRequestsFromStorage = (): DepositRequest[] => getFromStorage('mock_deposits', MOCK_DEPOSIT_REQUESTS).map((d: any) => ({...d, date: new Date(d.date)}));

// Updated Mock Deposit - REVERTED TO PENDING
export const addMockDepositRequestToStorage = (req: Omit<DepositRequest, 'displayId'>): DepositRequest => {
    const requests = getMockDepositRequestsFromStorage();
    const displayId = (requests.length + 3).toString().padStart(7, '0');
    
    const newRequest: DepositRequest = { 
        ...req, 
        displayId, 
        status: DepositStatus.Pending 
    };
    
    saveToStorage('mock_deposits', [newRequest, ...requests]);
    
    return newRequest;
};

export const updateMockDepositRequestInStorage = (updatedReq: DepositRequest) => {
    const requests = getMockDepositRequestsFromStorage();
    const originalRequest = requests.find(r => r.id === updatedReq.id);
    const updatedRequests = requests.map(r => r.id === updatedReq.id ? updatedReq : r);
    saveToStorage('mock_deposits', updatedRequests);

    if (updatedReq.status === DepositStatus.Approved && originalRequest?.status !== DepositStatus.Approved) {
        // Calculate bonus if present
        const totalAmount = updatedReq.amount + (updatedReq.bonusAmount || 0);
        updateMockUserBalance(updatedReq.userId, totalAmount);
        
        const transactions = getMockTransactionsFromStorage();
        const newTransaction: Transaction = {
            id: `mock-tx-${Date.now()}`,
            userId: updatedReq.userId,
            type: TransactionType.Credit,
            amount: totalAmount,
            description: `Deposit #${updatedReq.displayId} via ${updatedReq.utr}`,
            date: new Date(),
            status: DepositStatus.Approved,
            relatedId: updatedReq.id,
        };
        saveMockTransactionsToStorage([newTransaction, ...transactions]);
    }
};

export const getMockTransactionsFromStorage = (): Transaction[] => getFromStorage('mock_transactions', MOCK_TRANSACTIONS).map((t: any) => ({...t, date: new Date(t.date)}));
export const saveMockTransactionsToStorage = (txs: Transaction[]) => saveToStorage('mock_transactions', txs);

export const getMockSupportInfoFromStorage = (): SupportInfo => getFromStorage('mock_support', MOCK_SUPPORT_INFO);
export const saveMockSupportInfoToStorage = (info: SupportInfo) => saveToStorage('mock_support', info);
export const getMockPaymentInfoFromStorage = (): PaymentInfo => getFromStorage('mock_payment', MOCK_PAYMENT_INFO);
export const saveMockPaymentInfoToStorage = (info: PaymentInfo) => saveToStorage('mock_payment', info);

export const getMockUsersFromStorage = (): User[] => getFromStorage('mock_users', Object.values(MOCK_USERS));
export const getMockUserFromStorage = (userId: string): User | undefined => getMockUsersFromStorage().find(u => u.id === userId);
export const saveMockUsersToStorage = (users: User[]) => saveToStorage('mock_users', users);
export const getMockCategoriesFromStorage = (): Category[] => getFromStorage('mock_categories', MOCK_CATEGORIES);
export const addMockCategoryToStorage = (name: string, iconName: string) => saveToStorage('mock_categories', [...getMockCategoriesFromStorage(), { id: `mock-cat-${Date.now()}`, name, iconName }]);
export const deleteMockCategoryFromStorage = (id: string) => saveToStorage('mock_categories', getMockCategoriesFromStorage().filter(c => c.id !== id));

export const getMockMaintenanceStatusFromStorage = (): MaintenanceStatus => getFromStorage('mock_maintenance', { isEnabled: false, message: '' });
export const saveMockMaintenanceStatusToStorage = (status: MaintenanceStatus) => saveToStorage('mock_maintenance', status);

// Mock Coupon Services
export const getMockCouponsFromStorage = (): Coupon[] => getFromStorage('mock_coupons', MOCK_COUPONS).map((c: any) => ({ 
    ...c, 
    createdAt: new Date(c.createdAt),
    expiresAt: c.expiresAt ? new Date(c.expiresAt) : null 
}));
export const saveMockCouponsToStorage = (coupons: Coupon[]) => saveToStorage('mock_coupons', coupons);
export const createMockCoupon = (code: string, discountPercent: number, usageLimit: number, expiresAt: Date | null, isAutoApply: boolean, type: CouponType = 'discount') => {
    const coupons = getMockCouponsFromStorage();
    const newCoupon: Coupon = {
        id: `mock-coupon-${Date.now()}`,
        code: code.toUpperCase(),
        discountPercent,
        usageLimit,
        usedCount: 0,
        expiresAt,
        isAutoApply,
        type, // Added type
        createdAt: new Date(),
    };
    saveMockCouponsToStorage([...coupons, newCoupon]);
};
export const deleteMockCoupon = (id: string) => saveToStorage('mock_coupons', getMockCouponsFromStorage().filter(c => c.id !== id));
export const validateMockCoupon = (code: string): Coupon => {
    const coupons = getMockCouponsFromStorage();
    const coupon = coupons.find(c => c.code === code.toUpperCase());
    if (!coupon) throw new Error('Invalid coupon code.');
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw new Error('Coupon usage limit reached.');
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) throw new Error('This coupon has expired.');
    return coupon;
};

// --- MOCK MESSAGE SERVICES ---
export const getMockMessagesFromStorage = (): AdminMessage[] => getFromStorage('mock_messages', []).map((m:any) => ({...m, createdAt: new Date(m.createdAt)}));
export const sendMockMessage = (msg: Omit<AdminMessage, 'id' | 'createdAt'>) => {
    const messages = getMockMessagesFromStorage();
    const newMessage = { ...msg, id: `mock-msg-${Date.now()}`, createdAt: new Date() };
    saveToStorage('mock_messages', [newMessage, ...messages]);
};
export const deleteMockMessage = (id: string) => {
    const messages = getMockMessagesFromStorage();
    saveToStorage('mock_messages', messages.filter(m => m.id !== id));
};

export const getMockUserMessagesFromStorage = (userId: string): AdminMessage[] => {
    const messages = getMockMessagesFromStorage();
    return messages.filter(msg => msg.target === 'ALL' || msg.targetUserId === userId)
                   .sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
};

// --- MOCK SECURITY SERVICES ---
export const getMockAdminSecurityFromStorage = (): AdminSecurityConfig | null => getFromStorage('mock_security', null);
export const saveMockAdminSecurityToStorage = (pin: string) => saveToStorage('mock_security', { pin });
