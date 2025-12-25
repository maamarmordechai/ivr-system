
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import HebrewDatePicker from './HebrewDatePicker';

const EditGuestDialog = ({ open, onClose, onSuccess, guest }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    number_of_people: '',
    guest_type: 'individual',
    check_in_date: new Date().toISOString().split('T')[0],
    check_out_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_couple: false,
    has_baby: false
  });

  useEffect(() => {
    if (guest) {
      setFormData({
        name: guest.name || '',
        phone_number: guest.phone_number || '',
        number_of_people: guest.number_of_people?.toString() || '',
        guest_type: guest.guest_type || 'individual',
        check_in_date: guest.check_in_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        check_out_date: guest.check_out_date?.split('T')[0] || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_couple: guest.is_couple || false,
        has_baby: guest.has_baby || false
      });
    }
  }, [guest]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('guests')
        .update({
          name: formData.name,
          phone_number: formData.phone_number,
          number_of_people: parseInt(formData.number_of_people),
          guest_type: formData.guest_type,
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date,
          is_couple: formData.is_couple,
          has_baby: formData.has_baby
        })
        .eq('id', guest.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Guest updated successfully"
      });

      onSuccess();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update guest"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white p-0 overflow-hidden rounded-2xl gap-0">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Edit Guest</DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-700 font-medium">Full Name</Label>
            <input
              id="name"
              type="text"
              required
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="input-field"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number" className="text-slate-700 font-medium">Phone Number</Label>
            <input
              id="phone_number"
              type="tel"
              required
              placeholder="+972 50..."
              value={formData.phone_number}
              onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="number_of_people" className="text-slate-700 font-medium">Group Size</Label>
              <input
                id="number_of_people"
                type="number"
                min="1"
                required
                value={formData.number_of_people}
                onChange={(e) => setFormData({...formData, number_of_people: e.target.value})}
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest_type" className="text-slate-700 font-medium">Type</Label>
              <select
                id="guest_type"
                value={formData.guest_type}
                onChange={(e) => setFormData({...formData, guest_type: e.target.value})}
                className="input-field"
              >
                <option value="individual">Individual</option>
                <option value="family">Family</option>
              </select>
            </div>
          </div>

          {/* Hebrew Date Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <HebrewDatePicker
              label="Check-In Date (תאריך כניסה)"
              value={formData.check_in_date}
              onChange={(date) => setFormData({...formData, check_in_date: date})}
            />
            
            <HebrewDatePicker
              label="Check-Out Date (תאריך יציאה)"
              value={formData.check_out_date}
              onChange={(date) => setFormData({...formData, check_out_date: date})}
            />
          </div>

          {/* Couple checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_couple"
              checked={formData.is_couple}
              onChange={(e) => setFormData({...formData, is_couple: e.target.checked})}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <Label htmlFor="is_couple" className="text-slate-700 font-medium cursor-pointer">
              Is this a couple? (זוג)
            </Label>
          </div>

          {/* Baby checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="has_baby"
              checked={formData.has_baby}
              onChange={(e) => setFormData({...formData, has_baby: e.target.checked})}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <Label htmlFor="has_baby" className="text-slate-700 font-medium cursor-pointer">
              Has baby? (תינוק)
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="px-6 border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditGuestDialog;
