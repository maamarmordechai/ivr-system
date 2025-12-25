
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import ApartmentsList from '@/components/ApartmentsList';
import CreateApartmentDialog from '@/components/CreateApartmentDialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const ApartmentsTab = () => {
  const { toast } = useToast();
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('all');

  useEffect(() => {
    fetchApartments();
  }, []);

  const fetchApartments = async () => {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .order('person_name', { ascending: true });

      if (error) throw error;
      setApartments(data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load apartments"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApartmentCreated = () => {
    fetchApartments();
    setShowCreateDialog(false);
  };

  const filterApartments = (type) => {
    if (type === 'all') return apartments;
    if (type === 'families') return apartments.filter(apt => apt.is_family_friendly);
    if (type === 'individuals') return apartments.filter(apt => !apt.is_family_friendly);
    return apartments;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">אכסניות - Apartments</h2>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Create Apartment
        </Button>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm">
          <TabsTrigger value="all" className="data-[state=active]:bg-blue-50">
            הכל (All)
          </TabsTrigger>
          <TabsTrigger value="families" className="data-[state=active]:bg-blue-50">
            משפחות (Families)
          </TabsTrigger>
          <TabsTrigger value="individuals" className="data-[state=active]:bg-blue-50">
            בחורים (Individuals)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ApartmentsList apartments={filterApartments('all')} loading={loading} onApartmentUpdated={fetchApartments} />
        </TabsContent>

        <TabsContent value="families" className="mt-4">
          <ApartmentsList apartments={filterApartments('families')} loading={loading} onApartmentUpdated={fetchApartments} />
        </TabsContent>

        <TabsContent value="individuals" className="mt-4">
          <ApartmentsList apartments={filterApartments('individuals')} loading={loading} onApartmentUpdated={fetchApartments} />
        </TabsContent>
      </Tabs>

      {showCreateDialog && (
        <CreateApartmentDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleApartmentCreated}
        />
      )}
    </div>
  );
};

export default ApartmentsTab;
