import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your MeraGhar account password.",
};

export default function ForgotPasswordPage() {
  return (
    <Container className="py-12">
      <AuthCard title="Forgot password" subtitle="We'll send you a reset link.">
        <ForgotPasswordForm />
      </AuthCard>
    </Container>
  );
}