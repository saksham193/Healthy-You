import type { MedicalKnowledgeDocument } from "../MedicalKnowledgeTypes";

export const createVersionId = (document: Pick<MedicalKnowledgeDocument, "id" | "version">): string =>
  `${document.id}@${document.version}`;

export const supersedes = (
  newer: Pick<MedicalKnowledgeDocument, "supersedes">,
  older: Pick<MedicalKnowledgeDocument, "id" | "version">,
): boolean => newer.supersedes === createVersionId(older);

export const latestActiveDocuments = (documents: MedicalKnowledgeDocument[]): MedicalKnowledgeDocument[] => {
  const byId = new Map<string, MedicalKnowledgeDocument>();

  documents.forEach((document) => {
    const existing = byId.get(document.id);

    if (!existing || document.version.localeCompare(existing.version, undefined, { numeric: true }) > 0) {
      byId.set(document.id, document);
    }
  });

  return Array.from(byId.values());
};
