export interface VolcanoAutocompleteSource {
  volcano_name: string;
  volcano_number: number;
}

export interface VolcanoAutocompleteOption extends VolcanoAutocompleteSource {
  label: string;
}

export const formatVolcanoAutocompleteLabel = (
  volcano: VolcanoAutocompleteSource,
): string => `${volcano.volcano_name} (${volcano.volcano_number})`;

export const createVolcanoAutocompleteOptions = <T extends VolcanoAutocompleteSource>(
  volcanoes: T[],
): VolcanoAutocompleteOption[] => volcanoes
  .map((volcano) => ({
    volcano_name: volcano.volcano_name,
    volcano_number: volcano.volcano_number,
    label: formatVolcanoAutocompleteLabel(volcano),
  }))
  .sort((left, right) => {
    const nameOrder = left.volcano_name.localeCompare(right.volcano_name);
    if (nameOrder !== 0) {
      return nameOrder;
    }
    return left.volcano_number - right.volcano_number;
  });

export const filterVolcanoAutocompleteOptions = <T extends VolcanoAutocompleteOption>(
  options: T[],
  query: string,
): T[] => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => (
    option.volcano_name.toLowerCase().includes(normalizedQuery)
    || option.label.toLowerCase().includes(normalizedQuery)
    || String(option.volcano_number).includes(query.trim())
  ));
};