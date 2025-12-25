
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, PhoneCall, PhoneOff, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import HebrewDatePicker from './HebrewDatePicker';

const CallSystemDialog = ({ open, onClose }) => {
  const { toast } = useToast();
  const [apartments, setApartments] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [callQueue, setCallQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestFormData, setGuestFormData] = useState({
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
    if (open) {
      fetchAndSortApartments();
    }
  }, [open]);

  const fetchAndSortApartments = async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: apartments, error } = await supabase
        .from('apartments')
        .select(`
          *,
          assignments (
            check_in_date,
            check_out_date
          )
        `);

      if (error) throw error;

      // Sort apartments: those with recent assignments first
      const sorted = apartments.sort((a, b) => {
        const aHasRecent = a.assignments?.some(
          assign => new Date(assign.check_in_date) > oneWeekAgo
        ) || false;
        const bHasRecent = b.assignments?.some(
          assign => new Date(assign.check_in_date) > oneWeekAgo
        ) || false;

        if (aHasRecent && !bHasRecent) return -1;
        if (!aHasRecent && bHasRecent) return 1;
        return 0;
      });

      setCallQueue(sorted);
      setApartments(sorted);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load call queue"
      });
    } finally {
      setLoading(false);
    }
  };

  const makeCall = async (apartment) => {
    setCalling(true);
    
    try {
      const guestType = apartment.is_family_friendly ? 'families' : 'individuals';
      const message = `Hi ${apartment.person_name}, this is a call from Accommodation Management. Based on our records you have ${apartment.number_of_beds} beds for ${guestType}. Is your apartment available this week? Press 1 to confirm availability, or press 2 if not available.`;

      const { data, error } = await supabase.functions.invoke('make-call', {
        body: {
          apartmentId: apartment.id,
          to: apartment.phone_number,
          guestName: apartment.person_name,
          apartmentNumber: apartment.address,
          message: message
        }
      });

      if (error) throw error;

      toast({
        title: "Call Initiated",
        description: `Calling ${apartment.person_name}...`
      });

      // Log the call attempt
      await supabase
        .from('call_history')
        .insert([{
          apartment_id: apartment.id,
          response: 0, // 0 = call initiated
          call_sid: data.callSid,
          call_status: data.status
        }]);

    } catch (error) {
      console.error('Call error:', error);
      toast({
        variant: "destructive",
        title: "Call Failed",
        description: error.message || "Failed to initiate call. Check console for details."
      });
    } finally {
      setCalling(false);
    }
  };

  const handleResponse = async (response, bedsAvailable = null) => {
    const currentApartment = apartments[currentIndex];

    // If they said "Yes, Available", show guest form
    if (response === 1) {
      setShowGuestForm(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('call_history')
        .insert([{
          apartment_id: currentApartment.id,
          response: response,
          beds_available: bedsAvailable
        }]);

      if (error) throw error;

      let message = '';
      switch (response) {
        case 2:
          message = 'Apartment marked as unavailable';
          break;
        case 3:
          message = 'Scheduled for callback on Friday';
          break;
        case 4:
          message = `Partial availability: ${bedsAvailable} beds`;
          break;
        default:
          message = 'Response recorded';
      }

      toast({
        title: "Response Recorded",
        description: message
      });

      if (currentIndex < apartments.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast({
          title: "Call Queue Complete",
          description: "All apartments have been contacted"
        });
        onClose();
      }
    } catch (error) {
      console.error('Response error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to record response"
      });
    }
  };

  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    const currentApartment = apartments[currentIndex];

    try {
      // Create the guest
      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .insert([{
          name: guestFormData.name,
          phone_number: guestFormData.phone_number,
          number_of_people: parseInt(guestFormData.number_of_people),
          guest_type: guestFormData.guest_type,
          check_in_date: guestFormData.check_in_date,
          check_out_date: guestFormData.check_out_date,
          is_couple: guestFormData.is_couple,
          has_baby: guestFormData.has_baby
        }])
        .select()
        .single();

      if (guestError) {
        console.error('Guest creation error:', guestError);
        throw guestError;
      }

      // Create the assignment
      const { error: assignmentError } = await supabase
        .from('assignments')
        .insert([{
          guest_id: guestData.id,
          apartment_id: currentApartment.id,
          check_in_date: guestFormData.check_in_date,
          check_out_date: guestFormData.check_out_date
        }]);

      if (assignmentError) {
        console.error('Assignment error:', assignmentError);
        throw assignmentError;
      }

      // Record the call response
      await supabase
        .from('call_history')
        .insert([{
          apartment_id: currentApartment.id,
          response: 1,
          beds_available: parseInt(guestFormData.number_of_people)
        }]);

      toast({
        title: "Success!",
        description: `Guest ${guestFormData.name} assigned to ${currentApartment.address}`
      });

      // Reset form and move to next
      setGuestFormData({
        name: '',
        phone_number: '',
        number_of_people: '',
        guest_type: 'individual',
        check_in_date: new Date().toISOString().split('T')[0],
        check_out_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_couple: false,
        has_baby: false
      });
      setShowGuestForm(false);

      if (currentIndex < apartments.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast({
          title: "Call Queue Complete",
          description: "All apartments have been contacted"
        });
        onClose();
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create guest and assignment"
      });
    }
  };

  const handlePartialAvailability = () => {
    const beds = prompt('How many beds are available?');
    if (beds && !isNaN(beds)) {
      handleResponse(4, parseInt(beds));
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (apartments.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Call System</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <Phone className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600">No apartments available to call</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentApartment = apartments[currentIndex];
  const guestType = currentApartment.is_family_friendly ? 'families' : 'individuals';

  // If showing guest form
  if (showGuestForm) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Guest to {currentApartment.address}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleGuestSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guest_name">Guest Name *</Label>
              <Input
                id="guest_name"
                required
                value={guestFormData.name}
                onChange={(e) => setGuestFormData({...guestFormData, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest_phone">Phone Number *</Label>
              <Input
                id="guest_phone"
                type="tel"
                required
                placeholder="+972 50..."
                value={guestFormData.phone_number}
                onChange={(e) => setGuestFormData({...guestFormData, phone_number: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="group_size">Group Size *</Label>
                <Input
                  id="group_size"
                  type="number"
                  min="1"
                  required
                  value={guestFormData.number_of_people}
                  onChange={(e) => setGuestFormData({...guestFormData, number_of_people: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={guestFormData.guest_type}
                  onChange={(e) => setGuestFormData({...guestFormData, guest_type: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="individual">Individual</option>
                  <option value="family">Family</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <HebrewDatePicker
                label="Check-In (Shabbat)"
                value={guestFormData.check_in_date}
                onChange={(date) => setGuestFormData({...guestFormData, check_in_date: date})}
              />
              
              <HebrewDatePicker
                label="Check-Out"
                value={guestFormData.check_out_date}
                onChange={(date) => setGuestFormData({...guestFormData, check_out_date: date})}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_couple_call"
                checked={guestFormData.is_couple}
                onChange={(e) => setGuestFormData({...guestFormData, is_couple: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <Label htmlFor="is_couple_call" className="cursor-pointer">
                Is this a couple? (זוג)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="has_baby_call"
                checked={guestFormData.has_baby}
                onChange={(e) => setGuestFormData({...guestFormData, has_baby: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <Label htmlFor="has_baby_call" className="cursor-pointer">
                Has baby (requires crib)
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowGuestForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Assign Guest
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Call System</span>
            <span className="text-sm font-normal text-slate-600">
              {currentIndex + 1} / {apartments.length}
            </span>
          </DialogTitle>
        </DialogHeader>

        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <PhoneCall className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-slate-800">{currentApartment.person_name}</h3>
            </div>
            
            <div className="space-y-2 text-sm text-slate-700">
              <p><strong>Address:</strong> {currentApartment.address}</p>
              <p><strong>Beds:</strong> {currentApartment.number_of_beds}</p>
              <p><strong>Type:</strong> {guestType}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Call Script:</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              "Hi {currentApartment.person_name}, this is a call from Accommodation Management. 
              Based on our records you have {currentApartment.number_of_beds} beds. 
              You have space for {guestType}. Is your apartment available this week?"
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => makeCall(currentApartment)}
              disabled={calling || !currentApartment.phone_number}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
            >
              {calling ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Calling...
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5 mr-2" />
                  Make Call
                </>
              )}
            </Button>
          </div>

          {!currentApartment.phone_number && (
            <p className="text-sm text-red-600 text-center">
              No phone number on file for this apartment
            </p>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Record Response:</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleResponse(1)}
                className="bg-green-600 hover:bg-green-700"
              >
                1 - Yes, Available
              </Button>
              <Button
                onClick={() => handleResponse(2)}
                className="bg-red-600 hover:bg-red-700"
              >
                2 - Not Available
              </Button>
              <Button
                onClick={() => handleResponse(3)}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                3 - Call Back Friday
              </Button>
              <Button
                onClick={handlePartialAvailability}
                className="bg-orange-600 hover:bg-orange-700"
              >
                4 - Partially Available
              </Button>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onClose}>
              <PhoneOff className="w-4 h-4 mr-2" />
              End Call Session
            </Button>
            <Button
              variant="outline"
              onClick={() => currentIndex < apartments.length - 1 && setCurrentIndex(currentIndex + 1)}
              disabled={currentIndex >= apartments.length - 1}
            >
              Skip
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default CallSystemDialog;
