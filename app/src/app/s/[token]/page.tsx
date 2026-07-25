import { ShareContent } from "@/components/ShareContent";

export default function PublicSharePage() {
  return (
    <div className="flex min-h-dvh w-full justify-center bg-neutral-200 sm:py-10">
      <div className="w-full max-w-[560px] bg-bg sm:my-auto sm:rounded-[32px] sm:shadow-lg">
        <div className="border-b border-neutral-300 px-5 py-5 text-center">
          <div className="font-heading text-[20px] text-text">Ambag</div>
          <div className="mt-0.5 text-xs text-neutral-700">Shared read-only view</div>
        </div>
        <div className="p-5">
          <ShareContent />
        </div>
      </div>
    </div>
  );
}
