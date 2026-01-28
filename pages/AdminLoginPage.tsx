
import React, { useState } from 'react';
import { User } from '../types';
import { authenticateUser } from '../firebase/services';
import { MOCK_USERS } from '../constants';
import ThemeToggle from '../components/ThemeToggle';
import { useNav } from '../routing';

interface AdminLoginPageProps {
    onLoginSuccess: (user: User) => void;
    theme: string;
    onToggleTheme: () => void;
}

const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess, theme, onToggleTheme }) => {
    const { navigate } = useNav();
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAdminLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        const cleanInput = usernameOrEmail.trim();
        const cleanPassword = password.trim();

        if (!cleanInput || !cleanPassword) {
            setError('Please enter both email and password.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Attempt live authentication
            const user = await authenticateUser(cleanInput, cleanPassword);
            if (user.role !== 'admin') {
                throw new Error("Access Denied: You do not have administrative privileges.");
            }
            onLoginSuccess(user);
        } catch (err: any) {
            console.error("Login attempt error:", err);
            
            const errorCode = err.code || '';
            let errorMsg = err.message || 'An unknown error occurred.';

            // Allow Mock Admin Login fallback
            if (
                (errorCode === 'auth/network-request-failed' || errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') &&
                cleanInput === MOCK_USERS.admin.email && 
                cleanPassword === MOCK_USERS.admin.password
            ) {
                 alert("Logging in via Offline/Mock Mode for Admin.");
                 onLoginSuccess(MOCK_USERS.admin);
                 return;
            }

            if (errorCode === 'auth/network-request-failed') {
                 errorMsg = 'Network error. Please check your internet connection.';
            } else if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found') {
                errorMsg = 'Invalid email or password. Please try again.';
            } else if (errorMsg.toLowerCase().includes('permission')) {
                errorMsg = 'Database permission denied. Please fix Firestore Rules in Firebase Console.';
            }

            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Decorative Blobs */}
            <div className="absolute -top-16 -left-16 w-64 h-64 bg-primary/20 rounded-full opacity-30 filter blur-3xl animate-blob"></div>
            <div className="absolute -bottom-24 -right-8 w-72 h-72 bg-purple-500/20 rounded-full opacity-30 filter blur-3xl animate-blob animation-delay-2000"></div>
            
            <div className="absolute top-4 right-4 z-20">
                <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            </div>

            <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-white border border-white/10 z-10 fade-in-up">
                <div className="text-center mb-8">
                    <div className="inline-block p-3 rounded-2xl bg-primary/10 mb-4 border border-primary/20">
                        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8-0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Admin Login
                    </h1>
                    <p className="text-slate-400 text-sm">Secure access to control panel</p>
                </div>
                
                <form onSubmit={handleAdminLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                        <input
                            type="email"
                            placeholder="admin@example.com"
                            value={usernameOrEmail}
                            onChange={(e) => setUsernameOrEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
                        />
                    </div>
                    
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg text-center animate-pulse">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-secondary hover:brightness-110 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Authenticating...
                            </>
                        ) : 'Sign In to Panel'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-3">
                    <button 
                        onClick={() => navigate('/')} 
                        className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <span>&larr;</span> Back to User Website
                    </button>
                </div>
            </div>
            
            <p className="mt-8 text-[10px] text-slate-500 font-bold tracking-widest uppercase opacity-60">
                © 2026 STAR SMM PANEL. All rights reserved.
            </p>
        </div>
    );
};
export default AdminLoginPage;
