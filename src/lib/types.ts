export type AppointmentStatus =
  | "solicitud"
  | "cotizado"
  | "seña_pendiente"
  | "confirmado"
  | "en_curso"
  | "completado"
  | "cancelado"
  | "no_show";

export type PaymentType = "seña" | "saldo" | "propina" | "producto" | "otro";

export type BodyZone =
  | "brazo"
  | "antebrazo"
  | "mano"
  | "hombro"
  | "pecho"
  | "espalda"
  | "costillas"
  | "pierna"
  | "pantorrilla"
  | "pie"
  | "cuello"
  | "muñeca"
  | "otro";

export type TattooStyle =
  | "realismo"
  | "tradicional"
  | "neotradicional"
  | "blackwork"
  | "fine_line"
  | "geométrico"
  | "lettering"
  | "japones"
  | "watercolor"
  | "minimalista"
  | "otro";

export type TattooSize = "pequeño" | "mediano" | "grande" | "manga" | "espalda_completa";

export interface Artist {
  id: string;
  name: string;
  slug: string;
  role: string;
  bio: string;
  specialties: TattooStyle[];
  avatar: string;
  photoUrl?: string;
  hourlyRate: number;
  commissionPercent: number;
  active: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  allergies: string;
  notes: string;
  totalSpent: number;
  visits: number;
  createdAt: string;
  lastVisit?: string;
}

export interface PortfolioItem {
  id: string;
  artistId: string;
  title: string;
  style: TattooStyle;
  image: string;
  featured: boolean;
}

export interface Appointment {
  id: string;
  clientId: string;
  artistId: string;
  title: string;
  style: TattooStyle;
  zone: BodyZone;
  size: TattooSize;
  description: string;
  references: string[];
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  estimatedHours: number;
  quotedPrice: number;
  depositAmount: number;
  depositPaid: boolean;
  balancePaid: boolean;
  consentSigned: boolean;
  consentId?: string;
  budget?: number;
  createdAt: string;
  sessionPackage?: SessionPackageId;
}

export interface Payment {
  id: string;
  appointmentId?: string;
  clientId: string;
  artistId: string;
  type: PaymentType;
  amount: number;
  method: "efectivo" | "transferencia" | "tarjeta" | "mercadopago";
  createdAt: string;
  note?: string;
}

export interface ConsentForm {
  id: string;
  appointmentId?: string;
  clientId: string;
  clientName: string;
  sessionTitle?: string;
  sessionAt?: string;
  signedAt?: string;
  signatureData?: string;
  acceptedTerms: boolean;
  healthDeclaration: string;
  idDocument?: string;
}

export interface Studio {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  city: string;
  address: string;
  phone: string;
  instagram: string;
  tiktok: string;
  tiktokUrl: string;
  facebook: string;
  bio: string;
  avatarUrl: string;
  logoUrl: string;
  coverUrl: string;
  followersLabel: string;
  depositPercent: number;
  aftercareText: string;
}

export type SessionPackageId = "una_hora" | "corta" | "estandar" | "larga";

export interface BookingRequestInput {
  name: string;
  email: string;
  phone: string;
  artistId: string;
  style: TattooStyle;
  zone: BodyZone;
  size: TattooSize;
  description: string;
  sessionPackage: SessionPackageId;
  budget?: number;
  preferredDate?: string;
}

export interface QuoteResult {
  estimatedHours: number;
  minPrice: number;
  maxPrice: number;
  suggestedPrice: number;
  depositAmount: number;
  complexity: "baja" | "media" | "alta" | "extrema";
  factors: string[];
}

export type AuctionStatus = "programada" | "en_vivo" | "finalizada" | "cancelada";

export type VerificationStatus =
  | "pendiente_documento"
  | "en_revision"
  | "verificado"
  | "rechazado";

export type DocumentType = "cedula" | "pasaporte";

export type UserRole = "user" | "studio_admin";

export interface VerifiedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  rut: string;
  documentType: DocumentType;
  documentDataUrl?: string;
  documentFileName?: string;
  profilePhotoUrl?: string;
  passwordHash: string;
  role?: UserRole;
  verificationStatus: VerificationStatus;
  reviewNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
}

export interface AuctionBid {
  id: string;
  auctionId: string;
  bidderName: string;
  bidderPhone?: string;
  bidderUserId?: string;
  verificationStatus?: VerificationStatus;
  amount: number;
  createdAt: string;
  isAuto?: boolean;
}

export interface TattooAuction {
  id: string;
  artistId: string;
  title: string;
  description: string;
  style: TattooStyle;
  size: TattooSize;
  image: string;
  startingPrice: number;
  minIncrement: number;
  currentBid: number;
  status: AuctionStatus;
  startsAt: string;
  endsAt: string;
  winnerName?: string;
  winnerPhone?: string;
  bids: AuctionBid[];
  viewers: number;
  createdAt: string;
}

export interface CreateAuctionInput {
  title: string;
  description: string;
  style: TattooStyle;
  size: TattooSize;
  image: string;
  startingPrice: number;
  minIncrement: number;
  durationMinutes: number;
}

export interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
  decidedAt?: string;
}

export type MarketingEventName =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "Schedule"
  | "Contact"
  | "CompleteRegistration"
  | "CTAClick";

export interface MarketingEvent {
  id: string;
  eventId: string;
  eventName: MarketingEventName;
  source: "landing" | "studio" | "booking" | "dashboard" | "auction" | "consent";
  path: string;
  channel: "internal" | "meta" | "ga4" | "tiktok";
  value?: number;
  metadata?: Record<string, string | number | boolean | undefined>;
  createdAt: string;
}

export type LeadTemperature = "nuevo" | "frio" | "tibio" | "caliente" | "listo";

export type LeadIntent =
  | "explorando"
  | "precio"
  | "agendar"
  | "indeciso"
  | "descartado";

export type ChatAuthor = "cliente" | "bot" | "artista";

export type ReferenceReviewStatus =
  | "sin_referencia"
  | "pendiente"
  | "aprobada"
  | "rechazada";

export interface ChatMessage {
  id: string;
  author: ChatAuthor;
  text: string;
  createdAt: string;
  quotePrice?: number;
  hasImage?: boolean;
}

export interface LeadQualification {
  style?: TattooStyle;
  zone?: BodyZone;
  size?: TattooSize;
  sessionPackage?: SessionPackageId;
  budget?: number;
  preferredDate?: string;
  hasReference: boolean;
  intent: LeadIntent;
}

export interface WhatsAppConversation {
  id: string;
  contactName: string;
  phone: string;
  avatarHue: number;
  botEnabled: boolean;
  temperature: LeadTemperature;
  score: number;
  unread: number;
  tags: string[];
  qualification: LeadQualification;
  referenceStatus: ReferenceReviewStatus;
  messages: ChatMessage[];
  createdAt: string;
  lastMessageAt: string;
  convertedAppointmentId?: string;
  archived?: boolean;
  /** ID de contacto en Meta WhatsApp Cloud API */
  waContactId?: string;
  /** demo = simulación local; whatsapp = conversación real vía API */
  source?: "demo" | "whatsapp";
}
