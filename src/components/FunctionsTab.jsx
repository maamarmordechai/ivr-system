import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/customSupabaseClient";
import { PhoneCall, Users, Settings, Info, CheckCircle2, XCircle } from "lucide-react";

export function FunctionsTab() {
  const [functions, setFunctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFunctions();
  }, []);

  async function loadFunctions() {
    try {
      const { data, error } = await supabase
        .from("ivr_function_descriptions")
        .select("*")
        .order("category", { ascending: true })
        .order("display_name", { ascending: true });

      if (error) throw error;
      setFunctions(data || []);
    } catch (error) {
      console.error("Error loading functions:", error);
    } finally {
      setLoading(false);
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Registration":
        return <Users className="h-5 w-5" />;
      case "Host Management":
        return <PhoneCall className="h-5 w-5" />;
      case "Admin":
        return <Settings className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "Registration":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Host Management":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "Internal":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const groupedFunctions = functions.reduce((acc, func) => {
    const category = func.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(func);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading functions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">IVR Functions Reference</h2>
          <p className="text-sm text-gray-600 mt-1">
            Complete list of all available phone system functions
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {functions.filter(f => f.is_active).length} Active Functions
        </Badge>
      </div>

      <Tabs defaultValue={Object.keys(groupedFunctions)[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {Object.keys(groupedFunctions).map((category) => (
            <TabsTrigger key={category} value={category} className="flex items-center gap-2">
              {getCategoryIcon(category)}
              {category}
              <Badge variant="secondary" className="ml-1">
                {groupedFunctions[category].length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(groupedFunctions).map(([category, funcs]) => (
          <TabsContent key={category} value={category} className="space-y-4 mt-4">
            {funcs.map((func) => (
              <Card key={func.function_name} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(func.category)}
                      <div>
                        <CardTitle className="text-xl">{func.display_name}</CardTitle>
                        <code className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                          {func.function_name}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(func.category)}>
                        {func.category}
                      </Badge>
                      {func.is_active ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {func.description}
                  </CardDescription>
                  
                  {/* Special info for specific functions */}
                  {func.function_name === "register_host" && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Call Frequency Options:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• <strong>Press 1:</strong> Every week (~52 calls/year)</li>
                        <li>• <strong>Press 2:</strong> Every second week (~26 calls/year + busy weeks)</li>
                        <li>• <strong>Press 3:</strong> Once a month (~13 calls/year + busy weeks)</li>
                        <li>• <strong>Press 4:</strong> Only busy weeks (0-10 calls/year)</li>
                      </ul>
                    </div>
                  )}
                  
                  {func.function_name === "trigger_busy_campaign" && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                      <h4 className="font-semibold text-sm mb-2 text-red-800 dark:text-red-200">⚠️ Admin Only</h4>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        This function triggers calls to ALL hosts regardless of their frequency preference. 
                        Use only during high-demand Shabbos weeks. Requires confirmation.
                      </p>
                    </div>
                  )}

                  {func.function_name === "beds" && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Used By:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Automated weekly availability calls</li>
                        <li>• IVR Menu Digit 3 (Update beds)</li>
                        <li>• Host-initiated availability updates</li>
                      </ul>
                    </div>
                  )}

                  {func.function_name === "meals" && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Meal Types:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Friday night dinner</li>
                        <li>• Shabbat lunch</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Reference Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            IVR Menu Quick Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">1</div>
              <div className="text-xs mt-1">Guest Services</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">2</div>
              <div className="text-xs mt-1">Register Host</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">3</div>
              <div className="text-xs mt-1">Update Beds</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">4</div>
              <div className="text-xs mt-1">Update Meals</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">5</div>
              <div className="text-xs mt-1">Meal Host</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-purple-600">6</div>
              <div className="text-xs mt-1">Busy Campaign</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-purple-600">8</div>
              <div className="text-xs mt-1">Admin</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-gray-600">0</div>
              <div className="text-xs mt-1">Voicemail</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
