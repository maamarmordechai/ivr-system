import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const CreateGuestDialog = ({ open, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showMergeAlert, setShowMergeAlert] = useState(false);
  const [existingGuest, setExistingGuest] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    group_size: '',
    guest_type: 'individual',
    week_id: '',
    has_baby: false
  });

  useEffect(() => {
    if (open) {
      fetchWeeks();
    }
  }, [open]);

  const fetchWeeks = async () => {
    // Get next 8 weeks starting from current week
    const { data, error } = await supabase
      .from('weekly_bed_needs')
      .select('*')
      .gte('week_start_date', new Date().toISOString().split('T')[0])
      .order('week_start_date', { ascending: true })
      .limit(8);

    if (data) {
      setWeeks(data);
      // Auto-select current week
      if (data.length > 0 && !formData.week_id) {
        setFormData(prev => ({ ...prev, week_id: data[0].id }));
      }
    }
  };

  const checkPhoneNumber = async (phoneNumber) => {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (data) {
      setExistingGuest(data);
      setShowMergeAlert(true);
      return true;
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const phoneExists = await checkPhoneNumber(formData.phone_number);
      
      if (phoneExists) {
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('guests')
        .insert([{
          name: formData.name,
          phone_number: formData.phone_number,
          group_size: parseInt(formData.group_size),
          guest_type: formData.guest_type,
          is_couple: formData.guest_type === 'family', // Auto-set: family = couple
          has_baby: formData.has_baby,
          week_id: formData.week_id
        }]);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Guest created successfully"
      });

      onSuccess();
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create guest"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = () => {
    toast({
      title: "Merged",
      description: `Using existing guest record for ${existingGuest.name}`
    });
    setShowMergeAlert(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-white p-0 overflow-hidden rounded-2xl gap-0 flex flex-col">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-5 flex-shrink-0">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-3xl">👤</span> Register New Guest
              </DialogTitle>
              <p className="text-blue-50 text-sm mt-1">Add a new guest to the accommodation system</p>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">👤 Personal Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-semibold text-base">Full Name</Label>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field text-base h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-slate-700 font-semibold text-base">Phone Number</Label>
                <input
                  id="phone_number"
                  type="tel"
                  required
                  placeholder="+972 50..."
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  className="input-field text-base h-12"
                />
              </div>
            </div>

            {/* Group Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">👥 Group Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="group_size" className="text-slate-700 font-semibold text-base">Group Size</Label>
                  <input
                    id="group_size"
                    type="number"
                    min="1"
                    required
                    value={formData.group_size}
                    onChange={(e) => setFormData({...formData, group_size: e.target.value})}
                    className="input-field text-base h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guest_type" className="text-slate-700 font-semibold text-base">Type</Label>
                  <select
                    id="guest_type"
                    value={formData.guest_type}
                    onChange={(e) => setFormData({...formData, guest_type: e.target.value})}
                    className="input-field text-base h-12"
                  >
                    <option value="individual">Individual</option>
                    <option value="family">Family (Couple)</option>
                  </select>
                </div>
              </div>

              {/* Baby checkbox only */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="has_baby"
                    checked={formData.has_baby}
                    onChange={(e) => setFormData({...formData, has_baby: e.target.checked})}
                    className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500 border-slate-300"
                  />
                  <Label htmlFor="has_baby" className="text-slate-800 font-semibold cursor-pointer flex-1 text-base">
                    👶 Has baby (requires crib)
                  </Label>
                </div>
              </div>
            </div>

            {/* Stay Dates Section - Week Selector */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">📅 Stay Dates</h3>
              
              <div className="space-y-2">
                <Label htmlFor="week_id" className="text-slate-700 font-semibold text-base">Select Shabbos Week</Label>
                <select
                  id="week_id"
                  required
                  value={formData.week_id}
                  onChange={(e) => setFormData({...formData, week_id: e.target.value})}
                  className="input-field text-base h-12"
                >
                  <option value="">Choose week...</option>
                  {weeks.map(week => (
                    <option key={week.id} value={week.id}>
                      שבת {new Date(week.week_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-slate-600 mt-1">Guest will arrive for this Shabbos</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={onClose} className="border-slate-300 text-slate-700 hover:bg-slate-100 h-12 px-6 text-base">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-12 px-8 text-base font-semibold shadow-lg">
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Register Guest
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showMergeAlert} onOpenChange={setShowMergeAlert}>
        <AlertDialogContent className="bg-white rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Duplicate Phone Number</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              A guest with phone number <strong>{formData.phone_number}</strong> already exists:
              <br /><br />
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="font-medium text-slate-900">{existingGuest?.name}</span>
              </div>
              <br />
              Would you like to merge with this existing guest record instead of creating a new one?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowMergeAlert(false)} className="border-slate-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleMerge} className="bg-blue-600 hover:bg-blue-700">
              Merge Records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CreateGuestDialog;
