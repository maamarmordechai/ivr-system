import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/customSupabaseClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';
import { 
  Upload, Play, Pause, Trash2, Search, Filter, Music, 
  Phone, Bed, UtensilsCrossed, Volume2, FolderOpen, Plus,
  RefreshCw, Download, FileAudio
} from 'lucide-react';

const AUDIO_CATEGORIES = [
  { key: 'all', name: 'All Audio', icon: Music, color: 'bg-slate-500' },
  { key: 'ivr', name: 'IVR Prompts', icon: Phone, color: 'bg-blue-500' },
  { key: 'beds', name: 'Bed System', icon: Bed, color: 'bg-green-500' },
  { key: 'meals', name: 'Meal System', icon: UtensilsCrossed, color: 'bg-orange-500' },
  { key: 'voicemail', name: 'Voicemails', icon: Volume2, color: 'bg-purple-500' },
  { key: 'system', name: 'System Sounds', icon: FolderOpen, color: 'bg-slate-600' },
];

export default function AudioManagerTab() {
  const [audioFiles, setAudioFiles] = useState([]);
  const [voicemails, setVoicemails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [playingId, setPlayingId] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    category: 'ivr'
  });
  const audioRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllAudio();
  }, []);

  const fetchAllAudio = async () => {
    setLoading(true);
    try {
      // Fetch from audio_library
      const { data: libraryData, error: libraryError } = await supabase
        .from('audio_library')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch voicemails (recordings)
      const { data: vmData, error: vmError } = await supabase
        .from('voicemails')
        .select(`
          *,
          voicemail_boxes (box_name, box_number)
        `)
        .order('created_at', { ascending: false });

      // Fetch IVR audio prompts
      const { data: promptData, error: promptError } = await supabase
        .from('voicemail_audio_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch IVR Menu audio (from ivr_menus_v2)
      const { data: ivrMenuData } = await supabase
        .from('ivr_menus_v2')
        .select('id, menu_name, menu_key, prompt_audio_url, created_at')
        .not('prompt_audio_url', 'is', null);

      // Fetch bed audio settings
      const { data: bedAudioData } = await supabase
        .from('bed_audio_settings')
        .select('*')
        .not('audio_url', 'is', null);

      // Fetch meal audio settings
      const { data: mealAudioData } = await supabase
        .from('meal_audio_settings')
        .select('*')
        .not('audio_url', 'is', null);

      // Fetch call settings audio
      const { data: callSettingsData } = await supabase
        .from('call_settings')
        .select('*')
        .single();

      // Combine all audio sources
      const allAudio = [];

      // Add library files
      if (libraryData) {
        allAudio.push(...libraryData.map(f => ({
          ...f,
          source: 'library',
          displayName: f.name,
          displayCategory: f.category
        })));
      }

      // Add voicemails
      if (vmData) {
        allAudio.push(...vmData.map(vm => ({
          id: vm.id,
          name: vm.caller_name || `Voicemail from ${vm.caller_phone}`,
          description: `Box: ${vm.voicemail_boxes?.box_name || 'Unknown'}`,
          category: 'voicemail',
          file_url: vm.recording_url,
          duration_seconds: vm.duration_seconds,
          created_at: vm.created_at,
          source: 'voicemail',
          displayName: vm.caller_name || vm.caller_phone,
          displayCategory: 'voicemail',
          listened: vm.listened
        })));
      }

      // Add IVR prompts with audio URLs
      if (promptData) {
        promptData.filter(p => p.audio_url).forEach(p => {
          allAudio.push({
            id: p.id,
            name: p.prompt_name,
            description: p.description,
            category: 'ivr',
            file_url: p.audio_url,
            created_at: p.created_at,
            source: 'ivr_prompt',
            displayName: p.prompt_name,
            displayCategory: 'ivr'
          });
        });
      }

      // Add IVR Menu audio
      if (ivrMenuData) {
        ivrMenuData.forEach(menu => {
          allAudio.push({
            id: `menu-${menu.id}`,
            name: `IVR Menu: ${menu.menu_name}`,
            description: `Menu key: ${menu.menu_key}`,
            category: 'ivr',
            file_url: menu.prompt_audio_url,
            created_at: menu.created_at,
            source: 'ivr_menu',
            displayName: menu.menu_name,
            displayCategory: 'ivr'
          });
        });
      }

      // Add bed audio
      if (bedAudioData) {
        bedAudioData.forEach(audio => {
          allAudio.push({
            id: `bed-${audio.id}`,
            name: `Bed Audio: ${audio.audio_key}`,
            description: audio.description || 'Bed system audio',
            category: 'beds',
            file_url: audio.audio_url,
            created_at: audio.created_at,
            source: 'bed_audio',
            displayName: audio.audio_key,
            displayCategory: 'beds'
          });
        });
      }

      // Add meal audio
      if (mealAudioData) {
        mealAudioData.forEach(audio => {
          allAudio.push({
            id: `meal-${audio.id}`,
            name: `Meal Audio: ${audio.audio_key}`,
            description: audio.description || 'Meal system audio',
            category: 'meals',
            file_url: audio.audio_url,
            created_at: audio.created_at,
            source: 'meal_audio',
            displayName: audio.audio_key,
            displayCategory: 'meals'
          });
        });
      }

      // Add call settings audio
      if (callSettingsData) {
        const audioFields = [
          { key: 'welcome_audio_url', name: 'Welcome Message' },
          { key: 'beds_audio_url', name: 'Beds Question' },
          { key: 'couple_audio_url', name: 'Couple Question' },
          { key: 'two_couples_audio_url', name: 'Two Couples Question' },
          { key: 'mix_audio_url', name: 'Mix Question' },
          { key: 'crib_audio_url', name: 'Crib Question' }
        ];
        audioFields.forEach(field => {
          if (callSettingsData[field.key]) {
            allAudio.push({
              id: `call-${field.key}`,
              name: `Call Setting: ${field.name}`,
              description: 'System call audio',
              category: 'system',
              file_url: callSettingsData[field.key],
              created_at: callSettingsData.updated_at,
              source: 'call_settings',
              displayName: field.name,
              displayCategory: 'system'
            });
          }
        });
      }

      setAudioFiles(allAudio);
      setVoicemails(vmData || []);
    } catch (error) {
      console.error('Error fetching audio:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load audio files'
      });
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please upload an audio file (MP3, WAV, etc.)'
      });
      return;
    }

    if (!uploadForm.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Name Required',
        description: 'Please enter a name for the audio file'
      });
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${uploadForm.category}/${Date.now()}-${uploadForm.name.replace(/[^a-z0-9]/gi, '_')}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-recordings')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(fileName);

      // Save to audio_library
      const { error: dbError } = await supabase
        .from('audio_library')
        .insert({
          name: uploadForm.name,
          description: uploadForm.description,
          category: uploadForm.category,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'Audio file uploaded successfully'
      });

      setShowUploadModal(false);
      setUploadForm({ name: '', description: '', category: 'ivr' });
      fetchAllAudio();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message
      });
    }
    setUploading(false);
  };

  const handleDelete = async (audio) => {
    if (!confirm(`Delete "${audio.name}"?`)) return;

    try {
      if (audio.source === 'library') {
        const { error } = await supabase
          .from('audio_library')
          .delete()
          .eq('id', audio.id);
        if (error) throw error;
      } else if (audio.source === 'voicemail') {
        const { error } = await supabase
          .from('voicemails')
          .delete()
          .eq('id', audio.id);
        if (error) throw error;
      }

      toast({ title: 'Deleted', description: 'Audio file removed' });
      fetchAllAudio();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    }
  };

  const togglePlay = (audioId, url) => {
    if (playingId === audioId) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingId(audioId);
      }
    }
  };

  const filteredAudio = audioFiles.filter(audio => {
    const matchesSearch = searchTerm === '' || 
      audio.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audio.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      audio.displayCategory === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryStats = () => {
    const stats = {};
    AUDIO_CATEGORIES.forEach(cat => {
      if (cat.key === 'all') {
        stats[cat.key] = audioFiles.length;
      } else {
        stats[cat.key] = audioFiles.filter(a => a.displayCategory === cat.key).length;
      }
    });
    return stats;
  };

  const stats = getCategoryStats();

  return (
    <div className="space-y-6">
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Music className="w-7 h-7 text-blue-600" />
              Audio Manager
            </h2>
            <p className="text-slate-500 mt-1">
              Central hub for all audio files in the system
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchAllAudio} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowUploadModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload Audio
            </Button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {AUDIO_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? `${cat.color} text-white shadow-md`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  isSelected ? 'bg-white/20' : 'bg-slate-200'
                }`}>
                  {stats[cat.key] || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search audio files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white"
        />
      </div>

      {/* Audio Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredAudio.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileAudio className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No audio files found</h3>
          <p className="text-slate-500 mt-1">
            {searchTerm ? 'Try a different search term' : 'Upload your first audio file'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAudio.map(audio => {
            const category = AUDIO_CATEGORIES.find(c => c.key === audio.displayCategory);
            const Icon = category?.icon || Music;
            const isPlaying = playingId === audio.id;

            return (
              <div
                key={`${audio.source}-${audio.id}`}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {/* Play Button */}
                  <button
                    onClick={() => togglePlay(audio.id, audio.file_url)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isPlaying
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600'
                    }`}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 truncate">
                      {audio.name}
                    </h4>
                    {audio.description && (
                      <p className="text-sm text-slate-500 truncate">
                        {audio.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${category?.color || 'bg-slate-500'} text-white`}>
                        <Icon className="w-3 h-3" />
                        {category?.name || 'Unknown'}
                      </span>
                      {audio.duration_seconds && (
                        <span className="text-xs text-slate-400">
                          {Math.floor(audio.duration_seconds / 60)}:{(audio.duration_seconds % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                      {audio.source === 'voicemail' && !audio.listened && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    {audio.file_url && (
                      <a
                        href={audio.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(audio)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                  {new Date(audio.created_at).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Upload Audio File</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  placeholder="e.g., Welcome Message Hebrew"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Optional description..."
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                />
              </div>

              <div>
                <Label>Category</Label>
                <select
                  className="w-full p-2 border border-slate-200 rounded-md"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                >
                  {AUDIO_CATEGORIES.filter(c => c.key !== 'all' && c.key !== 'voicemail').map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Audio File (MP3, WAV)</Label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  disabled={uploading || !uploadForm.name.trim()}
                  className="w-full mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              {uploading && (
                <div className="flex-1 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="ml-2">Uploading...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
