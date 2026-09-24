export const siteConfig = {
  name: "Construire Orée",
  shortName: "Construire Orée",
  description:
    "Le journal public de la construction d’Orée, une future marketplace éthique consacrée à la création originale, à l’art et à l’artisanat d’art.",

  language: "fr",
  locale: "fr_FR",

  project: {
    name: "Orée",
    currentPhase: "Point zéro",
    marketplaceAvailable: false,
  },

  repository: {
    organization: "ProjetOree",
    name: "construire-oree",
    url: "https://github.com/ProjetOree/construire-oree",
  },

  links: {
    follow: "https://tally.so/r/Bz57ON",
    join: "https://tally.so/r/685NbB",
    contact: "https://tally.so/r/q4eVx7",
    forum: "https://construire-oree.discourse.group/",
    forumWelcome:
      "https://construire-oree.discourse.group/t/bienvenue-sur-construire-oree/12",
    forumProject: "https://construire-oree.discourse.group/c/construire-oree/6",
    forumExperiences:
      "https://construire-oree.discourse.group/c/experiences-besoins/7",
  },

  social: {
    linkedin: "https://www.linkedin.com/in/jeremy-litique/",
    instagram: "https://www.instagram.com/projet.oree/",
    mastodon: null,
    bluesky: null,
    medium: null,
  },

  analytics: {
    cloudflareWebAnalytics: true,
  },

  licensing: {
    code: "AGPL-3.0-only",
    editorialContent: "CC BY-SA 4.0",
    trademarkExcluded: true,
  },
} as const;

export type SiteConfig = typeof siteConfig;
