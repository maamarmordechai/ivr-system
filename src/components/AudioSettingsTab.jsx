import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Play, Pause, Save, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const AudioSettingsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [bedAudio, setBedAudio] = useState([]);
  const [mealAudio, setMealAudio] = useState([]);
  const [activeTab, setActiveTab] = useState('bed');
  const [playingId, setPlayingId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchAudioSettings();
  }, []);

  const fetchAudioSettings = async () => {
    try {
      setLoading(true);

      // Fetch bed audio settings
      const { data: bedData, error: bedError } = await supabase
        .from('bed_audio_settings')
        .select('*')
        .order('sequence_order', { ascending: true })
        .order('audio_key', { ascending: true });

      if (bedError) throw bedError;
      setBedAudio(bedData || []);

      // Fetch meal audio settings
      const { data: mealData, error: mealError } = await supabase
        .from('meal_audio_settings')
        .select('*')
        .order('sequence_order', { ascending: true })
        .order('audio_key', { ascending: true });

      if (mealError) throw mealError;
      setMealAudio(mealData || []);

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

  const handleUpdateAudio = async (id, updates, tableName) => {
    try {
      const { error } = await supabase
        .from(tableName)
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

  const handleFileUpload = async (id, file, tableName) => {
    try {
      // Upload to Supabase Storage
      const fileName = `audio/${tableName}/${id}-${Date.now()}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from('call-audio')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('call-audio')
        .getPublicUrl(fileName);

      // Update database
      await handleUpdateAudio(id, { audio_url: urlData.publicUrl }, tableName);

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
      // Stop audio playback
    } else {
      setPlayingId(id);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => setPlayingId(null);
    }
  };

  const getFlowBadgeColor = (context) => {
    switch (context) {
      case 'new': return 'bg-green-500';
      case 'update': return 'bg-blue-500';
      case 'both': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const currentAudio = activeTab === 'bed' ? bedAudio : mealAudio;
  const currentTable = activeTab === 'bed' ? 'bed_audio_settings' : 'meal_audio_settings';

  if (loading) {
    return <div className="flex justify-center p-8">Loading audio settings...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audio Settings</h2>
          <p className="text-gray-600 mt-1">
            Manage audio prompts for bed and meal confirmation systems
          </p>
        </div>
        <Button onClick={fetchAudioSettings}>Refresh</Button>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('bed')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'bed'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Bed System ({bedAudio.length})
        </button>
        <button
          onClick={() => setActiveTab('meal')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'meal'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Meal System ({mealAudio.length})
        </button>
      </div>

      {/* Audio Settings Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Order</TableHead>
              <TableHead className="w-48">Key</TableHead>
              <TableHead>Default Text</TableHead>
              <TableHead className="w-32">Flow Context</TableHead>
              <TableHead className="w-48">Audio File</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentAudio.map((audio) => (
              <TableRow key={audio.id}>
                {/* Sequence Order */}
                <TableCell>
                  <Input
                    type="number"
                    value={audio.sequence_order}
                    onChange={(e) =>
                      handleUpdateAudio(
                        audio.id,
                        { sequence_order: parseInt(e.target.value) },
                        currentTable
                      )
                    }
                    className="w-16"
                  />
                </TableCell>

                {/* Audio Key */}
                <TableCell>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {audio.audio_key}
                  </code>
                </TableCell>

                {/* Default Text */}
                <TableCell>
                  <div className="max-w-md">
                    {editingId === audio.id ? (
                      <Input
                        value={audio.default_text}
                        onChange={(e) => {
                          const updated = currentAudio.map((a) =>
                            a.id === audio.id ? { ...a, default_text: e.target.value } : a
                          );
                          activeTab === 'bed' ? setBedAudio(updated) : setMealAudio(updated);
                        }}
                        onBlur={() => {
                          handleUpdateAudio(audio.id, { default_text: audio.default_text }, currentTable);
                          setEditingId(null);
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => setEditingId(audio.id)}
                        className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                      >
                        {audio.default_text}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Flow Context */}
                <TableCell>
                  <Select
                    value={audio.flow_context}
                    onValueChange={(value) =>
                      handleUpdateAudio(audio.id, { flow_context: value }, currentTable)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New Only</SelectItem>
                      <SelectItem value="update">Update Only</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge className={`mt-1 ${getFlowBadgeColor(audio.flow_context)}`}>
                    {audio.flow_context}
                  </Badge>
                </TableCell>

                {/* Audio File */}
                <TableCell>
                  {audio.audio_url ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePlayAudio(audio.audio_url, audio.id)}
                      >
                        {playingId === audio.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <span className="text-xs text-green-600">✓ Uploaded</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="audio/mp3,audio/mpeg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(audio.id, file, currentTable);
                        }}
                        className="text-xs"
                      />
                    </div>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  {audio.audio_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUpdateAudio(audio.id, { audio_url: null }, currentTable)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Flow Context Legend:</h3>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500">new</Badge>
            <span>Only played for new confirmations (first time callers)</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500">update</Badge>
            <span>Only played when updating existing confirmations</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500">both</Badge>
            <span>Always played regardless of flow</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          <strong>Note:</strong> Audio files with "_before" and "_after" keys allow dynamic data insertion.
          For example: play "already_confirmed_before.mp3", speak bed count, play "already_confirmed_after.mp3"
        </p>
      </div>
    </div>
  );
};

export default AudioSettingsTab;
