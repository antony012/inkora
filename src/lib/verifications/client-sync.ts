import type { VerifiedUser } from "@/lib/types";

export async function pushVerificationUserToServer(user: VerifiedUser) {
  try {
    await fetch("/api/verifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user }),
    });
  } catch (error) {
    console.error("Verification sync push failed", error);
  }
}

export async function pushVerificationReviewToServer(input: {
  userId: string;
  status: VerifiedUser["verificationStatus"];
  reviewNote?: string;
  reviewedAt: string;
  reviewedBy: string;
}) {
  try {
    await fetch(`/api/verifications/${input.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: input.status,
        reviewNote: input.reviewNote,
        reviewedAt: input.reviewedAt,
        reviewedBy: input.reviewedBy,
      }),
    });
  } catch (error) {
    console.error("Verification review sync failed", error);
  }
}

export async function fetchVerificationUsersFromServer(): Promise<VerifiedUser[]> {
  try {
    const response = await fetch("/api/verifications", {
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { users?: VerifiedUser[] };
    return data.users ?? [];
  } catch (error) {
    console.error("Verification sync fetch failed", error);
    return [];
  }
}
