
import React, { useState } from 'react';
import { XMarkIcon, DocumentArrowUpIcon, PlayCircleIcon, ClipboardDocumentListIcon, CheckCircleIcon, TagIcon } from './Icons';
import { createDepositRequestAndTransaction, addMockDepositRequestToStorage, validateCoupon, validateMockCoupon } from '../firebase/services';
import { User, PaymentInfo, DepositStatus, DepositRequest } from '../types';
import VideoPlayerModal from './VideoPlayerModal';

interface AddFundsModalProps {
    user: User;
    isMockMode: boolean;
    onClose: () => void;
    onFundsRequested: (newRequest: DepositRequest) => void;
    paymentInfo: PaymentInfo | null;
}

const getYouTubeEmbedUrl = (url: string): string | null => {
    if (!url || typeof url !== 'string') return null;
    let videoId = null;

    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);

    if (match && match[1]) {
        videoId = match[1];
    } else {
        if (url.length === 11 && /^[a-zA-Z0-9_-]+$/.test(url)) {
            videoId = url;
        }
    }
    
    if (!videoId) return null;

    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
};


const AddFundsModal: React.FC<AddFundsModalProps> = ({ user, isMockMode, onClose, onFundsRequested, paymentInfo }) => {
    const [amount, setAmount] = useState<number | ''>('');
    const [amountError, setAmountError] = useState('');
    const [step, setStep] = useState(1);
    const [utr, setUtr] = useState('');
    const [senderUpi, setSenderUpi] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isVideoModalOpen, setVideoModalOpen] = useState(false);
    const [upiCopied, setUpiCopied] = useState(false);

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent: number } | null>(null);
    const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });
    const [isValidating, setIsValidating] = useState(false);

    const embedUrl = paymentInfo?.youtubeTutorialUrl ? getYouTubeEmbedUrl(paymentInfo.youtubeTutorialUrl) : null;
    const minDeposit = paymentInfo?.minDeposit || 30;
    const maxDeposit = paymentInfo?.maxDeposit || 100000;

    const bonusAmount = (Number(amount) && appliedCoupon) ? (Number(amount) * appliedCoupon.percent) / 100 : 0;
    const totalCredit = Number(amount) + bonusAmount;

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setAmount(value === '' ? '' : parseFloat(value));

        if (value !== '') {
            const numValue = parseFloat(value);
            if (numValue < minDeposit) {
                setAmountError(`Minimum deposit is ₹${minDeposit}.`);
            } else if (numValue > maxDeposit) {
                setAmountError(`Maximum deposit is ₹${maxDeposit}.`);
            } else {
                setAmountError('');
            }
        } else {
            setAmountError('');
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setIsValidating(true);
        setCouponMessage({ text: '', type: '' });
        
        try {
            let coupon;
            try {
                coupon = await validateCoupon(couponCode);
            } catch (liveError: any) {
                if (liveError.message && liveError.message.includes('permission')) {
                    coupon = validateMockCoupon(couponCode);
                } else {
                    throw liveError;
                }
            }

            // Validating Type (Undefined implies discount for legacy support, so strict check for bonus required for deposit)
            if (coupon.type !== 'bonus') {
                throw new Error('This coupon is valid for Service Orders only.');
            }

            setAppliedCoupon({ code: coupon.code, percent: coupon.discountPercent });
            setCouponMessage({ text: `Success! +${coupon.discountPercent}% Extra Bonus applied.`, type: 'success' });
        } catch (err: any) {
            setAppliedCoupon(null);
            setCouponMessage({ text: err.message || 'Invalid coupon.', type: 'error' });
        } finally {
            setIsValidating(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setScreenshot(e.target.files[0]);
        }
    };

    const handleCopyUpi = () => {
        if (paymentInfo?.upiId) {
            navigator.clipboard.writeText(paymentInfo.upiId);
            setUpiCopied(true);
            setTimeout(() => setUpiCopied(false), 2000);
        }
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleSubmitRequest = async () => {
        if (!amount || !utr || !senderUpi || !screenshot) {
            setError('All fields are required.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // UPDATED: Increased limit to 4MB (4 * 1024 * 1024)
            if (screenshot.size > 4 * 1024 * 1024) {
                throw new Error("Screenshot file is too large. Please use an image smaller than 4MB.");
            }

            const screenshotUrl = await convertToBase64(screenshot);
            
            // Prepare Request Data
            const reqData = {
                userId: user.id,
                userName: user.name,
                userDisplayId: user.displayId,
                amount: amount as number,
                utr,
                senderUpi,
                screenshotUrl: screenshotUrl,
                bonusAmount: bonusAmount > 0 ? bonusAmount : undefined,
                couponCode: appliedCoupon?.code,
            };

            if (isMockMode) {
                const newRequest = addMockDepositRequestToStorage({
                    id: `mock-deposit-${Date.now()}`,
                    ...reqData,
                    status: DepositStatus.Pending,
                    date: new Date(),
                });
                alert('Mock Mode: Your deposit request has been submitted for approval.');
                onFundsRequested(newRequest);
                onClose();
                return;
            }

            const newRequest = await createDepositRequestAndTransaction(reqData);
            
            alert('Your deposit request has been submitted for approval.');
            onFundsRequested(newRequest);
            onClose();

        } catch (err: any) {
            console.error("Failed to submit deposit request:", err);
            if (err.message && err.message.toLowerCase().includes('permission')) {
                setError('Database permission denied. Please verify your connection.');
            } else {
                setError(err.message || 'An error occurred. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isStep2FormValid = utr && senderUpi && screenshot && !isSubmitting;
    const hasPaymentDetails = paymentInfo && (paymentInfo.qrCodeUrl || paymentInfo.upiId);

    return (
        <>
        {isVideoModalOpen && embedUrl && <VideoPlayerModal embedUrl={embedUrl} onClose={() => setVideoModalOpen(false)} />}
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-base-100 rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-base-300 animate-scale-in">
                <div className="p-5 border-b border-gray-200 dark:border-base-300 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-text-primary">Add Funds to Wallet</h3>
                    <button onClick={onClose} className="text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                {step === 1 && (
                    <>
                        <div className="p-6 space-y-6">
                            <div>
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-500 dark:text-text-secondary mb-1">
                                    Amount to Deposit (₹)
                                </label>
                                <input
                                    type="number"
                                    id="amount"
                                    value={amount}
                                    onChange={handleAmountChange}
                                    placeholder="e.g., 500"
                                    className={`w-full bg-gray-100 dark:bg-base-200 border rounded-lg px-3 py-2 text-gray-900 dark:text-text-primary focus:ring-primary focus:border-primary font-bold text-lg transition-all ${amountError ? 'border-red-500' : 'border-gray-300 dark:border-base-300'}`}
                                />
                                {amountError && <p className="text-red-400 text-xs mt-1">{amountError}</p>}
                                <p className="text-[10px] text-gray-400 mt-2">Min: ₹{minDeposit} | Max: ₹{maxDeposit}</p>
                            </div>

                            {/* Coupon Section */}
                            <div>
                                <label className="block text-sm font-medium text-gray-500 dark:text-text-secondary mb-1 flex items-center gap-1">
                                    <TagIcon className="w-4 h-4" /> Deposit Bonus Code
                                </label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        disabled={!!appliedCoupon}
                                        placeholder="Enter code (e.g. BONUS10)"
                                        className="flex-1 bg-gray-100 dark:bg-base-200 border border-gray-300 dark:border-base-300 rounded-lg px-3 py-2 text-gray-900 dark:text-text-primary text-sm uppercase font-bold transition-all"
                                    />
                                    {appliedCoupon ? (
                                        <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); setCouponMessage({text:'', type:''}) }} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 active:scale-95 transition-all">Remove</button>
                                    ) : (
                                        <button onClick={handleApplyCoupon} disabled={!couponCode || isValidating} className="px-3 py-2 bg-secondary/10 text-secondary border border-secondary/30 rounded-lg text-xs font-bold hover:bg-secondary/20 active:scale-95 transition-all">
                                            {isValidating ? '...' : 'Apply'}
                                        </button>
                                    )}
                                </div>
                                {couponMessage.text && (
                                    <p className={`text-xs mt-1 font-bold ${couponMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                        {couponMessage.text}
                                    </p>
                                )}
                            </div>

                            {appliedCoupon && amount && !amountError && (
                                <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20 animate-fade-in">
                                    <div className="flex justify-between text-xs text-green-700 dark:text-green-400 font-bold mb-1">
                                        <span>Deposit Amount:</span>
                                        <span>₹{Number(amount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-green-700 dark:text-green-400 font-bold mb-1">
                                        <span>Extra Bonus ({appliedCoupon.percent}%):</span>
                                        <span>+ ₹{bonusAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="border-t border-green-500/20 my-1"></div>
                                    <div className="flex justify-between text-sm text-green-800 dark:text-green-300 font-black">
                                        <span>Total Wallet Credit:</span>
                                        <span>₹{totalCredit.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 bg-gray-50 dark:bg-base-300/20 rounded-b-xl">
                            <button
                                onClick={() => setStep(2)}
                                className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-all duration-300 disabled:bg-gray-500 active:scale-95 shadow-lg"
                                disabled={!amount || !!amountError}
                            >
                                Proceed to Pay ₹{amount}
                            </button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto animate-fade-in-up">
                            {embedUrl && (
                                <div className="mb-4">
                                    <button 
                                        onClick={() => setVideoModalOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 dark:text-blue-400 rounded-lg hover:bg-blue-500/20 dark:hover:bg-blue-500/30 font-semibold text-sm transition-all active:scale-95"
                                    >
                                        <PlayCircleIcon className="w-5 h-5" />
                                        <span>Watch Payment Tutorial</span>
                                    </button>
                                </div>
                            )}
                           {hasPaymentDetails ? (
                                <div className="text-center bg-gray-100 dark:bg-base-200 p-4 rounded-lg border border-gray-200 dark:border-base-300 transition-all hover:border-primary/30">
                                    <p className="text-sm font-bold text-gray-500 dark:text-text-secondary uppercase tracking-wide mb-2">Pay exactly</p>
                                    <p className="text-3xl font-black text-gray-900 dark:text-text-primary mb-4">₹{amount}</p>
                                    
                                    {paymentInfo?.qrCodeUrl ? (
                                        <img src={paymentInfo.qrCodeUrl} alt="Payment QR Code" className="w-48 h-48 mx-auto rounded-xl shadow-sm border border-gray-200 dark:border-base-300 object-cover bg-white p-2 hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                        <div className="w-48 h-48 mx-auto rounded-xl bg-gray-200 dark:bg-base-300 flex items-center justify-center text-xs text-gray-500 mb-2">
                                            QR Code Unavailable
                                        </div>
                                    )}

                                    {paymentInfo?.upiId && (
                                        <div className="mt-4 flex items-center justify-center gap-2 bg-white/50 dark:bg-base-300/50 p-2 rounded-lg border border-gray-200 dark:border-base-300/50">
                                            <p className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300 select-all">
                                                {paymentInfo.upiId}
                                            </p>
                                            <button 
                                                onClick={handleCopyUpi}
                                                className="p-1.5 text-gray-500 hover:text-secondary hover:bg-secondary/10 rounded-md transition-all active:scale-90"
                                                title="Copy UPI ID"
                                            >
                                                {upiCopied ? <CheckCircleIcon className="w-5 h-5 text-green-500" /> : <ClipboardDocumentListIcon className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center bg-gray-100 dark:bg-base-200 p-6 rounded-lg">
                                    <p className="text-gray-500 dark:text-text-secondary font-medium">Payment details are currently unavailable.</p>
                                    <p className="text-xs text-gray-400 mt-2">Please contact support for assistance.</p>
                                </div>
                           )}
                            
                            <div className="pt-4 border-t border-gray-200 dark:border-base-300">
                                <p className="text-xs text-center text-gray-500 dark:text-text-secondary mb-3 uppercase font-bold tracking-wider">After payment, fill details</p>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label htmlFor="utr" className="block text-xs font-bold text-gray-500 dark:text-text-secondary mb-1 uppercase">UTR / Transaction ID</label>
                                        <input type="text" id="utr" value={utr} onChange={e => setUtr(e.target.value)} placeholder="e.g. 123456789012" className="w-full bg-gray-100 dark:bg-base-200 border border-gray-300 dark:border-base-300 rounded-lg px-3 py-2 text-gray-900 dark:text-text-primary text-sm font-mono transition-all focus:border-primary focus:ring-1 focus:ring-primary"/>
                                    </div>
                                    <div>
                                        <label htmlFor="senderUpi" className="block text-xs font-bold text-gray-500 dark:text-text-secondary mb-1 uppercase">Your Sender UPI ID</label>
                                        <input type="text" id="senderUpi" value={senderUpi} onChange={e => setSenderUpi(e.target.value)} placeholder="you@upi" className="w-full bg-gray-100 dark:bg-base-200 border border-gray-300 dark:border-base-300 rounded-lg px-3 py-2 text-gray-900 dark:text-text-primary text-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-text-secondary mb-1 uppercase">Payment Screenshot</label>
                                        <label htmlFor="screenshot" className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-base-200 border border-dashed border-gray-400 dark:border-gray-500 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-base-300/50 transition-colors">
                                            <DocumentArrowUpIcon className="w-4 h-4 text-gray-500"/>
                                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{screenshot ? screenshot.name : 'Upload Proof (Required)'}</span>
                                        </label>
                                        <input type="file" id="screenshot" onChange={handleFileChange} accept="image/*" className="hidden"/>
                                        <p className="text-[9px] text-gray-400 mt-1 text-center">Max size 4MB (Direct Upload)</p>
                                    </div>
                                </div>
                            </div>
                            
                            {error && <p className="text-red-500 text-xs text-center font-bold animate-pulse">{error}</p>}
                        </div>
                         <div className="p-5 bg-gray-50 dark:bg-base-300/20 rounded-b-xl flex gap-2">
                             <button onClick={() => setStep(1)} className="w-1/3 py-3 bg-gray-200 dark:bg-base-300 text-gray-800 dark:text-text-primary font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm active:scale-95">
                                 Back
                            </button>
                            <button
                                onClick={handleSubmitRequest}
                                className="w-2/3 py-3 bg-secondary text-white font-bold rounded-lg hover:brightness-110 transition-all disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed shadow-lg text-sm active:scale-95"
                                disabled={!isStep2FormValid}
                            >
                                {isSubmitting ? 'Verifying...' : 'Submit Payment'}
                            </button>
                        </div>
                    </>
                )}

            </div>
        </div>
        </>
    );
};

export default AddFundsModal;
