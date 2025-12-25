
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, Calendar, Phone, BedDouble, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import CallSystemDialog from '@/components/CallSystemDialog';

const Dashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalApartments: 0,
    totalHosts: 0,
    bedsConfirmed: 0,
    totalBeds: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCallSystem, setShowCallSystem] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get apartments
      const { data: apartments, error: aptError } = await supabase
        .from('apartments')
        .select('number_of_beds');

      if (aptError) throw aptError;

      const totalBeds = apartments?.reduce((sum, apt) => sum + apt.number_of_beds, 0) || 0;

      // Get current week
      const today = new Date().toISOString().split('T')[0];
      const { data: currentWeek } = await supabase
        .from('desperate_weeks')
        .select('id')
        .gte('week_end_date', today)
        .order('week_start_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      let bedsConfirmed = 0;
      if (currentWeek) {
        const { data: confirmations } = await supabase
          .from('bed_confirmations')
          .select('beds_confirmed')
          .eq('week_id', currentWeek.id)
          .eq('voided', false);

        bedsConfirmed = confirmations?.reduce((sum, c) => sum + (c.beds_confirmed || 0), 0) || 0;
      }

      // Get meal hosts
      const { data: mealHosts } = await supabase
        .from('meal_hosts')
        .select('id');

      setStats({
        totalApartments: apartments?.length || 0,
        totalHosts: (apartments?.length || 0) + (mealHosts?.length || 0),
        bedsConfirmed: bedsConfirmed,
        totalBeds
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard statistics"
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      icon: Building2,
      label: 'Bed Hosts',
      value: stats.totalApartments,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100'
    },
    {
      icon: Users,
      label: 'Total Hosts',
      value: stats.totalHosts,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100'
    },
    {
      icon: Calendar,
      label: 'Beds Confirmed',
      value: stats.bedsConfirmed,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100'
    },
    {
      icon: BedDouble,
      label: 'Total Capacity',
      value: stats.totalBeds,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-100'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Overview</h2>
          <p className="text-slate-500 mt-1">Welcome back to your dashboard</p>
        </div>
        <Button 
          onClick={() => setShowCallSystem(true)}
          className="shadow-lg shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 rounded-xl px-6 h-11 transition-all hover:scale-105"
        >
          <Phone className="w-4 h-4 mr-2" />
          Start Call System
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`flex items-center text-xs font-medium ${card.color} bg-opacity-10 px-2 py-1 rounded-full`}>
                  +2.5% <ArrowUpRight className="w-3 h-3 ml-1" />
                </span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">{card.label}</p>
                <h3 className="text-3xl font-bold text-slate-900">
                  {loading ? '...' : card.value}
                </h3>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Quick Actions or Recent Activity could go here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-slate-700">Database Connection</span>
              </div>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Operational</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-slate-700">Call System Service</span>
              </div>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Ready</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl shadow-lg text-white">
            <h3 className="text-lg font-bold mb-2">Pro Tip</h3>
            <p className="text-indigo-100 mb-4">
              Use the automated call system on Thursdays to maximize weekend occupancy rates.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setShowCallSystem(true)} className="bg-white text-blue-700 hover:bg-blue-50">
              Launch Now
            </Button>
        </div>
      </div>

      {showCallSystem && (
        <CallSystemDialog 
          open={showCallSystem} 
          onClose={() => setShowCallSystem(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;
