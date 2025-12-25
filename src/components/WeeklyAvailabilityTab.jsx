import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Phone, Calendar, User, Bed, RefreshCw, Upload, FileSpreadsheet, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const WeeklyAvailabilityTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [audioPrompts, setAudioPrompts] = useState([]);
  const [weeklyModeEnabled, setWeeklyModeEnabled] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState({});
  const [voicemails, setVoicemails] = useState([]);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [batchCallStatus, setBatchCallStatus] = useState(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get current week
      const today = new Date().toISOString().split('T')[0];
      const { data: week } = await supabase
        .from('desperate_weeks')
        .select('*')
        .gte('week_end_date', today)
        .order('week_start_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      setCurrentWeek(week);

      if (week) {
        // Get all responses for current week
        const { data: responsesData, error: responsesError } = await supabase
          .from('weekly_availability_calls')
          .select(`
            *,
            apartments (
              person_name,
              phone_number,
              address,
              number_of_beds
            )
          `)
          .eq('week_id', week.id)
          .order('created_at', { ascending: false });

        if (responsesError) throw responsesError;
        setResponses(responsesData || []);
      }

      // Get voicemail audio prompts
      const { data: promptsData, error: promptsError } = await supabase
        .from('voicemail_audio_prompts')
        .select('*')
        .order('prompt_name');

      if (promptsError) throw promptsError;
      setAudioPrompts(promptsData || []);

      // Get all voicemails for selection
      const { data: voicemailsData, error: voicemailsError } = await supabase
        .from('voicemails')
        .select('id, caller_name, caller_phone, created_at, label')
        .order('created_at', { ascending: false })
        .limit(100);

      if (voicemailsError) throw voicemailsError;
      setVoicemails(voicemailsData || []);

      // Get weekly mode setting
      const { data: setting } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'enable_weekly_availability_mode')
        .maybeSingle();

      setWeeklyModeEnabled(setting?.setting_value === 'true');

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

  const updateVoicemailMapping = async (promptId, voicemailId) => {
    try {
      const { error } = await supabase
        .from('voicemail_audio_prompts')
        .update({ 
          voicemail_id: voicemailId,
          updated_at: new Date().toISOString()
        })
        .eq('id', promptId);

      if (error) throw error;

      // Update local state
      setAudioPrompts(audioPrompts.map(p => 
        p.id === promptId ? { ...p, voicemail_id: voicemailId } : p
      ));

      toast({
        title: "Success",
        description: "Voicemail mapping updated",
      });
    } catch (error) {
      console.error('Error updating voicemail mapping:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update mapping",
        variant: "destructive",
      });
    }
  };

  const handleAudioUpload = async (promptId, file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an audio file (MP3, WAV, etc.)",
        variant: "destructive",
      });
      return;
    }

    setUploadingAudio({ ...uploadingAudio, [promptId]: true });
    
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `weekly_${promptId}_${Date.now()}.${fileExt}`;
      const filePath = `weekly-audio/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-recordings')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(filePath);

      // Update audio prompt with the URL (and clear voicemail_id)
      const { error: updateError } = await supabase
        .from('voicemail_audio_prompts')
        .update({ 
          audio_url: publicUrl,
          voicemail_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', promptId);

      if (updateError) throw updateError;

      // Update local state
      setAudioPrompts(audioPrompts.map(p => 
        p.id === promptId ? { ...p, audio_url: publicUrl, voicemail_id: null } : p
      ));

      toast({
        title: "Success",
        description: "Audio file uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload audio file",
        variant: "destructive",
      });
    } finally {
      setUploadingAudio({ ...uploadingAudio, [promptId]: false });
    }
  };

  const handleDeleteAudio = async (promptId) => {
    try {
      const prompt = audioPrompts.find(p => p.id === promptId);
      if (!prompt?.audio_url) return;

      // Extract file path from URL
      const urlParts = prompt.audio_url.split('/weekly-audio/');
      if (urlParts.length === 2) {
        const filePath = `weekly-audio/${urlParts[1]}`;
        
        // Delete from storage
        await supabase.storage
          .from('audio-recordings')
          .remove([filePath]);
      }

      // Clear URL from database
      const { error } = await supabase
        .from('voicemail_audio_prompts')
        .update({ 
          audio_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', promptId);

      if (error) throw error;

      // Update local state
      setAudioPrompts(audioPrompts.map(p => 
        p.id === promptId ? { ...p, audio_url: null } : p
      ));

      toast({
        title: "Success",
        description: "Audio file deleted",
      });
    } catch (error) {
      console.error('Error deleting audio:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete audio file",
        variant: "destructive",
      });
    }
  };

  const restartWeeklyCheck = async () => {
    if (!currentWeek) {
      toast({
        variant: "destructive",
        title: "No Current Week",
        description: "No week configured to restart"
      });
      return;
    }

    const confirmed = window.confirm(
      `⚠️ WARNING: This will delete ALL ${responses.length} responses for this week!\n\n` +
      `This will also remove all bed confirmations from the weekly availability check.\n\n` +
      `Are you absolutely sure you want to restart the weekly availability check?`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      // Get all responses with bed counts to decrement
      const responsesWithBeds = responses.filter(r => r.response_type === 'yes' && r.beds_offered && r.apartment_id);
      
      console.log('Restarting weekly check - responses with beds:', responsesWithBeds);

      // Decrement bed counts in weekly_bed_tracking
      for (const response of responsesWithBeds) {
        console.log(`Decrementing ${response.beds_offered} beds for week ${currentWeek.id}`);
        const { error: rpcError } = await supabase.rpc('increment_beds_confirmed', {
          p_week_id: currentWeek.id,
          p_beds: -response.beds_offered
        });
        if (rpcError) {
          console.error('Error decrementing beds:', rpcError);
        }
      }

      // Delete bed_confirmations that were created from weekly availability check
      const { error: bedConfError } = await supabase
        .from('bed_confirmations')
        .delete()
        .eq('week_id', currentWeek.id)
        .eq('confirmed_via', 'phone_call_weekly_check');

      if (bedConfError) {
        console.error('Error deleting bed confirmations:', bedConfError);
      } else {
        console.log('Deleted bed confirmations');
      }

      // Set apartments to not available
      const apartmentIds = responsesWithBeds.map(r => r.apartment_id).filter(Boolean);
      if (apartmentIds.length > 0) {
        const { error: updateError } = await supabase
          .from('apartments')
          .update({ available_this_week: false })
          .in('id', apartmentIds);

        if (updateError) {
          console.error('Error updating apartments:', updateError);
        } else {
          console.log('Updated apartments to not available');
        }
      }

      // Delete all responses for this week
      const { error: deleteError } = await supabase
        .from('weekly_availability_calls')
        .delete()
        .eq('week_id', currentWeek.id);

      if (deleteError) throw deleteError;

      console.log('Deleted all weekly availability responses');

      toast({
        title: "Weekly Check Restarted",
        description: `Deleted all ${responses.length} responses. You can now start fresh.`
      });

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error restarting weekly check:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleWeeklyMode = async () => {
    try {
      const newValue = !weeklyModeEnabled;
      
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: newValue ? 'true' : 'false' })
        .eq('setting_key', 'enable_weekly_availability_mode');

      if (error) throw error;

      setWeeklyModeEnabled(newValue);

      toast({
        title: newValue ? "Weekly Mode Enabled" : "Weekly Mode Disabled",
        description: newValue 
          ? "All incoming calls will now go through weekly availability check"
          : "Incoming calls will use normal IVR menu"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const updateAudioUrl = async (promptId, newUrl) => {
    try {
      const { error } = await supabase
        .from('audio_prompts')
        .update({ 
          audio_url: newUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', promptId);

      if (error) throw error;

      setAudioPrompts(audioPrompts.map(p => 
        p.id === promptId ? { ...p, audio_url: newUrl } : p
      ));

      toast({
        title: "Audio URL Updated",
        description: "MP3 file URL has been saved"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const handleExcelUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      toast({
        title: "Invalid File",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    setUploadingExcel(true);
    setBatchCallStatus(null);

    try {
      // Read Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Get first sheet
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      // Parse data - Column A = phone number, Column B = name, Column C = address
      const contacts = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const phone = row[0]?.toString().trim();
        const name = row[1]?.toString().trim();
        const address = row[2]?.toString().trim();

        // Skip empty rows
        if (!phone || !name) continue;

        // Basic phone validation (must have digits)
        if (!/\d/.test(phone)) {
          console.warn(`Skipping row ${i + 1}: invalid phone number`);
          continue;
        }

        contacts.push({ phone, name, address: address || '' });
      }

      if (contacts.length === 0) {
        toast({
          title: "No Valid Data",
          description: "Excel file must have phone numbers in column A, names in column B, and addresses in column C",
          variant: "destructive",
        });
        return;
      }

      // Show confirmation
      const confirmed = window.confirm(
        `Found ${contacts.length} contacts.\n\n` +
        `This will make weekly availability check calls to:\n` +
        contacts.slice(0, 5).map(c => `${c.name} (${c.phone})${c.address ? ' - ' + c.address : ''}`).join('\n') +
        (contacts.length > 5 ? `\n...and ${contacts.length - 5} more` : '') +
        `\n\nDo you want to proceed?`
      );

      if (!confirmed) {
        toast({
          title: "Cancelled",
          description: "Batch call cancelled",
        });
        return;
      }

      // Call edge function to trigger batch calls
      const { data: batchResult, error: batchError } = await supabase.functions.invoke('batch-weekly-calls', {
        body: { contacts }
      });

      if (batchError) throw batchError;

      setBatchCallStatus({
        total: contacts.length,
        success: batchResult.success || 0,
        failed: batchResult.failed || 0,
        details: batchResult.details || []
      });

      toast({
        title: "Batch Calls Initiated",
        description: `Starting calls to ${contacts.length} contacts`,
      });

      // Refresh data after a delay to show new responses
      setTimeout(() => {
        fetchData();
      }, 5000);

    } catch (error) {
      console.error('Error processing Excel file:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process Excel file",
        variant: "destructive",
      });
    } finally {
      setUploadingExcel(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const callAllRegisteredHosts = async () => {
    if (!weeklyModeEnabled) {
      toast({
        variant: "destructive",
        title: "Weekly Mode Disabled",
        description: "Enable weekly mode first to make batch calls"
      });
      return;
    }

    try {
      // Fetch all registered hosts from apartments table
      const { data: apartments, error: fetchError } = await supabase
        .from('apartments')
        .select('person_name, phone_number')
        .not('phone_number', 'is', null)
        .order('person_name');

      if (fetchError) throw fetchError;

      if (!apartments || apartments.length === 0) {
        toast({
          variant: "destructive",
          title: "No Registered Hosts",
          description: "No hosts found in the apartments table with phone numbers"
        });
        return;
      }

      // Convert to contacts format
      const contacts = apartments.map(apt => ({
        name: apt.person_name || 'Unknown',
        phone: apt.phone_number
      }));

      // Show confirmation
      const confirmed = window.confirm(
        `Found ${contacts.length} registered hosts.\n\n` +
        `This will make weekly availability check calls to all registered hosts:\n` +
        contacts.slice(0, 5).map(c => `${c.name}: ${c.phone}`).join('\n') +
        (contacts.length > 5 ? `\n...and ${contacts.length - 5} more` : '') +
        `\n\nDo you want to proceed?`
      );

      if (!confirmed) {
        toast({
          title: "Cancelled",
          description: "Batch call cancelled",
        });
        return;
      }

      setUploadingExcel(true);
      setBatchCallStatus(null);

      // Call edge function to trigger batch calls
      const { data: batchResult, error: batchError } = await supabase.functions.invoke('batch-weekly-calls', {
        body: { contacts }
      });

      if (batchError) throw batchError;

      setBatchCallStatus({
        total: contacts.length,
        success: batchResult.success || 0,
        failed: batchResult.failed || 0,
        details: batchResult.details || []
      });

      toast({
        title: "Batch Calls Initiated",
        description: `Starting calls to ${contacts.length} registered hosts`,
      });

      // Refresh data after a delay to show new responses
      setTimeout(() => {
        fetchData();
      }, 5000);

    } catch (error) {
      console.error('Error calling all hosts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to initiate calls"
      });
    } finally {
      setUploadingExcel(false);
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

      // Capture the element as canvas with higher quality
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1200,
        windowHeight: reportRef.current.scrollHeight
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
      
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

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
      const filename = `Weekly_Availability_Report_${weekStart}_to_${weekEnd}.pdf`;

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

  const fridayCallbacks = responses.filter(r => r.response_type === 'friday_callback');
  const yesResponses = responses.filter(r => r.response_type === 'yes');
  const noResponses = responses.filter(r => r.response_type === 'no');

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Weekly Availability Check</h2>
          <p className="text-slate-600">
            {currentWeek 
              ? `Week of ${new Date(currentWeek.week_start_date).toLocaleDateString()} - ${new Date(currentWeek.week_end_date).toLocaleDateString()}`
              : 'No current week configured'
            }
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={downloadPDF}
            variant="default"
            size="lg"
            disabled={exportingPDF || !currentWeek}
            className="bg-green-600 hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            {exportingPDF ? 'Generating...' : 'Download PDF'}
          </Button>
          <Button
            onClick={restartWeeklyCheck}
            variant="destructive"
            size="lg"
            disabled={!currentWeek || responses.length === 0}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Restart Weekly Check
          </Button>
          <Button
            onClick={toggleWeeklyMode}
            variant={weeklyModeEnabled ? "destructive" : "default"}
            size="lg"
          >
            {weeklyModeEnabled ? 'Disable Weekly Mode' : 'Enable Weekly Mode'}
          </Button>
          <Button onClick={fetchData} variant="outline" size="lg">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`p-4 rounded-lg ${weeklyModeEnabled ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100'}`}>
        <p className="font-semibold">
          {weeklyModeEnabled 
            ? '✅ Weekly Mode ACTIVE - All calls will ask availability question'
            : '⚪ Weekly Mode OFF - Using normal IVR menu'
          }
        </p>
      </div>

      {/* Batch Call Section */}
      <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Batch Weekly Calls from Excel
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Upload Excel file with names in Column A and phone numbers in Column B
            </p>
          </div>
          <div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              disabled={uploadingExcel || !weeklyModeEnabled}
              className="hidden"
              id="excel-upload"
            />
            <label htmlFor="excel-upload">
              <Button
                asChild
                disabled={uploadingExcel || !weeklyModeEnabled}
                size="lg"
              >
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingExcel ? 'Processing...' : 'Upload Excel'}
                </span>
              </Button>
            </label>
          </div>
        </div>

        {!weeklyModeEnabled && (
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
            ⚠️ Enable Weekly Mode first to use batch calling
          </div>
        )}

        {batchCallStatus && (
          <div className="bg-white p-4 rounded border border-blue-300">
            <h4 className="font-semibold mb-2">Batch Call Results</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Total:</span>
                <span className="ml-2 font-semibold">{batchCallStatus.total}</span>
              </div>
              <div>
                <span className="text-green-600">Success:</span>
                <span className="ml-2 font-semibold">{batchCallStatus.success}</span>
              </div>
              <div>
                <span className="text-red-600">Failed:</span>
                <span className="ml-2 font-semibold">{batchCallStatus.failed}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Call All Registered Hosts Section */}
      <div className="p-6 bg-purple-50 border-2 border-purple-200 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Call All Registered Hosts
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Automatically call all hosts from the apartments database
            </p>
          </div>
          <Button
            onClick={callAllRegisteredHosts}
            disabled={uploadingExcel || !weeklyModeEnabled}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Phone className="w-4 h-4 mr-2" />
            {uploadingExcel ? 'Processing...' : 'Call All Hosts'}
          </Button>
        </div>

        {!weeklyModeEnabled && (
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
            ⚠️ Enable Weekly Mode first to use batch calling
          </div>
        )}
      </div>

      {/* Report Content - Wrapped for PDF Export */}
      <div ref={reportRef}>
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-2xl font-bold text-green-700">{yesResponses.length}</div>
          <div className="text-sm text-green-600">Available (Option 1)</div>
          <div className="text-lg font-semibold text-green-800 mt-1">
            {yesResponses.reduce((sum, r) => sum + (r.beds_offered || 0), 0)} Beds
          </div>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-2xl font-bold text-red-700">{noResponses.length}</div>
          <div className="text-sm text-red-600">Not Available (Option 2)</div>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-2xl font-bold text-blue-700">{fridayCallbacks.length}</div>
          <div className="text-sm text-blue-600">Call Friday (Option 3)</div>
        </div>
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-2xl font-bold text-slate-700">{responses.length}</div>
          <div className="text-sm text-slate-600">Total Responses</div>
        </div>
      </div>

      {/* Friday Callback List */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Friday Callbacks ({fridayCallbacks.length})
        </h3>
        
        {fridayCallbacks.length === 0 ? (
          <p className="text-slate-600 italic">No Friday callbacks requested yet</p>
        ) : (
          <div className="space-y-3">
            {fridayCallbacks.map((response) => (
              <div key={response.id} className="bg-white p-4 rounded-lg border border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <User className="w-8 h-8 text-blue-600" />
                  <div>
                    <div className="font-semibold text-lg">
                      {response.apartments?.person_name || 'Unknown'}
                    </div>
                    <div className="text-sm text-slate-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {response.caller_phone}
                    </div>
                    {response.apartments?.address && (
                      <div className="text-sm text-slate-500">📍 {response.apartments.address}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-500">
                    {new Date(response.created_at).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">
                    Usually: {response.apartments?.number_of_beds} beds
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Responses Table */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b bg-slate-50">
          <h3 className="text-lg font-bold">All Responses This Week</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Response</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Beds</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {responses.map((response) => (
                <tr key={response.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{response.apartments?.person_name || response.caller_name || 'Unknown'}</td>
                  <td className="px-4 py-3">{response.caller_phone}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      response.response_type === 'yes' ? 'bg-green-100 text-green-700' :
                      response.response_type === 'no' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {response.response_type === 'yes' ? 'Available' : 
                       response.response_type === 'no' ? 'Not Available' : 
                       'Call Friday'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {response.beds_offered ? (
                      <span className="flex items-center gap-1">
                        <Bed className="w-4 h-4" />
                        {response.beds_offered}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {new Date(response.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      {/* End Report Content for PDF */}

      {/* Audio Prompts Link */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5" />
              IVR Audio Prompts
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Manage audio recordings for the weekly availability IVR system
            </p>
          </div>
          <p className="text-sm text-blue-600 font-medium">
            Go to the "IVR Audio" tab to manage audio prompts →
          </p>
        </div>
      </div>
    </div>
  );
};

export default WeeklyAvailabilityTab;
