import React, { useEffect } from 'react';

interface AdUnitProps {
    slot: string;
    format?: 'auto' | 'fluid' | 'rectangle';
    layoutKey?: string;
    style?: React.CSSProperties;
}

export const AdUnit: React.FC<AdUnitProps> = ({
    slot,
    format = 'auto',
    layoutKey,
    style = { display: 'block' }
}) => {
    useEffect(() => {
        try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
            console.error('AdSense error:', err);
        }
    }, []);

    return (
        <div className="ad-container" style={{ margin: '20px 0', textAlign: 'center' }}>
            <ins
                className="adsbygoogle"
                style={style}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Placeholder ID
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive="true"
                {...(layoutKey && { 'data-ad-layout-key': layoutKey })}
            />
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Advertisement</div>
        </div>
    );
};
