
export const DEMO_USERS = [
  { id:'1', name:'Priya Sharma', phone:'9876543210', gender:'Female', joinDate:'10/04/2025', appOpens:156, totalTimeSpent:'42h 15m', lastActive:'2 min ago', status:'active', totalCalls:23, coins:450, language:'Hindi', interests:['Films & Music','Career'], isBanned: false, avatar: require('../../images/user_priya.png') },
  { id:'2', name:'Shruti Jaiswal', phone:'9812345678', gender:'Female', joinDate:'12/04/2025', appOpens:89, totalTimeSpent:'18h 30m', lastActive:'15 min ago', status:'active', totalCalls:12, coins:200, language:'English', interests:['Growth & Ideas'], isBanned: false, avatar: require('../../images/user_shruti.png') },
  { id:'3', name:'Ananya', phone:'9898989898', gender:'Female', joinDate:'15/04/2025', appOpens:234, totalTimeSpent:'67h 45m', lastActive:'1 hr ago', status:'active', totalCalls:45, coins:890, language:'Hindi', interests:['Emotional & Supportive Talk'], isBanned: true, avatar: require('../../images/user_ananya.png') },
  { id:'4', name:'Neha', phone:'9123456789', gender:'Female', joinDate:'08/04/2025', appOpens:45, totalTimeSpent:'8h 10m', lastActive:'2 days ago', status:'inactive', totalCalls:5, coins:50, language:'Telugu', interests:['Childhood & Memories'], isBanned: false, avatar: require('../../images/user_neha.png') },
  { id:'5', name:'Riya', phone:'9567891234', gender:'Female', joinDate:'20/04/2025', appOpens:12, totalTimeSpent:'2h 40m', lastActive:'5 days ago', status:'inactive', totalCalls:1, coins:10, language:'Marathi', interests:['Films & Music'], isBanned: false, avatar: require('../../images/user_riya.png') },
  { id:'6', name:'Deepika', phone:'9234567891', gender:'Female', joinDate:'05/04/2025', appOpens:312, totalTimeSpent:'95h 20m', lastActive:'5 min ago', status:'active', totalCalls:78, coins:1560, language:'English', interests:['Career','Growth & Ideas'], isBanned: false, avatar: require('../../images/user_deepika.png') },
];

export const DEMO_LISTENERS = [
  { id:'1', name:'Priya Sharma', phone:'9876543210', status:'approved', verified:true, bestChoice:true, totalCalls:156, earnings:'₹12,400', rating:4.8, isBanned: false, avatar: require('../../images/user_priya.png') },
  { id:'2', name:'Shruti Jaiswal', phone:'9812345678', status:'approved', verified:true, bestChoice:false, totalCalls:89, earnings:'₹7,200', rating:4.5, isBanned: false, avatar: require('../../images/user_shruti.png') },
  { id:'3', name:'Ananya', phone:'9898989898', status:'approved', verified:false, bestChoice:false, totalCalls:45, earnings:'₹3,600', rating:4.2, isBanned: false, avatar: require('../../images/user_ananya.png') },
  { id:'4', name:'Neha', phone:'9123456789', status:'pending', verified:false, bestChoice:false, totalCalls:0, earnings:'₹0', rating:0, isBanned: false, avatar: require('../../images/user_neha.png') },
  { id:'5', name:'Riya', phone:'9567891234', status:'pending', verified:false, bestChoice:false, totalCalls:0, earnings:'₹0', rating:0, isBanned: false, avatar: require('../../images/user_riya.png') },
  { id:'6', name:'Deepika', phone:'9234567891', status:'rejected', verified:false, bestChoice:false, totalCalls:0, earnings:'₹0', rating:0, isBanned: true, avatar: require('../../images/user_deepika.png') },
];

export const USER_AVATARS = {
  '1': require('../../images/user_priya.png'),
  '2': require('../../images/user_shruti.png'),
  '3': require('../../images/user_ananya.png'),
  '4': require('../../images/user_neha.png'),
  '5': require('../../images/user_riya.png'),
  '6': require('../../images/user_deepika.png'),
};

export const ADMIN_STATS = {
  totalUsers: 1247,
  totalListeners: 89,
  pendingApprovals: 12,
  pendingReports: 8,
  activeNow: 34,
  totalCalls: 5678,
  totalRevenue: 234500,
};

export const RECENT_ACTIVITIES = [
  { id:'1', user:'Priya Sharma', action:'Applied to become listener', time:'2 min ago', icon:'person-add', color:'#3B82F6' },
  { id:'2', user:'Shruti Jaiswal', action:'Completed 50 calls', time:'15 min ago', icon:'call', color:'#10B981' },
  { id:'3', user:'Ananya', action:'New user registered', time:'32 min ago', icon:'person', color:'#F59E0B' },
  { id:'4', user:'Neha', action:'Listener went offline', time:'1 hr ago', icon:'radio-button-off', color:'#EF4444' },
  { id:'5', user:'Riya', action:'Made first call', time:'2 hr ago', icon:'call-outline', color:'#8B5CF6' },
];


export const ADMIN_PHONE = '1234567890';
export const ADMIN_OTP = '0000';
