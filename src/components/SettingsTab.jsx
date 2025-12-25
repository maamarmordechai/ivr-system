import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Building2, Phone, PhoneCall, Globe, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import CallSettings from './CallSettings';
import AutomatedCallSystem from './AutomatedCallSystem';
import CallAudioConfigTab from './CallAudioConfigTab';

const SettingsTab = () => {
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState('Accommodation Management');
  const [ivrLanguage, setIvrLanguage] = useState('he-IL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_key', 'tts_language')
        .maybeSingle();

      if (data) {
        setIvrLanguage(data.setting_value);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update IVR language setting
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'tts_language',
          setting_value: ivrLanguage,
          description: 'Text-to-speech language code (he-IL for Hebrew, en-US for English)'
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your IVR language has been updated successfully"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold text-slate-800">הגדרות - Settings</h2>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="calls" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Call Settings
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Call Audio
          </TabsTrigger>
          <TabsTrigger value="automated" className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4" />
            Automated Calls
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <Settings className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-800">General Settings</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <input
                  id="company_name"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-slate-500 mt-1">Used in automated call scripts</p>
              </div>

              <div>
                <Label htmlFor="ivr_language" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  IVR Language / שפת המערכת
                </Label>
                <select
                  id="ivr_language"
                  value={ivrLanguage}
                  onChange={(e) => setIvrLanguage(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="he-IL">🇮🇱 Hebrew (עברית)</option>
                  <option value="en-US">🇺🇸 English</option>
                </select>
                <p className="text-sm text-slate-500 mt-1">
                  Language used for IVR prompts and automated calls
                </p>
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> After changing language, you'll need to update IVR text prompts in the IVR Builder to match the selected language.
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calls">
          <CallSettings />
        </TabsContent>

        <TabsContent value="audio">
          <CallAudioConfigTab />
        </TabsContent>

        <TabsContent value="automated">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 pb-4 border-b mb-6">
              <PhoneCall className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-800">Automated Call System</h3>
            </div>
            <AutomatedCallSystem />
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default SettingsTab;
