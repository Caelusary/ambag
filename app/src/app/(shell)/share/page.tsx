import { ShareContent } from "@/components/ShareContent";
import { ShareLinks } from "@/components/ShareLinks";

export default function SharePage() {
  return (
    <div className="flex flex-col gap-6">
      <ShareLinks />
      <ShareContent />
    </div>
  );
}
