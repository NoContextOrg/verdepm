import { NextResponse } from "next/server";
import {
  createClient as createServerClient,
  createAdminClient,
} from "@/lib/supabase/server";

export async function PUT(request: Request) {
  const body = await request.json();

  const {
    userId,
    email,
    firstname,
    lastname,
    phone,
    role,
    avatarUrl,
    avatarStoragePath,
  } = body as {
    userId?: string;
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    role?: string;
    avatarUrl?: string | null;
    avatarStoragePath?: string | null;
  };

  const hasAvatarUrl = Object.prototype.hasOwnProperty.call(body, "avatarUrl");
  const hasAvatarStoragePath = Object.prototype.hasOwnProperty.call(
    body,
    "avatarStoragePath"
  );

  if (!userId) {
    return NextResponse.json(
      { error: "Missing user identifier." },
      { status: 400 }
    );
  }

  // Get the current authenticated user (the one making the modification)
  const supabase = await createServerClient();
  const {
    data: { user: currentUser },
    error: authCheckError,
  } = await supabase.auth.getUser();

  if (authCheckError || !currentUser) {
    return NextResponse.json(
      { error: "Unauthorized. You must be logged in to update users." },
      { status: 401 }
    );
  }

  const supabaseAdmin = createAdminClient();

  // Resolve the organization ID for the current user
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
    return NextResponse.json(
      { error: "Unable to determine your organization membership." },
      { status: 500 }
    );
  }

  const resolvedMembership = (requesterMemberships ?? []).find(
    (membership) => typeof membership?.organization_id === "string"
  );

  if (!resolvedMembership?.organization_id) {
    return NextResponse.json(
      { error: "No organization membership found for this account." },
      { status: 403 }
    );
  }

  const organizationId = resolvedMembership.organization_id;

  // Update role in organization_member if provided
  if (role) {
    const { error: roleError } = await supabaseAdmin
      .from("organization_member")
      .update({ role })
      .eq("organization_id", organizationId)
      .eq("user_id", userId);

    if (roleError) {
      console.error("Failed to update member role:", roleError);
      return NextResponse.json(
        { error: "Failed to update member role." },
        { status: 500 }
      );
    }
  }

  const shouldUpdateAuth = Boolean(email || phone || firstname || lastname);

  if (shouldUpdateAuth) {
    const displayName = [firstname, lastname].filter(Boolean).join(" ");
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(displayName
          ? {
              user_metadata: {
                display_name: displayName,
              },
            }
          : {}),
      }
    );

    if (authError) {
      console.error("Supabase auth error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
  }

  // Update the corresponding row in public.users
  const updatePayload: Record<string, unknown> = {
    modified_by: currentUser.id,
    modified_at: new Date().toISOString(),
  };

  const assignIfProvided = (key: string, value: unknown) => {
    if (typeof value !== "undefined") {
      updatePayload[key] = value;
    }
  };

  assignIfProvided("first_name", firstname);
  assignIfProvided("last_name", lastname);
  assignIfProvided("phone", phone);
  assignIfProvided("email", email);
  // Role is now handled in organization_member table
  // assignIfProvided("role", role);
  if (hasAvatarUrl) {
    assignIfProvided("avatar_url", avatarUrl ?? null);
  }
  if (hasAvatarStoragePath) {
    assignIfProvided("avatar_storage_path", avatarStoragePath ?? null);
  }

  const { data: updatedUser, error: profileError } = await supabaseAdmin
    .from("users")
    .update(updatePayload)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (profileError) {
    console.error("Error updating user profile:", profileError);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "User updated successfully.",
    user: updatedUser,
  });
}
