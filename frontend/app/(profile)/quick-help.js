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
import { ms, wp, hp } from '../../utils/responsive';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const QUICK_HELP_DATA = [
  {
    id: '1',
    question: 'Why am I unable to connect with any listener?',
    answer:
      'All available listeners may be busy or offline at the moment. Please check your internet connection, app permissions, and coin balance, then try again after a few minutes. If the issue continues, contact Mingo Support.',
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
      'Please wait a few minutes for the transaction to process. If coins still don\'t appear, contact support@talkmingo.com with your transaction ID.',
  },
  {
    id: '4',
    question: 'How much coins cost for audio call?',
    answer:
      '10 coins per minute for audio calls. You can purchase coins from the Wallet section in your profile.',
  },
  {
    id: '5',
    question: 'How much coins cost for video call?',
    answer:
      '40 coins per minute for video calls. Check the Wallet section for the best coin packages.',
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
          size={wp(4.5)}
          color="#000"
        />
      </View>
    </TouchableOpacity>
    {isOpen && (
      <Text style={styles.faqAnswer}>{item.answer}</Text>
    )}
  </View>
);

export default function QuickHelpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [openId, setOpenId] = useState(null);

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

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + hp(1) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={wp(5.5)} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Help</Text>
        <View style={{ width: wp(5.5) }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {QUICK_HELP_DATA.map((item) => (
          <FAQItem
            key={item.id}
            item={item}
            isOpen={openId === item.id}
            onToggle={() => toggleFAQ(item.id)}
          />
        ))}

        <View style={{ height: hp(8) }} />
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
    height: hp(45),
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingBottom: hp(1.5),
  },
  backBtn: {
    marginRight: wp(2),
  },
  headerTitle: {
    flex: 1,
    fontSize: wp(5.5),
    color: '#fff',
    fontWeight: '600',
  },

  /* Scroll */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    gap: hp(1.2),
  },

  /* FAQ Items */
  faqItem: {
    backgroundColor: '#141414',
    borderRadius: wp(4),
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(1.8),
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
    fontSize: ms(14, 0.3),
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    lineHeight: ms(20),
    marginRight: wp(3),
  },
  faqToggle: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqAnswer: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(19),
    marginTop: hp(1.5),
  },
});
