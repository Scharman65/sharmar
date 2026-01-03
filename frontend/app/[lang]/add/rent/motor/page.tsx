import { BoatForm } from "@/components/boat-form/BoatForm";

export default function Page() {
  return <BoatForm mode={{ kind: "rent", boatType: "motor" }} />;
}
