import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SourcedMaterial } from "@/types/construction";

type DailyHistory = {
  id?: string;
  log_date?: string;
  fuel_consumption_liters?: number | null;
  equipment_usage_tco2e?: number | null;
  safety_incidents?: number | null;
  incident_count?: number | null;
  hours_worked?: number | null;
};

type MonthlyHistory = {
  id?: string;
  log_month?: string;
  submitted_on?: string;
  electricity_usage_kwh?: number | null;
  water_consumption_cubic_m?: number | null;
  waste_generated_kg?: number | null;
  waste_placeholder?: number | null;
  scope3?: number | null;
  elec_placeholder?: number | null;
  water_placeholder?: number | null;
};

type LogsOverviewTabProps = {
  dailyLogs: DailyHistory[];
  monthlyLogs: MonthlyHistory[];
  materialLogs: SourcedMaterial[];
  isLoadingMaterials?: boolean;
  isLoadingHistory?: boolean;
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

const formatMonth = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      });
};

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
};

const MATERIAL_STATUS_BADGE: Record<string, string> = {
  Vetted:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  Identified:
    "bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300",
  Denied: "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300",
};

export function LogsOverviewTab({
  dailyLogs,
  monthlyLogs,
  materialLogs,
  isLoadingMaterials,
  isLoadingHistory,
}: LogsOverviewTabProps) {
  const [dailyRange, setDailyRange] = useState<"all" | "7" | "30">("all");
  const [monthlyRange, setMonthlyRange] = useState<"all" | "6" | "12">("all");
  const [materialStatus, setMaterialStatus] = useState<
    "all" | "Vetted" | "Identified" | "Denied"
  >("all");

  const now = useMemo(() => new Date(), []);
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const monthsAgo = (months: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - months);
    return d;
  };

  const filteredDailyLogs = useMemo(() => {
    if (dailyRange === "all") return dailyLogs;
    const threshold =
      dailyRange === "7" ? daysAgo(7) : dailyRange === "30" ? daysAgo(30) : null;
    if (!threshold) return dailyLogs;
    return dailyLogs.filter((log) => {
      const d = log.log_date ? new Date(log.log_date) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      return d >= threshold;
    });
  }, [dailyRange, dailyLogs, now]);

  const filteredMonthlyLogs = useMemo(() => {
    if (monthlyRange === "all") return monthlyLogs;
    const threshold =
      monthlyRange === "6" ? monthsAgo(6) : monthlyRange === "12" ? monthsAgo(12) : null;
    if (!threshold) return monthlyLogs;
    return monthlyLogs.filter((log) => {
      const d = log.log_month ? new Date(log.log_month) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      return d >= threshold;
    });
  }, [monthlyRange, monthlyLogs, now]);

  const filteredMaterialLogs = useMemo(() => {
    if (materialStatus === "all") return materialLogs;
    return materialLogs.filter(
      (material) => material.status?.toLowerCase() === materialStatus.toLowerCase()
    );
  }, [materialStatus, materialLogs]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="backdrop-blur-sm bg-white/70 dark:bg-gray-900/70 border border-white/30 dark:border-gray-800/60 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle>Daily Input Logs</CardTitle>
          <CardDescription>
            Review fuel consumption, equipment emissions, and safety incidents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={dailyRange} onValueChange={(v) => setDailyRange(v as typeof dailyRange)}>
            <SelectTrigger className="h-9 w-full sm:w-56">
              <SelectValue placeholder="Filter daily logs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All daily logs</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          {isLoadingHistory ? (
            <p className="text-sm text-muted-foreground">Loading daily history…</p>
          ) : filteredDailyLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No daily logs yet.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/70 backdrop-blur z-10">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Fuel (L)</TableHead>
                      <TableHead>Equip. Emissions (kg)</TableHead>
                      <TableHead>TRIR</TableHead>
                      <TableHead>Incidents</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDailyLogs.map((log) => (
                      <TableRow key={log.id ?? log.log_date}>
                        <TableCell className="font-medium">
                          {formatDate(log.log_date)}
                        </TableCell>
                        <TableCell>
                          {formatNumber(log.fuel_consumption_liters)}
                        </TableCell>
                        <TableCell>
                          {formatNumber(log.equipment_usage_tco2e)}
                        </TableCell>
                        <TableCell>{formatNumber(log.safety_incidents)}</TableCell>
                        <TableCell>{formatNumber(log.incident_count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-white/70 dark:bg-gray-900/70 border border-white/30 dark:border-gray-800/60 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle>Monthly Input Logs</CardTitle>
          <CardDescription>
            Track utility consumption, waste generation, and Scope 3 totals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={monthlyRange}
            onValueChange={(v) => setMonthlyRange(v as typeof monthlyRange)}
          >
            <SelectTrigger className="h-9 w-full sm:w-56">
              <SelectValue placeholder="Filter monthly logs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All monthly logs</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          {isLoadingHistory ? (
            <p className="text-sm text-muted-foreground">Loading monthly history…</p>
          ) : filteredMonthlyLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No monthly logs yet.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/70 backdrop-blur z-10">
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Electricity (kWh)</TableHead>
                      <TableHead>Water (m³)</TableHead>
                      <TableHead>Waste (kg)</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMonthlyLogs.map((log) => (
                      <TableRow key={log.id ?? log.log_month}>
                        <TableCell className="font-medium">
                          {formatMonth(log.log_month)}
                        </TableCell>
                        <TableCell>
                          {formatNumber(
                            log.electricity_usage_kwh ?? log.elec_placeholder
                          )}
                        </TableCell>
                        <TableCell>
                          {formatNumber(
                            log.water_consumption_cubic_m ?? log.water_placeholder
                          )}
                        </TableCell>
                        <TableCell>
                          {formatNumber(
                            log.waste_generated_kg ?? log.waste_placeholder
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(log.submitted_on)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 backdrop-blur-sm bg-white/70 dark:bg-gray-900/70 border border-white/30 dark:border-gray-800/60 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle>Material Delivery Logs</CardTitle>
          <CardDescription>
            See sourced materials, supplier details, and planned delivery dates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={materialStatus}
            onValueChange={(v) => setMaterialStatus(v as typeof materialStatus)}
          >
            <SelectTrigger className="h-9 w-full sm:w-56">
              <SelectValue placeholder="Filter materials" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Vetted">Vetted</SelectItem>
              <SelectItem value="Identified">Identified</SelectItem>
              <SelectItem value="Denied">Denied</SelectItem>
            </SelectContent>
          </Select>
          {isLoadingMaterials ? (
            <p className="text-sm text-muted-foreground">
              Loading material logs...
            </p>
          ) : filteredMaterialLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No material logs yet.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/70 backdrop-blur z-10">
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fuel (L)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterialLogs.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">
                          {material.name || "—"}
                        </TableCell>
                        <TableCell>{material.supplier || "—"}</TableCell>
                        <TableCell>
                          {material.deliveryDate
                            ? formatDate(material.deliveryDate.toString())
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              MATERIAL_STATUS_BADGE[material.status] ??
                              "bg-muted text-foreground"
                            }
                          >
                            {material.status || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatNumber(material.fuelSummary)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

