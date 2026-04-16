import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutTemplate, ShoppingCart, GraduationCap, DollarSign, BarChart3, Users, Activity, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const templateData: Record<string, { columns: string[]; rows: Record<string, string>[] }> = {
  sales: {
    columns: ["Month", "Revenue", "Expenses", "Product", "Region"],
    rows: [
      { Month: "2025-01", Revenue: "12400", Expenses: "8200", Product: "Electronics", Region: "North" },
      { Month: "2025-02", Revenue: "15800", Expenses: "9100", Product: "Clothing", Region: "South" },
      { Month: "2025-03", Revenue: "11200", Expenses: "7600", Product: "Electronics", Region: "East" },
      { Month: "2025-04", Revenue: "18900", Expenses: "10300", Product: "Food", Region: "West" },
      { Month: "2025-05", Revenue: "22100", Expenses: "12500", Product: "Electronics", Region: "North" },
      { Month: "2025-06", Revenue: "19700", Expenses: "11800", Product: "Clothing", Region: "South" },
      { Month: "2025-07", Revenue: "25300", Expenses: "14200", Product: "Food", Region: "East" },
      { Month: "2025-08", Revenue: "21800", Expenses: "13100", Product: "Electronics", Region: "West" },
      { Month: "2025-09", Revenue: "17600", Expenses: "10900", Product: "Clothing", Region: "North" },
      { Month: "2025-10", Revenue: "28400", Expenses: "15700", Product: "Food", Region: "South" },
      { Month: "2025-11", Revenue: "31200", Expenses: "17400", Product: "Electronics", Region: "East" },
      { Month: "2025-12", Revenue: "34500", Expenses: "19200", Product: "Clothing", Region: "West" },
    ],
  },
  student: {
    columns: ["Student", "Math", "Science", "English", "Attendance", "Grade"],
    rows: [
      { Student: "Alice", Math: "92", Science: "88", English: "95", Attendance: "97", Grade: "A" },
      { Student: "Bob", Math: "78", Science: "82", English: "71", Attendance: "89", Grade: "B" },
      { Student: "Charlie", Math: "65", Science: "70", English: "68", Attendance: "75", Grade: "C" },
      { Student: "Diana", Math: "95", Science: "93", English: "91", Attendance: "98", Grade: "A" },
      { Student: "Eve", Math: "55", Science: "60", English: "72", Attendance: "65", Grade: "D" },
      { Student: "Frank", Math: "88", Science: "85", English: "82", Attendance: "92", Grade: "B" },
      { Student: "Grace", Math: "91", Science: "94", English: "89", Attendance: "96", Grade: "A" },
      { Student: "Henry", Math: "73", Science: "68", English: "75", Attendance: "80", Grade: "C" },
    ],
  },
  financial: {
    columns: ["Date", "Category", "Amount", "Type", "Account"],
    rows: [
      { Date: "2025-01-05", Category: "Salary", Amount: "5000", Type: "Income", Account: "Main" },
      { Date: "2025-01-10", Category: "Rent", Amount: "1200", Type: "Expense", Account: "Main" },
      { Date: "2025-01-15", Category: "Groceries", Amount: "350", Type: "Expense", Account: "Main" },
      { Date: "2025-02-05", Category: "Salary", Amount: "5000", Type: "Income", Account: "Main" },
      { Date: "2025-02-12", Category: "Utilities", Amount: "180", Type: "Expense", Account: "Main" },
      { Date: "2025-02-20", Category: "Investment", Amount: "1000", Type: "Expense", Account: "Savings" },
      { Date: "2025-03-05", Category: "Salary", Amount: "5200", Type: "Income", Account: "Main" },
      { Date: "2025-03-08", Category: "Rent", Amount: "1200", Type: "Expense", Account: "Main" },
      { Date: "2025-03-15", Category: "Dining", Amount: "250", Type: "Expense", Account: "Main" },
      { Date: "2025-04-05", Category: "Salary", Amount: "5200", Type: "Income", Account: "Main" },
      { Date: "2025-04-10", Category: "Insurance", Amount: "400", Type: "Expense", Account: "Main" },
    ],
  },
  marketing: {
    columns: ["Campaign", "Impressions", "Clicks", "Conversions", "Spend", "Channel"],
    rows: [
      { Campaign: "Spring Sale", Impressions: "50000", Clicks: "2500", Conversions: "150", Spend: "1200", Channel: "Google" },
      { Campaign: "Brand Awareness", Impressions: "120000", Clicks: "3600", Conversions: "90", Spend: "2500", Channel: "Facebook" },
      { Campaign: "Product Launch", Impressions: "75000", Clicks: "4500", Conversions: "300", Spend: "3000", Channel: "Google" },
      { Campaign: "Retargeting", Impressions: "30000", Clicks: "1800", Conversions: "220", Spend: "800", Channel: "Instagram" },
      { Campaign: "Newsletter", Impressions: "15000", Clicks: "2100", Conversions: "180", Spend: "200", Channel: "Email" },
      { Campaign: "Holiday Special", Impressions: "90000", Clicks: "5400", Conversions: "420", Spend: "4000", Channel: "Google" },
    ],
  },
  hr: {
    columns: ["Employee", "Department", "Salary", "YearsExp", "Performance", "Status"],
    rows: [
      { Employee: "John Smith", Department: "Engineering", Salary: "95000", YearsExp: "5", Performance: "4.5", Status: "Active" },
      { Employee: "Jane Doe", Department: "Marketing", Salary: "72000", YearsExp: "3", Performance: "4.2", Status: "Active" },
      { Employee: "Mike Johnson", Department: "Sales", Salary: "68000", YearsExp: "7", Performance: "3.8", Status: "Active" },
      { Employee: "Sarah Williams", Department: "Engineering", Salary: "110000", YearsExp: "8", Performance: "4.8", Status: "Active" },
      { Employee: "Tom Brown", Department: "HR", Salary: "65000", YearsExp: "4", Performance: "4.0", Status: "Active" },
      { Employee: "Lisa Chen", Department: "Engineering", Salary: "105000", YearsExp: "6", Performance: "4.6", Status: "Active" },
    ],
  },
  health: {
    columns: ["Date", "PatientID", "HeartRate", "BloodPressure", "Temperature", "Diagnosis"],
    rows: [
      { Date: "2025-01-10", PatientID: "P001", HeartRate: "72", BloodPressure: "120/80", Temperature: "98.6", Diagnosis: "Healthy" },
      { Date: "2025-01-11", PatientID: "P002", HeartRate: "85", BloodPressure: "140/90", Temperature: "99.1", Diagnosis: "Hypertension" },
      { Date: "2025-01-12", PatientID: "P003", HeartRate: "68", BloodPressure: "115/75", Temperature: "98.4", Diagnosis: "Healthy" },
      { Date: "2025-01-13", PatientID: "P004", HeartRate: "95", BloodPressure: "150/95", Temperature: "101.2", Diagnosis: "Fever" },
      { Date: "2025-01-14", PatientID: "P005", HeartRate: "70", BloodPressure: "118/78", Temperature: "98.7", Diagnosis: "Healthy" },
      { Date: "2025-01-15", PatientID: "P001", HeartRate: "74", BloodPressure: "122/82", Temperature: "98.5", Diagnosis: "Healthy" },
    ],
  },
};

const templates = [
  { id: "sales", name: "Sales Dashboard", description: "Revenue tracking, product performance, and customer segmentation.", icon: ShoppingCart, color: "from-primary to-chart-4", tags: ["Revenue", "Products", "Trends"] },
  { id: "student", name: "Student Analysis", description: "Academic performance tracking with grades and attendance.", icon: GraduationCap, color: "from-chart-2 to-primary", tags: ["Grades", "Attendance", "Progress"] },
  { id: "financial", name: "Financial Report", description: "Expense tracking, budget analysis, and profit/loss.", icon: DollarSign, color: "from-accent to-chart-5", tags: ["Budget", "Expenses", "P&L"] },
  { id: "marketing", name: "Marketing Analytics", description: "Campaign performance, conversion funnels, and ROI.", icon: BarChart3, color: "from-chart-4 to-chart-5", tags: ["Campaigns", "Conversions", "ROI"] },
  { id: "hr", name: "HR Dashboard", description: "Employee metrics, hiring pipeline, and productivity.", icon: Users, color: "from-chart-2 to-chart-4", tags: ["Employees", "Hiring", "Productivity"] },
  { id: "health", name: "Health Metrics", description: "Patient data analysis with vitals and outcomes.", icon: Activity, color: "from-chart-5 to-accent", tags: ["Patients", "Vitals", "Outcomes"] },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 24 } } };

const Templates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [creating, setCreating] = useState<string | null>(null);

  const handleUseTemplate = async (template: typeof templates[0]) => {
    if (!user) return;
    setCreating(template.id);
    try {
      const data = templateData[template.id];
      if (!data) throw new Error("Template data not found");

      // Create project
      const { data: project, error: projErr } = await supabase.from("projects").insert({
        name: template.name,
        description: template.description,
        user_id: user.id,
        tags: template.tags,
        ai_summary: `Auto-generated from ${template.name} template`,
      }).select().single();
      if (projErr) throw projErr;

      // Create dataset with real template-specific data
      const { data: dataset, error: dsErr } = await supabase.from("datasets").insert({
        name: `${template.name} Data`,
        file_type: "csv",
        user_id: user.id,
        project_id: project.id,
        status: "ready",
        row_count: data.rows.length,
        column_count: data.columns.length,
        columns: data.columns as any,
        preview_rows: data.rows as any,
        quality_report: {} as any,
      }).select().single();
      if (dsErr) throw dsErr;

      // Trigger AI analysis on the dataset
      supabase.functions.invoke("analyze-data", {
        body: { data: data.rows, columns: data.columns, action: "analyze" },
      }).then(async ({ data: aiResult }) => {
        if (aiResult?.insights) {
          await supabase.from("datasets").update({ ai_insights: aiResult.insights as any }).eq("id", dataset.id);
        }
        if (aiResult?.suggestedCharts) {
          // Auto-create visualizations from AI suggestions
          const chartInserts = aiResult.suggestedCharts.slice(0, 4).map((chart: any) => ({
            name: chart.title || `${chart.type} Chart`,
            chart_type: chart.type,
            dataset_id: dataset.id,
            project_id: project.id,
            user_id: user.id,
            config: { xAxis: chart.xAxis, yAxis: chart.yAxis, groupBy: chart.groupBy } as any,
            ai_explanation: chart.reason,
          }));
          await supabase.from("visualizations").insert(chartInserts);
        }
      });

      // Log activity
      await supabase.from("project_activity").insert({
        project_id: project.id,
        user_id: user.id,
        activity_type: "template_used",
        activity_label: `Project created from ${template.name} template`,
        metadata: { template_id: template.id } as any,
      });

      toast({ title: "Template Applied", description: `${template.name} project created with sample data and AI analysis.` });
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create project from template.", variant: "destructive" });
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <LayoutTemplate className="w-5 h-5 text-primary-foreground" />
          </div>
          Templates
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Pre-built project setups with real data and AI analysis</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map((t) => {
          const data = templateData[t.id];
          return (
            <motion.div key={t.id} variants={item} whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="glass rounded-2xl p-6 relative overflow-hidden group cursor-pointer"
              style={{ boxShadow: "var(--shadow-card)" }}>
              <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${t.color} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500`} />
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-4 shadow-lg`}>
                <t.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{t.name}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{t.description}</p>
              <div className="flex gap-1.5 mt-3">
                {t.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                <p className="text-xs text-muted-foreground">{data?.rows.length || 0} rows · {data?.columns.length || 0} columns</p>
                <Button size="sm" onClick={() => handleUseTemplate(t)} disabled={creating === t.id}
                  className="bg-gradient-primary text-primary-foreground text-xs gap-1">
                  {creating === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Use<ArrowRight className="w-3 h-3" /></>}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default Templates;
