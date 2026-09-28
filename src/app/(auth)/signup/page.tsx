import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a free MeraGhar account to list or save properties in Kaithal, Kurukshetra, Pundri and Narwana.",
};

export default function SignupPage() {
  return (
    <Container className="py-12">
      <AuthCard title="Create account" subtitle="Join MeraGhar to buy, sell or rent properties.">
        <SignupForm />
      </AuthCard>
    </Container>
  );
}