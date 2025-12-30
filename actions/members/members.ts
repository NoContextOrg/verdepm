"use server";

import {
  createClient as createServerClient,
  createAdminClient,
} from "@/lib/supabase/server";
import type { User } from "@/types/user";

type OrganizationMemberRow = {
  organization_id: string | null;
  user_id: string | null;
  role: string | null;
};

export async function fetchMembers(): Promise<User[]> {
  const supabase = await createServerClient();
  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !currentUser) {
    throw new Error("Unauthorized. You must be logged in to view members.");
  }

  const supabaseAdmin = createAdminClient();

  const { data: requesterMemberships, error: requesterMembershipError } =
    await supabaseAdmin
      .from("organization_member")
      .select("organization_id")
      .eq("user_id", currentUser.id);

  if (requesterMembershipError) {
    console.error(
      "Failed to resolve requester organization:",
      requesterMembershipError
    );
    throw new Error("Unable to determine your organization membership.");
  }

  const resolvedMembership = (requesterMemberships ?? []).find(
    (membership) => typeof membership?.organization_id === "string"
  );

  if (!resolvedMembership?.organization_id) {
    throw new Error("No organization membership found for this account.");
  }

  const organizationId = resolvedMembership.organization_id;

  const { data: organizationMembers, error: organizationMembersError } =
    await supabaseAdmin
      .from("organization_member")
      .select("user_id, role")
      .eq("organization_id", organizationId);

  if (organizationMembersError) {
    console.error(
      "Failed to load organization memberships:",
      organizationMembersError
    );
    throw new Error("Unable to load members for your organization.");
  }

  const memberRows = (organizationMembers ?? []).filter(
    (row): row is OrganizationMemberRow =>
      typeof row.user_id === "string" && row.user_id.length > 0
  );

  const memberIds = memberRows.map((row) => row.user_id!);

  if (memberIds.length === 0) {
    return [];
  }

  const { data: users, error: usersError } = await supabaseAdmin
    .from("users")
    .select("*")
    .in("user_id", memberIds);

  if (usersError) {
    console.error("Failed to load users:", usersError);
    throw new Error("Unable to load member profiles.");
  }

  const roleByUserId = new Map(
    memberRows.map((row) => [row.user_id!, row.role ?? null])
  );

  const membersWithRoles = (users ?? []).map((user) => ({
    ...user,
    role: (roleByUserId.get(user.user_id) ??
      user.role ??
      "member") as User["role"],
  }));

  return membersWithRoles;
}

export async function fetchRoles(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("roles")
    .select("name")
    .order("name");

  if (error) {
    console.error("Error fetching roles:", error);
    return [];
  }

  return data.map((r) => r.name);
}
