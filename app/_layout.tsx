import { Stack } from 'expo-router';

export default function UserAppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, 
      }}
    />
  );
}
