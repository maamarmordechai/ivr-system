import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Calendar, Users, Loader2 } from 'lucide-react';

const AutomatedCallSystem = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [callQueue, setCallQueue] = useState([]);
  const [pendingGuests, setPendingGuests] = useState({ couples: 0, individuals: 0 });

  useEffect(() => {
    loadCallQueue();
    loadPendingGuests();
  }, []);

  const loadCallQueue = async () => {
    try {
      // Get apartments ordered by call priority (lowest first)
      // Exclude apartments with call_frequency = 'desperate' unless no other options
      const { data: apartments } = await supabase
        .from('apartments')
        .select('*')
        .not('phone_number', 'is', null)
        .order('call_priority', { ascending: true })
        .order('last_called_date', { ascending: true, nullsFirst: true });

      if (apartments) {
        // Filter based on call frequency
        const now = new Date();
        const filtered = apartments.filter(apt => {
          if (!apt.call_frequency || apt.call_frequency === 'weekly') {
            return true; // Always include weekly
          }
          
          if (apt.call_frequency === 'biweekly') {
            if (!apt.last_called_date) return true;
            const daysSinceCall = (now.getTime() - new Date(apt.last_called_date).getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceCall >= 14; // Only if 2+ weeks since last call
          }
          
          // 'desperate' - only include if we have no other options
          return false;
        });

        setCallQueue(filtered);
      }
    } catch (error) {
      console.error('Error loading call queue:', error);
    }
  };

  const loadPendingGuests = async () => {
    try {
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

      const { data: allGuests } = await supabase
        .from('guests')
        .select(`
          id,
          is_couple,
          assignments!left (id)
        `)
        .lte('check_in_date', oneWeekFromNow.toISOString())
        .gte('check_out_date', new Date().toISOString());

      const pending = allGuests?.filter(g => !g.assignments || g.assignments.length === 0) || [];
      const couples = pending.filter(g => g.is_couple === true).length;
      const individuals = pending.filter(g => g.is_couple !== true).length;

      setPendingGuests({ couples, individuals });
    } catch (error) {
      console.error('Error loading pending guests:', error);
    }
  };

  const callApartment = async (apartmentId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('make-call', {
        body: { apartmentId }
      });

      if (error) throw error;

      toast({
        title: "Call Initiated",
        description: "Automated call has been placed successfully"
      });

      // Refresh queue
      loadCallQueue();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Call Failed",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const callAllInQueue = async () => {
    setLoading(true);
    try {
      let callCount = 0;
      
      // Only call if we have pending guests
      if (pendingGuests.couples === 0 && pendingGuests.individuals === 0) {
        toast({
          title: "No Guests Waiting",
          description: "There are no pending guests to assign"
        });
        setLoading(false);
        return;
      }

      // Call each apartment in queue
      for (const apartment of callQueue.slice(0, 10)) { // Limit to 10 calls at once
        try {
          await supabase.functions.invoke('make-call', {
            body: { apartmentId: apartment.id }
          });
          callCount++;
          
          // Wait 2 seconds between calls
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Failed to call ${apartment.person_name}:`, error);
        }
      }

      toast({
        title: "Batch Calling Complete",
        description: `${callCount} calls initiated successfully`
      });

      loadCallQueue();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Batch Call Failed",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCallFrequency = async (apartmentId, frequency) => {
    try {
      await supabase
        .from('apartments')
        .update({ call_frequency: frequency })
        .eq('id', apartmentId);

      toast({
        title: "Updated",
        description: `Call frequency updated to ${frequency}`
      });

      loadCallQueue();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Guests Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Pending Guests</h3>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                <span className="text-2xl font-bold text-slate-900">{pendingGuests.couples}</span>
                <span className="text-sm text-slate-600">Couples</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold text-slate-900">{pendingGuests.individuals}</span>
                <span className="text-sm text-slate-600">Individuals</span>
              </div>
            </div>
          </div>
          <Button
            onClick={callAllInQueue}
            disabled={loading || callQueue.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calling...</>
            ) : (
              <><Phone className="mr-2 h-4 w-4" /> Call All ({callQueue.length})</>
            )}
          </Button>
        </div>
      </div>

      {/* Call Queue */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Call Queue</h3>
        {callQueue.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No apartments in call queue</p>
          </div>
        ) : (
          <div className="space-y-3">
            {callQueue.map((apartment, index) => (
              <div key={apartment.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 rounded-full w-10 h-10 flex items-center justify-center font-bold text-slate-600">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{apartment.person_name}</h4>
                    <div className="flex gap-3 text-sm text-slate-500">
                      <span>{apartment.number_of_beds} beds</span>
                      <span>•</span>
                      <span>{apartment.is_family_friendly ? 'Family Friendly' : 'Individuals'}</span>
                      {apartment.last_called_date && (
                        <>
                          <span>•</span>
                          <span>Last called: {new Date(apartment.last_called_date).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={apartment.call_frequency || 'weekly'}
                    onChange={(e) => updateCallFrequency(apartment.id, e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="desperate">Desperate Only</option>
                  </select>
                  
                  <Button
                    onClick={() => callApartment(apartment.id)}
                    disabled={loading}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomatedCallSystem;
