"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter } from "@/components/date-range-filter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { MessageSquare, TrendingUp, Users, Download, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import type { SurveyResponseItem } from "@/lib/survey-config";

interface SurveyResponseRow {
  id: string;
  role: string;
  participantName: string | null;
  surveyType: string;
  triggerPoint: string;
  responses: SurveyResponseItem[];
  createdAt: string;
}

interface FeedbackSummary {
  totalResponses: number;
  byRole: Record<string, number>;
  bySurveyType: Record<string, number>;
  averageRatings: Record<string, { avg: number; count: number }>;
  npsScore: number;
}

interface FeedbackData {
  summary: FeedbackSummary;
  responses: SurveyResponseRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const ROLE_COLORS: Record<string, string> = {
  TOURIST: "#2E7D32",
  ADMIN: "#1565C0",
  VERIFIER: "#E65100",
};

const PIE_COLORS = ["#2E7D32", "#1565C0", "#E65100"];

export default function FeedbackDashboardPage() {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [surveyTypeFilter, setSurveyTypeFilter] = useState<string>("all");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (surveyTypeFilter !== "all") params.set("surveyType", surveyTypeFilter);
      if (triggerFilter !== "all") params.set("triggerPoint", triggerFilter);
      if (dateRange) {
        params.set("from", dateRange.from.toISOString());
        params.set("to", dateRange.to.toISOString());
      }
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/admin/feedback?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [roleFilter, surveyTypeFilter, triggerFilter, dateRange, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleExport(type: "summary" | "raw") {
    const params = new URLSearchParams();
    params.set("type", type);
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (triggerFilter !== "all") params.set("triggerPoint", triggerFilter);
    if (dateRange) {
      params.set("from", dateRange.from.toISOString());
      params.set("to", dateRange.to.toISOString());
    }
    window.open(`/api/export/feedback?${params}`, "_blank");
  }

  const summary = data?.summary;

  // Prepare chart data
  const barData = summary
    ? Object.entries(summary.averageRatings).map(([trigger, d]) => ({
        name: trigger.replace(/_/g, " "),
        avg: d.avg,
        count: d.count,
      }))
    : [];

  const pieData = summary
    ? Object.entries(summary.byRole).map(([role, count]) => ({
        name: role,
        value: count,
      }))
    : [];

  // Derive text responses from already-fetched data (no separate API call)
  const allTextResponses = useMemo(() => {
    if (!data?.responses) return [];
    const texts: Array<{
      question: string;
      answer: string;
      role: string;
      participant: string | null;
      date: string;
      triggerPoint: string;
    }> = [];
    for (const r of data.responses) {
      for (const item of r.responses) {
        if (item.type === "text" && typeof item.value === "string" && item.value.trim()) {
          texts.push({
            question: item.questionText,
            answer: item.value,
            role: r.role,
            participant: r.participantName,
            date: r.createdAt,
            triggerPoint: r.triggerPoint,
          });
        }
      }
    }
    return texts;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-[#2E7D32]" />
          <h1 className="text-2xl font-bold text-gray-900">User Feedback</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export
            <ChevronDown className="w-3 h-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport("summary")}>
              Export Summary (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("raw")}>
              Export All Responses (CSV)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="TOURIST">Tourist</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="VERIFIER">Verifier</SelectItem>
          </SelectContent>
        </Select>

        <Select value={surveyTypeFilter} onValueChange={(v) => { setSurveyTypeFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="micro">Micro</SelectItem>
            <SelectItem value="session">Session</SelectItem>
          </SelectContent>
        </Select>

        <Select value={triggerFilter} onValueChange={(v) => { setTriggerFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Trigger" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Triggers</SelectItem>
            <SelectItem value="fee_payment">Fee Payment</SelectItem>
            <SelectItem value="business_review">Business Review</SelectItem>
            <SelectItem value="business_search">Business Search</SelectItem>
            <SelectItem value="business_detail">Business Detail</SelectItem>
            <SelectItem value="eco_certification">Eco Certification</SelectItem>
            <SelectItem value="analytics_view">Analytics View</SelectItem>
            <SelectItem value="check_in">Check-in</SelectItem>
            <SelectItem value="fee_scan">Fee Scan</SelectItem>
            <SelectItem value="session_end">Session End</SelectItem>
          </SelectContent>
        </Select>

        {/* "All time" toggle + DateRangeFilter */}
        <Button
          variant={dateRange === null ? "default" : "outline"}
          size="sm"
          className={dateRange === null ? "text-xs bg-[#2E7D32] hover:bg-[#1B5E20]" : "text-xs"}
          onClick={() => setDateRange(null)}
        >
          All time
        </Button>
        {dateRange !== null && (
          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
          />
        )}
      </div>

      {loading && !data ? (
        <div className="text-center py-12 text-gray-500">Loading feedback data...</div>
      ) : !summary || summary.totalResponses === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No feedback collected yet.</p>
            <p className="text-sm mt-1">Surveys will appear for users as they interact with the app.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="responses">Responses</TabsTrigger>
            <TabsTrigger value="text">Text Feedback</TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Responses</CardTitle>
                  <MessageSquare className="h-5 w-5 text-[#2E7D32]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.totalResponses}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Avg Rating</CardTitle>
                  <TrendingUp className="h-5 w-5 text-[#2E7D32]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {barData.length > 0
                      ? (barData.reduce((s, d) => s + d.avg * d.count, 0) / barData.reduce((s, d) => s + d.count, 0)).toFixed(1)
                      : "\u2014"}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">out of 5</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">NPS Score</CardTitle>
                  <TrendingUp className="h-5 w-5 text-[#2E7D32]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.npsScore}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {summary.npsScore >= 50 ? "Excellent" : summary.npsScore >= 0 ? "Good" : "Needs work"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">By Role</CardTitle>
                  <Users className="h-5 w-5 text-[#2E7D32]" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(summary.byRole).map(([role, count]) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {barData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Average Rating by Trigger</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="avg" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {pieData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Responses by Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tab 2: Responses */}
          <TabsContent value="responses" className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Responses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.responses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No responses match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.responses.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{formatDate(r.createdAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{ color: ROLE_COLORS[r.role] }}
                        >
                          {r.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.participantName || "\u2014"}</TableCell>
                      <TableCell className="text-xs capitalize">{r.surveyType}</TableCell>
                      <TableCell className="text-xs">{r.triggerPoint.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-xs max-w-xs">
                        {r.responses.map((item, i) => (
                          <div key={i} className="mb-1">
                            <span className="text-gray-400">{item.questionText}: </span>
                            <span className="font-medium">
                              {Array.isArray(item.value)
                                ? item.value.join(", ")
                                : String(item.value)}
                            </span>
                          </div>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500 py-1.5">
                  Page {page} of {data.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Text Feedback */}
          <TabsContent value="text" className="space-y-4">
            {allTextResponses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No text feedback yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {allTextResponses.map((item, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{ color: ROLE_COLORS[item.role] }}
                        >
                          {item.role}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {item.participant || "Anonymous"} &middot; {formatDate(item.date)}
                        </span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {item.triggerPoint.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{item.question}</p>
                      <p className="text-sm text-gray-900">{item.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
