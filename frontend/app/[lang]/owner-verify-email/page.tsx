import type { Metadata } from "next";

import OwnerVerifyEmailClient from "./OwnerVerifyEmailClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function OwnerVerifyEmailPage() {
  return <OwnerVerifyEmailClient />;
}
