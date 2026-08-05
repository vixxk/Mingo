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
import { ms, s, vs, wp, hp, SCREEN_HEIGHT, SCREEN_WIDTH } from '../../utils/responsive';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_DATA = [
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

const CategoryCard = ({ icon, iconBg, title, subtitle, onPress }) => (
  <TouchableOpacity
    style={styles.categoryCard}
    activeOpacity={0.7}
    onPress={onPress}
  >
    <View style={styles.categoryIcon}>
      <Ionicons name={icon} size={wp(5.5)} color={iconBg} />
    </View>
    <View style={styles.categoryTextContainer}>
      <Text style={styles.categoryTitle}>{title}</Text>
      <Text style={styles.categorySubtitle}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={wp(5)} color="#6B7280" />
  </TouchableOpacity>
);

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

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [openId, setOpenId] = useState('1'); 

  const toggleFAQ = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['transparent', '#1A0000', '#4A0000']}
        locations={[0, 0.6, 1]}
        style={styles.bgGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={wp(5.5)} color="#fff" />
          <Text style={styles.headerTitle}>Help & Support</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Select by Category Section */}
        <Text style={styles.sectionTitle}>Select by Category</Text>
        
        <View style={styles.categoryContainer}>
          <CategoryCard
            icon="call-outline"
            iconBg="#2563EB"
            title="Recent Sessions"
            subtitle="Regarding Audio and Video calls"
            onPress={() => router.push('/(profile)/recent-sessions')}
          />
          <CategoryCard
            icon="wallet-outline"
            iconBg="#8B5CF6"
            title="Recent Payments"
            subtitle="Regarding Wallet and Payments"
            onPress={() => router.push('/(profile)/recent-payments')}
          />
        </View>

        {/* Quick Help Section */}
        <View style={styles.quickHelpHeader}>
          <Text style={styles.sectionTitle}>Quick Help</Text>
          <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7} onPress={() => router.push('/(profile)/quick-help')}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickHelpContainer}>
          {FAQ_DATA.slice(0, 3).map((item) => (
            <FAQItem
              key={item.id}
              item={item}
              isOpen={openId === item.id}
              onToggle={() => toggleFAQ(item.id)}
            />
          ))}
        </View>

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
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  headerTitle: {
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
  },

  /* Section Title */
  sectionTitle: {
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    marginBottom: hp(1.5),
  },

  /* Category Cards */
  categoryContainer: {
    gap: hp(1.2),
    marginBottom: hp(3),
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: wp(4),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  categoryIcon: {
    marginRight: wp(3),
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: hp(0.3),
  },
  categorySubtitle: {
    fontSize: ms(12, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },

  /* Quick Help */
  quickHelpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  viewAllText: {
    fontSize: ms(13, 0.3),
    color: '#EF4444',
    fontFamily: 'Inter_600SemiBold',
    lineHeight: ms(15, 0.3),
  },
  viewAllBtn: {
    alignSelf: 'center',
  },
  quickHelpContainer: {
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
