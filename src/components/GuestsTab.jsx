
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import GuestsList from '@/components/GuestsList';
import CreateGuestDialog from '@/components/CreateGuestDialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const GuestsTab = () => {
  const { toast } = useToast();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState(null);

  useEffect(() => {
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeekId) {
      fetchGuests();
    }
  }, [selectedWeekId]);

  const fetchWeeks = async () => {
    const { data } = await supabase
      .from('weekly_bed_needs')
      .select('*')
      .gte('week_end_date', new Date().toISOString())
      .order('week_start_date', { ascending: true })
      .limit(8);
    
    if (data && data.length > 0) {
      setWeeks(data);
      setSelectedWeekId(data[0].id); // Select current week by default
    }
  };

  const fetchGuests = async () => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select(`
          *,
          weekly_bed_needs!inner(
            week_start_date,
            week_end_date
          )
        `)
        .eq('week_id', selectedWeekId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuests(data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load guests"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestCreated = () => {
    fetchGuests();
    setShowCreateDialog(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">אורחים - Guests</h2>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Create Guest
        </Button>
      </div>

      {/* Week Selector */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Week</label>
        <select
          className="w-full p-2 border rounded-md"
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

      <GuestsList guests={guests} loading={loading} onGuestUpdated={fetchGuests} />

      {showCreateDialog && (
        <CreateGuestDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleGuestCreated}
        />
      )}
    </div>
  );
};

export default GuestsTab;
