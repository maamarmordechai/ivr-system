import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Phone, PhoneIncoming, Users, Bed, Heart, CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const IncomingCallsTab = () => {
  const { toast } = useToast();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCalls: 0,
    guestRegistrations: 0,
    hostRegistrations: 0,
    availabilityChecks: 0,
    guestsAssigned: 0
  });

  useEffect(() => {
    fetchIncomingCalls();
    const subscription = subscribeToIncomingCalls();
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchIncomingCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('incoming_calls')
        .select(`
          *,
          apartments (
            person_name,
            address
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setCalls(data || []);
      calculateStats(data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load incoming calls"
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToIncomingCalls = () => {
    return supabase
      .channel('incoming_calls_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'incoming_calls' },
        (payload) => {
          fetchIncomingCalls();
        }
      )
      .subscribe();
  };

  const calculateStats = (callsData) => {
    const stats = {
      totalCalls: callsData.length,
      guestRegistrations: callsData.filter(c => c.menu_selection === 'guest_registration').length,
      hostRegistrations: callsData.filter(c => c.menu_selection === 'host_registration').length,
      availabilityChecks: callsData.filter(c => c.menu_selection === 'check_availability').length,
      guestsAssigned: callsData.reduce((sum, c) => sum + (c.guests_assigned || 0), 0)
    };
    setStats(stats);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'started': { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Started' },
      'awaiting_beds_input': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Awaiting Input' },
      'completed_assigned': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Assigned' },
      'completed_no_match': { color: 'bg-orange-100 text-orange-800', icon: XCircle, label: 'No Match' },
      'completed_no_pending': { color: 'bg-gray-100 text-gray-800', icon: CheckCircle, label: 'No Pending' },
      'completed': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Completed' }
    };

    const config = statusConfig[status] || statusConfig['completed'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getMenuLabel = (selection) => {
    const labels = {
      'guest_registration': 'Guest Registration',
      'host_registration': 'Host Registration',
      'check_availability': 'Check Availability'
    };
    return labels[selection] || selection;
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    // Format +12345678900 to +1 (234) 567-8900
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Calls</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalCalls}</p>
            </div>
            <PhoneIncoming className="w-8 h-8 text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Guest Reg.</p>
              <p className="text-2xl font-bold text-green-900">{stats.guestRegistrations}</p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Host Reg.</p>
              <p className="text-2xl font-bold text-purple-900">{stats.hostRegistrations}</p>
            </div>
            <Phone className="w-8 h-8 text-purple-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Availability</p>
              <p className="text-2xl font-bold text-orange-900">{stats.availabilityChecks}</p>
            </div>
            <Bed className="w-8 h-8 text-orange-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-pink-600">Assigned</p>
              <p className="text-2xl font-bold text-pink-900">{stats.guestsAssigned}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-pink-500" />
          </div>
        </motion.div>
      </div>

      {/* Calls List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Recent Incoming Calls</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Host
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Menu Selection
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Beds
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Couples
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Assigned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {calls.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                    <PhoneIncoming className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p>No incoming calls yet</p>
                    <p className="text-sm mt-1">Calls will appear here when hosts call in</p>
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {new Date(call.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatPhoneNumber(call.phone_number)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {call.apartments?.person_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {call.menu_selection ? getMenuLabel(call.menu_selection) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {call.beds_offered || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {call.accepts_couples === null ? '-' : (
                        call.accepts_couples ? (
                          <span className="text-green-600 flex items-center">
                            <Heart className="w-4 h-4 mr-1" />
                            Yes
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center">
                            <XCircle className="w-4 h-4 mr-1" />
                            No
                          </span>
                        )
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {call.guests_assigned > 0 ? (
                        <span className="font-medium text-green-600">{call.guests_assigned}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(call.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallsTab;
