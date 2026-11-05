import type { RecommendInput } from "./types.ts";

/** Métiers pris en charge. Ajouter un métier = une entrée dans VERTICALS. */
export type VerticalId = "caviste" | "epicerie" | "librairie";

/** Icônes connues du widget (apps/widget/src/icons.ts). */
export type IconName = "bottle" | "gift" | "glass" | "star" | "jar" | "book";

export interface Idea {
  icon: IconName;
  label: string;
  query: Pick<RecommendInput, "category" | "max_price" | "occasion">;
}

/** Textes et réglages du widget propres au métier, envoyés avec la config de la boutique. */
export interface ShopCopy {
  /** « la cave » : « Je regarde dans la cave ». */
  place: string;
  /** « notre cave » : « Idées cadeaux dans notre cave ». */
  our_place: string;
  recipients: string[];
  occasions: string[];
  /** Exemple du champ libre de la page QR. */
  example: string;
  /** Raccourcis de la page QR ; le widget ajoute toujours « Les coups de cœur ». */
  ideas: Idea[];
  /** Puce de préférence sous les résultats (« Plus léger »), null si le métier n'en a pas. */
  lighter_label: string | null;
  /** Puce de catégorie sous les résultats (« En coffret »). */
  category_chip: { label: string; category: string } | null;
  /** Icône de la vignette selon la catégorie du produit, sinon `default_icon`. */
  icons: Record<string, IconName>;
  default_icon: IconName;
}

/** Réglages du classement de repli (côté serveur uniquement). */
interface Ranking {
  /** Mots du client absents des fiches → mots des fiches. Mots simples, sans tiret (passent par normalize). */
  synonyms: Record<string, string[]>;
  /** Mots-clés (`tags`) favorisés ou défavorisés par la puce de préférence. */
  lighter: { up: string; down: string };
  /** Bonus quand l'occasion choisie contient `word`. */
  occasions: { word: string; categories: string[]; bonus: number }[];
}

export interface Vertical {
  /** « Caviste », « Épicerie fine » : onglets de la page d'accueil, consigne du modèle. */
  label: string;
  copy: ShopCopy;
  ranking: Ranking;
}

export const VERTICALS: Record<VerticalId, Vertical> = {
  caviste: {
    label: "Caviste",
    copy: {
      place: "la cave",
      our_place: "notre cave",
      recipients: ["Mon beau-père", "Ma mère", "Un ami", "Un collègue", "Pour moi"],
      occasions: ["Noël", "Anniversaire", "Dîner chez des amis", "Merci"],
      example: "Pour mon beau-père, il aime les rouges puissants, 30 € max",
      ideas: [
        { icon: "gift", label: "Un coffret à offrir, moins de 40 €", query: { category: "coffret", max_price: 40 } },
        { icon: "glass", label: "Une bulle pour dire merci", query: { category: "effervescent", occasion: "Merci" } },
      ],
      lighter_label: "Plus léger",
      category_chip: { label: "En coffret", category: "coffret" },
      icons: { coffret: "gift" },
      default_icon: "bottle",
    },
    ranking: {
      synonyms: {
        bulle: ["effervescent"],
        petillant: ["effervescent"],
        champagne: ["effervescent"],
        fete: ["festif", "effervescent"],
        sud: ["languedoc", "roussillon", "rhone", "provence", "sudouest"],
        loire: ["anjou", "loire"],
        coffret: ["coffret"],
        doux: ["moelleux", "doux"],
        leger: ["leger", "frais"],
      },
      lighter: { up: "léger frais souple fruité", down: "puissant tannique" },
      occasions: [
        { word: "merci", categories: ["effervescent"], bonus: 2 },
        { word: "noel", categories: ["coffret"], bonus: 1 },
        { word: "diner", categories: ["rouge", "blanc"], bonus: 1 },
      ],
    },
  },

  epicerie: {
    label: "Épicerie fine",
    copy: {
      place: "l'épicerie",
      our_place: "notre épicerie",
      recipients: ["Ma mère", "Un ami", "Un collègue", "Nos hôtes", "Pour moi"],
      occasions: ["Noël", "Anniversaire", "Dîner chez des amis", "Merci"],
      example: "Pour ma sœur, elle adore le chocolat et le thé, 30 € max",
      ideas: [
        { icon: "gift", label: "Un coffret gourmand, moins de 40 €", query: { category: "coffret", max_price: 40 } },
        { icon: "jar", label: "Une douceur pour dire merci", query: { category: "sucré", occasion: "Merci" } },
      ],
      lighter_label: "Plutôt sucré",
      category_chip: { label: "En coffret", category: "coffret" },
      icons: { coffret: "gift", boisson: "bottle" },
      default_icon: "jar",
    },
    ranking: {
      synonyms: {
        chocolat: ["chocolat", "cacao"],
        gourmand: ["gourmand", "sucre"],
        douceur: ["sucre", "gourmand"],
        sucre: ["sucre"],
        apero: ["aperitif"],
        aperitif: ["aperitif"],
        sale: ["sale"],
        cuisine: ["cuisine"],
        cuisinier: ["cuisine"],
        cuisiner: ["cuisine"],
        the: ["the", "infusion"],
        tisane: ["infusion", "zen"],
        cafe: ["cafe"],
        epice: ["epice"],
        releve: ["epice"],
        fete: ["festif"],
        enfant: ["enfant", "gourmand"],
      },
      lighter: { up: "sucré gourmand chocolat fondant", down: "salé épicé iodé" },
      occasions: [
        { word: "noel", categories: ["coffret"], bonus: 1 },
        { word: "merci", categories: ["sucré"], bonus: 1 },
        { word: "diner", categories: ["coffret", "salé"], bonus: 1 },
      ],
    },
  },

  librairie: {
    label: "Librairie",
    copy: {
      place: "la librairie",
      our_place: "notre librairie",
      recipients: ["Ma mère", "Mon neveu", "Un ami", "Un collègue", "Pour moi"],
      occasions: ["Noël", "Anniversaire", "Départ en vacances", "Merci"],
      example: "Pour mon neveu de 12 ans, il aime l'aventure et la BD, 20 € max",
      ideas: [
        { icon: "book", label: "Un beau livre à offrir", query: { category: "beau livre" } },
        { icon: "gift", label: "Pour un enfant, moins de 20 €", query: { category: "jeunesse", max_price: 20 } },
      ],
      lighter_label: "Plus léger",
      category_chip: { label: "Beau livre", category: "beau livre" },
      icons: {},
      default_icon: "book",
    },
    ranking: {
      synonyms: {
        bd: ["bd"],
        bande: ["bd"],
        dessinee: ["bd"],
        manga: ["bd"],
        polar: ["polar", "enquete"],
        thriller: ["polar", "haletant"],
        enquete: ["polar", "enquete"],
        policier: ["polar"],
        enfant: ["jeunesse"],
        ado: ["ado", "jeunesse"],
        adolescent: ["ado"],
        neveu: ["jeunesse", "ado"],
        niece: ["jeunesse", "ado"],
        drole: ["drole", "humour"],
        rire: ["drole", "humour"],
        humour: ["humour", "drole"],
        voyage: ["voyage"],
        histoire: ["historique", "histoire"],
        cuisine: ["cuisine"],
        photo: ["photo"],
        nature: ["nature"],
        fantasy: ["fantasy"],
        aventure: ["aventure"],
        beau: ["beau"],
      },
      lighter: { up: "léger drôle tendre feelgood lumineux", down: "sombre dense exigeant" },
      occasions: [
        { word: "noel", categories: ["beau livre"], bonus: 1 },
        { word: "vacance", categories: ["roman", "polar", "bd"], bonus: 1 },
      ],
    },
  },
};

/** Métier d'une boutique ; une valeur inconnue (base modifiée à la main) retombe sur « caviste ». */
export function verticalOf(id: string): Vertical {
  return VERTICALS[id as VerticalId] ?? VERTICALS.caviste;
}
