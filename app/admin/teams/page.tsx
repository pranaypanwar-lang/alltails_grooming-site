"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "../components/common/AdminPageHeader";
import { AdminSummaryBar } from "../components/common/AdminSummaryBar";
import { AdminActionConfirmModal } from "../components/common/AdminActionConfirmModal";
import { useAdminToast } from "../components/common/AdminToastProvider";
import { AdminTeamsTable } from "../components/teams/AdminTeamsTable";
import { AdminTeamEditModal } from "../components/teams/AdminTeamEditModal";
import { AdminTeamCoverageModal } from "../components/teams/AdminTeamCoverageModal";
import { AdminTeamMembersModal } from "../components/teams/AdminTeamMembersModal";
import { useAdminConfirmAction } from "../hooks/useAdminConfirmAction";
import {
  fetchAdminServiceAreas,
  fetchAdminTeams,
  testAdminTeamTelegram,
  createAdminTeamMember,
  updateAdminTeam,
  updateAdminTeamCoverage,
  updateAdminTeamMember,
  type AdminServiceArea,
  type AdminTeamRow,
} from "../lib/api";

type Draft = {
  name: string;
  isActive: boolean;
  telegramChatId: string;
  telegramAlertsEnabled: boolean;
  opsLeadName: string;
  opsLeadPhone: string;
};

type CoverageRuleDraft = {
  weekday: number;
  areaIds: string[];
};

export default function AdminTeamsPage() {
  const { showToast } = useAdminToast();

  const [teams, setTeams] = useState<AdminTeamRow[]>([]);
  const [serviceAreas, setServiceAreas] = useState<AdminServiceArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [editingTeam, setEditingTeam] = useState<AdminTeamRow | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [coverageTeam, setCoverageTeam] = useState<AdminTeamRow | null>(null);
  const [coverageRules, setCoverageRules] = useState<CoverageRuleDraft[]>([]);
  const [membersTeam, setMembersTeam] = useState<AdminTeamRow | null>(null);
  const [memberDraft, setMemberDraft] = useState({
    memberId: null as string | null,
    name: "",
    phone: "",
    password: "",
    role: "groomer",
    isActive: true,
  });
  const [draft, setDraft] = useState<Draft>({
    name: "", isActive: true, telegramChatId: "", telegramAlertsEnabled: false, opsLeadName: "", opsLeadPhone: "",
  });

  const testTelegramConfirm = useAdminConfirmAction<AdminTeamRow>({
    title: "Send test Telegram",
    getSubtitle: (team) => team?.name,
    tone: "default",
    getMessage: () => "This will send a test Telegram message to the configured team chat ID.",
    confirmLabel: "Send test",
  });

  const load = async (refresh = false) => {
    try {
      setError("");
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      const [data, serviceAreasData] = await Promise.all([
        fetchAdminTeams(),
        fetchAdminServiceAreas(),
      ]);
      setTeams(data.teams);
      setServiceAreas(serviceAreasData.serviceAreas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openEdit = (team: AdminTeamRow) => {
    setEditingTeam(team);
    setDraft({
      name: team.name,
      isActive: team.isActive ?? true,
      telegramChatId: team.telegramChatId ?? "",
      telegramAlertsEnabled: team.telegramAlertsEnabled,
      opsLeadName: team.opsLeadName ?? "",
      opsLeadPhone: team.opsLeadPhone ?? "",
    });
    setIsEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editingTeam) return;
    try {
      setIsSubmitting(true);
      await updateAdminTeam(editingTeam.id, {
        name: draft.name.trim(),
        isActive: draft.isActive,
        telegramChatId: draft.telegramChatId.trim() || null,
        telegramAlertsEnabled: draft.telegramAlertsEnabled,
        opsLeadName: draft.opsLeadName.trim() || null,
        opsLeadPhone: draft.opsLeadPhone.trim() || null,
      });
      showToast("Team updated.", true);
      setIsEditOpen(false);
      setEditingTeam(null);
      await load(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update team.", false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCoverage = (team: AdminTeamRow) => {
    const nextRules: CoverageRuleDraft[] = Array.from({ length: 7 }, (_, weekday) => {
      const rule = team.coverageRules?.find((entry) => entry.weekday === weekday);
      return {
        weekday,
        areaIds: rule?.areas.map((area) => area.serviceAreaId) ?? [],
      };
    });
    setCoverageTeam(team);
    setCoverageRules(nextRules);
  };

  const toggleCoverageArea = (weekday: number, areaId: string) => {
    setCoverageRules((prev) => prev.map((rule) => {
      if (rule.weekday !== weekday) return rule;
      return {
        ...rule,
        areaIds: rule.areaIds.includes(areaId)
          ? rule.areaIds.filter((value) => value !== areaId)
          : [...rule.areaIds, areaId],
      };
    }));
  };

  const submitCoverage = async () => {
    if (!coverageTeam) return;
    try {
      setIsSubmitting(true);
      await updateAdminTeamCoverage(coverageTeam.id, { rules: coverageRules });
      showToast("Coverage updated.", true);
      setCoverageTeam(null);
      await load(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update coverage.", false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMembers = (team: AdminTeamRow) => {
    setMembersTeam(team);
        setMemberDraft({
          memberId: null,
          name: "",
          phone: "",
          password: "",
          role: "groomer",
          isActive: true,
        });
  };

  const submitMember = async () => {
    if (!membersTeam || !memberDraft.name.trim()) return;
    try {
      setIsSubmitting(true);
      if (memberDraft.memberId) {
        await updateAdminTeamMember(membersTeam.id, {
          memberId: memberDraft.memberId,
          name: memberDraft.name.trim(),
          phone: memberDraft.phone.trim() || null,
          password: memberDraft.password || null,
          role: memberDraft.role,
          isActive: memberDraft.isActive,
        });
      } else {
        await createAdminTeamMember(membersTeam.id, {
          name: memberDraft.name.trim(),
          phone: memberDraft.phone.trim() || null,
          password: memberDraft.password || null,
          role: memberDraft.role,
          isActive: memberDraft.isActive,
        });
      }
      showToast("Team member saved.", true);
      await load(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save team member.", false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitTestTelegram = async () => {
    const team = testTelegramConfirm.state.payload;
    if (!team) return;
    try {
      testTelegramConfirm.setSubmitting(true);
      await testAdminTeamTelegram(team.id);
      showToast(`Test Telegram sent to ${team.name}.`, true);
      testTelegramConfirm.close();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to send test Telegram.", false);
    } finally {
      testTelegramConfirm.setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Teams"
          subtitle="Manage Telegram routing and ops lead settings."
          onRefresh={() => void load(true)}
          isRefreshing={isRefreshing}
        />

        <AdminSummaryBar
          columnsClassName="sm:grid-cols-2 xl:grid-cols-4"
          items={[
            { label: "Total teams",      value: teams.length },
            { label: "Telegram enabled", value: teams.filter((t) => t.telegramAlertsEnabled).length, tone: "success" },
            { label: "Missing chat ID",  value: teams.filter((t) => !t.telegramChatId).length, tone: "warning" },
            { label: "With ops lead",    value: teams.filter((t) => !!t.opsLeadName).length },
          ]}
        />

        <AdminTeamsTable
          rows={teams}
          isLoading={isLoading}
          error={error}
          testingTeamId={testTelegramConfirm.state.isSubmitting ? testTelegramConfirm.state.payload?.id : null}
          onEdit={openEdit}
          onManageMembers={openMembers}
          onEditCoverage={openCoverage}
          onTestTelegram={(team) => testTelegramConfirm.open(team)}
        />
      </div>

      <AdminTeamEditModal
        isOpen={isEditOpen}
        team={editingTeam}
        draft={draft}
        isSubmitting={isSubmitting}
        onClose={() => { setIsEditOpen(false); setEditingTeam(null); }}
        onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
        onSubmit={() => void submitEdit()}
      />

      <AdminTeamCoverageModal
        isOpen={!!coverageTeam}
        team={coverageTeam}
        serviceAreas={serviceAreas.filter((area) => area.isActive)}
        rules={coverageRules}
        isSubmitting={isSubmitting}
        onClose={() => setCoverageTeam(null)}
        onToggleArea={toggleCoverageArea}
        onSubmit={() => void submitCoverage()}
      />

      <AdminTeamMembersModal
        isOpen={!!membersTeam}
        team={membersTeam}
        draft={memberDraft}
        isSubmitting={isSubmitting}
        onClose={() => setMembersTeam(null)}
        onChange={(patch) => setMemberDraft((prev) => ({ ...prev, ...patch }))}
        onSubmit={() => void submitMember()}
        onEditMember={(member) => setMemberDraft({
          memberId: member.id,
          name: member.name,
          phone: member.phone ?? "",
          password: "",
          role: member.role,
          isActive: member.isActive,
        })}
      />

      <AdminActionConfirmModal
        {...testTelegramConfirm.modalProps}
        onSubmit={() => void submitTestTelegram()}
      />
    </div>
  );
}
