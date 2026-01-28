
import React, { useState, useMemo } from 'react';
import { ServicePackage } from '../types';
import { XMarkIcon, TagIcon, InformationCircleIcon } from './Icons';
import { validateCoupon, validateMockCoupon } from '../firebase/services';

interface OrderModalProps {
    service: ServicePackage;
    visualId?: string;
    onClose: () => void;
    // Updated type to allow async handling
    onOrder: (orderData: { amount: number; quantity: number; target: string; couponCode?: string }) => Promise<void> | void;
    walletBalance: number;
}

const OrderModal: React.FC<OrderModalProps> = ({ service, visualId, onClose, onOrder, walletBalance }) => {
    const [quantity, setQuantity] = useState<number | ''>(service.minQuantity);
    const [target, setTarget] = useState('');
    const [error, setError] = useState('');
    const [isPaying, setIsPaying] = useState(false); // New state for button spinner
    
    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent: number } | null>(null);
    const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });
    const [isValidating, setIsValidating] = useState(false);

    const numQuantity = Number(quantity);

    const basePrice = useMemo(() => {
        if (!service.ratePerQuantity || quantity === '') return 0;
        return (numQuantity / service.ratePerQuantity) * service.rate;
    }, [quantity, service.rate, service.ratePerQuantity, numQuantity]);


    const finalPrice = useMemo(() => {
        if (!appliedCoupon) return basePrice;
        const discountAmount = (basePrice * appliedCoupon.percent) / 100;
        return basePrice - discountAmount;
    }, [basePrice, appliedCoupon]);

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const newQuantity = value === '' ? '' : parseInt(value, 10);
        setQuantity(isNaN(newQuantity as number) ? '' : newQuantity);

        const numValue = Number(newQuantity);
        if (value === '' || numValue < service.minQuantity) {
            setError(`Minimum quantity is ${service.minQuantity}.`);
        } else if (numValue > service.maxQuantity) {
            setError(`Maximum quantity is ${service.maxQuantity}.`);
        } else {
            setError('');
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setIsValidating(true);
        setCouponMessage({ text: '', type: '' });
        
        try {
            // Check if mock mode logic is needed based on visual clues (or try/catch flow)
            // Ideally prop `isMockMode` should be passed, but we can try live first
            let coupon;
            try {
                coupon = await validateCoupon(couponCode);
            } catch (liveError: any) {
                if (liveError.message && liveError.message.includes('permission')) {
                    // Fallback to mock if permission error
                    coupon = validateMockCoupon(couponCode);
                } else {
                    throw liveError;
                }
            }

            // Validating Type
            if (coupon.type === 'bonus') {
                throw new Error('This coupon is valid for Deposits only.');
            }

            setAppliedCoupon({ code: coupon.code, percent: coupon.discountPercent });
            setCouponMessage({ text: `Success! ${coupon.discountPercent}% OFF applied.`, type: 'success' });
        } catch (err: any) {
            setAppliedCoupon(null);
            setCouponMessage({ text: err.message || 'Invalid coupon.', type: 'error' });
        } finally {
            setIsValidating(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponMessage({ text: '', type: '' });
    };
    
    // --- LINK VALIDATION LOGIC ---
    const validateTargetUrl = (url: string, categoryId: string, inputType: string): boolean => {
        if (!url) return false;
        
        const lowerUrl = url.toLowerCase();

        // 1. Instagram Validation
        if (categoryId === 'cat-instagram') {
            if (inputType === 'link') {
                // Must contain instagram.com
                return lowerUrl.includes('instagram.com');
            } else if (inputType === 'username') {
                // Must NOT contain http, no spaces, allowed chars: letters, numbers, dot, underscore
                // Optional @ at start allowed
                return !lowerUrl.includes('http') && /^[a-zA-Z0-9._]+$/.test(url.replace('@', ''));
            }
        }

        // 2. YouTube Validation
        if (categoryId === 'cat-youtube' && inputType === 'link') {
            return lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');
        }

        // 3. Facebook Validation
        if (categoryId === 'cat-facebook' && inputType === 'link') {
            return lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch');
        }

        // 4. Telegram Validation
        if (categoryId === 'cat-telegram') {
             if (inputType === 'link') return lowerUrl.includes('t.me') || lowerUrl.includes('telegram.me');
             if (inputType === 'username') return !lowerUrl.includes('http') && /^[a-zA-Z0-9_]+$/.test(url.replace('@', ''));
        }

        // Default: If simple input or unknown category, just require non-empty (which is already checked)
        return true; 
    };

    const isTargetValid = useMemo(() => {
        return validateTargetUrl(target, service.categoryId, service.inputType);
    }, [target, service.categoryId, service.inputType]);

    const hasSufficientFunds = walletBalance >= finalPrice;
    const isFormValid = target && isTargetValid && !error && hasSufficientFunds && numQuantity >= service.minQuantity && numQuantity <= service.maxQuantity;

    const handleSubmit = async () => {
        if (isFormValid) {
            setIsPaying(true);
            try {
                await onOrder({
                    amount: finalPrice,
                    quantity: numQuantity,
                    target: target,
                    couponCode: appliedCoupon?.code
                });
                // Note: The component usually unmounts here if successful, so no need to setIsPaying(false)
            } catch (e) {
                setIsPaying(false);
                // Error handling is done in parent, but we stop spinner here if modal stays open
            }
        }
    };

    const formatId = (id: string) => {
        if (/^\d+$/.test(id)) return id.padStart(4, '0');
        return id;
    };

    const displayId = visualId || formatId(service.id);

    return (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-base-100 rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-base-300 flex flex-col max-h-[90vh] animate-scale-in">
                <div className="p-5 border-b border-gray-200 dark:border-base-300 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-text-primary">Place Your Order</h3>
                    <button onClick={onClose} className="text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-lg font-semibold text-secondary">{service.title}</h4>
                            <span className="text-[10px] font-black bg-gray-200 dark:bg-base-300 px-1.5 py-0.5 rounded text-gray-500 dark:text-text-secondary">#{displayId}</span>
                        </div>
                        
                        {/* Description Section */}
                        <div className="bg-gray-50 dark:bg-base-200/50 p-3 rounded-lg border border-gray-200 dark:border-white/5">
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1">
                                <InformationCircleIcon className="w-3 h-3" /> Description
                            </p>
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                {service.description}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="target" className="block text-sm font-medium text-gray-500 dark:text-text-secondary mb-1">
                            {service.inputType === 'username' ? 'Username' : 'Post / Profile Link'}
                        </label>
                        <input
                            type="text"
                            id="target"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            placeholder={service.inputType === 'username' ? '@username' : 'https://...'}
                            className={`w-full bg-gray-100 dark:bg-base-200 border rounded-lg px-3 py-2 text-gray-900 dark:text-text-primary focus:ring-primary focus:border-primary transition-all ${target && !isTargetValid ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-base-300'}`}
                        />
                        {target && !isTargetValid && (
                            <p className="text-[10px] text-red-500 mt-1 font-bold">
                                {service.categoryId === 'cat-instagram' 
                                    ? (service.inputType === 'username' ? "Enter a valid username (no spaces/http)." : "Must be an Instagram link (instagram.com)")
                                    : "Invalid format for this service."}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-500 dark:text-text-secondary mb-1">
                            Quantity ({service.unitName}s)
                        </label>
                        <input
                            type="number"
                            id="quantity"
                            value={quantity}
                            onChange={handleQuantityChange}
                            min={service.minQuantity}
                            max={service.maxQuantity}
                            step="1"
                            className={`w-full bg-gray-100 dark:bg-base-200 border rounded-lg px-3 py-2 text-gray-900 dark:text-text-primary focus:ring-primary focus:border-primary transition-all ${error ? 'border-red-500' : 'border-gray-300 dark:border-base-300'}`}
                        />
                        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                    </div>

                    {/* Coupon Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-text-secondary mb-1 flex items-center gap-1">
                            <TagIcon className="w-4 h-4" /> Discount Coupon
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                disabled={!!appliedCoupon}
                                placeholder="Enter code"
                                className="flex-1 bg-gray-100 dark:bg-base-200 border border-gray-300 dark:border-base-300 rounded-lg px-3 py-2 text-gray-900 dark:text-text-primary text-sm uppercase font-bold transition-all"
                            />
                            {appliedCoupon ? (
                                <button onClick={handleRemoveCoupon} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 active:scale-95 transition-all">Remove</button>
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

                    <div className="bg-gray-100 dark:bg-base-200 p-4 rounded-lg text-center">
                        <p className="text-gray-500 dark:text-text-secondary text-xs uppercase font-bold">Total Price</p>
                        {appliedCoupon && (
                            <p className="text-sm text-gray-400 line-through">₹{basePrice.toFixed(2)}</p>
                        )}
                        <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-neon animate-pulse">
                            ₹{finalPrice.toFixed(2)}
                        </p>
                    </div>

                    {!hasSufficientFunds && (
                        <div className="text-center text-red-400 text-sm bg-red-500/20 p-3 rounded-lg animate-pulse">
                            Insufficient wallet balance. Please add funds to proceed.
                        </div>
                    )}
                </div>

                <div className="p-5 bg-gray-50 dark:bg-base-300/20 rounded-b-xl mt-auto">
                    <button
                        onClick={handleSubmit}
                        className={`w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${(!isFormValid || isPaying) ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                        disabled={!isFormValid || isPaying}
                    >
                        {isPaying ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Processing...</span>
                            </>
                        ) : (
                            'Pay from Wallet'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderModal;
