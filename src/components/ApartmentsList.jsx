
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Bed, Users, UtensilsCrossed, Calendar, Phone, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import EditApartmentDialog from './EditApartmentDialog';

const ApartmentsList = ({ apartments, loading, onApartmentUpdated }) => {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [apartmentToDelete, setApartmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleEditClick = (apartment) => {
    setSelectedApartment(apartment);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (apartment) => {
    setApartmentToDelete(apartment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!apartmentToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('apartments')
        .delete()
        .eq('id', apartmentToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Apartment deleted successfully"
      });

      setDeleteDialogOpen(false);
      setApartmentToDelete(null);
      if (onApartmentUpdated) {
        onApartmentUpdated();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete apartment"
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setSelectedApartment(null);
    if (onApartmentUpdated) {
      onApartmentUpdated();
    }
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (apartments.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-slate-100">
        <div className="bg-slate-50 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Building2 className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No apartments yet</h3>
        <p className="text-slate-500 max-w-xs mx-auto mt-1">Add your first apartment to start managing your accommodations.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apartments.map((apartment, index) => (
          <motion.div
            key={apartment.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="modern-card flex flex-col h-full overflow-hidden"
          >
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 mb-1 leading-tight">{apartment.person_name}</h3>
                  {apartment.room_name && apartment.room_name !== 'Main Room' && (
                    <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mb-1">
                      🏠 {apartment.room_name}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[180px]">{apartment.address}</span>
                  </div>
                  {apartment.phone_number && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[180px]">{apartment.phone_number}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {apartment.is_family_friendly ? (
                    <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-lg border border-purple-100">
                      Family
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100">
                      Single
                    </span>
                  )}
                  <Button
                    onClick={() => handleEditClick(apartment)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg"
                  >
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteClick(apartment)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-red-100 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                <Building2 className="w-4 h-4 text-blue-500" />
                <span><span className="font-semibold text-slate-900">{apartment.number_of_rooms}</span> Rooms</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                <Bed className="w-4 h-4 text-emerald-500" />
                <span><span className="font-semibold text-slate-900">{apartment.number_of_beds}</span> Beds</span>
              </div>
              {apartment.has_kitchenette && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-orange-50 p-2 rounded-lg col-span-2">
                  <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                  <span>Kitchenette Available</span>
                </div>
              )}
            </div>

            {/* Guest Statistics */}
            {(apartment.total_guests_hosted > 0 || apartment.total_couples_hosted > 0 || apartment.total_individuals_hosted > 0) && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-xs font-semibold text-green-700 mb-2">HOSTED TOTAL</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-green-800">{apartment.total_guests_hosted || 0}</div>
                    <div className="text-[10px] text-green-600">Guests</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-800">{apartment.total_couples_hosted || 0}</div>
                    <div className="text-[10px] text-purple-600">Couples</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-800">{apartment.total_individuals_hosted || 0}</div>
                    <div className="text-[10px] text-blue-600">Singles</div>
                  </div>
                </div>
              </div>
            )}

            {/* Call Frequency Badge */}
            <div className="mb-3 flex flex-wrap gap-2">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                apartment.call_frequency === 'weekly' ? 'bg-green-100 text-green-800 border border-green-300' :
                apartment.call_frequency === 'bi-weekly' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                apartment.call_frequency === 'desperate-only' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                'bg-slate-100 text-slate-600 border border-slate-300'
              }`}>
                <Phone className="w-3 h-3" />
                {apartment.call_frequency === 'weekly' ? 'Weekly Calls' :
                 apartment.call_frequency === 'bi-weekly' ? 'Bi-Weekly Calls' :
                 apartment.call_frequency === 'desperate-only' ? 'Desperate Only' :
                 'No Auto Calls'}
              </div>
              
              {/* Couple Friendly Badge */}
              {apartment.couple_friendly ? (
                <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-800 border border-pink-300">
                  💑 Couples OK
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                  👤 Singles Only
                </div>
              )}
            </div>
            </div>

          {/* Host Statistics */}
          <div className="bg-slate-50 border-t border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Host Statistics</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-2 rounded border border-slate-100">
                <div className="text-xs text-slate-500">Times Helped</div>
                <div className="text-lg font-bold text-blue-600">{apartment.times_helped || 0}</div>
              </div>
              <div className="bg-white p-2 rounded border border-slate-100">
                <div className="text-xs text-slate-500">Last Helped</div>
                <div className="text-xs font-semibold text-slate-700">
                  {apartment.last_helped_date 
                    ? new Date(apartment.last_helped_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : 'Never'}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>

    <EditApartmentDialog
      open={editDialogOpen}
      onClose={() => {
        setEditDialogOpen(false);
        setSelectedApartment(null);
      }}
      onSuccess={handleEditSuccess}
      apartment={selectedApartment}
    />

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Apartment</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{apartmentToDelete?.person_name}</strong>'s apartment? This action cannot be undone and will also delete all associated assignments.
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

export default ApartmentsList;
