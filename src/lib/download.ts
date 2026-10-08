/** Baixa um arquivo gerado no navegador (PDF, DOCX) sem passar pelo servidor. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // O navegador precisa da URL até iniciar o download.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
