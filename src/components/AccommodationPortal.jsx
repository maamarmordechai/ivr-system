import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Home, Building2, Settings, LogOut, Phone, 
  Music, Activity, Bed, UtensilsCrossed, Volume2
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';

// Core tabs
import Dashboard from '@/components/Dashboard';
import ApartmentsTab from '@/components/ApartmentsTab';

// Unified tabs (new)
import AudioManagerTab from '@/components/AudioManagerTab';
import ActivityDashboardTab from '@/components/ActivityDashboardTab';
import IVRFlowBuilderTab from '@/components/IVRFlowBuilderTab';
import IVRMenuConfigTab from '@/components/IVRMenuConfigTab';

// Existing tabs
import BedManagementTab from '@/components/BedManagementTab';
import MealHostsTab from '@/components/MealHostsTab';
import VoicemailsTab from '@/components/VoicemailsTab';
import SystemSettingsTab from '@/components/SystemSettingsTab';
import WeeklyAvailabilityTab from '@/components/WeeklyAvailabilityTab';

const AccommodationPortal = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { signOut, user } = useAuth();

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'activity', name: 'Activity', icon: Activity },
    { id: 'hosts', name: 'Hosts', icon: Building2 },
    { id: 'beds', name: 'Beds', icon: Bed },
    { id: 'meals', name: 'Meals', icon: UtensilsCrossed },
    { id: 'weekly-check', name: 'Weekly Check', icon: Phone },
    { id: 'ivr-menu', name: 'IVR Menu', icon: Phone },
    { id: 'ivr-builder', name: 'IVR Builder', icon: Phone },
    { id: 'audio', name: 'Audio', icon: Music },
    { id: 'voicemails', name: 'Voicemails', icon: Volume2 },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Modern Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">Portal</h1>
              <p className="text-xs text-slate-500 font-medium">Accommodation Manager</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden md:block">
              {user?.email}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut}
              className="text-slate-500 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-7xl space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
          {/* Simplified Navigation */}
          <div className="flex justify-center">
            <TabsList className="bg-white p-1.5 rounded-full border border-slate-200 shadow-sm inline-flex flex-wrap justify-center gap-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger 
                    key={tab.id}
                    value={tab.id}
                    className="rounded-full px-4 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.name}</span>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <div className="min-h-[500px]">
            {/* Dashboard */}
            <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none">
              <Dashboard />
            </TabsContent>

            {/* Activity Dashboard - NEW unified reporting */}
            <TabsContent value="activity" className="mt-0 focus-visible:outline-none">
              <ActivityDashboardTab />
            </TabsContent>

            {/* Hosts */}
            <TabsContent value="hosts" className="mt-0 focus-visible:outline-none">
              <ApartmentsTab />
            </TabsContent>

            {/* Beds */}
            <TabsContent value="beds" className="mt-0 focus-visible:outline-none">
              <BedManagementTab />
            </TabsContent>

            {/* Meals */}
            <TabsContent value="meals" className="mt-0 focus-visible:outline-none">
              <MealHostsTab />
            </TabsContent>

            {/* Weekly Availability Check */}
            <TabsContent value="weekly-check" className="mt-0 focus-visible:outline-none">
              <WeeklyAvailabilityTab />
            </TabsContent>

            {/* IVR Menu Config - NEW */}
            <TabsContent value="ivr-menu" className="mt-0 focus-visible:outline-none">
              <IVRMenuConfigTab />
            </TabsContent>

            {/* IVR Flow Builder - NEW visual builder */}
            <TabsContent value="ivr-builder" className="mt-0 focus-visible:outline-none">
              <IVRFlowBuilderTab />
            </TabsContent>

            {/* Audio Manager - NEW unified audio */}
            <TabsContent value="audio" className="mt-0 focus-visible:outline-none">
              <AudioManagerTab />
            </TabsContent>

            {/* Voicemails */}
            <TabsContent value="voicemails" className="mt-0 focus-visible:outline-none">
              <VoicemailsTab />
            </TabsContent>

            {/* Settings */}
            <TabsContent value="settings" className="mt-0 focus-visible:outline-none">
              <SystemSettingsTab />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default AccommodationPortal;