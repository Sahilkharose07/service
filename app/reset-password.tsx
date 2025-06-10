import { useLocalSearchParams, router } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

export default function ResetPassword() {
    const params = useLocalSearchParams();
    useEffect(() => {
        if (params.userId && params.secret) {
            router.replace({
                pathname: '/login',
                params: {
                    resetPassword: 'true',
                    userId: params.userId as string,
                    secret: params.secret as string
                }
            });
        }
    }, [params]);
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Processing password reset...</Text>
        </View>
    );
}