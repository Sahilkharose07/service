import { useEffect } from 'react';
import { router, useNavigationContainerRef } from 'expo-router';

export default function Index() {
    const navigationRef = useNavigationContainerRef();
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (navigationRef.isReady()) {
                router.replace('/login');
            }
        }, 100);
        return () => clearTimeout(timeout);
    }, []);
    return null;
}
