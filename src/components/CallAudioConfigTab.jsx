import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Volume2, Upload, Play, Pause, Trash2, Save, RefreshCw,
  Phone, User, Mic, CheckCircle, XCircle, Calendar, 
  MessageSquare, Settings2, FileAudio, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Audio position definitions with icons and descriptions
const AUDIO_POSITIONS = [
  {
    key: 'greeting',
    label: 'Opening Greeting',
    icon: Phone,
    description: 'First message when call connects',
    color: 'blue'
  },
  {
    key: 'before_name',
    label: 'Before Name',
    icon: User,
    description: 'Played before saying the person\'s name (e.g., "Thank you")',
    color: 'green'
  },
  {
    key: 'after_name',
    label: 'After Name',
    icon: User,
    description: 'Played after saying the person\'s name',
    color: 'green'
  },
  {
    key: 'recognized_host',
    label: 'Recognized Host',
    icon: CheckCircle,
    description: 'When system recognizes the caller',
    color: 'emerald'
  },
  {
    key: 'unrecognized_host',
    label: 'Unrecognized Host',
    icon: XCircle,
    description: 'When caller is not in the system',
    color: 'amber'
  },
  {
    key: 'menu_options',
    label: 'Menu Options',
    icon: MessageSquare,
    description: 'Press 1 for..., Press 2 for... options',
    color: 'purple'
  },
  {
    key: 'beds_question',
    label: 'Beds Question',
    icon: Mic,
    description: 'Asking how many beds they can offer',
    color: 'indigo'
  },
  {
    key: 'accept_confirmation',
    label: 'Accept Confirmation',
    icon: CheckCircle,
    description: 'When host confirms/accepts',
    color: 'green'
  },
  {
    key: 'goodbye',
    label: 'Goodbye Message',
    icon: Phone,
    description: 'Final message before hanging up (after accepting)',
    color: 'slate'
  },
  {
    key: 'decline',
    label: 'Decline Response',
    icon: XCircle,
    description: 'When host declines',
    color: 'red'
  },
  {
    key: 'friday_callback',
    label: 'Friday Callback',
    icon: Calendar,
    description: 'When host requests Friday callback',
    color: 'orange'
  },
  {
    key: 'guest_info',
    label: 'Guest Info',
    icon: User,
    description: 'We have X guests waiting...',
    color: 'cyan'
  },
  {
    key: 'no_beds_needed',
    label: 'No Beds Needed',
    icon: CheckCircle,
    description: 'Everyone is set for this week',
    color: 'teal'
  },
  {
    key: 'host_unreg_private',
    label: 'Private Place Question (Unregistered)',
    icon: User,
    description: 'Ask if accommodation is private or at home (for unregistered hosts)',
    color: 'violet'
  },
  {
    key: 'register_private',
    label: 'Private Place Question (Register)',
    icon: User,
    description: 'Ask if accommodation is private during registration',
    color: 'violet'
  },
  {
    key: 'host_unreg_final',
    label: 'Final Message (Unregistered)',
    icon: Phone,
    description: 'Final message before hanging up for unregistered hosts',
    color: 'slate'
  }
];

const AudioPositionConfig = ({ 
  position, 
  config, 
  onUpdate, 
  onUpload, 
  uploading,
  playingAudio,
  onPlay
}) => {
  const Icon = position.icon;
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
  };

  const audioUrl = config?.[`${position.key}_audio_url`];
  const text = config?.[`${position.key}_text`] || '';
  const useAudio = config?.[`use_${position.key}_audio`] || false;

  return (
    <div className={`p-4 rounded-lg border-2 ${colorClasses[position.color]} space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <span className="font-medium">{position.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">Use Audio</span>
          <Switch
            checked={useAudio}
            onCheckedChange={(checked) => onUpdate(`use_${position.key}_audio`, checked)}
          />
        </div>
      </div>
      
      <p className="text-xs opacity-75">{position.description}</p>

      {/* Text fallback */}
      <div>
        <Label className="text-xs">Text (TTS Fallback)</Label>
        <Textarea
          value={text}
          onChange={(e) => onUpdate(`${position.key}_text`, e.target.value)}
          placeholder={`Text to speak for ${position.label.toLowerCase()}...`}
          className="mt-1 text-sm h-16 bg-white/50"
        />
      </div>

      {/* Audio upload */}
      {useAudio && (
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <FileAudio className="w-3 h-3" />
            Audio File
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => onUpload(e, position.key)}
              className="flex-1 text-xs"
              disabled={uploading}
            />
            {audioUrl && (
              <>
                <button
                  onClick={() => onPlay(audioUrl, position.key)}
                  className={`p-2 rounded-full transition-colors ${
                    playingAudio === position.key
                      ? 'bg-green-600 text-white'
                      : 'bg-white hover:bg-slate-100'
                  }`}
                >
                  {playingAudio === position.key ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => onUpdate(`${position.key}_audio_url`, null)}
                  className="p-2 rounded-full bg-white hover:bg-red-100 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          {audioUrl && (
            <p className="text-xs text-green-700">✓ Audio uploaded</p>
          )}
        </div>
      )}
    </div>
  );
};

export default function CallAudioConfigTab() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('call_audio_config')
        .select('*')
        .order('created_at');

      if (error) throw error;
      
      setConfigs(data || []);
      if (data?.length > 0 && !selectedConfig) {
        setSelectedConfig(data[0]);
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load audio configurations"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (field, value) => {
    if (!selectedConfig) return;
    setSelectedConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!selectedConfig) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('call_audio_config')
        .update({
          ...selectedConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConfig.id);

      if (error) throw error;

      toast({
        title: "Saved",
        description: `Audio configuration for "${selectedConfig.config_name}" saved successfully`
      });

      // Refresh configs
      fetchConfigs();
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save configuration"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAudioUpload = async (e, positionKey) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConfig) return;

    setUploading(true);
    try {
      const fileName = `call-audio/${selectedConfig.config_name}/${positionKey}_${Date.now()}.${file.name.split('.').pop()}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voicemail-recordings')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('voicemail-recordings')
        .getPublicUrl(fileName);

      handleUpdate(`${positionKey}_audio_url`, publicUrl);

      toast({
        title: "Uploaded",
        description: "Audio file uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload audio file"
      });
    } finally {
      setUploading(false);
    }
  };

  const togglePlay = (url, key) => {
    if (playingAudio === key) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingAudio(key);
      }
    }
  };

  const handleAudioEnded = () => {
    setPlayingAudio(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} onEnded={handleAudioEnded} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold text-slate-800">Call Audio Configuration</h2>
            <p className="text-sm text-slate-500">Configure which recordings play at each position in calls</p>
          </div>
        </div>
      </div>

      {/* Config Selector */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-4">
          <Label className="whitespace-nowrap">Call Scenario:</Label>
          <Select 
            value={selectedConfig?.config_name || ''} 
            onValueChange={(value) => {
              const config = configs.find(c => c.config_name === value);
              setSelectedConfig(config);
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a call scenario" />
            </SelectTrigger>
            <SelectContent>
              {configs.map(config => (
                <SelectItem key={config.id} value={config.config_name}>
                  {config.config_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedConfig && (
            <span className="text-sm text-slate-500">{selectedConfig.description}</span>
          )}
        </div>
      </div>

      {selectedConfig && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6 space-y-6"
        >
          {/* Call Flow Preview */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Call Flow Preview
            </h3>
            <div className="text-sm text-slate-600 space-y-1">
              <p>1. <strong>Greeting</strong> → "Welcome to the system..."</p>
              <p>2. <strong>Before Name</strong> → "Thank you..." → <em>[Person's Name]</em> → <strong>After Name</strong></p>
              <p>3. <strong>Menu Options</strong> → "Press 1 if available..."</p>
              <p>4. On Accept: <strong>Beds Question</strong> → <strong>Accept Confirmation</strong> → <strong>Goodbye</strong></p>
              <p>4. On Decline: <strong>Decline Response</strong></p>
              <p>4. On Friday: <strong>Friday Callback</strong></p>
            </div>
          </div>

          {/* Audio Positions Grid */}
          <Accordion type="single" collapsible defaultValue="opening" className="space-y-2">
            <AccordionItem value="opening" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  Opening & Recognition
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {AUDIO_POSITIONS.filter(p => ['greeting', 'recognized_host', 'unrecognized_host', 'guest_info', 'no_beds_needed'].includes(p.key)).map(position => (
                    <AudioPositionConfig
                      key={position.key}
                      position={position}
                      config={selectedConfig}
                      onUpdate={handleUpdate}
                      onUpload={handleAudioUpload}
                      uploading={uploading}
                      playingAudio={playingAudio}
                      onPlay={togglePlay}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="name" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-green-600" />
                  Name Handling (Before/After)
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {AUDIO_POSITIONS.filter(p => ['before_name', 'after_name'].includes(p.key)).map(position => (
                    <AudioPositionConfig
                      key={position.key}
                      position={position}
                      config={selectedConfig}
                      onUpdate={handleUpdate}
                      onUpload={handleAudioUpload}
                      uploading={uploading}
                      playingAudio={playingAudio}
                      onPlay={togglePlay}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="menu" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  Menu & Questions
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {AUDIO_POSITIONS.filter(p => ['menu_options', 'beds_question', 'host_unreg_private', 'register_private', 'host_unreg_final'].includes(p.key)).map(position => (
                    <AudioPositionConfig
                      key={position.key}
                      position={position}
                      config={selectedConfig}
                      onUpdate={handleUpdate}
                      onUpload={handleAudioUpload}
                      uploading={uploading}
                      playingAudio={playingAudio}
                      onPlay={togglePlay}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="responses" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Response Handling
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {AUDIO_POSITIONS.filter(p => ['accept_confirmation', 'goodbye', 'decline', 'friday_callback'].includes(p.key)).map(position => (
                    <AudioPositionConfig
                      key={position.key}
                      position={position}
                      config={selectedConfig}
                      onUpdate={handleUpdate}
                      onUpload={handleAudioUpload}
                      uploading={uploading}
                      playingAudio={playingAudio}
                      onPlay={togglePlay}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
