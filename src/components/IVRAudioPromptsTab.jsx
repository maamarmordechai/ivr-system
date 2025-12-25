import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Play, 
  Pause, 
  Upload, 
  Trash2, 
  RefreshCw, 
  Check, 
  X, 
  ChevronDown, 
  ChevronRight,
  Phone,
  Volume2,
  Mic
} from 'lucide-react';

// IVR Flow Steps organized by category
const IVR_STEPS = {
  'Main Menu': [
    { key: 'main_menu', name: 'Main Menu Greeting', description: 'Welcome message with options (1=host, 2=register, 0=office, 8=admin)' },
  ],
  'Host This Shabbos (Option 1)': [
    { key: 'host_recognized', name: 'Recognized Host', description: 'When system recognizes caller - "We recognize you as [name], you have [X] beds..."' },
    { key: 'host_unrecognized', name: 'Unrecognized Caller', description: 'When system doesn\'t recognize caller - asks for bed count' },
    { key: 'host_confirmed', name: 'Host Confirmed', description: 'Thank you message after host confirms availability' },
    { key: 'host_update_beds', name: 'Update Beds Prompt', description: 'Ask host for new bed count when updating' },
    { key: 'host_update_beds_saved', name: 'Beds Updated', description: 'Confirmation after bed count is updated' },
    { key: 'host_unreg_private', name: 'Private/Home Question', description: 'Ask if accommodation is private or at home' },
    { key: 'host_unreg_final', name: 'Unregistered Final', description: 'Thank you message for unregistered host' },
    { key: 'all_set', name: 'All Beds Filled', description: 'Message when no more beds are needed this week' },
  ],
  'Register as Host (Option 2)': [
    { key: 'register_beds', name: 'Register Beds Prompt', description: 'Ask new host how many beds they can offer' },
    { key: 'register_private', name: 'Register Private/Home', description: 'Ask if their accommodation is private' },
    { key: 'register_frequency', name: 'Call Frequency', description: 'Ask how often they want to receive calls' },
    { key: 'register_final', name: 'Registration Complete', description: 'Thank you for registering message' },
  ],
  'Office & Other': [
    { key: 'leave_message', name: 'Leave Message', description: 'Prompt to leave a voicemail for the office' },
  ],
  'Weekly Availability Calls (Outbound)': [
    { key: 'thank_you_mr', name: 'Thank You Greeting', description: 'Start of thank you - "Thank you Mr/Mrs..."' },
    { key: 'beds_question', name: 'How Many Beds?', description: 'Ask caller how many beds they have available' },
    { key: 'thank_you_yes', name: 'Thank You (Available)', description: 'Thank you message when they say yes with bed count' },
    { key: 'thank_you_no', name: 'Thank You (Not Available)', description: 'Thank you message when they say no' },
    { key: 'thank_you_friday', name: 'Call Back Friday', description: 'Confirmation they\'ll be called back Friday' },
  ],
};

const IVRAudioPromptsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [audioPrompts, setAudioPrompts] = useState([]);
  const [voicemails, setVoicemails] = useState([]);
  const [uploadingAudio, setUploadingAudio] = useState({});
  const [playingId, setPlayingId] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    'Main Menu': true,
    'Host This Shabbos (Option 1)': true,
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
    return () => {
      // Cleanup audio on unmount
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch audio prompts
      const { data: promptsData, error: promptsError } = await supabase
        .from('voicemail_audio_prompts')
        .select(`
          *,
          voicemails (
            id,
            caller_name,
            caller_phone,
            created_at,
            label,
            recording_url
          )
        `)
        .order('prompt_name');

      if (promptsError) throw promptsError;
      setAudioPrompts(promptsData || []);

      // Fetch all voicemails for selection
      const { data: voicemailsData, error: voicemailsError } = await supabase
        .from('voicemails')
        .select('id, caller_name, caller_phone, created_at, label, recording_url')
        .order('created_at', { ascending: false })
        .limit(100);

      if (voicemailsError) throw voicemailsError;
      setVoicemails(voicemailsData || []);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const getPromptByKey = (key) => {
    return audioPrompts.find(p => p.prompt_key === key);
  };

  const handlePlayAudio = (url, promptKey) => {
    if (playingId === promptKey) {
      // Stop playing
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setPlayingId(null);
      setAudioElement(null);
    } else {
      // Stop previous audio
      if (audioElement) {
        audioElement.pause();
      }
      
      // Play new audio
      const audio = new Audio(url);
      audio.onended = () => {
        setPlayingId(null);
        setAudioElement(null);
      };
      audio.onerror = () => {
        toast({
          variant: "destructive",
          title: "Playback Error",
          description: "Could not play audio file"
        });
        setPlayingId(null);
        setAudioElement(null);
      };
      audio.play();
      setPlayingId(promptKey);
      setAudioElement(audio);
    }
  };

  const updateVoicemailMapping = async (promptKey, voicemailId) => {
    try {
      let prompt = getPromptByKey(promptKey);
      
      // Create prompt if it doesn't exist
      if (!prompt) {
        const stepInfo = Object.values(IVR_STEPS).flat().find(s => s.key === promptKey);
        const { data: newPrompt, error: insertError } = await supabase
          .from('voicemail_audio_prompts')
          .insert({
            prompt_key: promptKey,
            prompt_name: stepInfo?.name || promptKey,
            description: stepInfo?.description || '',
            voicemail_id: voicemailId || null,
            is_active: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        prompt = newPrompt;
      } else {
        // Update existing prompt
        const { error: updateError } = await supabase
          .from('voicemail_audio_prompts')
          .update({ 
            voicemail_id: voicemailId || null,
            audio_url: voicemailId ? null : prompt.audio_url, // Clear audio_url if selecting voicemail
            updated_at: new Date().toISOString()
          })
          .eq('id', prompt.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Success",
        description: "Audio mapping updated"
      });

      fetchData();
    } catch (error) {
      console.error('Error updating voicemail mapping:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const handleAudioUpload = async (promptKey, file) => {
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload an audio file (MP3, WAV, etc.)"
      });
      return;
    }

    setUploadingAudio({ ...uploadingAudio, [promptKey]: true });
    
    try {
      let prompt = getPromptByKey(promptKey);
      
      // Create prompt if it doesn't exist
      if (!prompt) {
        const stepInfo = Object.values(IVR_STEPS).flat().find(s => s.key === promptKey);
        const { data: newPrompt, error: insertError } = await supabase
          .from('voicemail_audio_prompts')
          .insert({
            prompt_key: promptKey,
            prompt_name: stepInfo?.name || promptKey,
            description: stepInfo?.description || '',
            is_active: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        prompt = newPrompt;
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `ivr_${promptKey}_${Date.now()}.${fileExt}`;
      const filePath = `ivr-prompts/${fileName}`;

      const { error: uploadError } = await supabase.storage
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

      // Update prompt with URL (clear voicemail_id)
      const { error: updateError } = await supabase
        .from('voicemail_audio_prompts')
        .update({ 
          audio_url: publicUrl,
          voicemail_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', prompt.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Audio file uploaded"
      });

      fetchData();
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setUploadingAudio({ ...uploadingAudio, [promptKey]: false });
    }
  };

  const handleClearAudio = async (promptKey) => {
    try {
      const prompt = getPromptByKey(promptKey);
      if (!prompt) return;

      // Delete from storage if it's an uploaded file
      if (prompt.audio_url && prompt.audio_url.includes('ivr-prompts/')) {
        const urlParts = prompt.audio_url.split('/ivr-prompts/');
        if (urlParts.length === 2) {
          const filePath = `ivr-prompts/${urlParts[1]}`;
          await supabase.storage
            .from('audio-recordings')
            .remove([filePath]);
        }
      }

      // Clear both audio_url and voicemail_id
      const { error } = await supabase
        .from('voicemail_audio_prompts')
        .update({ 
          audio_url: null,
          voicemail_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', prompt.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Audio cleared - will use text-to-speech"
      });

      fetchData();
    } catch (error) {
      console.error('Error clearing audio:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const expandAll = () => {
    const allExpanded = {};
    Object.keys(IVR_STEPS).forEach(key => {
      allExpanded[key] = true;
    });
    setExpandedSections(allExpanded);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  const getAudioStatus = (promptKey) => {
    const prompt = getPromptByKey(promptKey);
    if (!prompt) return { status: 'none', label: 'Text-to-Speech', color: 'text-slate-400' };
    
    if (prompt.voicemail_id && prompt.voicemails?.recording_url) {
      return { 
        status: 'voicemail', 
        label: `Voicemail: ${prompt.voicemails.label || prompt.voicemails.caller_name || 'Recording'}`,
        color: 'text-purple-600',
        url: prompt.voicemails.recording_url
      };
    }
    
    if (prompt.audio_url) {
      return { 
        status: 'uploaded', 
        label: 'Uploaded Audio',
        color: 'text-green-600',
        url: prompt.audio_url
      };
    }
    
    return { status: 'none', label: 'Text-to-Speech', color: 'text-slate-400' };
  };

  const filteredSteps = searchTerm 
    ? Object.entries(IVR_STEPS).reduce((acc, [category, steps]) => {
        const filtered = steps.filter(step => 
          step.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          step.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          step.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[category] = filtered;
        }
        return acc;
      }, {})
    : IVR_STEPS;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading audio prompts...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Volume2 className="w-6 h-6" />
            IVR Audio Prompts
          </h2>
          <p className="text-slate-600 mt-1">
            Manage audio recordings for each step in the phone IVR system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={expandAll} variant="outline" size="sm">
            Expand All
          </Button>
          <Button onClick={collapseAll} variant="outline" size="sm">
            Collapse All
          </Button>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          type="text"
          placeholder="Search prompts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status Legend */}
      <div className="flex items-center gap-6 text-sm bg-slate-50 p-3 rounded-lg">
        <span className="font-medium">Status:</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          Uploaded Audio
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
          Voicemail Recording
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-slate-300"></span>
          Text-to-Speech (Fallback)
        </span>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {Object.entries(filteredSteps).map(([category, steps]) => (
          <div key={category} className="border rounded-lg overflow-hidden">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(category)}
              className="w-full flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedSections[category] ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
                <span className="font-semibold text-lg">{category}</span>
                <span className="text-slate-500 text-sm">({steps.length} prompts)</span>
              </div>
              <div className="flex items-center gap-2">
                {steps.map(step => {
                  const status = getAudioStatus(step.key);
                  return (
                    <span 
                      key={step.key}
                      className={`w-2 h-2 rounded-full ${
                        status.status === 'uploaded' ? 'bg-green-500' :
                        status.status === 'voicemail' ? 'bg-purple-500' :
                        'bg-slate-300'
                      }`}
                      title={`${step.name}: ${status.label}`}
                    />
                  );
                })}
              </div>
            </button>

            {/* Section Content */}
            {expandedSections[category] && (
              <div className="divide-y">
                {steps.map(step => {
                  const prompt = getPromptByKey(step.key);
                  const audioStatus = getAudioStatus(step.key);
                  
                  return (
                    <div key={step.key} className="p-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-base">{step.name}</h4>
                            <code className="text-xs bg-slate-200 px-2 py-0.5 rounded">
                              {step.key}
                            </code>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{step.description}</p>
                          
                          {/* Status */}
                          <div className={`text-sm mt-2 ${audioStatus.color} font-medium flex items-center gap-1`}>
                            {audioStatus.status === 'uploaded' && <Check className="w-4 h-4" />}
                            {audioStatus.status === 'voicemail' && <Mic className="w-4 h-4" />}
                            {audioStatus.label}
                          </div>
                        </div>

                        {/* Right: Controls */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Play Button */}
                          {audioStatus.url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePlayAudio(audioStatus.url, step.key)}
                              className="w-10 h-10"
                            >
                              {playingId === step.key ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                          )}

                          {/* Voicemail Dropdown */}
                          <select
                            value={prompt?.voicemail_id || ''}
                            onChange={(e) => updateVoicemailMapping(step.key, e.target.value || null)}
                            className="h-10 px-3 border border-slate-300 rounded-md text-sm bg-white min-w-[180px]"
                            disabled={!!prompt?.audio_url}
                          >
                            <option value="">Select voicemail...</option>
                            {voicemails.map((vm) => (
                              <option key={vm.id} value={vm.id}>
                                {vm.label || `${vm.caller_name || 'Unknown'} - ${new Date(vm.created_at).toLocaleDateString()}`}
                              </option>
                            ))}
                          </select>

                          {/* Upload Button */}
                          <div>
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={(e) => handleAudioUpload(step.key, e.target.files?.[0])}
                              className="hidden"
                              id={`upload-${step.key}`}
                              disabled={uploadingAudio[step.key] || !!prompt?.voicemail_id}
                            />
                            <label htmlFor={`upload-${step.key}`}>
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                disabled={uploadingAudio[step.key] || !!prompt?.voicemail_id}
                                className="cursor-pointer"
                              >
                                <span>
                                  <Upload className="w-4 h-4 mr-1" />
                                  {uploadingAudio[step.key] ? 'Uploading...' : 'Upload'}
                                </span>
                              </Button>
                            </label>
                          </div>

                          {/* Clear Button */}
                          {(prompt?.audio_url || prompt?.voicemail_id) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleClearAudio(step.key)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">💡 Tips for Audio Prompts</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Voicemail recordings</strong> are captured from phone calls - best for Yiddish prompts</li>
          <li>• <strong>Uploaded audio</strong> should be MP3 format, ideally 8kHz mono for phone compatibility</li>
          <li>• If no audio is set, the system will use <strong>text-to-speech</strong> as a fallback</li>
          <li>• Click the <strong>play button</strong> to preview any audio before going live</li>
        </ul>
      </div>
    </div>
  );
};

export default IVRAudioPromptsTab;
