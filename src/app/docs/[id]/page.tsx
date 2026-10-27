import { DocumentView } from "@/components/editor/document-view";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Keyed so navigating between documents starts with a fresh editor.
  return <DocumentView key={id} documentId={id} />;
}
