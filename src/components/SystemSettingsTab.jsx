import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Lock, Bed, Users, Phone, Mail, Plus, X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import supabase from '@/lib/customSupabaseClient';
import CallAudioConfigTab from './CallAudioConfigTab';

const SystemSettingsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showCallAudioConfig, setShowCallAudioConfig] = useState(false);
  const [settings, setSettings] = useState({
    default_beds_needed: 30,
    default_friday_meals_needed: 0,
    default_saturday_meals_needed: 0,
    admin_menu_digit: '8',
    admin_password: '7587'
  });
  const [emailAddresses, setEmailAddresses] = useState([]);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    loadSettings();
    loadEmailSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // system_settings is a key-value table, fetch all rows
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value');

      if (error) {
        throw error;
      }

      // Convert key-value pairs to object
      const settingsObj = {};
      if (data) {
        data.forEach(row => {
          settingsObj[row.setting_key] = row.setting_value;
        });
      }

      setSettings({
        default_beds_needed: parseInt(settingsObj.default_beds_needed) || 30,
        default_friday_meals_needed: parseInt(settingsObj.default_friday_meals_needed) || 0,
        default_saturday_meals_needed: parseInt(settingsObj.default_saturday_meals_needed) || 0,
        admin_menu_digit: settingsObj.admin_menu_digit || '8',
        admin_password: settingsObj.admin_password || '7587'
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load system settings",
        variant: "destructive"
      });
    }
  };

  const loadEmailSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_email_settings')
        .select('email_addresses')
        .eq('setting_key', 'voicemail_notifications')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && data.email_addresses) {
        setEmailAddresses(data.email_addresses);
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    }
  };

  const addEmail = () => {
    if (!newEmail) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    if (emailAddresses.includes(newEmail)) {
      toast({
        title: "Duplicate Email",
        description: "This email address is already in the list",
        variant: "destructive"
      });
      return;
    }

    setEmailAddresses([...emailAddresses, newEmail]);
    setNewEmail('');
  };

  const removeEmail = (email) => {
    setEmailAddresses(emailAddresses.filter(e => e !== email));
  };

  const saveEmailSettings = async () => {
    try {
      const { error } = await supabase
        .from('system_email_settings')
        .upsert({
          setting_key: 'voicemail_notifications',
          email_addresses: emailAddresses,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      toast({
        title: "Email Settings Saved",
        description: "Voicemail notification emails updated successfully"
      });
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast({
        title: "Error",
        description: "Failed to save email settings",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // system_settings is a key-value table, upsert each setting
      const settingsToSave = [
        { setting_key: 'default_beds_needed', setting_value: String(settings.default_beds_needed) },
        { setting_key: 'default_friday_meals_needed', setting_value: String(settings.default_friday_meals_needed) },
        { setting_key: 'default_saturday_meals_needed', setting_value: String(settings.default_saturday_meals_needed) },
        { setting_key: 'admin_menu_digit', setting_value: settings.admin_menu_digit },
        { setting_key: 'admin_password', setting_value: settings.admin_password }
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(setting, { onConflict: 'setting_key' });
        
        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save system settings",
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Defaults */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b">
            <Bed className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-800">Weekly Defaults</h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="beds_needed" className="text-sm font-medium">
                Default Beds Needed Per Week
              </Label>
              <Input
                id="beds_needed"
                type="number"
                min="0"
                value={settings.default_beds_needed}
                onChange={(e) => setSettings({ ...settings, default_beds_needed: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                How many guest beds are needed each week by default
              </p>
            </div>

            <div>
              <Label htmlFor="friday_meals" className="text-sm font-medium">
                Default Friday Night Meals Needed
              </Label>
              <Input
                id="friday_meals"
                type="number"
                min="0"
                value={settings.default_friday_meals_needed}
                onChange={(e) => setSettings({ ...settings, default_friday_meals_needed: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                How many Friday night meals are needed each week
              </p>
            </div>

            <div>
              <Label htmlFor="saturday_meals" className="text-sm font-medium">
                Default Saturday Day Meals Needed
              </Label>
              <Input
                id="saturday_meals"
                type="number"
                min="0"
                value={settings.default_saturday_meals_needed}
                onChange={(e) => setSettings({ ...settings, default_saturday_meals_needed: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                How many Saturday day meals are needed each week
              </p>
            </div>
          </div>
        </div>

        {/* Admin Access */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b">
            <Lock className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-800">Admin Access</h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="admin_digit" className="text-sm font-medium">
                Admin Menu Digit
              </Label>
              <Input
                id="admin_digit"
                type="text"
                maxLength="1"
                pattern="[0-9*#]"
                value={settings.admin_menu_digit}
                onChange={(e) => setSettings({ ...settings, admin_menu_digit: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Which digit callers press to access admin menu (0-9, *, #)
              </p>
            </div>

            <div>
              <Label htmlFor="admin_password" className="text-sm font-medium">
                Admin Password
              </Label>
              <Input
                id="admin_password"
                type="text"
                pattern="[0-9]+"
                value={settings.admin_password}
                onChange={(e) => setSettings({ ...settings, admin_password: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Numeric password required to access admin features
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm mb-1">Admin Access Flow</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Callers press digit <strong>{settings.admin_menu_digit}</strong> during initial greeting</li>
                    <li>• System prompts for password</li>
                    <li>• Enter password: <strong>{settings.admin_password}</strong></li>
                    <li>• Access granted to manage beds and meals</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email Notifications */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
              <Mail className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-800">Voicemail Email Notifications</h3>
            </div>
            <Button
              onClick={saveEmailSettings}
              disabled={loading}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Emails
            </Button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Add email addresses to receive notifications when new voicemails arrive. 
              Each email will include the voicemail details and MP3 recording as an attachment.
            </p>

            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                className="flex-1"
              />
              <Button
                onClick={addEmail}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Email
              </Button>
            </div>

            {emailAddresses.length === 0 ? (
              <div className="bg-slate-50 rounded-lg p-4 text-center text-slate-500">
                No email addresses configured. Add one above to start receiving voicemail notifications.
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Notification Recipients ({emailAddresses.length})</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {emailAddresses.map((email, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-700">{email}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmail(email)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm mb-1">How Email Notifications Work</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Automatic email sent when new voicemail arrives</li>
                    <li>• Includes caller phone number, timestamp, and duration</li>
                    <li>• MP3 recording attached to email for easy playback</li>
                    <li>• All configured addresses receive each voicemail</li>
                    <li>• Can also configure per-box emails in Voicemails tab</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call Audio Configuration */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
              <Volume2 className="w-6 h-6 text-purple-600" />
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Call Audio Configuration</h3>
                <p className="text-sm text-slate-500">Configure which recordings play at each position in calls</p>
              </div>
            </div>
            <Button
              onClick={() => setShowCallAudioConfig(!showCallAudioConfig)}
              variant={showCallAudioConfig ? "default" : "outline"}
              className={showCallAudioConfig ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              {showCallAudioConfig ? 'Hide Configuration' : 'Configure Audio'}
            </Button>
          </div>

          {showCallAudioConfig ? (
            <CallAudioConfigTab />
          ) : (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Volume2 className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-purple-900 text-sm mb-1">Audio Position Settings</h4>
                  <ul className="text-xs text-purple-800 space-y-1">
                    <li>• <strong>Greeting:</strong> First message when call connects</li>
                    <li>• <strong>Before/After Name:</strong> Audio around the person's name</li>
                    <li>• <strong>Menu Options:</strong> Press 1 for..., Press 2 for...</li>
                    <li>• <strong>Accept/Decline:</strong> Response confirmations</li>
                    <li>• <strong>Friday Callback:</strong> When host requests callback</li>
                  </ul>
                  <p className="text-xs text-purple-700 mt-2">
                    Click "Configure Audio" to upload custom MP3 recordings or edit TTS text for each position.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* System Information */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-3 pb-4 border-b">
            <Settings className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-800">System Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-slate-600" />
                <h4 className="font-semibold text-slate-700">Open Call System</h4>
              </div>
              <p className="text-sm text-slate-600">
                Anyone can call in anytime during the week. No pre-registration required.
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-slate-600" />
                <h4 className="font-semibold text-slate-700">Priority Calling</h4>
              </div>
              <p className="text-sm text-slate-600">
                System calls hosts who haven't helped the longest first when sending automated calls.
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bed className="w-5 h-5 text-slate-600" />
                <h4 className="font-semibold text-slate-700">Capacity Tracking</h4>
              </div>
              <p className="text-sm text-slate-600">
                Tracks beds needed vs. confirmed. No guest names or arrival dates stored.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SystemSettingsTab;
