import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Play, Pause, Trash2, Check, Phone, Clock, Calendar, MessageSquare, Volume2, Edit2, X, Plus, Settings, Mail, ChevronDown, ChevronUp, Inbox } from 'lucide-react';

const VoicemailsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [voicemails, setVoicemails] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [allBoxes, setAllBoxes] = useState([]); // Including inactive
  const [selectedBox, setSelectedBox] = useState('all');
  const [playingId, setPlayingId] = useState(null);
  const [editingBoxId, setEditingBoxId] = useState(null);
  const [editingBoxName, setEditingBoxName] = useState('');
  const [editingLabelId, setEditingLabelId] = useState(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [showBoxManager, setShowBoxManager] = useState(false);
  const [showNewBoxForm, setShowNewBoxForm] = useState(false);
  const [newBoxForm, setNewBoxForm] = useState({
    box_number: '',
    box_name: '',
    description: '',
    greeting_message: '',
    email_notifications: ''
  });
  const [editingBoxDetails, setEditingBoxDetails] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedBox]);

  const fetchData = async () => {
    try {
      // Fetch ALL voicemail boxes (including inactive)
      const { data: allBoxesData, error: allBoxesError } = await supabase
        .from('voicemail_boxes')
        .select('*')
        .order('box_number');

      if (allBoxesError) throw allBoxesError;
      setAllBoxes(allBoxesData || []);

      // Fetch active voicemail boxes
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

  const handleCreateBox = async () => {
    if (!newBoxForm.box_number || !newBoxForm.box_name) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Box number and name are required"
      });
      return;
    }

    try {
      const emailArray = newBoxForm.email_notifications
        ? newBoxForm.email_notifications.split(',').map(e => e.trim()).filter(e => e)
        : null;

      const { error } = await supabase
        .from('voicemail_boxes')
        .insert({
          box_number: newBoxForm.box_number,
          box_name: newBoxForm.box_name.trim(),
          description: newBoxForm.description.trim() || null,
          greeting_message: newBoxForm.greeting_message.trim() || 'Please leave a message after the beep.',
          email_notifications: emailArray,
          is_active: true
        });

      if (error) throw error;

      setShowNewBoxForm(false);
      setNewBoxForm({
        box_number: '',
        box_name: '',
        description: '',
        greeting_message: '',
        email_notifications: ''
      });
      await fetchData();

      toast({
        title: "Created",
        description: "New voicemail box created successfully"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const handleUpdateBoxDetails = async (boxId) => {
    if (!editingBoxDetails) return;

    try {
      const emailArray = editingBoxDetails.email_notifications_text
        ? editingBoxDetails.email_notifications_text.split(',').map(e => e.trim()).filter(e => e)
        : null;

      const { error } = await supabase
        .from('voicemail_boxes')
        .update({
          box_name: editingBoxDetails.box_name,
          description: editingBoxDetails.description,
          greeting_message: editingBoxDetails.greeting_message,
          email_notifications: emailArray,
          is_active: editingBoxDetails.is_active
        })
        .eq('id', boxId);

      if (error) throw error;

      setEditingBoxDetails(null);
      await fetchData();

      toast({
        title: "Updated",
        description: "Voicemail box updated successfully"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const handleDeleteBox = async (boxId, boxName) => {
    if (!confirm(`Are you sure you want to delete "${boxName}"? This will also delete all voicemails in this box.`)) return;

    try {
      const { error } = await supabase
        .from('voicemail_boxes')
        .delete()
        .eq('id', boxId);

      if (error) throw error;

      await fetchData();

      toast({
        title: "Deleted",
        description: "Voicemail box has been deleted"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const handleToggleBoxActive = async (boxId, currentState) => {
    try {
      const { error } = await supabase
        .from('voicemail_boxes')
        .update({ is_active: !currentState })
        .eq('id', boxId);

      if (error) throw error;

      await fetchData();

      toast({
        title: "Updated",
        description: `Voicemail box ${!currentState ? 'activated' : 'deactivated'}`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const startEditingBoxDetails = (box) => {
    setEditingBoxDetails({
      ...box,
      email_notifications_text: box.email_notifications ? box.email_notifications.join(', ') : ''
    });
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

        {/* Box Manager Toggle */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => setShowBoxManager(!showBoxManager)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Manage Voicemail Boxes
            {showBoxManager ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* Expanded Box Manager */}
        {showBoxManager && (
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-blue-600" />
                  Voicemail Boxes Management
                </h3>
                <p className="text-sm text-slate-600">Create, edit, and configure voicemail boxes</p>
              </div>
              <Button
                onClick={() => setShowNewBoxForm(!showNewBoxForm)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Box
              </Button>
            </div>

            {/* New Box Form */}
            {showNewBoxForm && (
              <div className="bg-white p-4 rounded-lg border border-green-200 mb-4">
                <h4 className="font-semibold text-green-700 mb-3">Create New Voicemail Box</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Box Number *</Label>
                    <Input
                      type="text"
                      placeholder="e.g., 5 or 101"
                      value={newBoxForm.box_number}
                      onChange={(e) => setNewBoxForm({ ...newBoxForm, box_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Box Name *</Label>
                    <Input
                      placeholder="e.g., Customer Support"
                      value={newBoxForm.box_name}
                      onChange={(e) => setNewBoxForm({ ...newBoxForm, box_name: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Brief description of this voicemail box"
                      value={newBoxForm.description}
                      onChange={(e) => setNewBoxForm({ ...newBoxForm, description: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Greeting Message</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Message played to caller before they leave voicemail"
                      rows={2}
                      value={newBoxForm.greeting_message}
                      onChange={(e) => setNewBoxForm({ ...newBoxForm, greeting_message: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Email Notifications</Label>
                    <Input
                      placeholder="email1@example.com, email2@example.com"
                      value={newBoxForm.email_notifications}
                      onChange={(e) => setNewBoxForm({ ...newBoxForm, email_notifications: e.target.value })}
                    />
                    <p className="text-xs text-slate-500 mt-1">Comma-separated list of emails to notify when voicemail is received</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleCreateBox} className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Box
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewBoxForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* All Boxes List */}
            <div className="space-y-3">
              {allBoxes.map(box => (
                <div 
                  key={box.id} 
                  className={`bg-white p-4 rounded-lg border ${box.is_active ? 'border-slate-200' : 'border-red-200 bg-red-50'}`}
                >
                  {editingBoxDetails?.id === box.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Box Number</Label>
                          <div className="font-mono text-lg text-slate-500">{box.box_number}</div>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs">Box Name</Label>
                          <Input
                            value={editingBoxDetails.box_name}
                            onChange={(e) => setEditingBoxDetails({ ...editingBoxDetails, box_name: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={editingBoxDetails.description || ''}
                          onChange={(e) => setEditingBoxDetails({ ...editingBoxDetails, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Greeting Message (played to caller)</Label>
                        <textarea
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          rows={2}
                          value={editingBoxDetails.greeting_message || ''}
                          onChange={(e) => setEditingBoxDetails({ ...editingBoxDetails, greeting_message: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Email Notifications
                        </Label>
                        <Input
                          placeholder="email1@example.com, email2@example.com"
                          value={editingBoxDetails.email_notifications_text || ''}
                          onChange={(e) => setEditingBoxDetails({ ...editingBoxDetails, email_notifications_text: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`active-${box.id}`}
                          checked={editingBoxDetails.is_active}
                          onChange={(e) => setEditingBoxDetails({ ...editingBoxDetails, is_active: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`active-${box.id}`}>Active (visible in IVR)</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdateBoxDetails(box.id)} className="bg-green-600 hover:bg-green-700">
                          <Check className="w-4 h-4 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingBoxDetails(null)}>
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-mono font-bold text-sm">
                            #{box.box_number}
                          </div>
                          <div className="font-semibold text-slate-900">{box.box_name}</div>
                          {!box.is_active && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Inactive</span>
                          )}
                        </div>
                        {box.description && (
                          <p className="text-sm text-slate-600 mb-1">{box.description}</p>
                        )}
                        {box.email_notifications && box.email_notifications.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Mail className="w-3 h-3" />
                            {box.email_notifications.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEditingBoxDetails(box)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant={box.is_active ? "outline" : "default"}
                          onClick={() => handleToggleBoxActive(box.id, box.is_active)}
                        >
                          {box.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteBox(box.id, box.box_name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {allBoxes.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No voicemail boxes configured. Click "New Box" to create one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Simple Edit Boxes Section (legacy - keeping for quick renames) */}
        {!showBoxManager && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Rename Boxes</h3>
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
        )}
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
