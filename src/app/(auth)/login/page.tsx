import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your MeraGhar account to manage properties and save favorites.",
};

export default function LoginPage() {
  return (
    <Container className="py-12">
      <AuthCard title="Login" subtitle="Welcome back! Sign in to your account.">
        <Suspense>
          <LoginForm />
        </Suspense>
      </AuthCard>
    </Container>
  );
}