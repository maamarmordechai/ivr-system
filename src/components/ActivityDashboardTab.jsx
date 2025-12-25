import { useState, useEffect } from 'react';
import { supabase } from '../lib/customSupabaseClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from './ui/use-toast';
import { 
  Activity, Users, Phone, Bed, UtensilsCrossed, UserPlus, 
  CheckCircle, XCircle, Clock, RefreshCw, Calendar, Search,
  TrendingUp, AlertCircle, PhoneIncoming, PhoneOutgoing,
  Filter, Download, Eye
} from 'lucide-react';

const ACTIVITY_TYPES = [
  { key: 'all', name: 'All Activity', icon: Activity, color: 'bg-slate-500' },
  { key: 'host_signup', name: 'New Hosts', icon: UserPlus, color: 'bg-green-500' },
  { key: 'guest_accepted', name: 'Guests Accepted', icon: CheckCircle, color: 'bg-blue-500' },
  { key: 'bed_response', name: 'Bed Responses', icon: Bed, color: 'bg-purple-500' },
  { key: 'meal_response', name: 'Meal Responses', icon: UtensilsCrossed, color: 'bg-orange-500' },
  { key: 'call_received', name: 'Calls Received', icon: PhoneIncoming, color: 'bg-cyan-500' },
];

export default function ActivityDashboardTab() {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('week'); // 'today', 'week', 'month', 'all'
  const { toast } = useToast();

  useEffect(() => {
    fetchAllActivity();
  }, [dateRange]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      default:
        return null;
    }
  };

  const fetchAllActivity = async () => {
    setLoading(true);
    const allActivities = [];
    const dateFilter = getDateFilter();

    try {
      // Fetch new host signups (from apartments table)
      let hostsQuery = supabase
        .from('apartments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (dateFilter) {
        hostsQuery = hostsQuery.gte('created_at', dateFilter);
      }
      
      const { data: hosts } = await hostsQuery;
      
      if (hosts) {
        hosts.forEach(host => {
          allActivities.push({
            id: `host-${host.id}`,
            type: 'host_signup',
            title: `New Host: ${host.name || 'Unknown'}`,
            description: `Phone: ${host.phone_number || 'N/A'} • Beds: ${host.beds_available || 0}`,
            phone: host.phone_number,
            timestamp: host.created_at,
            metadata: host
          });
        });
      }

      // Fetch bed responses (weekly_bed_responses)
      let bedsQuery = supabase
        .from('weekly_bed_responses')
        .select(`
          *,
          weekly_bed_needs (week_start_date, week_end_date)
        `)
        .order('created_at', { ascending: false });
      
      if (dateFilter) {
        bedsQuery = bedsQuery.gte('created_at', dateFilter);
      }
      
      const { data: bedResponses } = await bedsQuery;
      
      if (bedResponses) {
        bedResponses.forEach(resp => {
          const responseText = resp.response === 'available' 
            ? `Available (${resp.beds_offered || 0} beds)` 
            : resp.response === 'not_available' 
              ? 'Not Available' 
              : 'Call Friday';
          
          allActivities.push({
            id: `bed-${resp.id}`,
            type: 'bed_response',
            title: `Bed Response: ${responseText}`,
            description: `Phone: ${resp.phone_number}`,
            phone: resp.phone_number,
            timestamp: resp.created_at,
            status: resp.response,
            metadata: resp
          });
        });
      }

      // Fetch incoming calls
      let callsQuery = supabase
        .from('incoming_calls')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (dateFilter) {
        callsQuery = callsQuery.gte('created_at', dateFilter);
      }
      
      const { data: calls } = await callsQuery;
      
      if (calls) {
        calls.forEach(call => {
          allActivities.push({
            id: `call-${call.id}`,
            type: 'call_received',
            title: `Call from ${call.caller_phone || 'Unknown'}`,
            description: `Duration: ${call.duration_seconds || 0}s • Status: ${call.status || 'completed'}`,
            phone: call.caller_phone,
            timestamp: call.created_at,
            metadata: call
          });
        });
      }

      // Fetch meal responses (if table exists)
      try {
        let mealsQuery = supabase
          .from('meal_host_responses')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (dateFilter) {
          mealsQuery = mealsQuery.gte('created_at', dateFilter);
        }
        
        const { data: mealResponses } = await mealsQuery;
        
        if (mealResponses) {
          mealResponses.forEach(resp => {
            allActivities.push({
              id: `meal-${resp.id}`,
              type: 'meal_response',
              title: `Meal Response: ${resp.response || 'Unknown'}`,
              description: `Phone: ${resp.phone_number} • Guests: ${resp.guests_offered || 0}`,
              phone: resp.phone_number,
              timestamp: resp.created_at,
              metadata: resp
            });
          });
        }
      } catch (e) {
        // Table might not exist
      }

      // Fetch guest acceptances from activity_log if available
      try {
        let logQuery = supabase
          .from('activity_log')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (dateFilter) {
          logQuery = logQuery.gte('created_at', dateFilter);
        }
        
        const { data: logData } = await logQuery;
        
        if (logData) {
          logData.forEach(log => {
            allActivities.push({
              id: `log-${log.id}`,
              type: log.activity_type,
              title: log.title,
              description: log.description,
              phone: log.phone_number,
              timestamp: log.created_at,
              metadata: log.metadata
            });
          });
        }
      } catch (e) {
        // Table might not exist yet
      }

      // Sort all activities by timestamp
      allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setActivities(allActivities);

      // Calculate stats
      const newStats = {
        total: allActivities.length,
        host_signup: allActivities.filter(a => a.type === 'host_signup').length,
        guest_accepted: allActivities.filter(a => a.type === 'guest_accepted').length,
        bed_response: allActivities.filter(a => a.type === 'bed_response').length,
        meal_response: allActivities.filter(a => a.type === 'meal_response').length,
        call_received: allActivities.filter(a => a.type === 'call_received').length,
        beds_available: bedResponses?.filter(r => r.response === 'available').reduce((sum, r) => sum + (r.beds_offered || 0), 0) || 0
      };
      setStats(newStats);

    } catch (error) {
      console.error('Error fetching activity:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load activity data'
      });
    }
    setLoading(false);
  };

  const filteredActivities = activities.filter(activity => {
    const matchesType = selectedType === 'all' || activity.type === selectedType;
    const matchesSearch = searchTerm === '' || 
      activity.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.phone?.includes(searchTerm);
    return matchesType && matchesSearch;
  });

  const getActivityIcon = (type) => {
    const activityType = ACTIVITY_TYPES.find(t => t.key === type);
    return activityType?.icon || Activity;
  };

  const getActivityColor = (type) => {
    const activityType = ACTIVITY_TYPES.find(t => t.key === type);
    return activityType?.color || 'bg-slate-500';
  };

  const getStatusIcon = (activity) => {
    if (activity.type === 'bed_response') {
      if (activity.status === 'available') return <CheckCircle className="w-4 h-4 text-green-500" />;
      if (activity.status === 'not_available') return <XCircle className="w-4 h-4 text-red-500" />;
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-7 h-7 text-blue-600" />
              Activity Dashboard
            </h2>
            <p className="text-slate-500 mt-1">
              All system activity in one place
            </p>
          </div>
          <div className="flex gap-2">
            {/* Date Range Filter */}
            <select
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
            <Button variant="outline" onClick={fetchAllActivity} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats.total || 0}</div>
            <div className="text-blue-100 text-sm">Total Activities</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats.host_signup || 0}</div>
            <div className="text-green-100 text-sm">New Hosts</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats.bed_response || 0}</div>
            <div className="text-purple-100 text-sm">Bed Responses</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats.beds_available || 0}</div>
            <div className="text-emerald-100 text-sm">Beds Available</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats.meal_response || 0}</div>
            <div className="text-orange-100 text-sm">Meal Responses</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats.call_received || 0}</div>
            <div className="text-cyan-100 text-sm">Calls Received</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {ACTIVITY_TYPES.map(type => {
            const Icon = type.icon;
            const isSelected = selectedType === type.key;
            const count = type.key === 'all' ? stats.total : stats[type.key] || 0;
            
            return (
              <button
                key={type.key}
                onClick={() => setSelectedType(type.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? `${type.color} text-white shadow-md`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {type.name}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  isSelected ? 'bg-white/20' : 'bg-slate-200'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by name or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No activity found</h3>
          <p className="text-slate-500 mt-1">
            {searchTerm ? 'Try a different search term' : 'Activity will appear here'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredActivities.map(activity => {
              const Icon = getActivityIcon(activity.type);
              const color = getActivityColor(activity.type);

              return (
                <div
                  key={activity.id}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-900">
                          {activity.title}
                        </h4>
                        {getStatusIcon(activity)}
                      </div>
                      {activity.description && (
                        <p className="text-sm text-slate-500 mt-0.5">
                          {activity.description}
                        </p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-sm text-slate-400 flex-shrink-0">
                      {new Date(activity.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
