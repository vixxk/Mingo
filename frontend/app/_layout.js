import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { 
  useFonts, 
  Inter_900Black,
  Inter_700Bold,
  Inter_500Medium,
  Inter_400Regular 
} from '@expo-google-fonts/inter';
import { Merriweather_700Bold_Italic } from '@expo-google-fonts/merriweather';
import { 
  PlayfairDisplay_700Bold_Italic, 
  PlayfairDisplay_400Regular_Italic 
} from '@expo-google-fonts/playfair-display';
import { View, ActivityIndicator } from 'react-native';
import { addNotificationResponseReceivedListener } from '../utils/notifications';

export default function RootLayout() {
  const router = useRouter();
  const [loaded] = useFonts({
    Inter_900Black,
    Inter_700Bold,
    Inter_500Medium,
    Inter_400Regular,
    'Merriweather-Italic': Merriweather_700Bold_Italic,
    'Playfair-Italic': PlayfairDisplay_400Regular_Italic,
    'Playfair-Bold-Italic': PlayfairDisplay_700Bold_Italic,
  });

  useEffect(() => {
    const subscription = addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data;
        console.log('[RootLayout] Notification tapped, data:', JSON.stringify(data));
        
        if (data?.type === 'incoming_call') {
          const { socketService } = require('../utils/socket');
          const actionId = response.actionIdentifier;
          if (actionId === 'accept') {
            console.log('[Expo] User clicked Accept button on call notification');
            socketService.triggerLocalEvent('accept_incoming_call', data);
          } else if (actionId === 'decline') {
            console.log('[Expo] User clicked Decline button on call notification');
            socketService.triggerLocalEvent('reject_incoming_call', data);
          } else {
            console.log('[Expo] User clicked call notification body');
            socketService.triggerLocalEvent('incoming_call', data);
          }
          router.push('/(listener)');
        } else if (data?.conversationId) {
          // Chat message notification — navigate to the chat screen
          router.push({
            pathname: '/chat',
            params: { id: data.conversationId },
          });
        } else if (data?.url) {
          router.push(data.url);
        }
      } catch (err) {
        console.error('Error handling notification tap:', err);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#9333EA" />
      </View>
    );
  }

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#000000',
      card: '#000000',
      border: '#000000',
    },
  };

  return (
    <ThemeProvider value={CustomDarkTheme}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade_from_bottom',
            presentation: 'card',
            gestureEnabled: true,
            contentStyle: { backgroundColor: '#000' },
          }}
        />
      </View>
    </ThemeProvider>
  );
}
