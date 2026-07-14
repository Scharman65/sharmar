import type { Metadata } from "next";

import OwnerRegisterForm from "./OwnerRegisterForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function OwnerRegisterPage() {
  return <OwnerRegisterForm />;
}
