
import React, { useState } from 'react';
import { GoogleIcon, EyeIcon, EyeSlashIcon, EnvelopeIcon, UserCircleIcon, PhoneIcon, LockClosedIcon } from '../components/Icons';
import { createUser, authenticateUser, handleGoogleSignIn, sendPasswordReset } from '../firebase/services';
import { signOut } from '@firebase/auth';
import { auth } from '../firebase/config';
import { useNav } from '../routing';
import { MOCK_USERS } from '../constants';
import { User } from '../types';

interface LoginPageProps {
    theme: string;
    onToggleTheme: () => void;
    setProfileError: (error: string) => void;
    onLoginSuccess?: (user: User) => void;
}

type AuthView = 'signin' | 'signup' | 'forgot_password';

const FormInput: React.FC<{
    label: string;
    type: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    error?: string;
    rightElement?: React.ReactNode;
}> = ({ label, type, name, value, onChange, placeholder, error, rightElement }) => (
    <div className="mb-4">
        <label className="block text-xs font-bold mb-2 text-slate-400 uppercase tracking-wider">
            {label}
        </label>
        <div className="relative">
            <input 
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full px-4 py-3.5 bg-[#1e293b] border rounded-2xl text-slate-200 placeholder-slate-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-300 ${error ? 'border-red-500/50 ring-red-500/20' : 'border-[#334155] focus:border-green-500'}`}
            />
            {rightElement && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>}
        </div>
        {error && <p className="text-red-500 text-[10px] mt-1 font-bold">{error}</p>}
    </div>
);

const LoginPage: React.FC<LoginPageProps> = ({ theme, onToggleTheme, setProfileError, onLoginSuccess }) => {
    const { navigate } = useNav();
    const [view, setView] = useState<AuthView>('signin');
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    const [isDomainUnauthorized, setIsDomainUnauthorized] = useState(false);
    
    const [showSignInPassword, setShowSignInPassword] = useState(false);
    const [showSignUpPassword, setShowSignUpPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [signUpData, setSignUpData] = useState({
        username: '',
        email: '',
        whatsapp: '',
        password: '',
        confirmPassword: '',
    });
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [signUpErrors, setSignUpErrors] = useState<Partial<typeof signUpData> & { terms?: string }>({});

    const [signInData, setSignInData] = useState({ username: '', password: '' });

    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState({ type: '', text: '' });

    const handleSignUpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSignUpData(prev => ({ ...prev, [name]: value }));
    };

    const handleSignInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSignInData(prev => ({ ...prev, [name]: value }));
    };

    const validateSignUp = () => {
        const newErrors: typeof signUpErrors = {};
        
        if (!signUpData.username.trim()) newErrors.username = 'Username is required.';
        
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!signUpData.email.trim()) {
            newErrors.email = 'Email is required.';
        } else if (!emailRegex.test(signUpData.email)) {
            newErrors.email = 'Enter a valid email address.';
        }

        if (!signUpData.whatsapp.trim()) newErrors.whatsapp = 'WhatsApp is required.';
        
        if (!signUpData.password || signUpData.password.length < 6 || signUpData.password.length > 12) {
            newErrors.password = 'Password must be 6-12 chars.';
        }
        if (signUpData.password !== signUpData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match.';
        }
        
        if (!termsAccepted) newErrors.terms = 'Agree to terms.';
        
        setSignUpErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSignUpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateSignUp()) return;
        setAuthError('');
        setIsDomainUnauthorized(false);
        setIsLoading(true);
        try {
            await createUser({
                name: signUpData.username,
                email: signUpData.email,
                whatsapp: signUpData.whatsapp,
                password: signUpData.password,
            });
        } catch (error: any) {
            console.error("Signup Error:", error);
            if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
                setProfileError("Firestore permission denied. Please configure security rules.");
                return;
            } else if (error.code === 'auth/email-already-in-use') {
                setAuthError("This email is already registered. Please Login.");
            } else if (error.code === 'auth/weak-password') {
                setAuthError("Password is too weak.");
            } else {
                setAuthError(error.message || "Error creating account.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignInSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        setIsDomainUnauthorized(false);
        if (!signInData.username || !signInData.password) {
            setAuthError("Please fill in all fields.");
            return;
        }
        setIsLoading(true);
        try {
            const user = await authenticateUser(signInData.username, signInData.password);
            if (user.role === 'admin') {
                await signOut(auth);
                setAuthError("Use Admin Portal for admin access.");
                setIsLoading(false);
                return;
            }
            if (onLoginSuccess) onLoginSuccess(user);
        } catch (error: any) {
            console.error("Login Error:", error);
            
            // Allow Mock Login fallback if credentials match MOCK_USER, regardless of network or invalid credential error
            // This is useful for testing when live users haven't been created yet.
            if (
                (error.code === 'auth/network-request-failed' || error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') &&
                signInData.username === MOCK_USERS.user.email && 
                signInData.password === MOCK_USERS.user.password && 
                onLoginSuccess
            ) {
                 alert("Logging in via Offline/Mock Mode.");
                 onLoginSuccess(MOCK_USERS.user);
                 return;
            }

            if (error.code === 'auth/network-request-failed') {
                 setAuthError("Network error. Please check internet.");
            } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setAuthError("Invalid Email or Password.");
            } else {
                setAuthError("Login failed. Check details.");
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGoogleLogin = async () => {
        setAuthError('');
        setIsDomainUnauthorized(false);
        setIsLoading(true);
        try {
            const user = await handleGoogleSignIn();
            if (user.role === 'admin') {
                navigate('/admin');
            }
        } catch (error: any) {
            console.error("Google Login Error:", error);
            if (error.code === 'auth/unauthorized-domain') {
                setIsDomainUnauthorized(true);
            } else if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
                setProfileError("Firestore permission denied. Please configure security rules.");
            } else if (error.code === 'auth/popup-closed-by-user') {
                setAuthError("Login popup was closed.");
            } else {
                setAuthError(`Google Login failed: ${error.message || 'Please try again.'}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        setIsDomainUnauthorized(false);
        setResetMessage({ type: '', text: '' });
        if (!resetEmail) {
            setResetMessage({ type: 'error', text: 'Please enter your email address.' });
            return;
        }
        setIsLoading(true);
        try {
            await sendPasswordReset(resetEmail);
            setResetMessage({ type: 'success', text: 'Password reset link sent! Check your email.' });
        } catch (error: any) {
            console.error("Password Reset Error:", error);
            setResetMessage({ type: 'error', text: error.message || 'Failed to send reset link.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] bg-gradient-to-b from-[#1e1b4b] to-[#0f172a] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Admin Login Icon - Top Right Corner */}
            <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
                <button onClick={onToggleTheme} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button 
                    onClick={() => navigate('/admin')}
                    className="p-2 rounded-full bg-white/5 hover:bg-pink-500/20 text-slate-400 hover:text-pink-500 transition-all"
                    title="Admin Access"
                >
                    <UserCircleIcon className="w-6 h-6" />
                </button>
            </div>

            <div className="w-full max-w-[400px] z-10">
                <div className="bg-[#1e293b]/50 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl border border-white/5 overflow-hidden p-8 relative">
                    
                    {/* Header Branding */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-black text-pink-500 tracking-tight leading-none mb-2 drop-shadow-lg">
                            STAR SMM<br />PANEL
                        </h1>
                        
                        <div className="bg-[#0f172a]/80 rounded-2xl p-4 mt-6 border border-white/5">
                            <p className="text-sm font-medium text-slate-300 leading-relaxed">
                                <span className="text-pink-500 font-bold">#1 best smm panel</span> | grow your social media: instagram facebook youtube more
                            </p>
                        </div>
                    </div>

                    {/* Auth Body */}
                    <div>
                        {/* Error Messages */}
                        {authError && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold text-center">{authError}</div>}
                        
                        {isDomainUnauthorized && (
                            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-xs text-center">
                                <p className="font-bold mb-1">Domain Not Authorized</p>
                                <p>Add domain to Firebase Console.</p>
                            </div>
                        )}

                        {view === 'signin' && (
                            <form onSubmit={handleSignInSubmit} className="space-y-5 animate-fade-in">
                                <FormInput label="Email Address" type="email" name="username" value={signInData.username} onChange={handleSignInChange} placeholder="you@example.com" />
                                <div>
                                    <FormInput 
                                        label="Password" 
                                        type={showSignInPassword ? 'text' : 'password'} 
                                        name="password" 
                                        value={signInData.password} 
                                        onChange={handleSignInChange} 
                                        placeholder="••••••••" 
                                        rightElement={<button type="button" onClick={() => setShowSignInPassword(!showSignInPassword)} className="text-slate-500 hover:text-white">{showSignInPassword ? <EyeSlashIcon className="w-4 h-4"/> : <EyeIcon className="w-4 h-4"/>}</button>}
                                    />
                                    <div className="flex justify-end mt-1">
                                        <button type="button" onClick={() => setView('forgot_password')} className="text-[10px] font-bold text-slate-500 hover:text-slate-300">Forgot Password?</button>
                                    </div>
                                </div>

                                <button type="submit" disabled={isLoading} className="w-full py-4 bg-green-500 hover:bg-green-400 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isLoading ? 'Loading...' : 'Login Now'}
                                </button>
                            </form>
                        )}

                        {view === 'signup' && (
                            <form onSubmit={handleSignUpSubmit} className="space-y-4 animate-fade-in">
                                <FormInput label="Username" type="text" name="username" value={signUpData.username} onChange={handleSignUpChange} placeholder="Choose username" error={signUpErrors.username} />
                                <FormInput label="Email" type="email" name="email" value={signUpData.email} onChange={handleSignUpChange} placeholder="you@example.com" error={signUpErrors.email} />
                                <FormInput label="WhatsApp" type="tel" name="whatsapp" value={signUpData.whatsapp} onChange={handleSignUpChange} placeholder="+91..." error={signUpErrors.whatsapp} />
                                <div className="grid grid-cols-2 gap-3">
                                    <FormInput 
                                        label="Password" 
                                        type={showSignUpPassword ? 'text' : 'password'} 
                                        name="password" 
                                        value={signUpData.password} 
                                        onChange={handleSignUpChange} 
                                        placeholder="Min 6" 
                                        error={signUpErrors.password}
                                    />
                                    <FormInput 
                                        label="Confirm" 
                                        type={showConfirmPassword ? 'text' : 'password'} 
                                        name="confirmPassword" 
                                        value={signUpData.confirmPassword} 
                                        onChange={handleSignUpChange} 
                                        placeholder="Repeat" 
                                        error={signUpErrors.confirmPassword}
                                    />
                                </div>
                                
                                <div className="flex items-center gap-2 mb-2">
                                    <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="accent-green-500 w-4 h-4" />
                                    <span className="text-[10px] text-slate-400">I agree to the Terms & Policy</span>
                                </div>
                                {signUpErrors.terms && <p className="text-red-500 text-[10px] font-bold">{signUpErrors.terms}</p>}

                                <button type="submit" disabled={isLoading} className="w-full py-4 bg-green-500 hover:bg-green-400 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                                    {isLoading ? 'Creating...' : 'Register Now'}
                                </button>
                            </form>
                        )}

                        {view === 'forgot_password' && (
                            <form onSubmit={handlePasswordReset} className="space-y-6 animate-fade-in text-center">
                                <h3 className="text-xl font-bold text-white mb-2">Reset Password</h3>
                                <FormInput label="Email Address" type="email" name="resetEmail" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="you@example.com" />
                                
                                {resetMessage.text && <div className={`p-3 rounded-lg text-xs font-bold ${resetMessage.type === 'error' ? 'text-red-400 bg-red-500/10' : 'text-green-400 bg-green-500/10'}`}>{resetMessage.text}</div>}

                                <button type="submit" disabled={isLoading} className="w-full py-4 bg-white text-black font-black rounded-2xl text-sm uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50">
                                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                                <button type="button" onClick={() => setView('signin')} className="text-xs font-bold text-slate-500 hover:text-white mt-4">Back to Sign In</button>
                            </form>
                        )}

                        {/* Divider */}
                        {view !== 'forgot_password' && (
                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                                <div className="relative flex justify-center"><span className="px-4 text-[10px] font-bold text-slate-500 bg-[#1e2333] uppercase tracking-widest">Or</span></div>
                            </div>
                        )}

                        {/* Google Button */}
                        {view !== 'forgot_password' && (
                            <button 
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-70 shadow-lg"
                            >
                                <GoogleIcon className="w-5 h-5" />
                                <span>Sign in with Google</span>
                            </button>
                        )}

                        {/* Toggle Sign In / Sign Up */}
                        {view !== 'forgot_password' && (
                            <div className="mt-6 text-center">
                                <p className="text-xs text-slate-400">
                                    {view === 'signin' ? "Don't have an account?" : "Already have an account?"}{' '}
                                    <button onClick={() => setView(view === 'signin' ? 'signup' : 'signin')} className="font-bold text-green-500 hover:text-green-400 underline">
                                        {view === 'signin' ? 'Sign Up' : 'Sign In'}
                                    </button>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* COPYRIGHT FOOTER */}
                <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-8 opacity-60">
                    © 2026 STARSMM PANEL. All rights reserved
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
