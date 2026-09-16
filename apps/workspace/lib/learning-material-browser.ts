import type { LearningMaterialSummary, LearningMaterialType } from "./types.ts";

export const LEARNING_MATERIAL_TYPES: readonly LearningMaterialType[] = [
  "concept_note",
  "derivation",
  "worked_example",
  "formula_sheet",
  "code_artifact",
  "diagram",
  "misconception_note",
  "source_note",
  "feynman_explanation",
];

export interface LearningMaterialBrowserFilters {
  query?: string;
  materialType?: LearningMaterialType;
  curatedOnly?: boolean;
  selectedMaterialIds?: readonly string[];
}

function searchText(material: LearningMaterialSummary): string {
  return [
    material.title,
    material.summary,
    material.whyReturn,
    material.missionId,
    material.materialType,
    material.materialType.replaceAll("_", " "),
    ...material.conceptIds,
  ].join("\n").toLocaleLowerCase();
}

export function filterLearningMaterials(
  materials: readonly LearningMaterialSummary[],
  filters: LearningMaterialBrowserFilters = {},
): LearningMaterialSummary[] {
  const query = filters.query?.trim().toLocaleLowerCase() || "";
  const selected = new Set(filters.selectedMaterialIds ?? []);

  return materials.filter((material) => {
    if (filters.materialType && material.materialType !== filters.materialType) return false;
    if (filters.curatedOnly && !selected.has(material.id)) return false;
    if (query && !searchText(material).includes(query)) return false;
    return true;
  });
}
