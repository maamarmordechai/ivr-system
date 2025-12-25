import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { UtensilsCrossed, Plus, Edit2, Trash2, Phone, Users, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const MealHostsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hosts, setHosts] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingHost, setEditingHost] = useState(null);
  const [makingCalls, setMakingCalls] = useState(false);

  const [formData, setFormData] = useState({
    host_name: '',
    phone_number: '',
    address: '',
    notes: '',
    wants_weekly_calls: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get current week
      const { data: weekData, error: weekError } = await supabase
        .from('desperate_weeks')
        .select('*')
        .gte('week_end_date', new Date().toISOString().split('T')[0])
        .order('week_start_date', { ascending: true })
        .limit(1)
        .single();

      if (weekError) throw weekError;
      setCurrentWeek(weekData);

      // Get all meal hosts
      const { data: hostsData, error: hostsError } = await supabase
        .from('meal_hosts')
        .select('*')
        .order('created_at', { ascending: false });

      if (hostsError) throw hostsError;
      setHosts(hostsData || []);

      // Get availabilities for current week
      if (weekData) {
        const { data: availData, error: availError } = await supabase
          .from('meal_availabilities')
          .select('*, meal_hosts(*)')
          .eq('week_id', weekData.id);

        if (availError) throw availError;
        setAvailabilities(availData || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
      setLoading(false);
    }
  };

  const handleAddHost = async () => {
    if (!formData.host_name || !formData.phone_number) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all required fields'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('meal_hosts')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Meal host added successfully'
      });

      setShowAddDialog(false);
      setFormData({ host_name: '', phone_number: '', address: '', notes: '', wants_weekly_calls: true });
      fetchData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    }
  };

  const handleUpdateHost = async () => {
    if (!editingHost) return;

    try {
      const { error } = await supabase
        .from('meal_hosts')
        .update(formData)
        .eq('id', editingHost.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Meal host updated successfully'
      });

      setEditingHost(null);
      setFormData({ host_name: '', phone_number: '', address: '', notes: '', wants_weekly_calls: true });
      fetchData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    }
  };

  const handleDeleteHost = async (hostId) => {
    if (!confirm('Are you sure you want to delete this host?')) return;

    try {
      const { error } = await supabase
        .from('meal_hosts')
        .delete()
        .eq('id', hostId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Meal host deleted successfully'
      });

      fetchData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    }
  };

  const handleMakeWeeklyCalls = async () => {
    if (!currentWeek) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No current week found'
      });
      return;
    }

    if (!confirm(`Send meal hosting calls to all ${hosts.length} active hosts for week of ${new Date(currentWeek.week_end_date).toLocaleDateString()}?`)) {
      return;
    }

    setMakingCalls(true);

    try {
      const response = await supabase.functions.invoke('make-meal-calls', {
        body: { week_id: currentWeek.id }
      });

      if (response.error) throw response.error;

      toast({
        title: 'Success',
        description: response.data.message
      });

      fetchData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setMakingCalls(false);
    }
  };

  const startEdit = (host) => {
    setEditingHost(host);
    setFormData({
      host_name: host.host_name,
      phone_number: host.phone_number,
      address: host.address || '',
      notes: host.notes || '',
      wants_weekly_calls: host.wants_weekly_calls ?? true
    });
  };

  const getHostAvailability = (hostId) => {
    return availabilities.find(a => a.host_id === hostId);
  };

  if (loading) {
    return <div className="p-6 text-center">Loading meal hosts...</div>;
  }

  const totalDayGuests = availabilities.reduce((sum, a) => sum + (a.day_meal_guests || 0), 0);
  const totalNightGuests = availabilities.reduce((sum, a) => sum + (a.night_meal_guests || 0), 0);
  const respondedCount = availabilities.filter(a => a.status !== 'pending').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <UtensilsCrossed className="w-8 h-8 text-orange-600" />
              Meal Hosting System
            </h2>
            <p className="text-slate-600 mt-1">Manage Shabbat meal hosts and weekly availabilities</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Host
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Meal Host</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Host Name *</Label>
                    <Input
                      value={formData.host_name}
                      onChange={(e) => setFormData({ ...formData, host_name: e.target.value })}
                      placeholder="Enter host name"
                    />
                  </div>
                  <div>
                    <Label>Phone Number *</Label>
                    <Input
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="+1234567890"
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional notes..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="wants_weekly_calls_add"
                      checked={formData.wants_weekly_calls}
                      onChange={(e) => setFormData({ ...formData, wants_weekly_calls: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <Label htmlFor="wants_weekly_calls_add" className="cursor-pointer">
                      Wants weekly automated calls
                    </Label>
                  </div>
                  <Button onClick={handleAddHost} className="w-full">
                    Add Host
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              onClick={handleMakeWeeklyCalls}
              disabled={makingCalls || !currentWeek || hosts.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Phone className="w-4 h-4 mr-2" />
              {makingCalls ? 'Making Calls...' : 'Send Weekly Calls'}
            </Button>
          </div>
        </div>
      </div>

      {/* Current Week Summary */}
      {currentWeek && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="modern-card p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-sm text-slate-600">Current Week</div>
                <div className="text-lg font-bold text-slate-900">
                  {new Date(currentWeek.week_end_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
          <div className="modern-card p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-sm text-slate-600">Friday Night</div>
                <div className="text-lg font-bold text-slate-900">{totalNightGuests} Guests</div>
              </div>
            </div>
          </div>
          <div className="modern-card p-4 bg-orange-50 border-orange-200">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-orange-600" />
              <div>
                <div className="text-sm text-slate-600">Saturday Day</div>
                <div className="text-lg font-bold text-slate-900">{totalDayGuests} Guests</div>
              </div>
            </div>
          </div>
          <div className="modern-card p-4 bg-purple-50 border-purple-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-purple-600" />
              <div>
                <div className="text-sm text-slate-600">Responded</div>
                <div className="text-lg font-bold text-slate-900">{respondedCount}/{hosts.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingHost} onOpenChange={() => setEditingHost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Meal Host</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Host Name *</Label>
              <Input
                value={formData.host_name}
                onChange={(e) => setFormData({ ...formData, host_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="wants_weekly_calls_edit"
                checked={formData.wants_weekly_calls}
                onChange={(e) => setFormData({ ...formData, wants_weekly_calls: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300"
              />
              <Label htmlFor="wants_weekly_calls_edit" className="cursor-pointer">
                Wants weekly automated calls
              </Label>
            </div>
            <Button onClick={handleUpdateHost} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hosts List */}
      <div className="space-y-4">
        {hosts.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
            <UtensilsCrossed className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Meal Hosts</h3>
            <p className="text-slate-500 mb-4">Add your first meal host to get started</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Host
            </Button>
          </div>
        ) : (
          hosts.map(host => {
            const availability = getHostAvailability(host.id);
            const hasResponded = availability && availability.status !== 'pending';
            
            return (
              <div key={host.id} className="modern-card p-6 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">{host.host_name}</h3>
                      {hasResponded ? (
                        availability.status === 'confirmed' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )
                      ) : (
                        <Clock className="w-5 h-5 text-orange-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-600 mb-3">
                      <Phone className="w-4 h-4" />
                      <span>{host.phone_number}</span>
                    </div>

                    {host.address && (
                      <div className="text-sm text-slate-600 mb-3">
                        📍 {host.address}
                      </div>
                    )}

                    <div className="mb-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        host.wants_weekly_calls 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {host.wants_weekly_calls ? '📞 Weekly calls enabled' : '📵 Manual check-in only'}
                      </span>
                    </div>

                    {host.notes && (
                      <p className="text-sm text-slate-600 mb-3">{host.notes}</p>
                    )}

                    {/* Current Week Availability */}
                    {availability && (
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <div className="text-xs font-semibold text-green-700 mb-1">Friday Night</div>
                          <div className="text-2xl font-bold text-green-900">
                            {availability.night_meal_guests || 0}
                          </div>
                          <div className="text-xs text-green-600">Guests</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                          <div className="text-xs font-semibold text-orange-700 mb-1">Saturday Day</div>
                          <div className="text-2xl font-bold text-orange-900">
                            {availability.day_meal_guests || 0}
                          </div>
                          <div className="text-xs text-orange-600">Guests</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => startEdit(host)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteHost(host.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MealHostsTab;
