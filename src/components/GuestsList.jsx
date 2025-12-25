
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Phone, Calendar, MapPin, Clock, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import EditGuestDialog from './EditGuestDialog';

const GuestsList = ({ guests, loading, onGuestUpdated }) => {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleEditClick = (guest) => {
    setSelectedGuest(guest);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (guest) => {
    setGuestToDelete(guest);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!guestToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Guest deleted successfully"
      });

      setDeleteDialogOpen(false);
      setGuestToDelete(null);
      if (onGuestUpdated) {
        onGuestUpdated();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete guest"
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setSelectedGuest(null);
    if (onGuestUpdated) {
      onGuestUpdated();
    }
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (guests.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-slate-100">
        <div className="bg-slate-50 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Users className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No guests registered</h3>
        <p className="text-slate-500 max-w-xs mx-auto mt-1">Register incoming guests to manage their stay.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guests.map((guest, index) => (
          <motion.div
            key={guest.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="modern-card flex flex-col h-full overflow-hidden"
          >
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1 leading-tight">{guest.name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{guest.phone_number}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                    guest.guest_type === 'family' 
                      ? 'bg-purple-50 text-purple-700 border-purple-100' 
                      : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {guest.guest_type === 'family' ? 'Family' : 'Single'}
                  </span>
                  <Button
                    onClick={() => handleEditClick(guest)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg"
                  >
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteClick(guest)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-red-100 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>Group Size</span>
                </div>
                <span className="font-bold text-slate-900">{guest.number_of_people}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg">
                 <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span>Arrival</span>
                </div>
                <span className="font-medium text-slate-900">{new Date(guest.arrival_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {guest.assignments && guest.assignments.length > 0 ? (
            <div className="bg-slate-50 border-t border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stay History</span>
              </div>
              <div className="space-y-2">
                {guest.assignments.slice(0, 2).map((assignment) => (
                  <div key={assignment.id} className="text-xs flex flex-col bg-white p-2 rounded border border-slate-100 shadow-sm">
                    <span className="font-medium text-slate-700 mb-0.5">{assignment.apartments?.person_name || 'Unknown Apartment'}</span>
                    <div className="flex justify-between items-center text-slate-400">
                       <span className="truncate max-w-[120px]">{assignment.apartments?.address}</span>
                       <span>{new Date(assignment.check_in_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
             <div className="bg-slate-50 border-t border-slate-100 p-4 text-center">
                 <span className="text-xs text-slate-400 italic">No assignment history</span>
             </div>
          )}
        </motion.div>
      ))}
    </div>

    <EditGuestDialog
      open={editDialogOpen}
      onClose={() => {
        setEditDialogOpen(false);
        setSelectedGuest(null);
      }}
      onSuccess={handleEditSuccess}
      guest={selectedGuest}
    />

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Guest</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{guestToDelete?.name}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirm}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default GuestsList;
