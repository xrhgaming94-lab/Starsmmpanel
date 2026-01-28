
import React from 'react';
import { DepositRequest, DepositStatus } from '../types';
import { XMarkIcon } from './Icons';

interface DepositRequestModalProps {
    request: DepositRequest;
    onClose: () => void;
    onProcess: (request: DepositRequest, newStatus: DepositStatus.Approved | DepositStatus.Rejected) => void;
}

const DetailItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div>
        <p className="text-[10px] text-gray-500 dark:text-text-secondary uppercase font-semibold">{label}</p>
        <p className="text-sm text-gray-900 dark:text-text-primary break-words font-bold">{value}</p>
    </div>
);

const DepositRequestModal: React.FC<DepositRequestModalProps> = ({ request, onClose, onProcess }) => {
    return (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-base-100 rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-base-300">
                <div className="p-4 border-b border-gray-200 dark:border-base-300 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-text-primary">Deposit Request</h3>
                    <button onClick={onClose} className="text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
                    <DetailItem label="Request ID" value={request.displayId} />
                    <DetailItem label="User" value={`${request.userName} ${request.userDisplayId ? `(#${request.userDisplayId})` : ''}`} />
                    <DetailItem label="Request Date" value={request.date.toLocaleDateString()} />
                    <DetailItem label="Amount" value={`₹${request.amount.toFixed(2)}`} />
                    <DetailItem label="UTR / Transaction ID" value={request.utr} />
                    <DetailItem label="Sender UPI" value={request.senderUpi} />
                     <div className="sm:col-span-2">
                        <p className="text-[10px] text-gray-500 dark:text-text-secondary uppercase font-semibold">Screenshot</p>
                        <a href={request.screenshotUrl} target="_blank" rel="noopener noreferrer">
                            <img 
                                src={request.screenshotUrl} 
                                alt="Deposit Screenshot" 
                                className="mt-1 w-full max-h-48 rounded-lg border border-gray-200 dark:border-base-300 object-contain bg-black/5"
                            />
                        </a>
                    </div>
                </div>

                {request.status === DepositStatus.Pending && (
                    <div className="p-4 bg-gray-50 dark:bg-base-300/20 rounded-b-xl flex gap-3">
                        <button
                            onClick={() => onProcess(request, DepositStatus.Rejected)}
                            className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors text-sm"
                        >
                            Reject
                        </button>
                        <button
                            onClick={() => onProcess(request, DepositStatus.Approved)}
                            className="flex-1 py-2.5 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors text-sm"
                        >
                            Approve
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DepositRequestModal;