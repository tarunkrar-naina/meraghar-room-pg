import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { AuthCard } from "@/components/auth/AuthCard";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { getAuthUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Update Password",
  description: "Set a new password for your MeraGhar account.",
};

export default async function UpdatePasswordPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login?message=password-link");

  return (
    <Container className="py-12">
      <AuthCard title="Update password" subtitle="Choose a new password for your account.">
        <UpdatePasswordForm />
      </AuthCard>
    </Container>
  );
}