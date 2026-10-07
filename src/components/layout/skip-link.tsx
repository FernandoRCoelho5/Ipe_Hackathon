import { messages } from "@/lib/i18n";

export function SkipLink() {
  return (
    <a
      href="#conteudo"
      className="fixed top-3 left-3 z-60 -translate-y-24 rounded-lg bg-verde-ipe px-4 py-2 text-sm font-medium text-white shadow-pop transition-transform focus:translate-y-0"
    >
      {messages.common.skipToContent}
    </a>
  );
}
