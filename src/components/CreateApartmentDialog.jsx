
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const CreateApartmentDialog = ({ open, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPhoneAlert, setShowPhoneAlert] = useState(false);
  const [existingApartments, setExistingApartments] = useState([]);
  const [formData, setFormData] = useState({
    person_name: '',
    phone_number: '',
    room_name: 'Room 1',
    address: '',
    number_of_rooms: '',
    number_of_beds: '',
    has_kitchenette: false,
    is_family_friendly: false,
    couple_friendly: true,
    has_crib: false,
    call_frequency: 'weekly',
    instructions: ''
  });

  const checkPhoneNumber = async (phoneNumber) => {
    if (!phoneNumber) return;
    
    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .eq('phone_number', phoneNumber);

    if (data && data.length > 0) {
      setExistingApartments(data);
      setShowPhoneAlert(true);
      return true;
    }
    return false;
  };

  const handlePhoneBlur = () => {
    if (formData.phone_number) {
      checkPhoneNumber(formData.phone_number);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('apartments')
        .insert([{
          person_name: formData.person_name,
          phone_number: formData.phone_number,
          room_name: formData.room_name || `Room ${existingApartments.length + 1}`,
          address: formData.address,
          number_of_rooms: parseInt(formData.number_of_rooms),
          number_of_beds: parseInt(formData.number_of_beds),
          has_kitchenette: formData.has_kitchenette,
          is_family_friendly: formData.is_family_friendly,
          couple_friendly: formData.couple_friendly,
          has_crib: formData.has_crib,
          call_frequency: formData.call_frequency,
          instructions: formData.instructions
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: existingApartments.length > 0 
          ? `Additional apartment added for ${formData.person_name}` 
          : "Apartment created successfully"
      });

      setShowPhoneAlert(false);
      onSuccess();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create apartment"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-white p-0 overflow-hidden rounded-2xl gap-0 flex flex-col">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {existingApartments.length > 0 ? `Add Room #${existingApartments.length + 1}` : 'Add New Apartment/Room'}
            </DialogTitle>
            {existingApartments.length > 0 && (
              <p className="text-sm text-slate-600 mt-1">Adding another room for {formData.person_name}</p>
            )}
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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
              onBlur={handlePhoneBlur}
              className="input-field"
            />
            <p className="text-xs text-slate-500 mt-1">Include country code (e.g. +1 for US)</p>
          </div>

          {existingApartments.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                📋 This owner already has {existingApartments.length} room(s):
              </p>
              <ul className="text-xs text-blue-800 space-y-1 mb-2">
                {existingApartments.map((apt, idx) => (
                  <li key={apt.id}>• {apt.room_name || `Room ${idx + 1}`}: {apt.address}</li>
                ))}
              </ul>
              <p className="text-xs text-blue-700 font-medium">
                💡 One call will ask about ALL rooms
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="room_name" className="text-slate-700 font-medium">Room/Apartment Name</Label>
            <input
              id="room_name"
              type="text"
              required
              placeholder={existingApartments.length > 0 ? `Room ${existingApartments.length + 1}` : "e.g., Room 1, Basement, Main House"}
              value={formData.room_name}
              onChange={(e) => setFormData({...formData, room_name: e.target.value})}
              className="input-field"
            />
            <p className="text-xs text-slate-500 mt-1">Unique name for this specific room/apartment</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-slate-700 font-medium">Address</Label>
            <input
              id="address"
              type="text"
              required
              placeholder="Street address, City"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="input-field"
            />
            <p className="text-xs text-slate-500 mt-1">Can be different for each room</p>
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

          <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-100">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="couple_friendly"
                checked={formData.couple_friendly}
                onCheckedChange={(checked) => setFormData({...formData, couple_friendly: checked})}
                className="border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label htmlFor="couple_friendly" className="cursor-pointer text-slate-700 font-semibold">
                💑 Can Accommodate Couples (in THIS room)
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="has_kitchenette"
                checked={formData.has_kitchenette}
                onCheckedChange={(checked) => setFormData({...formData, has_kitchenette: checked})}
                className="border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label htmlFor="has_kitchenette" className="cursor-pointer text-slate-700">Has Kitchenette</Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="is_family_friendly"
                checked={formData.is_family_friendly}
                onCheckedChange={(checked) => setFormData({...formData, is_family_friendly: checked})}
                className="border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label htmlFor="is_family_friendly" className="cursor-pointer text-slate-700">Family Friendly</Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="has_crib"
                checked={formData.has_crib}
                onCheckedChange={(checked) => setFormData({...formData, has_crib: checked})}
                className="border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label htmlFor="has_crib" className="cursor-pointer text-slate-700">Has Crib Available</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="call_frequency" className="text-slate-700 font-medium">Automated Call Frequency</Label>
            <select
              id="call_frequency"
              value={formData.call_frequency}
              onChange={(e) => setFormData({...formData, call_frequency: e.target.value})}
              className="input-field"
            >
              <option value="weekly">Weekly - Call every week</option>
              <option value="biweekly">Biweekly - Call every 2 weeks</option>
              <option value="desperate">Desperate - Only when no other options</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">How often should we call to check availability?</p>
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

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 text-slate-700 hover:bg-slate-50">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Apartment
            </Button>
          </div>
        </form>
      </DialogContent>

      <AlertDialog open={showPhoneAlert} onOpenChange={setShowPhoneAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🏠 Adding Another Room for This Owner</AlertDialogTitle>
            <AlertDialogDescription>
              This phone number already has {existingApartments.length} room(s):
              <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {existingApartments.map((apt, idx) => (
                  <li key={apt.id} className="text-sm bg-slate-50 p-2 rounded">
                    <strong>{apt.room_name || `Room ${idx + 1}`}</strong> - {apt.address}
                    <br />
                    <span className="text-xs text-slate-600">{apt.number_of_beds} beds • {apt.couple_friendly ? '💑 Couples OK' : '👤 Individuals only'}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900">💡 How it works:</p>
                <ul className="text-xs text-blue-800 mt-1 space-y-1">
                  <li>• The system makes <strong>ONE call</strong> to this phone number</li>
                  <li>• It asks about availability for <strong>ALL rooms</strong></li>
                  <li>• Each room can have different address & couple settings</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setFormData({...formData, phone_number: '', room_name: 'Room 1'});
              setExistingApartments([]);
            }}>
              Cancel - Change Phone Number
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => setShowPhoneAlert(false)} className="bg-blue-600 hover:bg-blue-700">
              ✅ Yes - Add Room #{existingApartments.length + 1}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default CreateApartmentDialog;
