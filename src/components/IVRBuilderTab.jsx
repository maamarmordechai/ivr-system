import { useState, useEffect } from 'react';
import { supabase } from '../lib/customSupabaseClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Edit2, Trash2, Phone, Menu as MenuIcon, ArrowRight, ArrowLeft, Save, X } from 'lucide-react';
import { useToast } from './ui/use-toast';

export default function IVRBuilderTab() {
  const [menus, setMenus] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [menuOptions, setMenuOptions] = useState([]);
  const [voicemailBoxes, setVoicemailBoxes] = useState([]);
  const [availableFunctions, setAvailableFunctions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMenu, setEditingMenu] = useState(null);
  const [editingOption, setEditingOption] = useState(null);
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [showOptionDialog, setShowOptionDialog] = useState(false);
  const { toast } = useToast();
  
  // Week selection for per-week configuration
  const [weeks, setWeeks] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [viewMode, setViewMode] = useState('default'); // 'default' or 'week-specific'

  // Form states for new/edit menu
  const [menuForm, setMenuForm] = useState({
    menu_name: '',
    menu_key: '',
    prompt_text: '',
    prompt_audio_url: '',
    use_audio_file: false,
    voice_name: 'man',
    voice_gender: 'man',
    timeout_seconds: 10,
    max_digits: 1
  });

  // Form states for new/edit option
  const [optionForm, setOptionForm] = useState({
    digit: '1',
    option_name: '',
    option_audio_url: '',
    use_audio_file: false,
    action_type: 'voicemail',
    voicemail_box_id: null,
    submenu_id: null,
    transfer_number: '',
    function_name: ''
  });

  useEffect(() => {
    fetchMenus();
    fetchVoicemailBoxes();
    fetchWeeks();
    fetchAvailableFunctions();
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [viewMode, selectedWeekId]);

  useEffect(() => {
    if (selectedMenu) {
      fetchMenuOptions(selectedMenu.id);
    }
  }, [selectedMenu]);

  const fetchMenus = async () => {
    setIsLoading(true);
    
    let query = supabase.from('ivr_menus_v2').select('*');
    
    if (viewMode === 'default') {
      // Show only default menus (week_id IS NULL)
      query = query.is('week_id', null);
    } else {
      // Show week-specific menus for selected week
      query = query.eq('week_id', selectedWeekId);
    }
    
    const { data, error } = await query.order('created_at');
    
    if (error) {
      toast({ title: "Error fetching menus", description: error.message, variant: "destructive" });
    } else {
      setMenus(data || []);
      if (data && data.length > 0 && !selectedMenu) {
        setSelectedMenu(data[0]);
      }
    }
    setIsLoading(false);
  };
  
  const fetchWeeks = async () => {
    const { data } = await supabase
      .from('weekly_bed_needs')
      .select('*')
      .gte('week_end_date', new Date().toISOString())
      .order('week_start_date', { ascending: true })
      .limit(8);
    
    if (data) {
      setWeeks(data);
      if (data.length > 0) {
        setSelectedWeekId(data[0].id);
      }
    }
  };
  
  const copyDefaultMenuForWeek = async () => {
    if (!selectedWeekId) {
      toast({ title: "Please select a week", variant: "destructive" });
      return;
    }
    
    try {
      // Call the copy_menu_for_week function
      const { data, error } = await supabase.rpc('copy_menu_for_week', {
        source_menu_key: 'main',
        target_week_id: selectedWeekId
      });
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Default menu copied for this week. You can now customize it." });
      fetchMenus();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const fetchMenuOptions = async (menuId) => {
    const { data, error } = await supabase
      .from('ivr_menu_options')
      .select(`
        *,
        voicemail_boxes (box_name, box_number),
        submenu:submenu_id (menu_name, menu_key)
      `)
      .eq('menu_id', menuId)
      .order('digit', { ascending: true });
    
    if (error) {
      toast({ title: "Error fetching options", description: error.message, variant: "destructive" });
    } else {
      setMenuOptions(data || []);
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

  const fetchAvailableFunctions = async () => {
    const { data, error } = await supabase
      .from('ivr_function_descriptions')
      .select('*')
      .eq('is_active', true)
      .order('category, display_name');
    
    if (error) {
      console.error('Error fetching functions:', error);
    } else {
      setAvailableFunctions(data || []);
    }
  };

  const handleSaveMenu = async () => {
    if (!menuForm.menu_name || !menuForm.menu_key || (!menuForm.prompt_text && !menuForm.use_audio_file)) {
      toast({ title: "Required fields missing", variant: "destructive" });
      return;
    }

    if (editingMenu) {
      // Update existing
      const { error } = await supabase
        .from('ivr_menus_v2')
        .update({
          menu_name: menuForm.menu_name,
          prompt_text: menuForm.prompt_text,
          prompt_audio_url: menuForm.prompt_audio_url,
          use_audio_file: menuForm.use_audio_file,
          voice_name: menuForm.voice_name,
          voice_gender: menuForm.voice_gender,
          timeout_seconds: menuForm.timeout_seconds,
          max_digits: menuForm.max_digits,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingMenu.id);

      if (error) {
        toast({ title: "Error updating menu", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Menu updated successfully!" });
        setEditingMenu(null);
        fetchMenus();
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('ivr_menus_v2')
        .insert([menuForm]);

      if (error) {
        toast({ title: "Error creating menu", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Menu created successfully!" });
        setMenuForm({
          menu_name: '',
          menu_key: '',
          prompt_text: '',
          prompt_audio_url: '',
          use_audio_file: false,
          voice_name: 'man',
          voice_gender: 'man',
          timeout_seconds: 10,
          max_digits: 1
        });
        fetchMenus();
      }
    }
  };

  const handleSaveOption = async () => {
    if (!optionForm.digit || !optionForm.option_name || !optionForm.action_type) {
      toast({ title: "Required fields missing", variant: "destructive" });
      return;
    }

    // Check for duplicate digit (only when creating new option)
    if (!editingOption) {
      const existingOption = menuOptions.find(opt => opt.digit === optionForm.digit);
      if (existingOption) {
        toast({ 
          title: "Duplicate digit", 
          description: `Press ${optionForm.digit} is already used for "${existingOption.option_name}". Please choose a different digit.`,
          variant: "destructive" 
        });
        return;
      }
    }

    const optionData = {
      menu_id: selectedMenu.id,
      digit: optionForm.digit,
      option_name: optionForm.option_name,
      option_audio_url: optionForm.option_audio_url,
      use_audio_file: optionForm.use_audio_file,
      action_type: optionForm.action_type,
      voicemail_box_id: optionForm.action_type === 'voicemail' ? optionForm.voicemail_box_id : null,
      submenu_id: optionForm.action_type === 'submenu' ? optionForm.submenu_id : null,
      transfer_number: optionForm.action_type === 'transfer' ? optionForm.transfer_number : null,
      function_name: optionForm.action_type === 'custom_function' ? optionForm.function_name : null,
      sort_order: menuOptions.length
    };

    if (editingOption) {
      // Update
      const { error } = await supabase
        .from('ivr_menu_options')
        .update(optionData)
        .eq('id', editingOption.id);

      if (error) {
        toast({ title: "Error updating option", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Option updated successfully!" });
        setEditingOption(null);
        fetchMenuOptions(selectedMenu.id);
      }
    } else {
      // Create
      const { error } = await supabase
        .from('ivr_menu_options')
        .insert([optionData]);

      if (error) {
        if (error.code === '23505') {
          toast({ 
            title: "Duplicate option", 
            description: `Press ${optionForm.digit} already exists in this menu. Please choose a different digit.`,
            variant: "destructive" 
          });
        } else {
          toast({ title: "Error creating option", description: error.message, variant: "destructive" });
        }
      } else {
        toast({ title: "Option created successfully!" });
        setOptionForm({
          digit: '1',
          option_name: '',
          option_audio_url: '',
          use_audio_file: false,
          action_type: 'voicemail',
          voicemail_box_id: null,
          submenu_id: null,
          transfer_number: '',
          function_name: ''
        });
        fetchMenuOptions(selectedMenu.id);
      }
    }
  };

  const handleDeleteMenu = async (menuId) => {
    if (!confirm('Delete this menu? All options under it will also be deleted.')) return;

    const { error } = await supabase
      .from('ivr_menus_v2')
      .delete()
      .eq('id', menuId);

    if (error) {
      toast({ title: "Error deleting menu", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Menu deleted successfully!" });
      if (selectedMenu?.id === menuId) {
        setSelectedMenu(null);
      }
      fetchMenus();
    }
  };

  const handleDeleteOption = async (optionId) => {
    if (!confirm('Delete this menu option?')) return;

    const { error } = await supabase
      .from('ivr_menu_options')
      .delete()
      .eq('id', optionId);

    if (error) {
      toast({ title: "Error deleting option", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Option deleted successfully!" });
      fetchMenuOptions(selectedMenu.id);
    }
  };

  const startEditMenu = (menu) => {
    setEditingMenu(menu);
    setMenuForm({
      menu_name: menu.menu_name,
      menu_key: menu.menu_key,
      prompt_text: menu.prompt_text,
      prompt_audio_url: menu.prompt_audio_url || '',
      use_audio_file: menu.use_audio_file || false,
      voice_name: menu.voice_name,
      voice_gender: menu.voice_gender || 'man',
      timeout_seconds: menu.timeout_seconds,
      max_digits: menu.max_digits
    });
    setShowMenuDialog(true);
  };

  const startEditOption = (option) => {
    setEditingOption(option);
    setOptionForm({
      digit: option.digit,
      option_name: option.option_name,
      option_audio_url: option.option_audio_url || '',
      use_audio_file: option.use_audio_file || false,
      action_type: option.action_type,
      voicemail_box_id: option.voicemail_box_id,
      submenu_id: option.submenu_id,
      transfer_number: option.transfer_number,
      function_name: option.function_name
    });
    setShowOptionDialog(true);
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading IVR configuration...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            IVR Menu Builder
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Customize your phone system menus and options
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'default' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setViewMode('default');
                setSelectedMenu(null);
              }}
            >
              Default Menus
            </Button>
            <Button
              variant={viewMode === 'week-specific' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setViewMode('week-specific');
                setSelectedMenu(null);
              }}
            >
              Week-Specific
            </Button>
          </div>
          <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                New Menu
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingMenu ? 'Edit Menu' : 'Create New Menu'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Menu Name</Label>
                  <Input
                    placeholder="e.g., Main Menu, Guest Services"
                    value={menuForm.menu_name}
                    onChange={(e) => setMenuForm({ ...menuForm, menu_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Menu Key (Unique ID)</Label>
                  <Input
                    placeholder="e.g., main, guest_services"
                    value={menuForm.menu_key}
                    onChange={(e) => setMenuForm({ ...menuForm, menu_key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                    disabled={!!editingMenu}
                  />
                </div>
                <div>
                  <Label>Prompt Text (Text-to-Speech)</Label>
                  <textarea
                    className="w-full h-24 p-3 border rounded-md"
                    placeholder="What callers will hear when they reach this menu..."
                    value={menuForm.prompt_text}
                    onChange={(e) => setMenuForm({ ...menuForm, prompt_text: e.target.value })}
                    disabled={menuForm.use_audio_file}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="use_audio_file"
                      checked={menuForm.use_audio_file}
                      onChange={(e) => setMenuForm({ ...menuForm, use_audio_file: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="use_audio_file">Use Custom Audio File (MP3)</Label>
                  </div>
                  {menuForm.use_audio_file && (
                    <div>
                      <Input
                        placeholder="https://your-domain.com/audio/menu.mp3"
                        value={menuForm.prompt_audio_url}
                        onChange={(e) => setMenuForm({ ...menuForm, prompt_audio_url: e.target.value })}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Upload your MP3 to Supabase Storage or use a public URL
                      </p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Voice Gender (TTS)</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={menuForm.voice_gender}
                      onChange={(e) => setMenuForm({ ...menuForm, voice_gender: e.target.value, voice_name: e.target.value })}
                      disabled={menuForm.use_audio_file}
                    >
                      <option value="man">Man (Default)</option>
                      <option value="woman">Woman</option>
                    </select>
                  </div>
                  <div>
                    <Label>Timeout (sec)</Label>
                    <Input
                      type="number"
                      value={menuForm.timeout_seconds}
                      onChange={(e) => setMenuForm({ ...menuForm, timeout_seconds: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Max Digits</Label>
                    <Input
                      type="number"
                      value={menuForm.max_digits}
                      onChange={(e) => setMenuForm({ ...menuForm, max_digits: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditingMenu(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveMenu}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Menu
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Week Selector for Week-Specific Mode */}
      {viewMode === 'week-specific' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>Select Week to Configure</Label>
              <select
                className="w-full mt-2 p-2 border rounded-md"
                value={selectedWeekId || ''}
                onChange={(e) => setSelectedWeekId(e.target.value)}
              >
                {weeks.map(week => {
                  const startDate = new Date(week.week_start_date);
                  return (
                    <option key={week.id} value={week.id}>
                      שבת {startDate.toLocaleDateString('he-IL', { month: 'long', day: 'numeric' })}
                    </option>
                  );
                })}
              </select>
            </div>
            {menus.length === 0 && selectedWeekId && (
              <div className="ml-4">
                <Button onClick={copyDefaultMenuForWeek} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Copy Default Menu
                </Button>
              </div>
            )}
          </div>
          {menus.length === 0 && selectedWeekId && (
            <p className="text-sm text-blue-700 mt-2">
              No custom configuration for this week. Click "Copy Default Menu" to create a customized version.
            </p>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Menu List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 flex items-center">
            <MenuIcon className="w-4 h-4 mr-2" />
            Menus
          </h3>
          {menus.map(menu => (
            <div
              key={menu.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMenu?.id === menu.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-slate-200 hover:border-purple-300'
              }`}
              onClick={() => setSelectedMenu(menu)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">{menu.menu_name}</div>
                  <div className="text-xs text-slate-500 mt-1">{menu.menu_key}</div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditMenu(menu);
                    }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMenu(menu.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Menu Details & Options */}
        <div className="col-span-2 space-y-4">
          {selectedMenu ? (
            <>
              {/* Menu Info */}
              <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">{selectedMenu.menu_name}</h3>
                  <Button size="sm" variant="outline" onClick={() => startEditMenu(selectedMenu)}>
                    <Edit2 className="w-3 h-3 mr-2" />
                    Edit Menu
                  </Button>
                </div>
                <div className="bg-white p-4 rounded-md border border-slate-200">
                  <div className="text-sm text-slate-600 mb-2">Prompt:</div>
                  <div className="text-slate-800">{selectedMenu.prompt_text}</div>
                </div>
              </div>

              {/* Menu Options */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-700">Menu Options (Digits)</h3>
                  <Dialog open={showOptionDialog} onOpenChange={setShowOptionDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Option
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingOption ? 'Edit Option' : 'Add Menu Option'}
                        </DialogTitle>
                        <p className="text-sm text-slate-600">
                          {editingOption 
                            ? 'Update the menu option configuration below.'
                            : 'Configure what happens when callers press a digit.'}
                        </p>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Digit (Key Press)</Label>
                            <select
                              className="w-full p-2 border rounded-md"
                              value={optionForm.digit}
                              onChange={(e) => setOptionForm({ ...optionForm, digit: e.target.value })}
                            >
                              {['0','1','2','3','4','5','6','7','8','9','*','#'].map(d => {
                                const isUsed = !editingOption && menuOptions.some(opt => opt.digit === d);
                                return (
                                  <option key={d} value={d} disabled={isUsed}>
                                    Press {d} {isUsed ? '(already used)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                            {!editingOption && menuOptions.length > 0 && (
                              <p className="text-xs text-slate-500 mt-1">
                                Available: {['0','1','2','3','4','5','6','7','8','9','*','#']
                                  .filter(d => !menuOptions.some(opt => opt.digit === d))
                                  .join(', ')}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>Action Type</Label>
                            <select
                              className="w-full p-2 border rounded-md"
                              value={optionForm.action_type}
                              onChange={(e) => setOptionForm({ ...optionForm, action_type: e.target.value })}
                            >
                              <option value="voicemail">Leave Voicemail</option>
                              <option value="submenu">Go to Sub-menu</option>
                              <option value="transfer">Transfer Call</option>
                              <option value="custom_function">Custom Function</option>
                              <option value="hangup">Hang Up</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <Label>Option Name</Label>
                          <Input
                            placeholder="e.g., Leave a message, Billing"
                            value={optionForm.option_name}
                            onChange={(e) => setOptionForm({ ...optionForm, option_name: e.target.value })}
                            disabled={optionForm.use_audio_file}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              id="option_use_audio"
                              checked={optionForm.use_audio_file}
                              onChange={(e) => setOptionForm({ ...optionForm, use_audio_file: e.target.checked })}
                              className="rounded"
                            />
                            <Label htmlFor="option_use_audio">Use Custom Audio File (MP3)</Label>
                          </div>
                          {optionForm.use_audio_file && (
                            <Input
                              placeholder="https://your-domain.com/audio/option.mp3"
                              value={optionForm.option_audio_url}
                              onChange={(e) => setOptionForm({ ...optionForm, option_audio_url: e.target.value })}
                            />
                          )}
                        </div>

                        {optionForm.action_type === 'voicemail' && (
                          <div>
                            <Label>Voicemail Box</Label>
                            <select
                              className="w-full p-2 border rounded-md"
                              value={optionForm.voicemail_box_id || ''}
                              onChange={(e) => setOptionForm({ ...optionForm, voicemail_box_id: e.target.value })}
                            >
                              <option value="">Select a box...</option>
                              {voicemailBoxes.map(box => (
                                <option key={box.id} value={box.id}>
                                  {box.box_name} ({box.box_number})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {optionForm.action_type === 'submenu' && (
                          <div>
                            <Label>Sub-menu</Label>
                            <select
                              className="w-full p-2 border rounded-md"
                              value={optionForm.submenu_id || ''}
                              onChange={(e) => setOptionForm({ ...optionForm, submenu_id: e.target.value })}
                            >
                              <option value="">Select a menu...</option>
                              {menus.filter(m => m.id !== selectedMenu.id).map(menu => (
                                <option key={menu.id} value={menu.id}>
                                  {menu.menu_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {optionForm.action_type === 'transfer' && (
                          <div>
                            <Label>Transfer Number</Label>
                            <Input
                              placeholder="+1234567890"
                              value={optionForm.transfer_number}
                              onChange={(e) => setOptionForm({ ...optionForm, transfer_number: e.target.value })}
                            />
                          </div>
                        )}

                        {optionForm.action_type === 'custom_function' && (
                          <div>
                            <Label>Function Name</Label>
                            <select
                              className="w-full p-2 border rounded-md"
                              value={optionForm.function_name}
                              onChange={(e) => setOptionForm({ ...optionForm, function_name: e.target.value })}
                            >
                              <option value="">Select function...</option>
                              {availableFunctions.map((func) => (
                                <option key={func.function_name} value={func.function_name}>
                                  {func.display_name} - {func.category}
                                </option>
                              ))}
                            </select>
                            {optionForm.function_name && availableFunctions.find(f => f.function_name === optionForm.function_name) && (
                              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-sm text-blue-900">
                                  <strong>Description:</strong> {availableFunctions.find(f => f.function_name === optionForm.function_name).description}
                                </p>
                                <p className="text-xs text-blue-700 mt-1">
                                  <strong>Category:</strong> {availableFunctions.find(f => f.function_name === optionForm.function_name).category}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setEditingOption(null)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveOption}>
                            <Save className="w-4 h-4 mr-2" />
                            Save Option
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {menuOptions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 border-2 border-dashed rounded-lg">
                      No options configured yet. Click "Add Option" to create menu choices.
                    </div>
                  ) : (
                    menuOptions.map(option => (
                      <div
                        key={option.id}
                        className="p-4 bg-white rounded-lg border border-slate-200 hover:border-purple-300 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                              {option.digit}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-slate-800">{option.option_name}</div>
                              <div className="text-sm text-slate-500 mt-1">
                                {option.action_type === 'voicemail' && option.voicemail_boxes && (
                                  <>→ Voicemail: {option.voicemail_boxes.box_name}</>
                                )}
                                {option.action_type === 'submenu' && option.submenu && (
                                  <>→ Sub-menu: {option.submenu.menu_name}</>
                                )}
                                {option.action_type === 'transfer' && (
                                  <>→ Transfer to: {option.transfer_number}</>
                                )}
                                {option.action_type === 'custom_function' && (
                                  <>→ Function: {option.function_name}</>
                                )}
                                {option.action_type === 'hangup' && (
                                  <>→ Hang up call</>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => startEditOption(option)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteOption(option.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500">
              Select a menu from the left to view and edit its options
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
