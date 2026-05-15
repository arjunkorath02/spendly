import { useState } from 'react';
import { LayoutDashboard, BarChart3, Users, User } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import ReceivablesScreen from './screens/ReceivablesScreen';
import ProfileScreen from './screens/ProfileScreen';

type Tab = 'home' | 'analytics' | 'receivables' | 'profile';

function MainApp() {
  const { user, loading, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('home');

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  const avatarUrl = profile?.avatar_url;
  const initials = (profile?.display_name || profile?.email || 'U').slice(0, 2).toUpperCase();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Expenses', icon: <LayoutDashboard size={22} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={22} /> },
    { id: 'receivables', label: 'Receivables', icon: <Users size={22} /> },
    {
      id: 'profile',
      label: 'Profile',
      icon: avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
          <span style={{ fontSize: '9px' }} className="font-bold text-white">{initials}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen app-bg flex flex-col max-w-lg mx-auto relative">
      {/* Screen content */}
      <div className="flex-1 overflow-hidden" style={{ paddingBottom: '80px' }}>
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'analytics' && <AnalyticsScreen />}
        {activeTab === 'receivables' && <ReceivablesScreen />}
        {activeTab === 'profile' && <ProfileScreen />}
      </div>

      {/* Bottom navigation */}
      <div
        className="fixed bottom-0 nav-glass z-30"
        style={{ left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '512px' }}
      >
        <div className="flex items-center px-2 py-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-all duration-150 ${
                  isActive ? 'text-blue-500' : 'text-gray-400'
                }`}
              >
                <div className={`transition-transform duration-150 ${isActive ? 'scale-110' : ''}`}>
                  {tab.icon}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
