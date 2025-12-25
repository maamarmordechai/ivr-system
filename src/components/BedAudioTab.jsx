import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Play, Pause, Trash2 } from 'lucide-react';

const BedAudioTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [audioSettings, setAudioSettings] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchAudioSettings();
  }, []);

  const fetchAudioSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bed_audio_settings')
        .select('*')
        .order('sequence_order', { ascending: true })
        .order('audio_key', { ascending: true });

      if (error) throw error;
      setAudioSettings(data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading audio settings",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAudio = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('bed_audio_settings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Audio setting updated"
      });

      fetchAudioSettings();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating audio",
        description: error.message
      });
    }
  };

  const handleFileUpload = async (id, file) => {
    try {
      const fileName = `audio/bed-audio/${id}-${Date.now()}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from('call-audio')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('call-audio')
        .getPublicUrl(fileName);

      await handleUpdateAudio(id, { audio_url: urlData.publicUrl });

      toast({
        title: "Success",
        description: "Audio file uploaded"
      });

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error uploading file",
        description: error.message
      });
    }
  };

  const handlePlayAudio = (url, id) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => setPlayingId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading audio settings...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Bed Audio Settings</h2>
        <Button onClick={fetchAudioSettings} size="sm">Refresh</Button>
      </div>

      <div className="space-y-3">
        {audioSettings.map((audio, index) => (
          <div key={audio.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="grid grid-cols-12 gap-4 items-start">
              {/* Order Number */}
              <div className="col-span-1">
                <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
                  {audio.sequence_order}
                </div>
              </div>

              {/* Key and Text */}
              <div className="col-span-7">
                <div className="mb-2">
                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {audio.audio_key}
                  </code>
                </div>
                {editingId === audio.id ? (
                  <Textarea
                    value={audio.default_text || ''}
                    onChange={(e) => {
                      const updated = audioSettings.map((a) =>
                        a.id === audio.id ? { ...a, default_text: e.target.value } : a
                      );
                      setAudioSettings(updated);
                    }}
                    onBlur={() => {
                      handleUpdateAudio(audio.id, { default_text: audio.default_text });
                      setEditingId(null);
                    }}
                    className="w-full"
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={() => setEditingId(audio.id)}
                    className="text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded border border-transparent hover:border-blue-300"
                  >
                    {audio.default_text || <span className="text-gray-400">Click to add text...</span>}
                  </div>
                )}
              </div>

              {/* Flow Context */}
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">When Used:</label>
                <select
                  value={audio.flow_context || 'both'}
                  onChange={(e) => handleUpdateAudio(audio.id, { flow_context: e.target.value })}
                  className="w-full px-2 py-1 text-sm border rounded"
                >
                  <option value="new">New Only</option>
                  <option value="update">Update Only</option>
                  <option value="both">Both</option>
                </select>
              </div>

              {/* Audio File Upload/Play */}
              <div className="col-span-2">
                {audio.audio_url ? (
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePlayAudio(audio.audio_url, audio.id)}
                      className="w-full"
                    >
                      {playingId === audio.id ? (
                        <><Pause className="h-3 w-3 mr-1" /> Pause</>
                      ) : (
                        <><Play className="h-3 w-3 mr-1" /> Play</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Remove audio file?')) {
                          handleUpdateAudio(audio.id, { audio_url: null });
                        }
                      }}
                      className="w-full text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="audio/mp3,audio/mpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(audio.id, file);
                      }}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded p-3 text-center hover:border-blue-500 hover:bg-blue-50">
                      <Upload className="h-5 w-5 mx-auto mb-1 text-gray-400" />
                      <span className="text-xs text-gray-600">Upload MP3</span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BedAudioTab;
