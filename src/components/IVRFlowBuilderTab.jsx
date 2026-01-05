import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/customSupabaseClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';
import { 
  Plus, Trash2, Play, Pause, Save, RefreshCw, Upload,
  Phone, ArrowRight, Volume2, MessageSquare, Mic, 
  PhoneOff, RotateCcw, PhoneForwarded, Settings,
  ChevronDown, ChevronUp, Edit2, Copy, Eye, X,
  FileAudio, Hash, AlertCircle, List, GitBranch, Database
} from 'lucide-react';

const ACTION_TYPES = [
  { key: 'goto_step', name: 'Go to Step', icon: ArrowRight, color: 'bg-blue-500' },
  { key: 'voicemail', name: 'Voicemail', icon: Volume2, color: 'bg-purple-500' },
  { key: 'record', name: 'Record Voice', icon: Mic, color: 'bg-red-500' },
  { key: 'transfer', name: 'Transfer Call', icon: PhoneForwarded, color: 'bg-green-500' },
  { key: 'repeat', name: 'Repeat Menu', icon: RotateCcw, color: 'bg-yellow-500' },
  { key: 'hangup', name: 'End Call', icon: PhoneOff, color: 'bg-slate-500' },
  { key: 'custom_function', name: 'Custom Function', icon: Settings, color: 'bg-cyan-500' },
];

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '*', '#'];

export default function IVRFlowBuilderTab() {
  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [steps, setSteps] = useState([]);
  const [voicemailBoxes, setVoicemailBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState({});
  const [editingStep, setEditingStep] = useState(null);
  const [showNewFlowModal, setShowNewFlowModal] = useState(false);
  const [showNewStepModal, setShowNewStepModal] = useState(false);
  const [showEditActionModal, setShowEditActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [addingActionToStep, setAddingActionToStep] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [newFlowName, setNewFlowName] = useState('');
  const [viewMode, setViewMode] = useState('diagram'); // 'list' or 'diagram'
  const audioRef = useRef(null);
  const { toast } = useToast();

  const [actionForm, setActionForm] = useState({
    digit: '1',
    action_name: '',
    action_type: 'goto_step',
    target_step_id: null,
    voicemail_box_id: null,
    transfer_number: '',
    function_name: '',
    action_audio_text: ''
  });

  const [newStep, setNewStep] = useState({
    step_name: '',
    step_key: '',
    prompt_text: '',
    audio_url: '',
    use_audio: false,
    timeout_seconds: 10,
    max_digits: 1,
    is_entry_point: false,
    actions: []
  });

  useEffect(() => {
    fetchFlows();
    fetchVoicemailBoxes();
  }, []);

  useEffect(() => {
    if (selectedFlow) {
      fetchSteps(selectedFlow.id);
    }
  }, [selectedFlow]);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ivr_flows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlows(data || []);
      
      if (data && data.length > 0 && !selectedFlow) {
        setSelectedFlow(data[0]);
      }
    } catch (error) {
      console.error('Error fetching flows:', error);
      // Table might not exist yet
    }
    setLoading(false);
  };

  const fetchSteps = async (flowId) => {
    try {
      const { data: stepsData, error: stepsError } = await supabase
        .from('ivr_flow_steps')
        .select('*')
        .eq('flow_id', flowId)
        .order('step_order');

      if (stepsError) throw stepsError;

      // Fetch actions for each step
      const stepsWithActions = await Promise.all(
        (stepsData || []).map(async (step) => {
          const { data: actions } = await supabase
            .from('ivr_flow_actions')
            .select('*')
            .eq('step_id', step.id)
            .order('digit');

          return { ...step, actions: actions || [] };
        })
      );

      setSteps(stepsWithActions);
    } catch (error) {
      console.error('Error fetching steps:', error);
    }
  };

  const fetchVoicemailBoxes = async () => {
    const { data } = await supabase
      .from('voicemail_boxes')
      .select('*');
    // Sort numerically by box_number
    const sorted = (data || []).sort((a, b) => 
      parseInt(a.box_number) - parseInt(b.box_number)
    );
    setVoicemailBoxes(sorted);
  };

  const createFlow = async () => {
    if (!newFlowName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Flow name is required' });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('ivr_flows')
        .insert({ name: newFlowName, is_active: true })
        .select()
        .single();

      if (error) throw error;

      setFlows([data, ...flows]);
      setSelectedFlow(data);
      setShowNewFlowModal(false);
      setNewFlowName('');
      toast({ title: 'Success', description: 'Flow created successfully' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
    setSaving(false);
  };

  const deleteFlow = async (flowId) => {
    if (!confirm('Delete this entire flow? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('ivr_flows')
        .delete()
        .eq('id', flowId);

      if (error) throw error;

      setFlows(flows.filter(f => f.id !== flowId));
      if (selectedFlow?.id === flowId) {
        setSelectedFlow(flows.find(f => f.id !== flowId) || null);
      }
      toast({ title: 'Deleted', description: 'Flow removed' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const createStep = async () => {
    if (!newStep.step_name.trim() || !newStep.step_key.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Step name and key are required' });
      return;
    }

    setSaving(true);
    try {
      const { data: stepData, error: stepError } = await supabase
        .from('ivr_flow_steps')
        .insert({
          flow_id: selectedFlow.id,
          step_name: newStep.step_name,
          step_key: newStep.step_key,
          prompt_text: newStep.prompt_text,
          audio_url: newStep.audio_url,
          use_audio: newStep.use_audio,
          timeout_seconds: newStep.timeout_seconds,
          max_digits: newStep.max_digits,
          is_entry_point: newStep.is_entry_point,
          step_order: steps.length
        })
        .select()
        .single();

      if (stepError) throw stepError;

      // Create actions
      if (newStep.actions.length > 0) {
        const actionsToInsert = newStep.actions.map(action => ({
          step_id: stepData.id,
          digit: action.digit,
          action_name: action.action_name,
          action_type: action.action_type,
          target_step_id: action.target_step_id || null,
          voicemail_box_id: action.voicemail_box_id || null,
          transfer_number: action.transfer_number || null,
          function_name: action.function_name || null
        }));

        const { error: actionsError } = await supabase
          .from('ivr_flow_actions')
          .insert(actionsToInsert);

        if (actionsError) throw actionsError;
      }

      fetchSteps(selectedFlow.id);
      setShowNewStepModal(false);
      resetNewStep();
      toast({ title: 'Success', description: 'Step created successfully' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
    setSaving(false);
  };

  const resetNewStep = () => {
    setNewStep({
      step_name: '',
      step_key: '',
      prompt_text: '',
      audio_url: '',
      use_audio: false,
      timeout_seconds: 10,
      max_digits: 1,
      is_entry_point: false,
      actions: []
    });
  };

  const deleteStep = async (stepId) => {
    if (!confirm('Delete this step?')) return;

    try {
      const { error } = await supabase
        .from('ivr_flow_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;

      setSteps(steps.filter(s => s.id !== stepId));
      toast({ title: 'Deleted', description: 'Step removed' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const updateStepAction = async (stepId, actionId, updates) => {
    try {
      const { error } = await supabase
        .from('ivr_flow_actions')
        .update(updates)
        .eq('id', actionId);

      if (error) throw error;

      fetchSteps(selectedFlow.id);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  // Start editing an action
  const startEditAction = (action) => {
    setEditingAction(action);
    setActionForm({
      digit: action.digit || '1',
      action_name: action.action_name || '',
      action_type: action.action_type || 'goto_step',
      target_step_id: action.target_step_id || null,
      voicemail_box_id: action.voicemail_box_id || null,
      transfer_number: action.transfer_number || '',
      function_name: action.function_name || '',
      action_audio_text: action.action_audio_text || ''
    });
    setShowEditActionModal(true);
  };

  // Start adding a new action to a step
  const startAddAction = (stepId) => {
    const step = steps.find(s => s.id === stepId);
    const usedDigits = step?.actions?.map(a => a.digit) || [];
    const nextDigit = DIGITS.find(d => !usedDigits.includes(d)) || '1';
    
    setAddingActionToStep(stepId);
    setEditingAction(null);
    setActionForm({
      digit: nextDigit,
      action_name: '',
      action_type: 'goto_step',
      target_step_id: null,
      voicemail_box_id: null,
      transfer_number: '',
      function_name: '',
      action_audio_text: ''
    });
    setShowEditActionModal(true);
  };

  // Save action (create or update)
  const saveAction = async () => {
    if (!actionForm.digit || !actionForm.action_type) {
      toast({ variant: 'destructive', title: 'Error', description: 'Digit and action type are required' });
      return;
    }

    setSaving(true);
    try {
      if (editingAction) {
        // Update existing action
        const { error } = await supabase
          .from('ivr_flow_actions')
          .update({
            digit: actionForm.digit,
            action_name: actionForm.action_name,
            action_type: actionForm.action_type,
            target_step_id: actionForm.action_type === 'goto_step' ? actionForm.target_step_id : null,
            voicemail_box_id: actionForm.action_type === 'voicemail' ? actionForm.voicemail_box_id : null,
            transfer_number: actionForm.action_type === 'transfer' ? actionForm.transfer_number : null,
            function_name: actionForm.action_type === 'custom_function' ? actionForm.function_name : null,
            action_audio_text: actionForm.action_audio_text
          })
          .eq('id', editingAction.id);

        if (error) throw error;
        toast({ title: 'Updated', description: 'Action updated successfully' });
      } else if (addingActionToStep) {
        // Create new action
        const { error } = await supabase
          .from('ivr_flow_actions')
          .insert({
            step_id: addingActionToStep,
            digit: actionForm.digit,
            action_name: actionForm.action_name,
            action_type: actionForm.action_type,
            target_step_id: actionForm.action_type === 'goto_step' ? actionForm.target_step_id : null,
            voicemail_box_id: actionForm.action_type === 'voicemail' ? actionForm.voicemail_box_id : null,
            transfer_number: actionForm.action_type === 'transfer' ? actionForm.transfer_number : null,
            function_name: actionForm.action_type === 'custom_function' ? actionForm.function_name : null,
            action_audio_text: actionForm.action_audio_text
          });

        if (error) throw error;
        toast({ title: 'Created', description: 'Action added successfully' });
      }

      setShowEditActionModal(false);
      setEditingAction(null);
      setAddingActionToStep(null);
      fetchSteps(selectedFlow.id);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
    setSaving(false);
  };

  // Delete an action
  const deleteAction = async (actionId) => {
    if (!confirm('Delete this action?')) return;

    try {
      const { error } = await supabase
        .from('ivr_flow_actions')
        .delete()
        .eq('id', actionId);

      if (error) throw error;

      fetchSteps(selectedFlow.id);
      toast({ title: 'Deleted', description: 'Action removed' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const addActionToNewStep = () => {
    const usedDigits = newStep.actions.map(a => a.digit);
    const nextDigit = DIGITS.find(d => !usedDigits.includes(d)) || '1';
    
    setNewStep({
      ...newStep,
      actions: [
        ...newStep.actions,
        {
          digit: nextDigit,
          action_name: '',
          action_type: 'goto_step',
          target_step_id: null,
          voicemail_box_id: null,
          transfer_number: ''
        }
      ]
    });
  };

  const updateNewStepAction = (index, field, value) => {
    const updatedActions = [...newStep.actions];
    updatedActions[index] = { ...updatedActions[index], [field]: value };
    setNewStep({ ...newStep, actions: updatedActions });
  };

  const removeNewStepAction = (index) => {
    setNewStep({
      ...newStep,
      actions: newStep.actions.filter((_, i) => i !== index)
    });
  };

  const handleAudioUpload = async (e, isNewStep = true) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an audio file' });
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `ivr-flows/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-recordings')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(fileName);

      if (isNewStep) {
        setNewStep({ ...newStep, audio_url: publicUrl, use_audio: true });
      }

      toast({ title: 'Uploaded', description: 'Audio file uploaded successfully' });
      return publicUrl;
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
      return null;
    }
  };

  const handleAudioUploadForStep = async (e, stepId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an audio file' });
      return;
    }

    try {
      const fileName = `ivr-flows/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-recordings')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(fileName);

      // Update the step in the database
      const { error: updateError } = await supabase
        .from('ivr_flow_steps')
        .update({ audio_url: publicUrl, use_audio: true })
        .eq('id', stepId);

      if (updateError) throw updateError;

      // Update local state
      setSteps(steps.map(s => 
        s.id === stepId ? { ...s, audio_url: publicUrl, use_audio: true } : s
      ));

      toast({ title: '✅ Uploaded', description: 'Audio file saved for this step' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    }
  };

  const handleAudioUploadForAction = async (e, actionId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an audio file' });
      return;
    }

    try {
      const fileName = `ivr-actions/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-recordings')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(fileName);

      // Update the action in the database
      const { error: updateError } = await supabase
        .from('ivr_flow_actions')
        .update({ action_audio_url: publicUrl })
        .eq('id', actionId);

      if (updateError) throw updateError;

      // Update local state - find the step with this action and update it
      setSteps(steps.map(step => ({
        ...step,
        actions: step.actions?.map(action => 
          action.id === actionId ? { ...action, action_audio_url: publicUrl } : action
        )
      })));

      toast({ title: '✅ Uploaded', description: 'Response audio saved for this action' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    }
  };

  const togglePlay = (audioUrl, id) => {
    if (playingAudio === id) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingAudio(id);
      }
    }
  };

  const toggleStepExpanded = (stepId) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const getActionTypeName = (type) => {
    return ACTION_TYPES.find(a => a.key === type)?.name || type;
  };

  const getActionIcon = (type) => {
    return ACTION_TYPES.find(a => a.key === type)?.icon || Settings;
  };

  const getActionColor = (type) => {
    return ACTION_TYPES.find(a => a.key === type)?.color || 'bg-slate-500';
  };

  return (
    <div className="space-y-6">
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Phone className="w-7 h-7 text-blue-600" />
              IVR Flow Builder
            </h2>
            <p className="text-slate-500 mt-1">
              Build custom phone menu flows with audio prompts and button actions
            </p>
          </div>
          <Button onClick={() => setShowNewFlowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Flow
          </Button>
        </div>

        {/* Flow Selection */}
        {flows.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
            {flows.map(flow => (
              <button
                key={flow.id}
                onClick={() => setSelectedFlow(flow)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedFlow?.id === flow.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {flow.name}
                {flow.is_default && (
                  <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">Default</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Flow Content */}
      {selectedFlow ? (
        <div className="space-y-4">
          {/* Flow Actions */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-slate-900">{selectedFlow.name}</h3>
              <span className="text-sm text-slate-500">
                {steps.length} step{steps.length !== 1 ? 's' : ''}
              </span>
              {/* View Toggle */}
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('diagram')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 transition-all ${
                    viewMode === 'diagram' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
                  }`}
                >
                  <GitBranch className="w-4 h-4" />
                  Diagram
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 transition-all ${
                    viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
                  }`}
                >
                  <List className="w-4 h-4" />
                  List
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => deleteFlow(selectedFlow.id)} className="text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Flow
              </Button>
              <Button onClick={() => setShowNewStepModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </div>
          </div>

          {/* Diagram View */}
          {viewMode === 'diagram' && steps.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 overflow-x-auto">
              <div className="min-w-max">
                {/* Find entry point */}
                {(() => {
                  const entryStep = steps.find(s => s.is_entry_point) || steps[0];
                  const getStepById = (id) => steps.find(s => s.id === id);
                  
                  // Render a step node
                  const renderStepNode = (step, level = 0, visited = new Set()) => {
                    if (!step || visited.has(step.id)) return null;
                    visited.add(step.id);
                    
                    const actions = step.actions || [];
                    const gotoActions = actions.filter(a => a.action_type === 'goto_step' && a.target_step_id);
                    
                    return (
                      <div key={step.id} className="flex flex-col items-center">
                        {/* Step Node */}
                        <div 
                          className={`relative border-2 rounded-xl p-4 min-w-[200px] max-w-[280px] ${
                            step.is_entry_point 
                              ? 'border-green-500 bg-green-50' 
                              : 'border-blue-300 bg-blue-50'
                          }`}
                        >
                          {step.is_entry_point && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                              START
                            </div>
                          )}
                          <h4 className="font-semibold text-slate-900 text-center mb-1">
                            {step.step_name}
                          </h4>
                          <p className="text-xs text-slate-500 text-center mb-2 truncate">
                            {step.prompt_text?.slice(0, 50)}...
                          </p>
                          
                          {/* Action buttons */}
                          <div className="flex flex-wrap justify-center gap-1">
                            {actions.map(action => {
                              const Icon = getActionIcon(action.action_type);
                              const color = getActionColor(action.action_type);
                              const actionData = action.action_data ? (typeof action.action_data === 'string' ? JSON.parse(action.action_data) : action.action_data) : null;
                              return (
                                <div
                                  key={action.id}
                                  className={`${color} text-white text-xs px-2 py-1 rounded flex items-center gap-1 cursor-help`}
                                  title={actionData ? `${action.action_name}\n\n📊 DB: ${actionData.db_action}\n\n${actionData.description || ''}` : action.action_name}
                                >
                                  <span className="font-bold">{action.digit}</span>
                                  <Icon className="w-3 h-3" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Child connections */}
                        {gotoActions.length > 0 && (
                          <>
                            <div className="w-0.5 h-8 bg-slate-300"></div>
                            <div className="flex gap-8 items-start">
                              {gotoActions.map((action, idx) => {
                                const targetStep = getStepById(action.target_step_id);
                                if (!targetStep) return null;
                                const actionData = action.action_data ? (typeof action.action_data === 'string' ? JSON.parse(action.action_data) : action.action_data) : null;
                                return (
                                  <div key={action.id} className="flex flex-col items-center">
                                    <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded mb-1">
                                      Press {action.digit}
                                    </div>
                                    {actionData?.db_action && (
                                      <div className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded mb-2 flex items-center gap-1 max-w-[180px]">
                                        <Database className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{actionData.db_action}</span>
                                      </div>
                                    )}
                                    {renderStepNode(targetStep, level + 1, visited)}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                        
                        {/* Terminal actions */}
                        {actions.filter(a => a.action_type === 'hangup').length > 0 && (
                          <>
                            <div className="w-0.5 h-4 bg-slate-300"></div>
                            <div className="flex gap-2">
                              {actions.filter(a => a.action_type === 'hangup').map(action => {
                                const actionData = action.action_data ? (typeof action.action_data === 'string' ? JSON.parse(action.action_data) : action.action_data) : null;
                                return (
                                  <div key={action.id} className="bg-red-100 border border-red-300 rounded-lg px-3 py-2 text-xs text-center max-w-[200px]">
                                    <PhoneOff className="w-4 h-4 mx-auto text-red-500 mb-1" />
                                    <span className="text-red-700 block">Press {action.digit}: End</span>
                                    {actionData?.db_action && (
                                      <div className="mt-1 pt-1 border-t border-red-200">
                                        <Database className="w-3 h-3 mx-auto text-orange-500 mb-0.5" />
                                        <span className="text-orange-600 text-[10px] block">{actionData.db_action}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  };
                  
                  return (
                    <div className="flex justify-center py-4">
                      {renderStepNode(entryStep)}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Steps List View */}
          {viewMode === 'list' && steps.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">No steps yet</h3>
              <p className="text-slate-500 mt-1 mb-4">
                Create your first IVR step with audio and button actions
              </p>
              <Button onClick={() => setShowNewStepModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Step
              </Button>
            </div>
          )}
          
          {viewMode === 'diagram' && steps.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <GitBranch className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">No steps yet</h3>
              <p className="text-slate-500 mt-1 mb-4">
                Create your first IVR step to see the flow diagram
              </p>
              <Button onClick={() => setShowNewStepModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Step
              </Button>
            </div>
          )}
          
          {viewMode === 'list' && steps.length > 0 && (
            <div className="space-y-3">
              {steps.map((step, index) => {
                const isExpanded = expandedSteps[step.id];
                
                return (
                  <div
                    key={step.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
                    {/* Step Header */}
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                      onClick={() => toggleStepExpanded(step.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900 flex items-center gap-2">
                            {step.step_name}
                            {step.is_entry_point && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                Entry Point
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-slate-500">
                            Key: {step.step_key} • {step.actions?.length || 0} actions
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {step.audio_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlay(step.audio_url, step.id);
                            }}
                            className={`p-2 rounded-full ${
                              playingAudio === step.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-blue-100'
                            }`}
                          >
                            {playingAudio === step.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteStep(step.id);
                          }}
                          className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 p-4 bg-slate-50">
                        {/* Audio Upload Section */}
                        <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
                          <Label className="text-slate-600 flex items-center gap-2 mb-3">
                            <FileAudio className="w-4 h-4 text-blue-500" />
                            Audio Recording for this Step
                          </Label>
                          
                          {step.audio_url ? (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePlay(step.audio_url, `step-audio-${step.id}`);
                                }}
                                className={`p-3 rounded-full ${
                                  playingAudio === `step-audio-${step.id}`
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                }`}
                              >
                                {playingAudio === `step-audio-${step.id}` ? (
                                  <Pause className="w-5 h-5" />
                                ) : (
                                  <Play className="w-5 h-5" />
                                )}
                              </button>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-green-700">��� Audio file uploaded</p>
                                <p className="text-xs text-slate-500 truncate max-w-[300px]">{step.audio_url.split('/').pop()}</p>
                              </div>
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="audio/*"
                                  className="hidden"
                                  onChange={(e) => handleAudioUploadForStep(e, step.id)}
                                />
                                <span className="text-sm text-blue-600 hover:text-blue-800 underline">Replace</span>
                              </label>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              <p className="text-sm text-slate-600 mb-2">Upload MP3 audio for this prompt</p>
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="audio/*"
                                  className="hidden"
                                  onChange={(e) => handleAudioUploadForStep(e, step.id)}
                                />
                                <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                                  <Upload className="w-4 h-4" />
                                  Choose Audio File
                                </span>
                              </label>
                            </div>
                          )}
                        </div>

                        {/* Prompt Text */}
                        <div className="mb-4">
                          <Label className="text-slate-600">Prompt Text (TTS fallback)</Label>
                          <p className="text-sm text-slate-700 mt-1 bg-white p-3 rounded-lg border border-slate-200">
                            {step.prompt_text || 'No prompt text set'}
                          </p>
                        </div>

                        {/* Actions */}
                        <Label className="text-slate-600 mb-2 block">Button Actions - What happens when caller presses:</Label>
                        <div className="space-y-3 mt-2">
                          {step.actions?.map(action => {
                            const Icon = getActionIcon(action.action_type);
                            const color = getActionColor(action.action_type);
                            const actionData = action.action_data ? (typeof action.action_data === 'string' ? JSON.parse(action.action_data) : action.action_data) : null;
                            
                            return (
                              <div
                                key={action.id}
                                className="bg-white rounded-lg border border-slate-200 p-4"
                              >
                                {/* Action Header */}
                                <div className="flex items-center gap-3 mb-3">
                                  <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                                    {action.digit}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800">
                                      Press {action.digit}: {action.action_name || getActionTypeName(action.action_type)}
                                    </p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                      <Icon className="w-3 h-3" />
                                      {getActionTypeName(action.action_type)}
                                      {action.action_type === 'goto_step' && action.target_step_id && (
                                        <span className="text-blue-600">
                                          → {steps.find(s => s.id === action.target_step_id)?.step_name || 'Unknown'}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>

                                {/* Response Audio Upload */}
                                <div className="bg-slate-50 rounded-lg p-3 mb-3">
                                  <Label className="text-xs text-slate-600 mb-2 block flex items-center gap-1">
                                    <Volume2 className="w-3 h-3" />
                                    Response Audio (plays after pressing {action.digit})
                                  </Label>
                                  
                                  {action.action_audio_url ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          togglePlay(action.action_audio_url, `action-audio-${action.id}`);
                                        }}
                                        className={`p-2 rounded-full ${
                                          playingAudio === `action-audio-${action.id}`
                                            ? 'bg-green-600 text-white'
                                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                                        }`}
                                      >
                                        {playingAudio === `action-audio-${action.id}` ? (
                                          <Pause className="w-4 h-4" />
                                        ) : (
                                          <Play className="w-4 h-4" />
                                        )}
                                      </button>
                                      <span className="text-xs text-green-700 flex-1">✓ Audio uploaded</span>
                                      <label className="cursor-pointer">
                                        <input
                                          type="file"
                                          accept="audio/*"
                                          className="hidden"
                                          onChange={(e) => handleAudioUploadForAction(e, action.id)}
                                        />
                                        <span className="text-xs text-blue-600 hover:text-blue-800 underline">Replace</span>
                                      </label>
                                    </div>
                                  ) : (
                                    <label className="cursor-pointer block">
                                      <input
                                        type="file"
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={(e) => handleAudioUploadForAction(e, action.id)}
                                      />
                                      <div className="border border-dashed border-slate-300 rounded p-2 text-center hover:border-green-400 hover:bg-green-50 transition-colors">
                                        <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                                        <span className="text-xs text-slate-500">Upload response MP3</span>
                                      </div>
                                    </label>
                                  )}
                                  
                                  {/* TTS fallback text */}
                                  {action.action_audio_text && !action.action_audio_url && (
                                    <p className="text-xs text-slate-500 mt-2 italic">
                                      TTS: "{action.action_audio_text}"
                                    </p>
                                  )}
                                </div>

                                {/* Database Action Info */}
                                {actionData && (
                                  <div className="bg-orange-50 rounded-lg p-3">
                                    <div className="flex items-start gap-2 text-xs">
                                      <Database className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                                      <div>
                                        <p className="font-mono text-orange-700 font-medium">
                                          {actionData.db_action}
                                        </p>
                                        {actionData.description && (
                                          <p className="text-orange-600 mt-1">
                                            {actionData.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Action Edit/Delete Buttons */}
                                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startEditAction(action)}
                                    className="flex-1"
                                  >
                                    <Edit2 className="w-3 h-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteAction(action.id)}
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          {(!step.actions || step.actions.length === 0) && (
                            <p className="text-sm text-slate-400">
                              No actions configured for this step
                            </p>
                          )}

                          {/* Add Action Button */}
                          <Button
                            variant="outline"
                            className="w-full mt-3 border-dashed"
                            onClick={() => startAddAction(step.id)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Button Action
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Phone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No flows yet</h3>
          <p className="text-slate-500 mt-1 mb-4">
            Create your first IVR flow to get started
          </p>
          <Button onClick={() => setShowNewFlowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Flow
          </Button>
        </div>
      )}

      {/* New Flow Modal */}
      {showNewFlowModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Flow</h3>
            <div className="space-y-4">
              <div>
                <Label>Flow Name *</Label>
                <Input
                  placeholder="e.g., Weekly Availability"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewFlowModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={createFlow} disabled={saving}>
                {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Flow
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Step Modal */}
      {showNewStepModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add IVR Step</h3>
              <button
                onClick={() => { setShowNewStepModal(false); resetNewStep(); }}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Step Name *</Label>
                  <Input
                    placeholder="e.g., Main Menu"
                    value={newStep.step_name}
                    onChange={(e) => setNewStep({ ...newStep, step_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Step Key *</Label>
                  <Input
                    placeholder="e.g., main_menu"
                    value={newStep.step_key}
                    onChange={(e) => setNewStep({ ...newStep, step_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                  />
                </div>
              </div>

              {/* Entry Point */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_entry"
                  checked={newStep.is_entry_point}
                  onChange={(e) => setNewStep({ ...newStep, is_entry_point: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_entry" className="cursor-pointer">This is the entry point (first step)</Label>
              </div>

              {/* Audio Upload */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <Label className="flex items-center gap-2 mb-2">
                  <FileAudio className="w-4 h-4" />
                  Audio Prompt
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleAudioUpload(e, true)}
                    className="flex-1"
                  />
                  {newStep.audio_url && (
                    <button
                      onClick={() => togglePlay(newStep.audio_url, 'new-step')}
                      className={`p-2 rounded-full ${
                        playingAudio === 'new-step'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 hover:bg-blue-100'
                      }`}
                    >
                      {playingAudio === 'new-step' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {!newStep.audio_url && (
                  <p className="text-xs text-slate-500 mt-2">
                    Upload an MP3 file for the voice prompt
                  </p>
                )}
              </div>

              {/* TTS Fallback */}
              <div>
                <Label>Text-to-Speech Fallback</Label>
                <textarea
                  placeholder="Enter text to speak if no audio file..."
                  value={newStep.prompt_text}
                  onChange={(e) => setNewStep({ ...newStep, prompt_text: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                  rows={2}
                />
              </div>

              {/* Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Timeout (seconds)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={newStep.timeout_seconds}
                    onChange={(e) => setNewStep({ ...newStep, timeout_seconds: parseInt(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <Label>Max Digits</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={newStep.max_digits}
                    onChange={(e) => setNewStep({ ...newStep, max_digits: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              {/* Button Actions */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2 text-blue-900">
                    <Hash className="w-4 h-4" />
                    Button Actions (Press 1 for X, Press 2 for Y...)
                  </Label>
                  <Button size="sm" variant="outline" onClick={addActionToNewStep}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Action
                  </Button>
                </div>

                {newStep.actions.length === 0 ? (
                  <p className="text-sm text-blue-600/60 text-center py-4">
                    Click "Add Action" to define what happens when caller presses a button
                  </p>
                ) : (
                  <div className="space-y-3">
                    {newStep.actions.map((action, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="flex items-start gap-3">
                          {/* Digit Selector */}
                          <div>
                            <Label className="text-xs">Digit</Label>
                            <select
                              value={action.digit}
                              onChange={(e) => updateNewStepAction(index, 'digit', e.target.value)}
                              className="w-16 p-2 border border-slate-200 rounded text-center font-bold"
                            >
                              {DIGITS.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>

                          {/* Action Name */}
                          <div className="flex-1">
                            <Label className="text-xs">Action Name</Label>
                            <Input
                              placeholder="e.g., Listen to Options"
                              value={action.action_name}
                              onChange={(e) => updateNewStepAction(index, 'action_name', e.target.value)}
                            />
                          </div>

                          {/* Action Type */}
                          <div className="w-40">
                            <Label className="text-xs">Action Type</Label>
                            <select
                              value={action.action_type}
                              onChange={(e) => updateNewStepAction(index, 'action_type', e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded"
                            >
                              {ACTION_TYPES.map(type => (
                                <option key={type.key} value={type.key}>{type.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeNewStepAction(index)}
                            className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Action Parameters */}
                        <div className="mt-2">
                          {action.action_type === 'goto_step' && (
                            <div>
                              <Label className="text-xs">Go to Step</Label>
                              <select
                                value={action.target_step_id || ''}
                                onChange={(e) => updateNewStepAction(index, 'target_step_id', e.target.value || null)}
                                className="w-full p-2 border border-slate-200 rounded text-sm"
                              >
                                <option value="">Select a step...</option>
                                {steps.map(s => (
                                  <option key={s.id} value={s.id}>{s.step_name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {action.action_type === 'voicemail' && (
                            <div>
                              <Label className="text-xs">Voicemail Box</Label>
                              <select
                                value={action.voicemail_box_id || ''}
                                onChange={(e) => updateNewStepAction(index, 'voicemail_box_id', e.target.value || null)}
                                className="w-full p-2 border border-slate-200 rounded text-sm"
                              >
                                <option value="">Select a box...</option>
                                {voicemailBoxes.map(box => (
                                  <option key={box.id} value={box.id}>
                                    {box.box_number} - {box.box_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          {action.action_type === 'transfer' && (
                            <div>
                              <Label className="text-xs">Transfer To (Phone Number)</Label>
                              <Input
                                placeholder="+1234567890"
                                value={action.transfer_number || ''}
                                onChange={(e) => updateNewStepAction(index, 'transfer_number', e.target.value)}
                              />
                            </div>
                          )}
                          {action.action_type === 'custom_function' && (
                            <div>
                              <Label className="text-xs">Function Name</Label>
                              <Input
                                placeholder="e.g., check_availability"
                                value={action.function_name || ''}
                                onChange={(e) => updateNewStepAction(index, 'function_name', e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => { setShowNewStepModal(false); resetNewStep(); }}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={createStep} disabled={saving}>
                {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Step
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Action Modal */}
      {showEditActionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAction ? 'Edit Action' : 'Add New Action'}
              </h3>
              <button
                onClick={() => { setShowEditActionModal(false); setEditingAction(null); setAddingActionToStep(null); }}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Digit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Digit *</Label>
                  <select
                    value={actionForm.digit}
                    onChange={(e) => setActionForm({ ...actionForm, digit: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-md"
                  >
                    {DIGITS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Action Name</Label>
                  <Input
                    placeholder="e.g., Leave Message"
                    value={actionForm.action_name}
                    onChange={(e) => setActionForm({ ...actionForm, action_name: e.target.value })}
                  />
                </div>
              </div>

              {/* Action Type */}
              <div>
                <Label>Action Type *</Label>
                <select
                  value={actionForm.action_type}
                  onChange={(e) => setActionForm({ ...actionForm, action_type: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-md"
                >
                  {ACTION_TYPES.map(type => (
                    <option key={type.key} value={type.key}>{type.name}</option>
                  ))}
                </select>
              </div>

              {/* Action-specific fields */}
              {actionForm.action_type === 'goto_step' && (
                <div>
                  <Label>Go to Step</Label>
                  <select
                    value={actionForm.target_step_id || ''}
                    onChange={(e) => setActionForm({ ...actionForm, target_step_id: e.target.value || null })}
                    className="w-full p-2 border border-slate-200 rounded-md"
                  >
                    <option value="">Select a step...</option>
                    {steps.map(s => (
                      <option key={s.id} value={s.id}>{s.step_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {actionForm.action_type === 'voicemail' && (
                <div>
                  <Label>Voicemail Box</Label>
                  <select
                    value={actionForm.voicemail_box_id || ''}
                    onChange={(e) => setActionForm({ ...actionForm, voicemail_box_id: e.target.value || null })}
                    className="w-full p-2 border border-slate-200 rounded-md"
                  >
                    <option value="">Select a box...</option>
                    {voicemailBoxes.map(box => (
                      <option key={box.id} value={box.id}>
                        {box.box_number} - {box.box_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {actionForm.action_type === 'transfer' && (
                <div>
                  <Label>Transfer To (Phone Number)</Label>
                  <Input
                    placeholder="+1234567890"
                    value={actionForm.transfer_number}
                    onChange={(e) => setActionForm({ ...actionForm, transfer_number: e.target.value })}
                  />
                </div>
              )}

              {actionForm.action_type === 'custom_function' && (
                <div>
                  <Label>Function Name</Label>
                  <Input
                    placeholder="e.g., check_availability"
                    value={actionForm.function_name}
                    onChange={(e) => setActionForm({ ...actionForm, function_name: e.target.value })}
                  />
                </div>
              )}

              {/* Response Audio Text */}
              <div>
                <Label>Response Audio Text (TTS)</Label>
                <Input
                  placeholder="Text to speak after this action"
                  value={actionForm.action_audio_text}
                  onChange={(e) => setActionForm({ ...actionForm, action_audio_text: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">Optional: Text spoken to caller after pressing this digit</p>
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => { setShowEditActionModal(false); setEditingAction(null); setAddingActionToStep(null); }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={saveAction} disabled={saving}>
                {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingAction ? 'Save Changes' : 'Add Action'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
