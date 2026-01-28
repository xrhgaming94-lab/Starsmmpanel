
import React, { useState, useCallback, useEffect } from 'react';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import { User } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import { signOut, onAuthStateChanged } from '@firebase/auth';
import { auth, db } from './firebase/config';
import { MOCK_USERS } from './constants';
import { getUser, getAdminSecurity, getMockAdminSecurityFromStorage, getMockUsersFromStorage } from './firebase/services';
import { doc, setDoc } from 'firebase/firestore';
import { ShieldExclamationIcon, XMarkIcon, LockClosedIcon, ArrowRightOnRectangleIcon } from './components/Icons';
import { useNav } from './routing';

const AdminApp: React.FC = () => {
    const { navigate } = useNav();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [permissionError, setPermissionError] = useState(false);
    const [copied, setCopied] = useState(false);
    
    // PIN Security State
    const [isPinVerified, setIsPinVerified] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [savedPin, setSavedPin] = useState<string | null>(null);
    const [pinError, setPinError] = useState('');
    const [verifyingPin, setVerifyingPin] = useState(false);
    const [securityLoading, setSecurityLoading] = useState(true);

    // 1. Fetch PIN Configuration Immediately (Gatekeeper)
    useEffect(() => {
        const fetchSecurity = async () => {
            try {
                // Try to fetch live PIN (Settings are publicly readable per rules usually)
                let securityConfig = await getAdminSecurity();
                if (!securityConfig) {
                    // Fallback to mock if live returns nothing/fails
                    securityConfig = getMockAdminSecurityFromStorage();
                }

                if (securityConfig && securityConfig.pin) {
                    setSavedPin(securityConfig.pin);
                    setIsPinVerified(false); // Locked by default
                } else {
                    setSavedPin(null);
                    setIsPinVerified(true); // Open if no PIN set
                }
            } catch (e) {
                console.log("Security config fetch error (likely offline or rules), checking local mock");
                const mockSec = getMockAdminSecurityFromStorage();
                if (mockSec && mockSec.pin) {
                    setSavedPin(mockSec.pin);
                    setIsPinVerified(false);
                } else {
                    // If we can't verify a PIN exists, we default to open to prevent lockout during setup,
                    // OR we could fail secure. Here we assume open for first-time setup.
                    setSavedPin(null);
                    setIsPinVerified(true);
                }
            } finally {
                setSecurityLoading(false);
            }
        };
        fetchSecurity();
    }, []);

    // 2. Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                 try {
                    let appUser = null;
                    try {
                        appUser = await getUser(firebaseUser.uid);
                    } catch (e: any) {
                        if (e.code === 'permission-denied') {
                             setPermissionError(true);
                             setLoading(false);
                             return;
                        }
                        // Offline check
                        if (e.message && (e.message.includes('offline') || e.code === 'unavailable')) {
                            const mockUsers = getMockUsersFromStorage();
                            const foundUser = mockUsers.find(u => u.email === firebaseUser.email || u.id === firebaseUser.uid);
                            if (foundUser && foundUser.role === 'admin') appUser = foundUser;
                            else if (firebaseUser.email === MOCK_USERS.admin.email) appUser = MOCK_USERS.admin;
                        }
                    }
                    
                    // Fallback Super Admin Init
                    if (!appUser && firebaseUser.email === MOCK_USERS.admin.email) {
                        const newAdmin: User = {
                            id: firebaseUser.uid,
                            name: 'Super Admin',
                            email: firebaseUser.email!,
                            avatarUrl: firebaseUser.photoURL || `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
                            role: 'admin',
                            walletBalance: 0,
                            totalSpent: 0,
                            status: 'Active',
                        };
                        try { await setDoc(doc(db, 'users', firebaseUser.uid), newAdmin); } catch (e) {}
                        appUser = newAdmin;
                    }

                    if (appUser && appUser.role === 'admin') {
                        setCurrentUser(appUser);
                        setPermissionError(false);
                        // If user is already logged in, we consider them verified
                        setIsPinVerified(true); 
                    } else {
                        await signOut(auth);
                        setCurrentUser(null);
                    }
                } catch (error) {
                    console.error("Auth check failed:", error);
                    setPermissionError(true);
                }
            } else {
                setCurrentUser(null);
                // If logged out, we rely on the initial fetchSecurity state for verify status
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleToggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    };

    const handleLoginSuccess = (user: User) => {
        setCurrentUser(user);
        setIsPinVerified(true);
    };

    const handleLogout = useCallback(async () => {
        try {
            await signOut(auth);
            setCurrentUser(null);
            // On logout, re-lock the gatekeeper if a PIN exists
            if (savedPin) setIsPinVerified(false);
            setPinInput('');
        } catch (error) {
            console.error("Error signing out: ", error);
            setCurrentUser(null);
        }
    }, [savedPin]);

    const handleVerifyPin = (e: React.FormEvent) => {
        e.preventDefault();
        setVerifyingPin(true);
        setPinError('');
        
        setTimeout(() => {
            if (pinInput === savedPin) {
                setIsPinVerified(true);
            } else {
                setPinError('Incorrect PIN');
                setPinInput('');
            }
            setVerifyingPin(false);
        }, 500);
    };

    if (loading || securityLoading) return <div className="min-h-screen bg-gray-100 dark:bg-base-200 flex items-center justify-center"><LoadingSpinner /></div>;

    if (permissionError) {
        // [Existing permission error modal logic - kept minimal for brevity]
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-base-200 flex flex-col items-center justify-center p-4 text-gray-800 dark:text-text-primary">
                <div className="bg-white dark:bg-base-100 p-6 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-base-300 text-center relative">
                    <ShieldExclamationIcon className="w-16 h-16 text-red-500 mx-auto" />
                    <h2 className="text-2xl font-bold mt-4">Permission Denied</h2>
                    <p className="text-gray-500 mt-2">Please check your Firestore Security Rules.</p>
                    <button onClick={() => window.location.reload()} className="mt-6 w-full py-3 bg-green-600 text-white font-bold rounded-lg">Refresh App</button>
                </div>
            </div>
        );
    }

    // --- GATEKEEPER: PIN VERIFICATION SCREEN (BEFORE LOGIN) ---
    // Show this if:
    // 1. User is NOT logged in
    // 2. A PIN is configured in DB
    // 3. PIN has NOT been verified yet in this session
    if (!currentUser && savedPin && !isPinVerified) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 relative font-sans overflow-hidden">
                {/* Background Animation */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                    <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-blob"></div>
                    <div className="absolute top-1/2 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
                </div>

                <div className="w-full max-w-sm glass-card rounded-3xl shadow-2xl p-8 z-10 border border-white/10 text-center animate-scale-in">
                    <div className="mx-auto w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        <LockClosedIcon className="w-10 h-10 text-white animate-pulse" />
                    </div>
                    
                    <h2 className="text-2xl font-black text-white mb-2 tracking-wide uppercase">Admin Access</h2>
                    <p className="text-sm text-slate-400 mb-8 font-medium">Enter security PIN to proceed to login</p>

                    <form onSubmit={handleVerifyPin} className="space-y-6">
                        <div>
                            <input 
                                type="password" 
                                value={pinInput} 
                                onChange={e => {
                                    if (/^\d*$/.test(e.target.value) && e.target.value.length <= 6) {
                                        setPinInput(e.target.value);
                                    }
                                }}
                                placeholder="• • • •" 
                                className="w-full bg-white/5 border border-white/20 rounded-2xl px-4 py-4 text-center text-3xl font-black text-white tracking-[0.5em] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-600 placeholder:text-lg placeholder:tracking-normal"
                                autoFocus
                            />
                        </div>

                        {pinError && (
                            <div className="text-red-500 font-bold text-sm bg-red-500/10 py-2 rounded-lg animate-pulse">
                                {pinError}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={!pinInput || verifyingPin}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm flex items-center justify-center"
                        >
                            {verifyingPin ? 'Checking...' : 'UNLOCK PANEL'}
                        </button>
                    </form>

                    <button onClick={() => navigate('/')} className="mt-8 text-xs text-slate-500 hover:text-white transition-colors font-bold uppercase tracking-wider flex items-center justify-center gap-2 w-full">
                       <ArrowRightOnRectangleIcon className="w-4 h-4 rotate-180"/> Back to User Site
                    </button>
                </div>
                
                <p className="mt-8 text-[10px] text-slate-500 font-bold tracking-widest uppercase opacity-60 z-10">
                    © 2026 STARSMM PANEL. All rights reserved
                </p>
            </div>
        );
    }

    if (!currentUser) {
        return <AdminLoginPage onLoginSuccess={handleLoginSuccess} theme={theme} onToggleTheme={handleToggleTheme} />;
    }

    return <AdminDashboard key={currentUser.id} user={currentUser} onLogout={handleLogout} theme={theme} onToggleTheme={handleToggleTheme} />;
};
export default AdminApp;
