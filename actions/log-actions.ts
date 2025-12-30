"use server";

import { createClient } from "@/lib/supabase/server";
import { EquipmentEntry } from "@/types/construction";

export async function upsertDailyLog(
  projectId: string,
  date: Date,
  data: {
    equipment_details: EquipmentEntry[];
    equipment_fuel_consumed: number;
    scope_one: number;
    incident_count?: number | null;
    hours_worked?: number | null;
  }
) {
  const supabase = await createClient();

  try {
    // Always insert a new daily log (no overwrite on same day)
    const { error: insertError } = await supabase.from("daily_logs").insert({
      project_id: projectId,
      timestamp: date.toISOString(),
      equipment_details: data.equipment_details,
      // equipment_emissions stores kg CO2e; scope_one provided matches this meaning here.
      equipment_emissions: data.scope_one,
      scope_one: data.scope_one, // legacy/compat column if present
      equipment_fuel_consumed: data.equipment_fuel_consumed,
      number_of_incidents: data.incident_count,
      total_employee_hours: data.hours_worked,
    });

    if (insertError) throw insertError;

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Failed to upsert daily log:", error);
    
    let errorMessage = "Failed to upsert daily log";
    
    if (error?.message) {
      errorMessage = error.message;
    }
    
    if (error?.details) {
      errorMessage += ` Details: ${error.details}`;
    }
    
    if (error?.hint) {
      errorMessage += ` Hint: ${error.hint}`;
    }
    
    if (error?.code) {
      errorMessage += ` (Code: ${error.code})`;
    }

    return { success: false, error: errorMessage };
  }
}
