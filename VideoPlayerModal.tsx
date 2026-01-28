
import React from 'react';
import { XMarkIcon } from './Icons';

interface VideoPlayerModalProps {
    embedUrl: string;
    onClose: () => void;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ embedUrl, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-gray-900/70 dark:bg-black/80 z-[60] flex justify-center items-center p-4 backdrop-blur-md"
            onClick={onClose} // Close on overlay click
        >
            <div 
                className="bg-white dark:bg-base-100 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-base-300 transform transition-all"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <div className="p-4 border-b border-gray-200 dark:border-base-300 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-text-primary">Payment Tutorial</h3>
                    <button onClick={onClose} className="text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-2 bg-black">
                    <div className="aspect-video">
                        <iframe
                            className="w-full h-full rounded-b-lg"
                            src={embedUrl}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayerModal;
