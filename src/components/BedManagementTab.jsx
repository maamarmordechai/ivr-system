import { useState, useEffect } from 'react';
import { supabase } from '../lib/customSupabaseClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Bed, Phone, Calendar, Users, CheckCircle2, Clock, TrendingUp, X, AlertCircle, Play, Pause, SkipForward, RefreshCw } from 'lucide-react';
import { useToast } from './ui/use-toast';

export default function BedManagementTab() {
  const [currentWeek, setCurrentWeek] = useState(null);
  const [weeklyTracking, setWeeklyTracking] = useState(null);
  const [confirmations, setConfirmations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [callQueue, setCallQueue] = useState([]);
  const [currentCall, setCurrentCall] = useState(null);
  const [isCallingSequentially, setIsCallingSequentially] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    try {
      // Get or auto-create current week from desperate_weeks
      let { data: weekData } = await supabase
        .from('desperate_weeks')
        .select('*')
        .eq('is_current', true)
        .maybeSingle();
      
      // If no current week exists, create one automatically
      if (!weekData) {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
        const nextFriday = new Date(now);
        nextFriday.setDate(now.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
        nextFriday.setHours(18, 0, 0, 0); // 6 PM Friday

        const followingMonday = new Date(nextFriday);
        followingMonday.setDate(nextFriday.getDate() + 3);
        followingMonday.setHours(0, 0, 0, 0);

        const { data: newWeek, error: createWeekError } = await supabase
          .from('desperate_weeks')
          .insert({
            week_start_date: nextFriday.toISOString(),
            week_end_date: followingMonday.toISOString(),
            is_current: true
          })
          .select()
          .single();

        if (createWeekError) throw createWeekError;
        
        // Create tracking entry for the new week
        const { error: createTrackingError } = await supabase
          .from('weekly_bed_tracking')
          .insert({
            week_id: newWeek.id,
            beds_needed: 2,
            beds_confirmed: 0
          });

        if (createTrackingError) throw createTrackingError;
        
        weekData = newWeek;
        
        toast({
          title: 'Week Created',
          description: `Automatically created week for ${nextFriday.toLocaleDateString()}`
        });
      }
      
      setCurrentWeek(weekData);

      if (weekData) {
        // Get weekly tracking data
        const { data: trackingData } = await supabase
          .from('weekly_bed_tracking')
          .select('*')
          .eq('week_id', weekData.id)
          .maybeSingle();
        
        setWeeklyTracking(trackingData);

        // Get all bed confirmations for this week with apartment details
        const { data: confirmationsData } = await supabase
          .from('bed_confirmations')
          .select(`
            *,
            apartments (
              person_name,
              phone_number,
              number_of_beds,
              times_helped
            )
          `)
          .eq('week_id', weekData.id)
          .eq('voided', false)
          .order('confirmed_at', { ascending: false });
        
        setConfirmations(confirmationsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const voidConfirmation = async (confirmationId, apartmentName, bedCount) => {
    if (!confirm(`Are you sure you want to void the confirmation of ${bedCount} beds from ${apartmentName}?`)) {
      return;
    }

    try {
      // Mark confirmation as voided
      const { error: voidError } = await supabase
        .from('bed_confirmations')
        .update({
          voided: true,
          voided_at: new Date().toISOString(),
          voided_by: 'admin',
          void_reason: 'Manual void by administrator'
        })
        .eq('id', confirmationId);

      if (voidError) throw voidError;

      // Decrement beds_confirmed in weekly tracking
      if (weeklyTracking) {
        const { error: updateError } = await supabase
          .from('weekly_bed_tracking')
          .update({
            beds_confirmed: Math.max(0, weeklyTracking.beds_confirmed - bedCount)
          })
          .eq('week_id', currentWeek.id);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Confirmation Voided',
        description: `Removed ${bedCount} beds from ${apartmentName}`
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

  const callHost = async (phoneNumber, apartmentName) => {
    try {
      // You could call your Twilio function here to make an automated call
      // For now, just open the phone dialer
      window.location.href = `tel:${phoneNumber}`;
      
      toast({
        title: 'Calling Host',
        description: `Calling ${apartmentName}...`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    }
  };

  // Sequential calling functions
  const startSequentialCalls = async () => {
    if (!currentWeek) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('sequential-bed-calls', {
        body: { week_id: currentWeek.id, action: 'start' }
      });

      if (error) throw error;

      if (data.done) {
        toast({
          title: 'Already Complete',
          description: data.message
        });
        return;
      }

      toast({
        title: 'Queue Created',
        description: data.message
      });

      // Fetch the queue
      await refreshCallQueue();
      setIsCallingSequentially(true);

    } catch (error) {
      console.error('Error starting sequential calls:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCallQueue = async () => {
    if (!currentWeek) return;

    try {
      const { data, error } = await supabase.functions.invoke('sequential-bed-calls', {
        body: { week_id: currentWeek.id, action: 'status' }
      });

      if (error) throw error;

      setCallQueue(data.queue || []);
      
      // Also refresh tracking data
      const { data: trackingData } = await supabase
        .from('weekly_bed_tracking')
        .select('*')
        .eq('week_id', currentWeek.id)
        .maybeSingle();
      
      setWeeklyTracking(trackingData);

    } catch (error) {
      console.error('Error refreshing queue:', error);
    }
  };

  const callNextInQueue = async () => {
    if (!currentWeek) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('sequential-bed-calls', {
        body: { week_id: currentWeek.id, action: 'next' }
      });

      if (error) throw error;

      if (data.done) {
        toast({
          title: data.bedsConfirmed >= data.bedsNeeded ? '🎉 Complete!' : 'Queue Empty',
          description: data.message
        });
        setIsCallingSequentially(false);
        setCurrentCall(null);
        fetchData();
        return;
      }

      if (data.calling) {
        setCurrentCall(data.calling);
        toast({
          title: 'Calling...',
          description: `Calling ${data.calling.name} at ${data.calling.phone}`
        });
      }

      // Refresh queue status after a delay
      setTimeout(() => refreshCallQueue(), 2000);

    } catch (error) {
      console.error('Error calling next:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopSequentialCalls = async () => {
    if (!currentWeek) return;

    try {
      const { data, error } = await supabase.functions.invoke('sequential-bed-calls', {
        body: { week_id: currentWeek.id, action: 'stop' }
      });

      if (error) throw error;

      toast({
        title: 'Calls Stopped',
        description: 'Call queue cleared'
      });

      setIsCallingSequentially(false);
      setCallQueue([]);
      setCurrentCall(null);

    } catch (error) {
      console.error('Error stopping calls:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    }
  };

  const triggerBedAvailabilityCalls = async () => {
    if (!currentWeek) return;

    const confirmed = confirm(
      'This will trigger bed availability calls to all hosts who want weekly calls. Continue?'
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('handle-admin-send-calls', {
        body: { week_id: currentWeek.id, call_type: 'beds' }
      });

      if (error) throw error;

      toast({
        title: 'Calls Triggered',
        description: `Started bed availability calls to ${data.calls_made || 0} hosts`
      });

      fetchData();
    } catch (error) {
      console.error('Error triggering calls:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateBedsNeeded = async (newValue) => {
    if (!currentWeek) return;

    try {
      const { error } = await supabase
        .from('weekly_bed_tracking')
        .upsert({
          week_id: currentWeek.id,
          beds_needed: parseInt(newValue)
        }, { onConflict: 'week_id' });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Beds needed updated'
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

  const toggleDesperateWeek = async () => {
    if (!currentWeek) return;

    const newValue = !currentWeek.is_desperate;

    try {
      const { error } = await supabase
        .from('desperate_weeks')
        .update({ is_desperate: newValue })
        .eq('id', currentWeek.id);

      if (error) throw error;

      setCurrentWeek(prev => ({
        ...prev,
        is_desperate: newValue
      }));

      toast({
        title: newValue ? '🚨 Desperate Week Activated' : 'Desperate Week Deactivated',
        description: newValue 
          ? 'This week is now marked as desperate. All hosts will be called aggressively.'
          : 'This week is no longer marked as desperate.',
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

  if (isLoading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!currentWeek) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Current Week Configured</h3>
          <p className="text-yellow-700">Please run CREATE_CURRENT_WEEK.sql in Supabase to set up the current week.</p>
        </div>
      </div>
    );
  }

  const bedsConfirmed = weeklyTracking?.beds_confirmed || 0;
  const bedsNeeded = weeklyTracking?.beds_needed || 0;
  const bedsStillNeeded = Math.max(0, bedsNeeded - bedsConfirmed);
  const percentComplete = bedsNeeded > 0 ? (bedsConfirmed / bedsNeeded * 100).toFixed(0) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bed className="w-8 h-8 text-blue-600" />
            Weekly Bed Management
            {currentWeek.is_desperate && (
              <span className="ml-2 px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full animate-pulse">
                🚨 DESPERATE WEEK
              </span>
            )}
          </h2>
          <p className="text-slate-600 mt-1">
            Track bed availability for {new Date(currentWeek.week_start_date).toLocaleDateString()} - {new Date(currentWeek.week_end_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={toggleDesperateWeek}
            variant={currentWeek.is_desperate ? "destructive" : "outline"}
            className={currentWeek.is_desperate ? "animate-pulse" : ""}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            {currentWeek.is_desperate ? 'Deactivate Desperate Mode' : 'Mark as Desperate Week'}
          </Button>
          {!isCallingSequentially ? (
            <Button
              onClick={startSequentialCalls}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Sequential Calls
            </Button>
          ) : (
            <Button
              onClick={stopSequentialCalls}
              variant="destructive"
            >
              <Pause className="w-4 h-4 mr-2" />
              Stop Calls
            </Button>
          )}
        </div>
      </div>

      {/* Sequential Calling Panel */}
      {isCallingSequentially && (
        <div className="modern-card p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
              <Phone className="w-5 h-5 text-indigo-600" />
              Sequential Calling - One at a Time
            </h3>
            <Button 
              onClick={refreshCallQueue}
              variant="ghost" 
              size="sm"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          
          {currentCall && (
            <div className="bg-white p-4 rounded-lg mb-4 border border-indigo-200">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-slate-600">Currently Calling:</span>
                <span className="font-semibold text-slate-900">{currentCall.name}</span>
                <span className="text-slate-500">({currentCall.phone})</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-4">
            <div className="text-sm">
              <span className="text-slate-600">Queue: </span>
              <span className="font-semibold text-indigo-700">{callQueue.filter(q => q.status === 'pending').length} hosts waiting</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-600">Still need: </span>
              <span className="font-semibold text-orange-700">{bedsStillNeeded} beds</span>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800">
              <strong>🤖 Automatic Mode:</strong> Calls happen automatically one at a time. 
              When a call ends (no answer, declined, or completed), the system automatically calls the next person.
              It will stop when you have enough beds.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={fetchData}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          </div>

          {callQueue.filter(q => q.status === 'pending').length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-slate-600 mb-2">Waiting in queue:</p>
              <div className="space-y-1">
                {callQueue.filter(q => q.status === 'pending').slice(0, 5).map((item, index) => (
                  <div key={item.id} className="text-sm flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="font-medium">{item.host_name}</span>
                    <span className="text-slate-500">{item.phone_number}</span>
                  </div>
                ))}
                {callQueue.filter(q => q.status === 'pending').length > 5 && (
                  <p className="text-sm text-slate-500 ml-8">...and {callQueue.filter(q => q.status === 'pending').length - 5} more</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="modern-card p-6 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Beds Confirmed</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{bedsConfirmed}</p>
            </div>
            <CheckCircle2 className="w-12 h-12 text-green-600 opacity-50" />
          </div>
        </div>

        <div className="modern-card p-6 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Beds Needed</p>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  value={bedsNeeded}
                  onChange={(e) => updateBedsNeeded(e.target.value)}
                  className="w-20 h-10 text-2xl font-bold text-blue-900 bg-white"
                />
              </div>
            </div>
            <Bed className="w-12 h-12 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="modern-card p-6 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 font-medium">Still Needed</p>
              <p className="text-3xl font-bold text-orange-900 mt-1">{bedsStillNeeded}</p>
            </div>
            <Clock className="w-12 h-12 text-orange-600 opacity-50" />
          </div>
        </div>

        <div className="modern-card p-6 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">Progress</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">{percentComplete}%</p>
            </div>
            <TrendingUp className="w-12 h-12 text-purple-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="modern-card p-6 bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Overall Progress</span>
          <span className="text-sm text-slate-600">{bedsConfirmed} / {bedsNeeded} beds</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
          <div 
            className="h-4 bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(percentComplete, 100)}%` }}
          />
        </div>
      </div>

      {/* Hosts Who Confirmed This Week */}
      <div className="modern-card p-6 bg-white">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Hosts Who Confirmed Beds This Week
        </h3>

        {confirmations.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No hosts have confirmed beds yet this week
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Host Name</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Phone Number</th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-700">Beds Confirmed</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Confirmed</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Method</th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {confirmations.map((confirmation) => (
                  <tr key={confirmation.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">
                      {confirmation.apartments?.person_name || 'Unknown'}
                    </td>
                    <td className="p-3 text-slate-600">
                      <a 
                        href={`tel:${confirmation.apartments?.phone_number}`} 
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {confirmation.apartments?.phone_number || 'N/A'}
                      </a>
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold text-lg">
                        {confirmation.beds_confirmed}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 text-sm">
                      {new Date(confirmation.confirmed_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-600 text-sm">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                        {confirmation.confirmed_via || 'phone_call'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => callHost(
                            confirmation.apartments?.phone_number,
                            confirmation.apartments?.person_name
                          )}
                          className="text-xs"
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => voidConfirmation(
                            confirmation.id,
                            confirmation.apartments?.person_name,
                            confirmation.beds_confirmed
                          )}
                          className="text-xs"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Void
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Summary Row */}
            <div className="mt-4 pt-4 border-t border-slate-200 bg-blue-50 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-slate-600">Total Confirmations</div>
                  <div className="text-2xl font-bold text-blue-600">{confirmations.length}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Total Beds Confirmed</div>
                  <div className="text-2xl font-bold text-green-600">
                    {confirmations.reduce((sum, c) => sum + c.beds_confirmed, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Unique Hosts</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(confirmations.map(c => c.apartment_id)).size}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin Notes */}
      {weeklyTracking?.admin_notes && (
        <div className="modern-card p-6 bg-blue-50 border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Admin Notes</h3>
          <p className="text-blue-800">{weeklyTracking.admin_notes}</p>
        </div>
      )}
    </div>
  );
}
