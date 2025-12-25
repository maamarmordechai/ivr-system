import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pencil, Save, X, Plus, Trash2, ChevronRight, Menu } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function IVRMenuConfigTab() {
  const [menuOptions, setMenuOptions] = useState([]);
  const [allMenus, setAllMenus] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState('main_menu');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newMenuName, setNewMenuName] = useState('');
  const [menuGreetings, setMenuGreetings] = useState({});

  useEffect(() => {
    fetchAllMenus();
  }, []);

  useEffect(() => {
    if (selectedMenu) {
      fetchMenuOptions();
    }
  }, [selectedMenu]);

  const fetchAllMenus = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('ivr_menu_options')
        .select('menu_name')
        .order('menu_name');

      if (fetchError) throw fetchError;
      
      const uniqueMenus = [...new Set((data || []).map(item => item.menu_name))];
      setAllMenus(uniqueMenus);
      
      if (!selectedMenu && uniqueMenus.length > 0) {
        setSelectedMenu(uniqueMenus[0]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchMenuOptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('ivr_menu_options')
        .select('*')
        .eq('menu_name', selectedMenu)
        .order('display_order');

      if (fetchError) throw fetchError;
      setMenuOptions(data || []);
      
      // Get menu greeting if exists
      const { data: greetingData } = await supabase
        .from('ivr_menu_greetings')
        .select('*')
        .eq('menu_name', selectedMenu)
        .maybeSingle();
      
      if (greetingData) {
        setMenuGreetings(prev => ({ ...prev, [selectedMenu]: greetingData }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createNewMenu = async () => {
    if (!newMenuName || newMenuName.trim() === '') {
      setError('Menu name cannot be empty');
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('ivr_menu_options')
        .insert([{
          menu_name: newMenuName.trim(),
          digit_press: '1',
          function_name: 'new_option',
          audio_text: 'New menu option',
          is_enabled: true,
          display_order: 1
        }]);

      if (insertError) throw insertError;
      
      setNewMenuName('');
      await fetchAllMenus();
      setSelectedMenu(newMenuName.trim());
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (option) => {
    setEditingId(option.id);
    setEditForm({ ...option });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    try {
      const { error: updateError } = await supabase
        .from('ivr_menu_options')
        .update({
          digit_press: editForm.digit_press,
          function_name: editForm.function_name,
          audio_text: editForm.audio_text,
          is_enabled: editForm.is_enabled,
          display_order: editForm.display_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (updateError) throw updateError;
      
      setEditingId(null);
      setEditForm({});
      await fetchMenuOptions();
    } catch (err) {
      setError(err.message);
    }
  };

  const addNewOption = async () => {
    try {
      const maxOrder = menuOptions.length > 0 
        ? Math.max(...menuOptions.map(o => o.display_order || 0))
        : 0;

      const { error: insertError } = await supabase
        .from('ivr_menu_options')
        .insert([{
          menu_name: selectedMenu,
          digit_press: '9',
          function_name: 'new_function',
          audio_text: 'New option',
          is_enabled: true,
          display_order: maxOrder + 1
        }]);

      if (insertError) throw insertError;
      await fetchMenuOptions();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteOption = async (id) => {
    if (!confirm('Are you sure you want to delete this menu option?')) return;
    
    try {
      const { error: deleteError } = await supabase
        .from('ivr_menu_options')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchMenuOptions();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleEnabled = async (id, currentValue) => {
    try {
      const { error: updateError } = await supabase
        .from('ivr_menu_options')
        .update({ is_enabled: !currentValue })
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchMenuOptions();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && menuOptions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading IVR menu configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IVR Menu Configuration</h1>
          <p className="text-gray-600 mt-1">Configure your phone menu options and create sub-menus</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Menu Selection & Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Menu className="w-5 h-5" />
            Select Menu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Current Menu</Label>
              <Select value={selectedMenu} onValueChange={setSelectedMenu}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a menu" />
                </SelectTrigger>
                <SelectContent>
                  {allMenus.map((menu) => (
                    <SelectItem key={menu} value={menu}>
                      {menu}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Create New Menu</Label>
              <div className="flex gap-2">
                <Input
                  value={newMenuName}
                  onChange={(e) => setNewMenuName(e.target.value)}
                  placeholder="e.g., admin_submenu"
                  onKeyPress={(e) => e.key === 'Enter' && createNewMenu()}
                />
                <Button onClick={createNewMenu}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Greeting */}
      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Menu Greeting Audio for: <span className="text-blue-600">{selectedMenu}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold">Greeting Audio URL</Label>
              <Input
                value={menuGreetings[selectedMenu]?.audio_url || ''}
                onChange={async (e) => {
                  const newUrl = e.target.value;
                  try {
                    const { error } = await supabase
                      .from('ivr_menu_greetings')
                      .upsert({
                        menu_name: selectedMenu,
                        audio_url: newUrl,
                        updated_at: new Date().toISOString()
                      }, { onConflict: 'menu_name' });
                    
                    if (error) throw error;
                    setMenuGreetings(prev => ({ ...prev, [selectedMenu]: { menu_name: selectedMenu, audio_url: newUrl } }));
                  } catch (err) {
                    setError(err.message);
                  }
                }}
                placeholder="https://your-storage.com/menu-greeting.wav"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                This audio plays BEFORE the menu options. Use 8kHz mono μ-law WAV format for best quality.
              </p>
            </div>
            
            {menuGreetings[selectedMenu]?.audio_url && (
              <div className="bg-white p-3 rounded border">
                <audio controls className="w-full">
                  <source src={menuGreetings[selectedMenu].audio_url} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Menu Options */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>
            Menu Options for: <span className="text-blue-600">{selectedMenu}</span>
          </CardTitle>
          <Button onClick={addNewOption} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Option
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {menuOptions.map((option) => (
              <Card key={option.id} className={`${!option.is_enabled ? 'opacity-50 bg-gray-50' : 'bg-white'} border-2`}>
                <CardContent className="p-4">
                  {editingId === option.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs font-semibold text-gray-600">Digit Press</Label>
                          <Input
                            value={editForm.digit_press || ''}
                            onChange={(e) => setEditForm({ ...editForm, digit_press: e.target.value })}
                            placeholder="1"
                            maxLength={2}
                            className="mt-1"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs font-semibold text-gray-600">Action</Label>
                          <Select 
                            value={editForm.function_name || ''} 
                            onValueChange={(value) => setEditForm({ ...editForm, function_name: value })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select an action" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="accept_guests">
                                <div className="flex flex-col">
                                  <span className="font-semibold">Accept Guests</span>
                                  <span className="text-xs text-gray-500">Check bed availability and accept guests for Shabbos</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="register_host">
                                <div className="flex flex-col">
                                  <span className="font-semibold">Register Host</span>
                                  <span className="text-xs text-gray-500">Register as a new host in the system</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="voicemail">
                                <div className="flex flex-col">
                                  <span className="font-semibold">Voicemail System</span>
                                  <span className="text-xs text-gray-500">Leave voicemail (4 mailboxes: General, Registration, Availability, Other)</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="admin">
                                <div className="flex flex-col">
                                  <span className="font-semibold">Admin Menu</span>
                                  <span className="text-xs text-gray-500">Administrative options and settings</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="forward_call">
                                <div className="flex flex-col">
                                  <span className="font-semibold">Forward Call</span>
                                  <span className="text-xs text-gray-500">Forward call to another phone number</span>
                                </div>
                              </SelectItem>
                              {allMenus.filter(m => m !== selectedMenu).map((menuName) => (
                                <SelectItem key={menuName} value={menuName}>
                                  <div className="flex flex-col">
                                    <span className="font-semibold">→ {menuName}</span>
                                    <span className="text-xs text-purple-600">Go to sub-menu</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {editForm.function_name === 'forward_call' && (
                            <div className="mt-2">
                              <Label className="text-xs font-semibold text-gray-600">Phone Number to Forward To</Label>
                              <Input
                                value={editForm.audio_url || ''}
                                onChange={(e) => setEditForm({ ...editForm, audio_url: e.target.value })}
                                placeholder="+1234567890"
                                className="mt-1"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Include country code (e.g., +1 for US)
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-semibold text-gray-600">Description / Audio Text</Label>
                        <Input
                          value={editForm.audio_text || ''}
                          onChange={(e) => setEditForm({ ...editForm, audio_text: e.target.value })}
                          placeholder="Press 1 to accept guests"
                          className="mt-1"
                        />
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-semibold text-gray-600">Order</Label>
                          <Input
                            type="number"
                            value={editForm.display_order || 0}
                            onChange={(e) => setEditForm({ ...editForm, display_order: parseInt(e.target.value) })}
                            className="w-20"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editForm.is_enabled || false}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, is_enabled: checked })}
                          />
                          <Label className="text-xs font-semibold text-gray-600">Enabled</Label>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t">
                        <Button onClick={saveEdit} size="sm">
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                        <Button onClick={cancelEdit} variant="outline" size="sm">
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-2">
                          <div className="text-xs font-semibold text-gray-500 uppercase">Key</div>
                          <div className="text-3xl font-bold text-blue-600 mt-1">{option.digit_press}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 hidden md:block" />
                        <div className="md:col-span-4">
                          <div className="text-xs font-semibold text-gray-500 uppercase">Action</div>
                          <div className="mt-1 flex items-center gap-2">
                            {option.function_name === 'accept_guests' && (
                              <>
                                <div className="font-mono text-sm bg-green-100 text-green-700 px-2 py-1 rounded">Accept Guests</div>
                                <span className="text-xs text-gray-500">Check bed availability</span>
                              </>
                            )}
                            {option.function_name === 'register_host' && (
                              <>
                                <div className="font-mono text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">Register Host</div>
                                <span className="text-xs text-gray-500">New host registration</span>
                              </>
                            )}
                            {option.function_name === 'voicemail' && (
                              <>
                                <div className="font-mono text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded">Voicemail</div>
                                <span className="text-xs text-gray-500">4 mailbox system</span>
                              </>
                            )}
                            {option.function_name === 'admin' && (
                              <>
                                <div className="font-mono text-sm bg-red-100 text-red-700 px-2 py-1 rounded">Admin</div>
                                <span className="text-xs text-gray-500">Admin options</span>
                              </>
                            )}
                            {option.function_name === 'forward_call' && (
                              <>
                                <div className="font-mono text-sm bg-cyan-100 text-cyan-700 px-2 py-1 rounded">Forward Call</div>
                                <span className="text-xs text-gray-500">→ {option.audio_url || 'No number set'}</span>
                              </>
                            )}
                            {allMenus.includes(option.function_name) && (
                              <>
                                <div className="font-mono text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                  → {option.function_name}
                                </div>
                                <span className="text-xs text-purple-600">Sub-menu</span>
                              </>
                            )}
                            {!['accept_guests', 'register_host', 'voicemail', 'admin', 'forward_call'].includes(option.function_name) 
                              && !allMenus.includes(option.function_name) && (
                              <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                {option.function_name}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="md:col-span-5">
                          <div className="text-xs font-semibold text-gray-500 uppercase">Description</div>
                          <div className="text-sm text-gray-700 mt-1">{option.audio_text || 'No description'}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <div className="flex flex-col items-center gap-1">
                          <Switch
                            checked={option.is_enabled}
                            onCheckedChange={() => toggleEnabled(option.id, option.is_enabled)}
                          />
                          <span className="text-xs text-gray-500">
                            {option.is_enabled ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <Button onClick={() => startEdit(option)} variant="outline" size="sm">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => deleteOption(option.id)} variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {menuOptions.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Menu className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No menu options yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "Add Option" to create one</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reference Guide */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Available Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div className="font-mono font-bold text-green-700">accept_guests</div>
                </div>
                <div className="text-gray-600 text-sm">
                  Check bed availability for the current week and accept guests for Shabbos. Tracks confirmations and updates bed count.
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div className="font-mono font-bold text-blue-700">register_host</div>
                </div>
                <div className="text-gray-600 text-sm">
                  Register as a new host in the system. Collects name, phone, and address information.
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border-2 border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <div className="font-mono font-bold text-orange-700">voicemail</div>
                </div>
                <div className="text-gray-600 text-sm">
                  Leave a voicemail in one of 4 mailboxes: General (101), Registration (102), Availability (103), or Other (104).
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border-2 border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="font-mono font-bold text-red-700">admin</div>
                </div>
                <div className="text-gray-600 text-sm">
                  Administrative options menu for managing the system.
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border-2 border-cyan-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                  <div className="font-mono font-bold text-cyan-700">forward_call</div>
                </div>
                <div className="text-gray-600 text-sm">
                  Forward the call to another phone number. Set the phone number in the audio_url field.
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <div className="font-mono font-bold text-purple-700">Sub-Menus</div>
                </div>
                <div className="text-gray-600 text-sm">
                  Select any menu name to create a nested sub-menu. Caller will hear the options from that menu.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
