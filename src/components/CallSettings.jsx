import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/customSupabaseClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';
import { Upload, Trash2 } from 'lucide-react';

export default function CallSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState({});
  const [settings, setSettings] = useState({
    voice_gender: 'man',
    welcome_message: 'Welcome to Accommodation Management System.',
    option_1_text: 'Press 1 to register as a guest.',
    option_2_text: 'Press 2 to register as a host.',
    option_3_text: 'Press 3 to check if there are any assignments waiting for this week.',
    no_input_message: 'Sorry, we didn\'t receive any input. Goodbye.',
    guest_registration_message: 'You have selected guest registration. Please visit our website or contact our office to complete the guest registration process. Thank you for calling. Goodbye.',
    host_registration_message: 'You have selected host registration. Please visit our website or contact our office to complete the host registration process. Thank you for calling. Goodbye.',
    not_registered_message: 'We could not find your phone number in our system. Please contact our office to register as a host first. Thank you for calling. Goodbye.',
    no_pending_message: 'There are currently no guests waiting for assignment this week. Thank you for checking. Goodbye.',
    beds_question: 'How many beds do you have available? Please enter a number from 1 to 9.',
    invalid_beds_message: 'Invalid input. Please enter a number between 1 and 9.',
    couple_question: 'Would you like to accept couples? Press 1 for yes, or 2 for no.',
    assignment_success_message: 'Great! We have assigned guests to your apartment. You will receive details via email shortly. Thank you for your hospitality. Goodbye.',
    no_match_message: 'Thank you for your offer. Unfortunately, we could not find matching guests at this time. We will contact you if suitable guests become available. Goodbye.',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('call_settings')
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load call settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAudioUpload = async (fieldName, file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an audio file (MP3, WAV, etc.)",
        variant: "destructive",
      });
      return;
    }

    setUploadingAudio({ ...uploadingAudio, [fieldName]: true });
    
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${fieldName}_${Date.now()}.${fileExt}`;
      const filePath = `call-audio/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-recordings')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(filePath);

      // Update settings with the URL
      setSettings({ 
        ...settings, 
        [`${fieldName}_url`]: publicUrl,
        [`use_${fieldName}`]: true 
      });

      toast({
        title: "Success",
        description: "Audio file uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload audio file",
        variant: "destructive",
      });
    } finally {
      setUploadingAudio({ ...uploadingAudio, [fieldName]: false });
    }
  };

  const handleDeleteAudio = async (fieldName) => {
    const audioUrl = settings[`${fieldName}_url`];
    if (!audioUrl) return;

    try {
      // Extract file path from URL
      const urlParts = audioUrl.split('/audio-recordings/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Delete from storage
        const { error } = await supabase.storage
          .from('audio-recordings')
          .remove([filePath]);

        if (error) throw error;
      }

      // Clear from settings
      setSettings({ 
        ...settings, 
        [`${fieldName}_url`]: null,
        [`use_${fieldName}`]: false 
      });

      toast({
        title: "Success",
        description: "Audio file deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting audio:', error);
      toast({
        title: "Error",
        description: "Failed to delete audio file",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('call_settings')
        .update(settings)
        .eq('id', settings.id || (await supabase.from('call_settings').select('id').single()).data?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Call settings updated successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save call settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Call System Settings</h2>
        <p className="text-gray-600">Customize the voice and messages for your IVR system</p>
      </div>

      <div className="space-y-6">
        {/* Voice Gender */}
        <div className="space-y-2">
          <Label htmlFor="voice_gender">Voice Gender</Label>
          <select
            id="voice_gender"
            value={settings.voice_gender}
            onChange={(e) => setSettings({ ...settings, voice_gender: e.target.value })}
            className="w-full p-2 border rounded-md"
          >
            <option value="man">Man</option>
            <option value="woman">Woman</option>
            <option value="alice">Alice (Default Female)</option>
          </select>
          <p className="text-sm text-gray-500">The voice used for all phone interactions</p>
        </div>

        {/* Welcome Message */}
        <div className="space-y-2">
          <Label htmlFor="welcome_message">Welcome Message</Label>
          <Input
            id="welcome_message"
            value={settings.welcome_message}
            onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
            placeholder="Welcome to Accommodation Management System."
          />
          <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 rounded-md">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.use_welcome_audio || false}
                onChange={(e) => setSettings({ ...settings, use_welcome_audio: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm">Use Audio Recording</span>
            </Label>
            {settings.use_welcome_audio && (
              <div className="flex items-center gap-2">
                {settings.welcome_audio_url ? (
                  <>
                    <audio controls className="flex-1" src={settings.welcome_audio_url}>
                      Your browser does not support the audio element.
                    </audio>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteAudio('welcome_audio')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleAudioUpload('welcome_audio', e.target.files[0])}
                      className="flex-1"
                      disabled={uploadingAudio.welcome_audio}
                    />
                    {uploadingAudio.welcome_audio && (
                      <span className="text-sm text-gray-500">Uploading...</span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">Upload an MP3 file or use text-to-speech</p>
        </div>

        {/* Menu Options */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold">Menu Options</h3>
          
          <div className="space-y-2">
            <Label htmlFor="option_1_text">Option 1 (Guest Registration)</Label>
            <Input
              id="option_1_text"
              value={settings.option_1_text}
              onChange={(e) => setSettings({ ...settings, option_1_text: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="option_2_text">Option 2 (Host Registration)</Label>
            <Input
              id="option_2_text"
              value={settings.option_2_text}
              onChange={(e) => setSettings({ ...settings, option_2_text: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="option_3_text">Option 3 (Check Availability)</Label>
            <Input
              id="option_3_text"
              value={settings.option_3_text}
              onChange={(e) => setSettings({ ...settings, option_3_text: e.target.value })}
            />
          </div>
        </div>

        {/* Response Messages */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold">Response Messages</h3>
          
          <div className="space-y-2">
            <Label htmlFor="guest_registration_message">Guest Registration Message</Label>
            <textarea
              id="guest_registration_message"
              value={settings.guest_registration_message}
              onChange={(e) => setSettings({ ...settings, guest_registration_message: e.target.value })}
              className="w-full p-2 border rounded-md h-20"
            />
            <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 rounded-md">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.use_guest_registration_audio || false}
                  onChange={(e) => setSettings({ ...settings, use_guest_registration_audio: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Use Audio Recording</span>
              </Label>
              {settings.use_guest_registration_audio && (
                <div className="flex items-center gap-2">
                  {settings.guest_registration_audio_url ? (
                    <>
                      <audio controls className="flex-1" src={settings.guest_registration_audio_url}>
                        Your browser does not support the audio element.
                      </audio>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAudio('guest_registration_audio')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleAudioUpload('guest_registration_audio', e.target.files[0])}
                        className="flex-1"
                        disabled={uploadingAudio.guest_registration_audio}
                      />
                      {uploadingAudio.guest_registration_audio && (
                        <span className="text-sm text-gray-500">Uploading...</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="host_registration_message">Host Registration Message</Label>
            <textarea
              id="host_registration_message"
              value={settings.host_registration_message}
              onChange={(e) => setSettings({ ...settings, host_registration_message: e.target.value })}
              className="w-full p-2 border rounded-md h-20"
            />
            <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 rounded-md">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.use_host_registration_audio || false}
                  onChange={(e) => setSettings({ ...settings, use_host_registration_audio: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Use Audio Recording</span>
              </Label>
              {settings.use_host_registration_audio && (
                <div className="flex items-center gap-2">
                  {settings.host_registration_audio_url ? (
                    <>
                      <audio controls className="flex-1" src={settings.host_registration_audio_url}>
                        Your browser does not support the audio element.
                      </audio>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAudio('host_registration_audio')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleAudioUpload('host_registration_audio', e.target.files[0])}
                        className="flex-1"
                        disabled={uploadingAudio.host_registration_audio}
                      />
                      {uploadingAudio.host_registration_audio && (
                        <span className="text-sm text-gray-500">Uploading...</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="not_registered_message">Not Registered Message</Label>
            <textarea
              id="not_registered_message"
              value={settings.not_registered_message}
              onChange={(e) => setSettings({ ...settings, not_registered_message: e.target.value })}
              className="w-full p-2 border rounded-md h-20"
            />
            <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 rounded-md">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.use_not_registered_audio || false}
                  onChange={(e) => setSettings({ ...settings, use_not_registered_audio: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Use Audio Recording</span>
              </Label>
              {settings.use_not_registered_audio && (
                <div className="flex items-center gap-2">
                  {settings.not_registered_audio_url ? (
                    <>
                      <audio controls className="flex-1" src={settings.not_registered_audio_url}>
                        Your browser does not support the audio element.
                      </audio>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAudio('not_registered_audio')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleAudioUpload('not_registered_audio', e.target.files[0])}
                        className="flex-1"
                        disabled={uploadingAudio.not_registered_audio}
                      />
                      {uploadingAudio.not_registered_audio && (
                        <span className="text-sm text-gray-500">Uploading...</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="no_pending_message">No Pending Guests Message</Label>
            <textarea
              id="no_pending_message"
              value={settings.no_pending_message}
              onChange={(e) => setSettings({ ...settings, no_pending_message: e.target.value })}
              className="w-full p-2 border rounded-md h-20"
            />
            <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 rounded-md">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.use_no_pending_audio || false}
                  onChange={(e) => setSettings({ ...settings, use_no_pending_audio: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Use Audio Recording</span>
              </Label>
              {settings.use_no_pending_audio && (
                <div className="flex items-center gap-2">
                  {settings.no_pending_audio_url ? (
                    <>
                      <audio controls className="flex-1" src={settings.no_pending_audio_url}>
                        Your browser does not support the audio element.
                      </audio>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAudio('no_pending_audio')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleAudioUpload('no_pending_audio', e.target.files[0])}
                        className="flex-1"
                        disabled={uploadingAudio.no_pending_audio}
                      />
                      {uploadingAudio.no_pending_audio && (
                        <span className="text-sm text-gray-500">Uploading...</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assignment Flow Messages */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold">Assignment Flow Messages</h3>
          
          <div className="space-y-2">
            <Label htmlFor="beds_question">Beds Available Question</Label>
            <Input
              id="beds_question"
              value={settings.beds_question}
              onChange={(e) => setSettings({ ...settings, beds_question: e.target.value })}
            />
            <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 rounded-md">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.use_beds_audio || false}
                  onChange={(e) => setSettings({ ...settings, use_beds_audio: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Use Audio Recording</span>
              </Label>
              {settings.use_beds_audio && (
                <div className="flex items-center gap-2">
                  {settings.beds_audio_url ? (
                    <>
                      <audio controls className="flex-1" src={settings.beds_audio_url}>
                        Your browser does not support the audio element.
                      </audio>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAudio('beds_audio')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleAudioUpload('beds_audio', e.target.files[0])}
                        className="flex-1"
                        disabled={uploadingAudio.beds_audio}
                      />
                      {uploadingAudio.beds_audio && (
                        <span className="text-sm text-gray-500">Uploading...</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invalid_beds_message">Invalid Beds Input Message</Label>
            <Input
              id="invalid_beds_message"
              value={settings.invalid_beds_message}
              onChange={(e) => setSettings({ ...settings, invalid_beds_message: e.target.value })}
            />
            <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 rounded-md">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.use_invalid_beds_audio || false}
                  onChange={(e) => setSettings({ ...settings, use_invalid_beds_audio: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Use Audio Recording</span>
              </Label>
              {settings.use_invalid_beds_audio && (
                <div className="flex items-center gap-2">
                  {settings.invalid_beds_audio_url ? (
                    <>
                      <audio controls className="flex-1" src={settings.invalid_beds_audio_url}>
                        Your browser does not support the audio element.
                      </audio>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAudio('invalid_beds_audio')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleAudioUpload('invalid_beds_audio', e.target.files[0])}
                        className="flex-1"
                        disabled={uploadingAudio.invalid_beds_audio}
                      />
                      {uploadingAudio.invalid_beds_audio && (
                        <span className="text-sm text-gray-500">Uploading...</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="couple_question">Couple Acceptance Question</Label>
            <Input
              id="couple_question"
              value={settings.couple_question}
              onChange={(e) => setSettings({ ...settings, couple_question: e.target.value })}
            />
            <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 rounded-md">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.use_couple_audio || false}
                  onChange={(e) => setSettings({ ...settings, use_couple_audio: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Use Audio Recording</span>
              </Label>
              {settings.use_couple_audio && (
                <div className="flex items-center gap-2">
                  {settings.couple_audio_url ? (
                    <>
                      <audio controls className="flex-1" src={settings.couple_audio_url}>
                        Your browser does not support the audio element.
                      </audio>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAudio('couple_audio')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleAudioUpload('couple_audio', e.target.files[0])}
                        className="flex-1"
                        disabled={uploadingAudio.couple_audio}
                      />
                      {uploadingAudio.couple_audio && (
                        <span className="text-sm text-gray-500">Uploading...</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* TWO COUPLES QUESTION - NEW */}
          <div className="space-y-2 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <Label htmlFor="two_couples_question" className="text-purple-900 font-semibold">Two Couples Question (Multi-bedroom)</Label>
            <p className="text-xs text-purple-700 mb-2">Asked when apartment has multiple bedrooms and 2+ couples are waiting</p>
            <Input
              id="two_couples_question"
              value={settings.two_couples_question || 'You have multiple bedrooms. Can you accommodate 2 couples in separate rooms? Press 1 for yes, or 2 for no.'}
              onChange={(e) => setSettings({ ...settings, two_couples_question: e.target.value })}
            />
            <div className="flex flex-col gap-2 mt-2 p-3 bg-white rounded-md">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.use_two_couples_audio || false}
                  onChange={(e) => setSettings({ ...settings, use_two_couples_audio: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Use Audio Recording</span>
              </Label>
              {settings.use_two_couples_audio && (
                <div className="flex items-center gap-2">
                  {settings.two_couples_audio_url ? (
                    <>
                      <audio controls className="flex-1" src={settings.two_couples_audio_url}>
                        Your browser does not support the audio element.
                      </audio>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAudio('two_couples_audio')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleAudioUpload('two_couples_audio', e.target.files[0])}
                        className="flex-1"
                        disabled={uploadingAudio.two_couples_audio}
                      />
                      {uploadingAudio.two_couples_audio && (
                        <span className="text-sm text-gray-500">Uploading...</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment_success_message">Assignment Success Message</Label>
            <textarea
              id="assignment_success_message"
              value={settings.assignment_success_message}
              onChange={(e) => setSettings({ ...settings, assignment_success_message: e.target.value })}
              className="w-full p-2 border rounded-md h-20"
            />
            <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 rounded-md">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.use_assignment_success_audio || false}
                  onChange={(e) => setSettings({ ...settings, use_assignment_success_audio: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Use Audio Recording</span>
              </Label>
              {settings.use_assignment_success_audio && (
                <div className="flex items-center gap-2">
                  {settings.assignment_success_audio_url ? (
                    <>
                      <audio controls className="flex-1" src={settings.assignment_success_audio_url}>
                        Your browser does not support the audio element.
                      </audio>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAudio('assignment_success_audio')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleAudioUpload('assignment_success_audio', e.target.files[0])}
                        className="flex-1"
                        disabled={uploadingAudio.assignment_success_audio}
                      />
                      {uploadingAudio.assignment_success_audio && (
                        <span className="text-sm text-gray-500">Uploading...</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="no_match_message">No Match Found Message</Label>
            <textarea
              id="no_match_message"
              value={settings.no_match_message}
              onChange={(e) => setSettings({ ...settings, no_match_message: e.target.value })}
              className="w-full p-2 border rounded-md h-20"
            />
            <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 rounded-md">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.use_no_match_audio || false}
                  onChange={(e) => setSettings({ ...settings, use_no_match_audio: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Use Audio Recording</span>
              </Label>
              {settings.use_no_match_audio && (
                <div className="flex items-center gap-2">
                  {settings.no_match_audio_url ? (
                    <>
                      <audio controls className="flex-1" src={settings.no_match_audio_url}>
                        Your browser does not support the audio element.
                      </audio>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAudio('no_match_audio')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleAudioUpload('no_match_audio', e.target.files[0])}
                        className="flex-1"
                        disabled={uploadingAudio.no_match_audio}
                      />
                      {uploadingAudio.no_match_audio && (
                        <span className="text-sm text-gray-500">Uploading...</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Other Messages */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold">Other Messages</h3>
          
          <div className="space-y-2">
            <Label htmlFor="no_input_message">No Input Received Message</Label>
            <Input
              id="no_input_message"
              value={settings.no_input_message}
              onChange={(e) => setSettings({ ...settings, no_input_message: e.target.value })}
            />
            <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 rounded-md">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.use_no_input_audio || false}
                  onChange={(e) => setSettings({ ...settings, use_no_input_audio: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Use Audio Recording</span>
              </Label>
              {settings.use_no_input_audio && (
                <div className="flex items-center gap-2">
                  {settings.no_input_audio_url ? (
                    <>
                      <audio controls className="flex-1" src={settings.no_input_audio_url}>
                        Your browser does not support the audio element.
                      </audio>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAudio('no_input_audio')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleAudioUpload('no_input_audio', e.target.files[0])}
                        className="flex-1"
                        disabled={uploadingAudio.no_input_audio}
                      />
                      {uploadingAudio.no_input_audio && (
                        <span className="text-sm text-gray-500">Uploading...</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
