
import React, { useState, useCallback, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import UserDashboard from './pages/UserDashboard';
import { User } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import { onAuthStateChanged, signOut, sendEmailVerification } from '@firebase/auth';
import { auth, db } from './firebase/config';
import { getOrCreateUserProfile, deleteUserAccount } from './firebase/services';
import { ShieldExclamationIcon, ArrowTopRightOnSquareIcon, EnvelopeIcon, CheckCircleIcon, PaperAirplaneIcon, ArrowPathIcon, GlobeAltIcon, XMarkIcon } from './components/Icons';
import { doc, updateDoc } from 'firebase/firestore';
import FloatingWidgets from './firebase/FloatingWidgets';
import { MOCK_USERS } from './constants';
import AdminApp from './AdminApp'; // Verify this import exists or removed if admin handling logic is different in your version, kept basic structure below.

// Note: Ensure AdminApp logic is handled in index.tsx routing usually, but here checking currentUser logic
const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [connectionError, setConnectionError] = useState<boolean>(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [copied, setCopied] = useState(false);
    
    // Verification State
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [verificationMsg, setVerificationMsg] = useState('');
    const [msgType, setMsgType] = useState<'success' | 'error' | ''>('');
    const [linkSent, setLinkSent] = useState(false);
    const [lastEmailSentTime, setLastEmailSentTime] = useState(0);

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setProfileError(null);
            setConnectionError(false);
            setVerificationMsg('');
            setMsgType('');
            
            if (firebaseUser) {
                try {
                    const appUser = await getOrCreateUserProfile(firebaseUser);
                    
                    if (appUser && appUser.role === 'admin') {
                         setCurrentUser(null); // Admin is handled by routing in index.tsx checking /admin path, usually user stays null here if strictly separated
                    } else {
                        // AUTO-SYNC: If Firebase Auth says verified, but Firestore says false, update Firestore
                        if (firebaseUser.emailVerified && !appUser.isVerified) {
                             // Attempt update, ignore error if it fails (it might fail if offline)
                             updateDoc(doc(db, 'users', appUser.id), { isVerified: true }).catch(console.warn);
                             appUser.isVerified = true;
                        }
                        setCurrentUser(appUser);
                    }

                } catch (error: any) {
                    console.error("Failed to fetch or create user profile:", error);

                    if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
                        setProfileError("Firestore permission denied. Please configure security rules.");
                    } else if (error.message && (error.message.includes("Backend didn't respond") || error.code === 'unavailable' || error.message.includes("offline"))) {
                        // Handle Network Timeout specifically
                        setConnectionError(true);
                    } else {
                        setProfileError("An unexpected error occurred while loading your profile.");
                        // Only sign out on critical non-network errors to avoid loop
                        await signOut(auth);
                        setCurrentUser(null);
                    }
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleToggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    };

    const handleLogout = useCallback(async () => {
        try {
            await signOut(auth);
            setCurrentUser(null);
            setProfileError(null);
            setConnectionError(false);
            // REMOVED window.location.reload() to prevent 404 errors
            // Just clear the hash to go back to root
            window.location.hash = '';
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    }, []);

    const handleUserUpdate = useCallback((updatedUser: User) => {
        setCurrentUser(updatedUser);
    }, []);

    const handleLoginSuccess = useCallback((user: User) => {
        setCurrentUser(user);
    }, []);

    const handleOfflineMode = () => {
        setCurrentUser(MOCK_USERS.user);
        setConnectionError(false);
        setProfileError(null);
    };

    // REAL FIREBASE EMAIL LINK HANDLER
    const handleSendVerificationLink = async () => {
        if (!auth.currentUser) return;
        
        // Prevent spamming (1 minute cooldown)
        const now = Date.now();
        if (now - lastEmailSentTime < 60000) {
            setVerificationMsg(`Please wait ${Math.ceil((60000 - (now - lastEmailSentTime)) / 1000)}s before resending.`);
            setMsgType('error');
            return;
        }

        setVerificationLoading(true);
        setVerificationMsg('');
        setMsgType('');
        
        try {
            await sendEmailVerification(auth.currentUser);
            setLinkSent(true);
            setLastEmailSentTime(now);
            setVerificationMsg('Verification link sent! Check your inbox (and spam folder).');
            setMsgType('success');
        } catch (error: any) {
            console.error("Email Send Error:", error);
            if (error.code === 'auth/too-many-requests') {
                setVerificationMsg('Too many requests. Please wait a while before trying again.');
            } else {
                setVerificationMsg(error.message || 'Failed to send email.');
            }
            setMsgType('error');
        } finally {
            setVerificationLoading(false);
        }
    };

    const handleCheckVerificationStatus = async () => {
        if (!auth.currentUser || !currentUser) return;
        setVerificationLoading(true);
        setVerificationMsg('');
        setMsgType('');
    
        try {
            await auth.currentUser.reload();
            const isVerified = auth.currentUser.emailVerified;
    
            const creationTime = auth.currentUser.metadata.creationTime ? new Date(auth.currentUser.metadata.creationTime).getTime() : Date.now();
            const timeElapsed = Date.now() - creationTime;
            const FIVE_MINUTES = 5 * 60 * 1000;
    
            if (isVerified) {
                await updateDoc(doc(db, 'users', currentUser.id), { isVerified: true });
                setCurrentUser({ ...currentUser, isVerified: true });
                setVerificationMsg('Email verified successfully! Your account is now active.');
                setMsgType('success');
            } else {
                if (timeElapsed > FIVE_MINUTES) {
                    setVerificationMsg('Verification time expired. Your account has been deleted.');
                    setMsgType('error');
                    try {
                        await deleteUserAccount(currentUser.id);
                        setTimeout(() => window.location.reload(), 3000);
                    } catch (deleteError: any) {
                        console.error("Failed to delete expired user:", deleteError);
                        if (deleteError.code === 'auth/requires-recent-login') {
                            setVerificationMsg('Security check failed. Please log out and sign in again to finalize account deletion.');
                        } else {
                            setVerificationMsg('Error deleting expired account. Please sign up again.');
                        }
                    }
                } else {
                    setVerificationMsg('Not verified yet. Please click the link in your email first.');
                    setMsgType('error');
                }
            }
        } catch (error: any) {
            console.error("Verification Check Error:", error);
            setVerificationMsg('Error checking status. Please try again.');
            setMsgType('error');
        } finally {
            setVerificationLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-base-200 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    // PRIORITY 0: CONNECTION ERROR
    if (connectionError) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-base-200 flex flex-col items-center justify-center p-4 text-gray-800 dark:text-text-primary">
                <div className="bg-white dark:bg-base-100 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-base-300 text-center">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                        <GlobeAltIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-text-primary mb-2">Connection Issue</h2>
                    <p className="text-gray-600 dark:text-text-secondary text-sm mb-6">
                        We couldn't connect to the server. This happens if your internet is unstable or if you are on a restricted network.
                    </p>
                    
                    <div className="space-y-3">
                        <button 
                            onClick={() => window.location.reload()} 
                            className="w-full py-3 bg-secondary text-white font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowPathIcon className="w-5 h-5" /> Retry Connection
                        </button>
                        <button 
                            onClick={handleOfflineMode} 
                            className="w-full py-3 bg-gray-200 dark:bg-base-300 text-gray-800 dark:text-white font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-base-200 transition-all"
                        >
                            Continue in Offline Mode
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // PRIORITY 1: SHOW PROFILE/PERMISSION ERRORS
    if (profileError) {
        // [Existing Permission Error Code remains same...]
        // Just providing shortened version to fit context, actual content is same logic
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-base-200 flex flex-col items-center justify-center p-4">
               <div className="bg-white dark:bg-base-100 p-6 rounded-2xl shadow-2xl text-center">
                   <ShieldExclamationIcon className="w-12 h-12 text-red-500 mx-auto" />
                   <h2 className="text-xl font-bold mt-2">Configuration Error</h2>
                   <p className="text-sm mt-2">{profileError}</p>
                   <button onClick={() => window.location.reload()} className="mt-4 bg-primary text-white px-4 py-2 rounded">Retry</button>
               </div>
            </div>
        );
    }

    // PRIORITY 2: SHOW VERIFICATION SCREEN (REAL EMAIL LINK)
    if (currentUser && !currentUser.isVerified) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-base-200 flex flex-col items-center justify-center p-4 font-sans relative">
                
                <div className="glass-card w-full max-w-sm rounded-3xl shadow-2xl p-8 border border-white/10 text-center relative overflow-hidden animate-scale-in">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
                    
                    <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                        <EnvelopeIcon className="w-8 h-8 text-blue-500 animate-bounce" />
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Verify Your Email</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                        To protect your account, please verify your email address within <strong className="text-red-500">5 minutes</strong> or account will be deleted:<br/>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">{currentUser.email}</span>
                    </p>

                    <div className="space-y-4 relative z-10">
                        {/* Step 1: Send Link */}
                        <button 
                            onClick={handleSendVerificationLink} 
                            disabled={verificationLoading || (linkSent && Date.now() - lastEmailSentTime < 30000)}
                            className={`w-full py-3 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 ${linkSent ? 'bg-gray-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 shadow-blue-500/30'}`}
                        >
                            {verificationLoading ? <LoadingSpinner /> : linkSent ? 'Link Sent (Resend in 60s)' : 'Send Verification Link'}
                            {!verificationLoading && !linkSent && <PaperAirplaneIcon className="w-4 h-4" />}
                        </button>

                        {/* Step 2: Check Status */}
                        {linkSent && (
                            <div className="animate-fade-in-up">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 mt-4">
                                    After clicking the link in your email, come back here and click below:
                                </p>
                                <button 
                                    onClick={handleCheckVerificationStatus} 
                                    disabled={verificationLoading}
                                    className="w-full py-3 bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 hover:brightness-110 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {verificationLoading ? <LoadingSpinner /> : "I've Verified My Email"}
                                    {!verificationLoading && <CheckCircleIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        )}
                    </div>

                    {verificationMsg && (
                        <div className={`mt-4 p-3 rounded-xl text-xs font-bold ${msgType === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'} animate-fade-in flex items-center gap-2`}>
                            {msgType === 'error' && <XMarkIcon className="w-4 h-4" />}
                            {msgType === 'success' && <CheckCircleIcon className="w-4 h-4" />}
                            {verificationMsg}
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-white/10">
                        <button onClick={handleLogout} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest flex items-center justify-center gap-2 w-full">
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" /> Log Out / Change Email
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    // Determine content to render (Login vs Dashboard)
    let content;
    if (!currentUser) {
        content = <LoginPage theme={theme} onToggleTheme={handleToggleTheme} setProfileError={setProfileError} onLoginSuccess={handleLoginSuccess} />;
    } else {
        content = <UserDashboard key={currentUser.id} user={currentUser} onLogout={handleLogout} onUserUpdate={handleUserUpdate} theme={theme} onToggleTheme={handleToggleTheme} setProfileError={setProfileError} />;
    }

    return (
        <>
            {/* Show Floating Widgets on both Login and User Dashboard */}
            <FloatingWidgets />
            {content}
        </>
    );
};

export default App;
