import React from 'react';
import { Helmet } from 'react-helmet-async';
import type { Location } from '../data/types';

interface JsonLdProps {
    data: Record<string, any>;
}

export const JsonLd: React.FC<JsonLdProps> = ({ data }) => {
    return (
        <Helmet>
            <script type="application/ld+json">
                {JSON.stringify(data)}
            </script>
        </Helmet>
    );
};

export const LocationJsonLd: React.FC<{ location: Location }> = ({ location }) => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Place",
        "name": location.name,
        "description": location.description,
        "address": {
            "@type": "PostalAddress",
            "streetAddress": location.address,
            "addressLocality": location.city,
            "addressCountry": "TW"
        },
        "geo": location.coordinates ? {
            "@type": "GeoCoordinates",
            "latitude": location.coordinates.lat,
            "longitude": location.coordinates.lng
        } : undefined,
        "telephone": location.phone,
        "url": location.websiteUrl,
        "image": location.imageUrl,
        "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": [
                "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
            ],
            "opens": "00:00", // Simplified, ideally parse from openingHours
            "closes": "23:59"
        }
    };

    return <JsonLd data={structuredData} />;
};
