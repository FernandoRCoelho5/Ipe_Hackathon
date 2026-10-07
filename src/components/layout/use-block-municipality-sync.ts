"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useAppStore } from "@/stores/app-store";

/**
 * Mantém quarteirão selecionado (URL) e município ativo (cabeçalho) coerentes:
 * - um link para um quarteirão de outro município troca o município uma vez;
 * - se depois o usuário troca o município, a seleção antiga é descartada.
 */
export function useBlockMunicipalitySync(
  block: { id: string; municipalityId: string } | undefined,
  onMismatch: () => void,
) {
  const activeId = useAppStore((state) => state.municipalityId);
  const setMunicipalityId = useAppStore((state) => state.setMunicipalityId);
  const syncedBlock = useRef<string | null>(null);
  const clear = useEffectEvent(onMismatch);

  useEffect(() => {
    // Antes da reidratação do estado persistido não há município ativo.
    if (!block || !activeId) return;
    if (syncedBlock.current !== block.id) {
      syncedBlock.current = block.id;
      if (block.municipalityId !== activeId) setMunicipalityId(block.municipalityId);
      return;
    }
    if (block.municipalityId !== activeId) clear();
  }, [block, activeId, setMunicipalityId]);
}
