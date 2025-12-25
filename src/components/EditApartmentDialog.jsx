
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const EditApartmentDialog = ({ open, onClose, onSuccess, apartment }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    person_name: '',
    phone_number: '',
    room_name: '',
    address: '',
    apartment_number: '',
    number_of_rooms: '',
    number_of_beds: '',
    has_kitchenette: false,
    is_family_friendly: false,
    couple_friendly: true,
    has_crib: false,
    call_frequency: 'weekly',
    instructions: ''
  });

  useEffect(() => {
    if (apartment) {
      setFormData({
        person_name: apartment.person_name || '',
        phone_number: apartment.phone_number || '',
        room_name: apartment.room_name || 'Room 1',
        address: apartment.address || '',
        apartment_number: apartment.apartment_number || '',
        number_of_rooms: apartment.number_of_rooms?.toString() || '',
        number_of_beds: apartment.number_of_beds?.toString() || '',
        has_kitchenette: apartment.has_kitchenette || false,
        is_family_friendly: apartment.is_family_friendly || false,
        couple_friendly: apartment.couple_friendly !== undefined ? apartment.couple_friendly : true,
        has_crib: apartment.has_crib || false,
        call_frequency: apartment.call_frequency || 'weekly',
        instructions: apartment.instructions || ''
      });
    }
  }, [apartment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('apartments')
        .update({
          person_name: formData.person_name,
          phone_number: formData.phone_number,
          room_name: formData.room_name,
          address: formData.address,
          apartment_number: formData.apartment_number,
          number_of_rooms: parseInt(formData.number_of_rooms),
          number_of_beds: parseInt(formData.number_of_beds),
          has_kitchenette: formData.has_kitchenette,
          is_family_friendly: formData.is_family_friendly,
          couple_friendly: formData.couple_friendly,
          has_crib: formData.has_crib,
          call_frequency: formData.call_frequency,
          instructions: formData.instructions
        })
        .eq('id', apartment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Apartment updated successfully"
      });

      onSuccess();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update apartment"
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
            <DialogTitle className="text-xl font-bold text-slate-900">Edit Apartment</DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="person_name" className="text-slate-700 font-medium">Owner Name</Label>
            <input
              id="person_name"
              type="text"
              required
              placeholder="e.g. Cohen Family"
              value={formData.person_name}
              onChange={(e) => setFormData({...formData, person_name: e.target.value})}
              className="input-field"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number" className="text-slate-700 font-medium">Phone Number</Label>
            <input
              id="phone_number"
              type="tel"
              required
              placeholder="e.g. +1234567890"
              value={formData.phone_number}
              onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
              className="input-field"
            />
            <p className="text-xs text-slate-500 mt-1">Include country code (e.g. +1 for US)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room_name" className="text-slate-700 font-medium">Room/Apartment Name</Label>
            <input
              id="room_name"
              type="text"
              required
              placeholder="e.g., Room 1, Basement, Main House"
              value={formData.room_name}
              onChange={(e) => setFormData({...formData, room_name: e.target.value})}
              className="input-field"
            />
            <p className="text-xs text-slate-500 mt-1">Unique identifier for this room</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-slate-700 font-medium">Address</Label>
            <input
              id="address"
              type="text"
              required
              placeholder="e.g. 123 Main St, New York"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="input-field"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apartment_number" className="text-slate-700 font-medium">Apartment Number (Optional)</Label>
            <input
              id="apartment_number"
              type="text"
              placeholder="e.g. 5B"
              value={formData.apartment_number}
              onChange={(e) => setFormData({...formData, apartment_number: e.target.value})}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="number_of_rooms" className="text-slate-700 font-medium">Rooms</Label>
              <input
                id="number_of_rooms"
                type="number"
                min="1"
                required
                value={formData.number_of_rooms}
                onChange={(e) => setFormData({...formData, number_of_rooms: e.target.value})}
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="number_of_beds" className="text-slate-700 font-medium">Beds</Label>
              <input
                id="number_of_beds"
                type="number"
                min="1"
                required
                value={formData.number_of_beds}
                onChange={(e) => setFormData({...formData, number_of_beds: e.target.value})}
                className="input-field"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="call_frequency" className="text-slate-700 font-medium">📞 Call Frequency</Label>
            <select
              id="call_frequency"
              value={formData.call_frequency}
              onChange={(e) => setFormData({...formData, call_frequency: e.target.value})}
              className="input-field"
            >
              <option value="weekly">🟢 Weekly - Call every week</option>
              <option value="bi-weekly">🔵 Bi-Weekly - Call every 2 weeks</option>
              <option value="desperate-only">🟠 Desperate Only - Only when really needed</option>
              <option value="never">⭕ Never - Do not auto-call</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">How often should we automatically call this apartment?</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2 p-3 bg-pink-50 border border-pink-200 rounded-lg">
              <Checkbox
                id="couple_friendly"
                checked={formData.couple_friendly}
                onCheckedChange={(checked) => setFormData({...formData, couple_friendly: checked})}
                className="border-pink-400 data-[state=checked]:bg-pink-600 data-[state=checked]:border-pink-600"
              />
              <Label htmlFor="couple_friendly" className="text-slate-800 cursor-pointer font-semibold flex-1">
                💑 Can Accommodate Couples (in THIS room)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_kitchenette"
                checked={formData.has_kitchenette}
                onCheckedChange={(checked) => setFormData({...formData, has_kitchenette: checked})}
              />
              <Label htmlFor="has_kitchenette" className="text-slate-700 cursor-pointer">
                Has Kitchenette
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_family_friendly"
                checked={formData.is_family_friendly}
                onCheckedChange={(checked) => setFormData({...formData, is_family_friendly: checked})}
              />
              <Label htmlFor="is_family_friendly" className="text-slate-700 cursor-pointer">
                Family Friendly (Can accept couples)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_crib"
                checked={formData.has_crib}
                onCheckedChange={(checked) => setFormData({...formData, has_crib: checked})}
              />
              <Label htmlFor="has_crib" className="text-slate-700 cursor-pointer">
                Has Crib (For babies)
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions" className="text-slate-700 font-medium">Special Instructions (Optional)</Label>
            <textarea
              id="instructions"
              rows="3"
              placeholder="e.g., Left side entrance, combination lock 1234, parking in back"
              value={formData.instructions}
              onChange={(e) => setFormData({...formData, instructions: e.target.value})}
              className="input-field resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">Instructions for guests (entrance, parking, etc.)</p>
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

export default EditApartmentDialog;
