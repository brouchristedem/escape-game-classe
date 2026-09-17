import EspaceOrganisateur from "@/app/components/EspaceOrganisateur";
import { OWNER_EMAIL } from "@/lib/auth";

// Espace personnel de Christ : identique à /organisateur, mais réservé à son
// seul compte Google, pour piloter ses propres jeux et voir la plateforme
// comme n'importe quel organisateur.
export default function Page() {
  return <EspaceOrganisateur titre="Administration" restrictedEmail={OWNER_EMAIL} />;
}
