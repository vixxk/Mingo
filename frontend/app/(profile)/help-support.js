import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, SCREEN_HEIGHT } from '../../utils/responsive';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_DATA = [
  {
    id: '1',
    question: 'Why am I unable to connect with any listener?',
    answer:
      'Currently online only, which makes it accessible to patients in any city or country without needing to travel.',
  },
  {
    id: '2',
    question: 'How do I change my language?',
    answer:
      'Go to Profile → Language Settings to update your preferred language for the app.',
  },
  {
    id: '3',
    question: 'Why are coins not added to my wallet even after recharge?',
    answer:
      'Please wait a few minutes for the transaction to process. If coins still don\'t appear, contact support@mingo.in with your transaction ID.',
  },
  {
    id: '4',
    question: 'How much coins cost for audio call?',
    answer:
      '1 coin per minute for audio calls. You can purchase coins from the Wallet section in your profile.',
  },
  {
    id: '5',
    question: 'How much coins cost for video call?',
    answer:
      '6 coins per minute for video calls. Check the Wallet section for the best coin packages.',
  },
];

const FAQItem = ({ item, isOpen, onToggle }) => (
  <View style={styles.faqItem}>
    <TouchableOpacity
      style={styles.faqHeader}
      activeOpacity={0.7}
      onPress={onToggle}
    >
      <Text style={styles.faqQuestion}>{item.question}</Text>
      <View style={styles.faqToggle}>
        <Ionicons
          name={isOpen ? 'close' : 'add'}
          size={20}
          color="#000"
        />
      </View>
    </TouchableOpacity>
    {isOpen && (
      <Text style={styles.faqAnswer}>{item.answer}</Text>
    )}
  </View>
);

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [openId, setOpenId] = useState('1'); 

  const toggleFAQ = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['transparent', '#1A0000', '#4A0000']}
        locations={[0, 0.6, 1]}
        style={styles.bgGradient}
      />

      {}
      <View style={[styles.header, { paddingTop: insets.top + vs(8) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {FAQ_DATA.map((item) => (
          <FAQItem
            key={item.id}
            item={item}
            isOpen={openId === item.id}
            onToggle={() => toggleFAQ(item.id)}
          />
        ))}
        <View style={{ height: vs(60) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
  },

  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(16),
    paddingBottom: vs(12),
  },
  backBtn: {
    marginRight: s(8),
  },
  headerTitle: {
    flex: 1,
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontFamily: 'Inter_500Medium',
  },

  
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: s(16),
    paddingTop: vs(8),
    gap: vs(12),
  },

  
  faqItem: {
    backgroundColor: '#141414',
    borderRadius: 16,
    paddingHorizontal: s(18),
    paddingVertical: vs(16),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    lineHeight: ms(22),
    marginRight: s(12),
  },
  faqToggle: {
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqAnswer: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(19),
    marginTop: vs(12),
  },
});
