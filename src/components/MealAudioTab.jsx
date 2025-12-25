import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Music, Upload, Play, Trash2, Check, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const MealAudioTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [audioSettings, setAudioSettings] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [textEdits, setTextEdits] = useState({});

  const audioLabels = {
    intro: 'Introduction Message',
    guest_count_prompt: 'Guest Count Prompt',
    meal_selection: 'Meal Selection Prompt',
    day_meal_only: 'Saturday Day Meal Confirmation',
    night_meal_only: 'Friday Night Meal Confirmation',
    both_meals: 'Both Meals Confirmation',
    thank_you: 'Thank You Message'
  };

  const audioDescriptions = {
    intro: 'Played when the host answers the call',
    guest_count_prompt: 'Asks how many guests they can host (0 if unavailable)',
    meal_selection: 'Asks which meals: 1=Friday night, 2=Saturday day, 3=Both',
    day_meal_only: 'Confirms hosting Saturday lunch only',
    night_meal_only: 'Confirms hosting Friday dinner only',
    both_meals: 'Confirms hosting both Friday and Saturday meals',
    thank_you: 'Final thank you and goodbye message'
  };

  useEffect(() => {
    fetchAudioSettings();
  }, []);

  const fetchAudioSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('meal_audio_settings')
        .select('*')
        .order('audio_key');

      if (error) throw error;
      setAudioSettings(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching audio settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
      setLoading(false);
    }
  };

  const handleFileUpload = async (audioKey, file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please upload an audio file (MP3, WAV, etc.)'
      });
      return;
    }

    setUploading(audioKey);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `meal-audio/${audioKey}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('call-audio')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('call-audio')
        .getPublicUrl(fileName);

      // Update database
      const { error: updateError } = await supabase
        .from('meal_audio_settings')
        .update({ audio_url: urlData.publicUrl })
        .eq('audio_key', audioKey);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Audio file uploaded successfully'
      });

      fetchAudioSettings();
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteAudio = async (audioKey, audioUrl) => {
    if (!confirm('Are you sure you want to delete this audio file?')) return;

    try {
      // Extract file path from URL
      const urlParts = audioUrl.split('/call-audio/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('call-audio')
          .remove([`meal-audio/${filePath.split('/').pop()}`]);

        if (deleteError) console.error('Error deleting file:', deleteError);
      }

      // Update database to remove URL
      const { error: updateError } = await supabase
        .from('meal_audio_settings')
        .update({ audio_url: null })
        .eq('audio_key', audioKey);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Audio file deleted successfully'
      });

      fetchAudioSettings();
    } catch (error) {
      console.error('Error deleting audio:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    }
  };

  const handleTextUpdate = (audioKey, newText) => {
    setTextEdits({ ...textEdits, [audioKey]: newText });
    setAudioSettings(audioSettings.map(s => 
      s.audio_key === audioKey ? { ...s, default_text: newText } : s
    ));
  };

  const saveTextUpdate = async (audioKey) => {
    if (!(audioKey in textEdits)) return;

    try {
      const { error } = await supabase
        .from('meal_audio_settings')
        .update({ default_text: textEdits[audioKey] })
        .eq('audio_key', audioKey);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Text updated successfully'
      });

      const newEdits = { ...textEdits };
      delete newEdits[audioKey];
      setTextEdits(newEdits);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading audio settings...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Music className="w-8 h-8 text-purple-600" />
          Meal Call Audio Settings
        </h2>
        <p className="text-slate-600 mt-1">
          Upload custom MP3 files for each part of the meal hosting call flow
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">How It Works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Upload MP3 audio files for each part of the call</li>
          <li>• If no audio is uploaded, the system uses text-to-speech with the default text</li>
          <li>• You can edit the default text as a fallback</li>
          <li>• Audio files are stored in Supabase Storage</li>
        </ul>
      </div>

      {/* Audio Settings List */}
      <div className="space-y-6">
        {audioSettings.map(setting => (
          <div key={setting.audio_key} className="modern-card p-6 bg-white">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {audioLabels[setting.audio_key] || setting.audio_key}
                </h3>
                <p className="text-sm text-slate-600">
                  {audioDescriptions[setting.audio_key] || 'Custom audio prompt'}
                </p>
              </div>
            </div>

            {/* Current Audio File */}
            {setting.audio_url ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="text-sm font-semibold text-green-900">Custom Audio Uploaded</div>
                      <audio controls className="mt-2 w-full max-w-md">
                        <source src={setting.audio_url} type="audio/mpeg" />
                      </audio>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDeleteAudio(setting.audio_key, setting.audio_url)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <X className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-sm font-semibold text-slate-700">No Custom Audio</div>
                    <div className="text-xs text-slate-500">Using text-to-speech fallback</div>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Section */}
            <div className="mb-4">
              <Label className="mb-2">Upload Custom Audio (MP3 recommended)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(setting.audio_key, file);
                  }}
                  id={`upload-${setting.audio_key}`}
                  className="hidden"
                />
                <Button
                  onClick={() => document.getElementById(`upload-${setting.audio_key}`)?.click()}
                  disabled={uploading === setting.audio_key}
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading === setting.audio_key ? 'Uploading...' : 'Choose File'}
                </Button>
              </div>
            </div>

            {/* Default Text */}
            <div>
              <Label className="mb-2">Default Text-to-Speech (Fallback)</Label>
              <Textarea
                value={setting.default_text || ''}
                onChange={(e) => handleTextUpdate(setting.audio_key, e.target.value)}
                onBlur={() => saveTextUpdate(setting.audio_key)}
                placeholder="Enter text for text-to-speech with male voice..."
                className="w-full"
                rows={2}
              />
              <p className="text-xs text-slate-500 mt-1">
                Changes save automatically when you click outside the text box
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MealAudioTab;
