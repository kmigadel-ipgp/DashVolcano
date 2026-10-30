/**
 * Global Volcanism Program (Smithsonian Institution): links and the citation
 * the GVP asks for when a volcano profile is used.
 */

/**
 * Volcanoes of the World release DashVolcano's GVP data comes from (cited on the
 * About page too). Cite this release, not the latest one on the GVP website.
 */
export const GVP_VOTW = {
  year: 2025,
  version: '5.3.3',
  date: '26 Nov 2025',
  doi: 'https://doi.org/10.5479/si.GVP.VOTW5-2025.5.3',
} as const;

/** Volcano page on the GVP website */
export const gvpVolcanoUrl = (volcanoNumber: number) => `https://volcano.si.edu/volcano.cfm?vn=${volcanoNumber}`;

/** Citation text before the DOI, e.g. "Global Volcanism Program, 2025. St. Helens (321050) in [Database] ... Venzke, E." */
export const gvpVolcanoCitation = (volcanoName: string, volcanoNumber: number) =>
  `Global Volcanism Program, ${GVP_VOTW.year}. ${volcanoName} (${volcanoNumber}) in [Database] Volcanoes of the World ` +
  `(v. ${GVP_VOTW.version}; ${GVP_VOTW.date}). Distributed by Smithsonian Institution, compiled by Venzke, E.`;
