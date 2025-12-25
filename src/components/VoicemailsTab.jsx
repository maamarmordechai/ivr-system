import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Play, Pause, Trash2, Check, Phone, Clock, Calendar, MessageSquare, Volume2, Edit2, X } from 'lucide-react';

const VoicemailsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [voicemails, setVoicemails] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [selectedBox, setSelectedBox] = useState('all');
  const [playingId, setPlayingId] = useState(null);
  const [editingBoxId, setEditingBoxId] = useState(null);
  const [editingBoxName, setEditingBoxName] = useState('');
  const [editingLabelId, setEditingLabelId] = useState(null);
  const [editingLabel, setEditingLabel] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedBox]);

  const fetchData = async () => {
    try {
      // Fetch voicemail boxes
      const { data: boxesData, error: boxesError } = await supabase
        .from('voicemail_boxes')
        .select('*')
        .eq('is_active', true)
        .order('box_number');

      if (boxesError) throw boxesError;
      setBoxes(boxesData || []);

      // Fetch voicemails
      let query = supabase
        .from('voicemails')
        .select(`
          *,
          voicemail_boxes (
            box_name,
            box_number,
            description
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedBox !== 'all') {
        query = query.eq('voicemail_box_id', selectedBox);
      }

      const { data: voicemailsData, error: voicemailsError } = await query;

      if (voicemailsError) throw voicemailsError;
      setVoicemails(voicemailsData || []);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading voicemails",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsListened = async (id) => {
    try {
      const { error } = await supabase
        .from('voicemails')
        .update({ 
          listened: true, 
          listened_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;

      setVoicemails(voicemails.map(v => 
        v.id === id ? { ...v, listened: true } : v
      ));

      toast({
        title: "Marked as listened",
        description: "Voicemail has been marked as listened"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this voicemail?')) return;

    try {
      const { error } = await supabase
        .from('voicemails')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refetch to ensure sync with phone deletions
      await fetchData();

      toast({
        title: "Deleted",
        description: "Voicemail has been deleted"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const handleRenameBox = async (boxId) => {
    if (!editingBoxName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Box name cannot be empty"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('voicemail_boxes')
        .update({ box_name: editingBoxName.trim() })
        .eq('id', boxId);

      if (error) throw error;

      setBoxes(boxes.map(box => 
        box.id === boxId ? { ...box, box_name: editingBoxName.trim() } : box
      ));

      setEditingBoxId(null);
      setEditingBoxName('');

      toast({
        title: "Updated",
        description: "Voicemail box name has been updated"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const startEditing = (box) => {
    setEditingBoxId(box.id);
    setEditingBoxName(box.box_name);
  };

  const cancelEditing = () => {
    setEditingBoxId(null);
    setEditingBoxName('');
  };

  const handleEditLabel = async (voicemailId) => {
    if (editingLabel.trim() === '') {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Label cannot be empty"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('voicemails')
        .update({ label: editingLabel.trim() })
        .eq('id', voicemailId);

      if (error) throw error;

      setVoicemails(voicemails.map(v => 
        v.id === voicemailId ? { ...v, label: editingLabel.trim() } : v
      ));

      setEditingLabelId(null);
      setEditingLabel('');

      toast({
        title: "Updated",
        description: "Voicemail label has been updated"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const startEditingLabel = (voicemail) => {
    setEditingLabelId(voicemail.id);
    setEditingLabel(voicemail.label || '');
  };

  const cancelEditingLabel = () => {
    setEditingLabelId(null);
    setEditingLabel('');
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unlistenedCount = voicemails.filter(v => !v.listened).length;

  if (loading) {
    return <div className="p-6 text-center">Loading voicemails...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Volume2 className="w-8 h-8 text-blue-600" />
              Voicemail Messages
            </h2>
            <p className="text-slate-600 mt-1">Listen to and manage voicemail messages</p>
          </div>
          {unlistenedCount > 0 && (
            <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full font-semibold flex items-center gap-2">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
              {unlistenedCount} New
            </div>
          )}
        </div>
      </div>

      {/* Filter by Box */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedBox('all')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
              selectedBox === 'all' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Boxes ({voicemails.length})
          </button>
          {boxes.map(box => {
            const count = voicemails.filter(v => v.voicemail_box_id === box.id).length;
            return (
              <button
                key={box.id}
                onClick={() => setSelectedBox(box.id)}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  selectedBox === box.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {box.box_name} ({count})
              </button>
            );
          })}
        </div>

        {/* Edit Boxes Section */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Manage Voicemail Boxes</h3>
          <div className="space-y-2">
            {boxes.map(box => (
              <div key={box.id} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-slate-200">
                {editingBoxId === box.id ? (
                  <>
                    <input
                      type="text"
                      value={editingBoxName}
                      onChange={(e) => setEditingBoxName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Box name"
                      autoFocus
                    />
                    <Button
                      onClick={() => handleRenameBox(box.id)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={cancelEditing}
                      size="sm"
                      variant="outline"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{box.box_name}</div>
                      <div className="text-sm text-slate-500">Box #{box.box_number}</div>
                    </div>
                    <Button
                      onClick={() => startEditing(box)}
                      size="sm"
                      variant="outline"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Rename
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Voicemails List */}
      {voicemails.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
          <MessageSquare className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Voicemails</h3>
          <p className="text-slate-500">No voicemail messages in this box</p>
        </div>
      ) : (
        <div className="space-y-4">
          {voicemails.map(voicemail => (
            <div
              key={voicemail.id}
              className={`modern-card p-6 ${
                !voicemail.listened ? 'ring-2 ring-blue-400 bg-blue-50' : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    {!voicemail.listened && (
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    )}
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                      <MessageSquare className="w-4 h-4" />
                      {voicemail.voicemail_boxes?.box_name || 'Unknown Box'}
                    </div>
                  </div>

                  {/* Label */}
                  <div className="mb-3">
                    {editingLabelId === voicemail.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter label (e.g., 'Availability Question')"
                          autoFocus
                        />
                        <Button
                          onClick={() => handleEditLabel(voicemail.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={cancelEditingLabel}
                          size="sm"
                          variant="outline"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 font-semibold text-lg text-slate-900">
                          {voicemail.label || <span className="italic text-slate-400">No label</span>}
                        </div>
                        <Button
                          onClick={() => startEditingLabel(voicemail)}
                          size="sm"
                          variant="outline"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Label
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Caller Info */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold">{voicemail.caller_phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{formatDate(voicemail.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{formatDuration(voicemail.recording_duration || 0)}</span>
                    </div>
                  </div>

                  {/* Audio Player */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <audio
                      controls
                      className="w-full"
                      onPlay={() => {
                        setPlayingId(voicemail.id);
                        if (!voicemail.listened) {
                          handleMarkAsListened(voicemail.id);
                        }
                      }}
                      onEnded={() => setPlayingId(null)}
                    >
                      <source src={voicemail.recording_url} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>

                  {/* Transcription */}
                  {voicemail.transcription && (
                    <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="text-xs font-semibold text-purple-700 mb-2">TRANSCRIPTION</div>
                      <p className="text-slate-700 italic">{voicemail.transcription}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {!voicemail.listened && (
                    <Button
                      onClick={() => handleMarkAsListened(voicemail.id)}
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Mark Listened
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDelete(voicemail.id)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VoicemailsTab;
