
import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { XMarkIcon } from './Icons';
import { updateOrderStatus } from '../firebase/services';

interface AdminOrderDetailsModalProps {
    order: Order;
    isMockMode: boolean;
    onClose: () => void;
    onStatusUpdated: (orderId?: string, newStatus?: OrderStatus) => void;
}

const AdminOrderDetailsModal: React.FC<AdminOrderDetailsModalProps> = ({ order, isMockMode, onClose, onStatusUpdated }) => {
    const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order.status);
    
    const DetailItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
        <div>
            <p className="text-[10px] text-gray-500 dark:text-text-secondary uppercase font-semibold">{label}</p>
            <p className="text-sm text-gray-900 dark:text-text-primary break-words font-bold">{value}</p>
        </div>
    );

    const handleUpdateClick = async () => {
        if (isMockMode) {
            console.warn(`Mock Mode: Simulating status update for order ${order.id} to ${currentStatus}.`);
            onStatusUpdated(order.id, currentStatus);
            onClose();
            return;
        }

        try {
            await updateOrderStatus(order.id, currentStatus);
            alert(`Order ${order.displayId} status updated to ${currentStatus}`);
            onStatusUpdated();
            onClose();
        } catch (error: any) {
            if (error.message && error.message.toLowerCase().includes('permission')) {
                 console.warn(`Mock Mode: Simulating status update for order ${order.id} to ${currentStatus} due to permission error.`);
                 onStatusUpdated(order.id, currentStatus);
                 onClose();
            } else {
                console.error("Failed to update order status:", error);
                alert("An error occurred while updating the order status.");
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-base-100 rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-base-300">
                <div className="p-4 border-b border-gray-200 dark:border-base-300 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-text-primary">Order Details</h3>
                    <button onClick={onClose} className="text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailItem label="Order ID" value={`#${order.displayId}`} />
                    <DetailItem label="Plan ID" value={`#${order.serviceDisplayId || 'N/A'}`} />
                    <DetailItem label="User Name" value={order.userName} />
                    <DetailItem label="Order Date" value={order.date.toLocaleDateString()} />
                    <DetailItem label="Service" value={order.service} />
                    <DetailItem label="Quantity" value={`${order.quantity} ${order.unit || ''}`} />
                    <DetailItem label="Amount Paid" value={`₹${order.amount.toFixed(2)}`} />
                    <div className="sm:col-span-2">
                        <DetailItem label="Target URL / Username" value={order.targetUrl} />
                    </div>
                    {order.userWhatsapp && (
                        <div className="sm:col-span-2">
                            <DetailItem label="User WhatsApp" value={order.userWhatsapp} />
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-base-300 space-y-2">
                     <label htmlFor="status" className="block text-xs font-medium text-gray-500 dark:text-text-secondary">
                        Update Order Status
                    </label>
                    <div className="flex gap-3">
                        <select
                            id="status"
                            value={currentStatus}
                            onChange={(e) => setCurrentStatus(e.target.value as OrderStatus)}
                            className="w-full bg-gray-100 dark:bg-base-200 border border-gray-300 dark:border-base-300 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-text-primary focus:ring-primary focus:border-primary"
                        >
                            {Object.values(OrderStatus).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleUpdateClick}
                            className="py-2 px-4 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors duration-300 text-xs"
                        >
                            Update
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOrderDetailsModal;
