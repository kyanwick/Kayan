export type Warmth = "hot" | "warm" | "cold";

export type Category =
  | "creator"
  | "tech"
  | "muslim_community"
  | "business"
  | "personal"
  | string;

export type InteractionType =
  | "call"
  | "text"
  | "coffee"
  | "dinner"
  | "event"
  | "email"
  | "dm"
  | "other";

export interface Contact {
  id: string;
  created_at: string;
  name: string;
  photo_url: string | null;
  category: Category | null;
  how_we_met: string | null;
  notes: string | null;
  last_touched_at: string | null;
  last_touched_note: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  instagram: string | null;
  twitter: string | null;
  linkedin: string | null;
  tiktok: string | null;
  follow_up_at: string | null;
  archived: boolean;
}

export interface ContactTag {
  id: string;
  contact_id: string;
  tag: string;
}

export interface ContactOffer {
  id: string;
  contact_id: string;
  text: string;
}

export interface ContactNeed {
  id: string;
  contact_id: string;
  text: string;
}

export interface Interaction {
  id: string;
  contact_id: string;
  note: string;
  date: string;
  type: InteractionType;
}

export interface ContactWithRelations extends Contact {
  contact_tags: ContactTag[];
  contact_offers: ContactOffer[];
  contact_needs: ContactNeed[];
  interactions: Interaction[];
}
