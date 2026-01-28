
import React, { useEffect, useState } from 'react';
import { WhatsAppIcon, PlayCircleIcon, XMarkIcon } from '../components/Icons';
import { SupportInfo } from '../types';
import { getSupportInfo, getMockSupportInfoFromStorage } from './services';
import VideoPlayerModal from '../components/VideoPlayerModal';

const FloatingWidgets: React.FC = () => {
    const [supportInfo, setSupportInfo] = useState<SupportInfo | null>(null);
    const [showVideo, setShowVideo] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                // Try fetching live data first
                const info = await getSupportInfo();
                if (info) {
                    setSupportInfo(info);
                } else {
                    // Fallback to mock if live returns null (rare) or fails
                    setSupportInfo(getMockSupportInfoFromStorage());
                }
            } catch (error) {
                // Fallback to mock on error (e.g. offline/permission issues)
                console.log("Widget fetch error, using mock data");
                setSupportInfo(getMockSupportInfoFromStorage());
            }
        };
        fetchInfo();
    }, []);

    if (!supportInfo) return null;

    const handleVideoClick = () => {
        if (supportInfo.promoVideoUrl) {
            // Check if it is a direct link or embed
            const embed = getYouTubeEmbedUrl(supportInfo.promoVideoUrl);
            if (embed) {
                setVideoUrl(embed);
                setShowVideo(true);
            } else {
                // Fallback: open in new tab if logic fails to parse ID
                window.open(supportInfo.promoVideoUrl, '_blank');
            }
        }
    };

    // Extract video ID helper
    const getYouTubeEmbedUrl = (url: string): string | null => {
        if (!url || typeof url !== 'string') return null;
        let videoId = null;
        const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regex);
        if (match && match[1]) videoId = match[1];
        else if (url.length === 11 && /^[a-zA-Z0-9_-]+$/.test(url)) videoId = url;
        
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
    };

    return (
        <>
            <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-3 items-end">
                {/* YouTube Video Widget */}
                {supportInfo.promoVideoUrl && (
                    <div className="relative group flex items-center">
                        <span className="absolute right-full mr-3 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Watch Video
                        </span>
                        <button 
                            onClick={handleVideoClick}
                            className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform relative z-10"
                            title="Watch Video"
                        >
                            <PlayCircleIcon className="w-6 h-6 text-white" />
                            {/* Pulse animation for attention - pointer-events-none ensures it doesn't block click on button itself, though it's inside so it would bubble anyway. */}
                            <span className="absolute -inset-1 rounded-full border-2 border-red-500 opacity-75 animate-ping pointer-events-none"></span>
                        </button>
                    </div>
                )}

                {/* WhatsApp Widget */}
                {supportInfo.whatsapp && (
                    <div className="relative group flex items-center">
                        <span className="absolute right-full mr-3 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Need Help?
                        </span>
                        <a 
                            href={`https://wa.me/${supportInfo.whatsapp.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform z-10"
                            title="Chat on WhatsApp"
                        >
                            <WhatsAppIcon className="w-6 h-6 text-white" />
                        </a>
                    </div>
                )}
            </div>

            {/* Video Modal */}
            {showVideo && videoUrl && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={() => setShowVideo(false)}>
                    <div className="relative w-full max-w-3xl aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setShowVideo(false)}
                            className="absolute top-2 right-2 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                        <iframe 
                            src={videoUrl} 
                            className="w-full h-full" 
                            frameBorder="0" 
                            allow="autoplay; encrypted-media" 
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
            )}
        </>
    );
};

export default FloatingWidgets;
