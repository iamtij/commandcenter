export type ProjectDef = {
  id: string;
  label: string;
  owner: string;
  repo: string;
  keywords: string[];
};

export const PROJECTS: ProjectDef[] = [
  {
    id: "olinn",
    label: "OLINN",
    owner: "iamtij",
    repo: "olin",
    keywords: ["olin", "olinn"],
  },
  {
    id: "fullhouse",
    label: "Fullhouse",
    owner: "iamtij",
    repo: "fullhouseph",
    keywords: ["fullhouse", "fullhouseph"],
  },
  {
    id: "eventix",
    label: "Eventix",
    owner: "iamtij",
    repo: "eventixph",
    keywords: ["eventix", "eventixph"],
  },
];

export function matchProject(text: string): ProjectDef | null {
  const hay = text.toLowerCase();
  for (const project of PROJECTS) {
    if (project.keywords.some((kw) => hay.includes(kw))) {
      return project;
    }
  }
  return null;
}
