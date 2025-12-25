import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Printer, FileText, Bed, Users, Calendar, Phone, Mail, Send, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ReportsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [mealHosts, setMealHosts] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [bedConfirmations, setBedConfirmations] = useState([]);
  const [mealConfirmations, setMealConfirmations] = useState([]);
  const [weeklyTracking, setWeeklyTracking] = useState(null);
  const [guestCount, setGuestCount] = useState(0);
  const [exportingPDF, setExportingPDF] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get current week
      const today = new Date().toISOString().split('T')[0];
      const { data: currentWeekData } = await supabase
        .from('desperate_weeks')
        .select('*')
        .gte('week_end_date', today)
        .order('week_start_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      setCurrentWeek(currentWeekData);

      // Get bed confirmations for current week
      if (currentWeekData) {
        // Get weekly tracking data
        const { data: trackingData } = await supabase
          .from('weekly_bed_tracking')
          .select('*')
          .eq('week_id', currentWeekData.id)
          .maybeSingle();

        setWeeklyTracking(trackingData);

        // Get guest count for this week
        const { count: guestsCount } = await supabase
          .from('guests')
          .select('*', { count: 'exact', head: true })
          .eq('week_id', currentWeekData.id);

        setGuestCount(guestsCount || 0);

        const { data: bedConfs } = await supabase
          .from('bed_confirmations')
          .select(`
            *,
            apartments(person_name, phone_number, address, number_of_beds)
          `)
          .eq('week_id', currentWeekData.id)
          .eq('voided', false)
          .order('confirmed_at', { ascending: false });

        setBedConfirmations(bedConfs || []);

        // Get meal confirmations for current week
        const { data: mealConfs } = await supabase
          .from('meal_availabilities')
          .select(`
            *,
            meal_hosts(host_name, phone_number, address)
          `)
          .eq('week_id', currentWeekData.id)
          .eq('status', 'confirmed')
          .order('responded_at', { ascending: false});

        setMealConfirmations(mealConfs || []);
        
        // Set expected guests from current week data
        setGuestCount(currentWeekData.expected_guests || 0);
      }

      // Get all weeks with tracking data
      const { data: weeksData } = await supabase
        .from('desperate_weeks')
        .select(`
          *,
          weekly_bed_tracking(*)
        `)
        .order('week_start_date', { ascending: false })
        .limit(10);

      setWeeklyData(weeksData || []);

      // Get all apartments sorted by most helpful
      const { data: apartmentsData } = await supabase
        .from('apartments')
        .select('*')
        .order('times_helped', { ascending: false });

      setApartments(apartmentsData || []);

      // Get meal hosts
      const { data: mealHostsData } = await supabase
        .from('meal_hosts')
        .select('*')
        .order('times_hosted', { ascending: false });

      setMealHosts(mealHostsData || []);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  const sendReportByEmail = async () => {
    if (!currentWeek) {
      toast({
        variant: "destructive",
        title: "No Current Week",
        description: "Cannot send report - no current week configured"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-weekly-report', {
        body: { 
          weekId: currentWeek.id,
          emailAddresses: [] // Will use system default emails
        }
      });

      if (error) throw error;

      toast({
        title: "Report Sent!",
        description: `Weekly report has been sent to ${data.recipients} recipient(s)`
      });
    } catch (error) {
      console.error('Error sending report:', error);
      toast({
        variant: "destructive",
        title: "Error Sending Report",
        description: error.message
      });
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current || !currentWeek) {
      toast({
        variant: "destructive",
        title: "Cannot Generate PDF",
        description: "Report content not available"
      });
      return;
    }

    setExportingPDF(true);
    
    try {
      toast({
        title: "Generating PDF...",
        description: "This may take a moment"
      });

      // Clone the report element
      const element = reportRef.current;
      
      // Capture the element as canvas with higher quality
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1200,
        windowHeight: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF with A4 size
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pageWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10; // Top margin

      // Add first page
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add subsequent pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename with week dates
      const weekStart = new Date(currentWeek.week_start_date).toISOString().split('T')[0];
      const weekEnd = new Date(currentWeek.week_end_date).toISOString().split('T')[0];
      const filename = `Weekly_Report_${weekStart}_to_${weekEnd}.pdf`;

      // Save the PDF
      pdf.save(filename);

      toast({
        title: "PDF Downloaded!",
        description: `Report saved as ${filename}`
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: "destructive",
        title: "PDF Generation Failed",
        description: error.message
      });
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading reports...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-8 h-8 text-purple-600" />
            Reports & Analytics
          </h2>
          <p className="text-slate-600 mt-1">View hosting statistics and weekly summaries</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button 
            onClick={downloadPDF} 
            variant="default" 
            className="bg-green-600 hover:bg-green-700"
            disabled={exportingPDF}
          >
            <Download className="w-4 h-4 mr-2" />
            {exportingPDF ? 'Generating...' : 'Download PDF'}
          </Button>
          <Button onClick={sendReportByEmail} variant="default" className="bg-blue-600 hover:bg-blue-700">
            <Mail className="w-4 h-4 mr-2" />
            Email Report
          </Button>
          <Button onClick={printReport} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="current-week" className="space-y-6" ref={reportRef}>
        <TabsList className="print:hidden">
          <TabsTrigger value="current-week">Current Week</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Summary</TabsTrigger>
          <TabsTrigger value="bed-hosts">Bed Hosts</TabsTrigger>
          <TabsTrigger value="meal-hosts">Meal Hosts</TabsTrigger>
        </TabsList>

        {/* Current Week Confirmations */}
        <TabsContent value="current-week" className="space-y-6">
          {!currentWeek ? (
            <div className="modern-card p-6 bg-white text-center text-slate-500">
              No current week configured
            </div>
          ) : (
            <>
              <div className="modern-card p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <h3 className="text-xl font-bold mb-2">Current Week</h3>
                <p className="text-lg mb-4">
                  {new Date(currentWeek.week_start_date).toLocaleDateString()} - {new Date(currentWeek.week_end_date).toLocaleDateString()}
                </p>
                
                {/* Guest Count and Needs Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                    <div className="text-sm opacity-90">Expected Guests</div>
                    <div className="text-3xl font-bold">{guestCount}</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                    <div className="text-sm opacity-90">Beds Still Needed</div>
                    <div className="text-3xl font-bold">
                      {Math.max(0, (weeklyTracking?.beds_needed || 0) - bedConfirmations.reduce((sum, c) => sum + (c.beds_confirmed || 0), 0))}
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {bedConfirmations.reduce((sum, c) => sum + (c.beds_confirmed || 0), 0)} of {weeklyTracking?.beds_needed || 30} confirmed
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                    <div className="text-sm opacity-90">Meals Still Needed</div>
                    <div className="text-3xl font-bold">
                      {Math.max(0, (weeklyTracking?.meals_needed || 0) - Math.floor((mealConfirmations.reduce((sum, c) => sum + (c.friday_night_count || 0) + (c.saturday_day_count || 0), 0)) / 2))}
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {mealConfirmations.reduce((sum, c) => sum + (c.friday_night_count || 0) + (c.saturday_day_count || 0), 0)} confirmed
                    </div>
                  </div>
                </div>

                {weeklyTracking?.admin_notes && (
                  <div className="mt-4 p-3 bg-white/20 backdrop-blur rounded text-sm">
                    <strong>Admin Notes:</strong> {weeklyTracking.admin_notes}
                  </div>
                )}
              </div>

              {/* Bed Confirmations */}
              <div className="modern-card p-6 bg-white">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Bed className="w-5 h-5 text-blue-600" />
                  Bed Confirmations ({bedConfirmations.length})
                </h3>
                
                {bedConfirmations.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No bed confirmations yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Host</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Address</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Phone</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-700">Beds Confirmed</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Confirmed At</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Via</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bedConfirmations.map((conf) => (
                          <tr key={conf.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 font-medium">{conf.apartments?.person_name}</td>
                            <td className="py-3 px-4 text-slate-600 text-sm">{conf.apartments?.address || 'Not provided'}</td>
                            <td className="py-3 px-4 text-slate-600">
                              <a href={`tel:${conf.apartments?.phone_number}`} className="text-blue-600 hover:underline">
                                {conf.apartments?.phone_number}
                              </a>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full font-semibold">
                                <Bed className="w-3 h-3" />
                                {conf.beds_confirmed}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {new Date(conf.confirmed_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                {conf.confirmed_via}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-900">
                    <strong>Total beds confirmed:</strong> {bedConfirmations.reduce((sum, c) => sum + (c.beds_confirmed || 0), 0)} beds
                  </div>
                </div>
              </div>

              {/* Meal Confirmations */}
              <div className="modern-card p-6 bg-white">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Meal Confirmations ({mealConfirmations.length})
                </h3>
                
                {mealConfirmations.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No meal confirmations yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Host</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Address</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Phone</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-700">Friday Night</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-700">Saturday Day</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Responded At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mealConfirmations.map((conf) => (
                          <tr key={conf.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 font-medium">{conf.meal_hosts?.host_name}</td>
                            <td className="py-3 px-4 text-slate-600 text-sm">{conf.meal_hosts?.address || 'Not provided'}</td>
                            <td className="py-3 px-4 text-slate-600">
                              <a href={`tel:${conf.meal_hosts?.phone_number}`} className="text-purple-600 hover:underline">
                                {conf.meal_hosts?.phone_number}
                              </a>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {conf.night_meal_guests > 0 ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full font-semibold">
                                  <Users className="w-3 h-3" />
                                  {conf.night_meal_guests}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {conf.day_meal_guests > 0 ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-semibold">
                                  <Users className="w-3 h-3" />
                                  {conf.day_meal_guests}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {new Date(conf.responded_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-sm text-orange-900">
                      <strong>Total Friday night guests:</strong> {mealConfirmations.reduce((sum, c) => sum + (c.night_meal_guests || 0), 0)} guests
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="text-sm text-yellow-900">
                      <strong>Total Saturday day guests:</strong> {mealConfirmations.reduce((sum, c) => sum + (c.day_meal_guests || 0), 0)} guests
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Weekly Summary */}
        <TabsContent value="weekly" className="space-y-4">
          <div className="modern-card p-6 bg-white">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Weekly Bed Tracking History</h3>
            
            {weeklyData.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No weekly data available</div>
            ) : (
              <div className="space-y-4">
                {weeklyData.map((week) => {
                  const tracking = week.weekly_bed_tracking?.[0];
                  const bedsConfirmed = tracking?.beds_confirmed || 0;
                  const bedsNeeded = tracking?.beds_needed || 0;
                  const percent = bedsNeeded > 0 ? (bedsConfirmed / bedsNeeded * 100).toFixed(0) : 0;

                  return (
                    <div key={week.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {new Date(week.week_start_date).toLocaleDateString()} - {new Date(week.week_end_date).toLocaleDateString()}
                          </div>
                          {week.is_desperate && (
                            <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                              Desperate Week
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">{bedsConfirmed} / {bedsNeeded}</div>
                          <div className="text-sm text-slate-500">{percent}% Complete</div>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>

                      {tracking?.admin_notes && (
                        <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-900">
                          <strong>Notes:</strong> {tracking.admin_notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Bed Hosts Report */}
        <TabsContent value="bed-hosts" className="space-y-4">
          <div className="modern-card p-6 bg-white">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Bed Host Statistics</h3>
            
            {apartments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No hosts registered</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Host Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Phone</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Beds Available</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Times Helped</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Last Helped</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Weekly Calls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apartments.map((apt) => (
                      <tr key={apt.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">{apt.person_name}</td>
                        <td className="py-3 px-4 text-slate-600">{apt.phone_number}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                            <Bed className="w-3 h-3" />
                            {apt.number_of_beds}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-lg font-bold text-green-600">{apt.times_helped || 0}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {apt.last_helped_date ? new Date(apt.last_helped_date).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 text-xs rounded ${
                            apt.wants_weekly_calls 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {apt.wants_weekly_calls ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="modern-card p-6 bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total Hosts</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">{apartments.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-600 opacity-50" />
              </div>
            </div>

            <div className="modern-card p-6 bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Total Beds</p>
                  <p className="text-3xl font-bold text-green-900 mt-1">
                    {apartments.reduce((sum, apt) => sum + (apt.number_of_beds || 0), 0)}
                  </p>
                </div>
                <Bed className="w-12 h-12 text-green-600 opacity-50" />
              </div>
            </div>

            <div className="modern-card p-6 bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Active Hosts</p>
                  <p className="text-3xl font-bold text-purple-900 mt-1">
                    {apartments.filter(apt => apt.wants_weekly_calls).length}
                  </p>
                </div>
                <Phone className="w-12 h-12 text-purple-600 opacity-50" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Meal Hosts Report */}
        <TabsContent value="meal-hosts" className="space-y-4">
          <div className="modern-card p-6 bg-white">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Meal Host Statistics</h3>
            
            {mealHosts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No meal hosts registered</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Phone Number</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Times Hosted</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Last Hosted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mealHosts.map((host) => (
                      <tr key={host.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium">{host.phone_number}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-lg font-bold text-purple-600">{host.times_hosted || 0}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {host.last_hosted_date ? new Date(host.last_hosted_date).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="modern-card p-6 bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Total Meal Hosts</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{mealHosts.length}</p>
              </div>
              <Users className="w-12 h-12 text-purple-600 opacity-50" />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsTab;
