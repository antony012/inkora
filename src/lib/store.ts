"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  appointments as seedAppointments,
  artists as seedArtists,
  auctions as seedAuctions,
  clients as seedClients,
  consents as seedConsents,
  conversations as seedConversations,
  marketplaceListings as seedMarketplaceListings,
  marketplaceOrders as seedMarketplaceOrders,
  artistSaleContracts as seedArtistSaleContracts,
  payments as seedPayments,
  portfolio as seedPortfolio,
  studio as seedStudio,
  verifiedUsers as seedUsers,
} from "./seed";
import { nextMinBid, resolveAuctionStatus, sortBids } from "./auction";
import {
  marketplaceSplit,
  requiresArtistSaleContract,
  STUDIO_MARKETPLACE_FEE_PERCENT,
  studioMarketplaceSplit,
} from "./marketplace";
import { broadcastAuctionUpdate } from "./live-sync";
import { mergeAuctionLists, sanitizeAuctionsForSync } from "./live-merge";
import { pushLiveRoomToServer } from "./live-room/client-sync";
import { mergeUsers, readTabSessionUserId, writeTabSessionUserId } from "./session";
import { CARIZO_STORE_KEY } from "./storage-keys";
import {
  fetchVerificationUsersFromServer,
  pushVerificationReviewToServer,
  pushVerificationUserToServer,
} from "./verifications/client-sync";
import { removePresence } from "./presence";
import { DEFAULT_CRM_BOT_CONFIG, type CrmBotConfig } from "./bot-knowledge";
import { quoteSessionPackage } from "./quote-engine";
import {
  analyzeClientMessage,
  generateBotReply,
  mergeQualification,
  scoreLead,
} from "./chat-bot";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from "./password";
import { LEGACY_STUDIO_ADMIN_EMAILS, STUDIO_ADMIN_EMAIL } from "./auth";
import type {
  Appointment,
  ArtworkListing,
  Artist,
  ArtistSaleContract,
  AuctionRoomKick,
  BookingRequestInput,
  Client,
  ConsentForm,
  ConsentPreferences,
  CreateAuctionInput,
  DocumentType,
  MarketingEvent,
  MarketplaceOrder,
  Payment,
  PortfolioItem,
  SessionPackageId,
  Studio,
  TattooAuction,
  TattooSize,
  TattooStyle,
  UserRole,
  VerificationStatus,
  VerifiedUser,
  WhatsAppConversation,
} from "./types";

interface CarrizoState {
  studio: Studio;
  artists: Artist[];
  clients: Client[];
  appointments: Appointment[];
  payments: Payment[];
  portfolio: PortfolioItem[];
  consents: ConsentForm[];
  consentPreferences: ConsentPreferences;
  marketingEvents: MarketingEvent[];
  auctions: TattooAuction[];
  auctionRoomKicks: AuctionRoomKick[];
  marketplaceListings: ArtworkListing[];
  marketplaceOrders: MarketplaceOrder[];
  artistSaleContracts: ArtistSaleContract[];
  conversations: WhatsAppConversation[];
  crmBotConfig: CrmBotConfig;
  whatsappConnected: boolean;
  users: VerifiedUser[];
  sessionUserId: string | null;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  resetDemo: () => void;
  setConsentPreferences: (preferences: ConsentPreferences) => void;
  registerMarketingEvent: (
    event: Omit<MarketingEvent, "id" | "createdAt">,
  ) => void;
  registerUser: (input: {
    name: string;
    email: string;
    phone: string;
    rut: string;
    documentType: DocumentType;
    password: string;
  }) => Promise<{ ok: boolean; error?: string; userId?: string }>;
  loginUser: (input: {
    email: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string; isStudioAdmin?: boolean }>;
  ensureStudioAdmin: () => Promise<void>;
  ensureDemoUserPasswords: () => Promise<void>;
  changePassword: (input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  resetPassword: (input: {
    email: string;
    phone: string;
    rut: string;
    newPassword: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logoutUser: () => void;
  submitIdentityDocument: (input: {
    userId: string;
    documentDataUrl: string;
    documentFileName: string;
  }) => { ok: boolean; error?: string };
  updateProfilePhoto: (input: {
    userId: string;
    profilePhotoUrl: string;
  }) => { ok: boolean; error?: string };
  reviewVerification: (input: {
    userId: string;
    status: Extract<VerificationStatus, "verificado" | "rechazado">;
    reviewNote?: string;
  }) => void;
  adminCreateUser: (input: {
    name: string;
    email: string;
    phone: string;
    rut: string;
    documentType: DocumentType;
    password: string;
    role?: UserRole;
    verificationStatus?: VerificationStatus;
  }) => Promise<{ ok: boolean; error?: string; userId?: string }>;
  adminDeleteUser: (userId: string) => {
    ok: boolean;
    error?: string;
  };
  adminSetUserBlocked: (input: {
    userId: string;
    blocked: boolean;
    reason?: string;
  }) => { ok: boolean; error?: string };
  adminSetUserPassword: (input: {
    userId: string;
    newPassword: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  adminSetVerificationStatus: (input: {
    userId: string;
    status: VerificationStatus;
    reviewNote?: string;
  }) => void;
  createAuction: (input: CreateAuctionInput) => string;
  extendAuction: (auctionId: string, extraMinutes: number) => {
    ok: boolean;
    error?: string;
  };
  kickAuctionUser: (input: { userId: string; reason?: string }) => {
    ok: boolean;
    error?: string;
  };
  unkickAuctionUser: (userId: string) => void;
  placeBid: (input: {
    auctionId: string;
    amount: number;
  }) => { ok: boolean; error?: string };
  syncAuctionStatuses: () => void;
  cancelAuction: (auctionId: string) => void;
  bumpAuctionViewers: (auctionId: string) => void;
  upsertMarketplaceArtist: (input: {
    id?: string;
    name: string;
    role: string;
    bio: string;
    story: string;
    specialties: TattooStyle[];
    photoUrl?: string;
    marketplaceFeePercent?: number;
    hourlyRate?: number;
    commissionPercent?: number;
  }) => string;
  updateMarketplaceArtist: (
    artistId: string,
    patch: Partial<
      Pick<
        Artist,
        | "name"
        | "role"
        | "bio"
        | "story"
        | "specialties"
        | "photoUrl"
        | "marketplaceFeePercent"
        | "active"
      >
    >,
  ) => void;
  createPortfolioItem: (input: {
    artistId?: string;
    title: string;
    style: TattooStyle;
    image: string;
    featured?: boolean;
  }) => string;
  updatePortfolioItem: (
    itemId: string,
    patch: Partial<
      Pick<PortfolioItem, "title" | "style" | "image" | "featured" | "artistId">
    >,
  ) => void;
  deletePortfolioItem: (itemId: string) => void;
  createMarketplaceListing: (input: {
    artistId: string;
    title: string;
    description: string;
    story?: string;
    style: TattooStyle;
    size?: TattooSize;
    image: string;
    price: number;
    portfolioItemId?: string;
  }) => string;
  updateMarketplaceListing: (
    listingId: string,
    patch: Partial<
      Pick<
        ArtworkListing,
        "title" | "description" | "story" | "price" | "image" | "style" | "size"
      >
    >,
  ) => void;
  updateMarketplaceListingStatus: (
    listingId: string,
    status: ArtworkListing["status"],
  ) => void;
  signArtistSaleContract: (
    contractId: string,
    data: { signatureData: string },
  ) => void;
  ensureArtistSaleContract: (listingId: string) => {
    ok: boolean;
    error?: string;
    contractId?: string;
  };
  bumpListingView: (listingId: string) => void;
  trackListingClick: (listingId: string) => void;
  favoriteListing: (listingId: string) => void;
  purchaseListing: (input: {
    listingId: string;
    paymentMethod?: Payment["method"];
  }) => { ok: boolean; error?: string; orderId?: string };
  markMarketplaceOrderPaid: (orderId: string) => void;
  markMarketplaceOrderDelivered: (orderId: string) => void;
  cancelMarketplaceOrder: (orderId: string) => void;
  createBookingRequest: (input: BookingRequestInput) => {
    appointmentId: string;
    clientId: string;
  };
  approveQuote: (appointmentId: string, price?: number) => void;
  markDepositPaid: (appointmentId: string, method?: Payment["method"]) => void;
  markCompleted: (appointmentId: string) => void;
  registerPayment: (payment: Omit<Payment, "id" | "createdAt">) => void;
  signConsent: (
    consentId: string,
    data: { signatureData: string; healthDeclaration: string },
  ) => void;
  createConsentForAppointment: (appointmentId: string) => string;
  createConsent: (input: {
    clientId: string;
    clientName: string;
    appointmentId?: string;
    sessionTitle?: string;
    sessionAt?: string;
  }) => { ok: boolean; error?: string; consentId?: string };
  updateAppointmentStatus: (
    appointmentId: string,
    status: Appointment["status"],
  ) => void;
  sendClientMessage: (
    conversationId: string,
    text: string,
    options?: { hasImage?: boolean },
  ) => void;
  sendClientImage: (conversationId: string) => void;
  reviewReference: (
    conversationId: string,
    status: "aprobada" | "rechazada",
  ) => void;
  sendArtistMessage: (conversationId: string, text: string) => Promise<void>;
  runBotReply: (
    conversationId: string,
  ) => Promise<{ engine?: string; geminiModel?: string; geminiError?: string } | void>;
  toggleConversationBot: (conversationId: string) => void;
  markConversationRead: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => void;
  simulateIncomingLead: () => string;
  convertConversationToRequest: (conversationId: string) => {
    ok: boolean;
    error?: string;
    appointmentId?: string;
  };
  setCrmBotConfig: (patch: Partial<CrmBotConfig>) => void;
  syncWhatsAppFromServer: () => Promise<void>;
  syncVerificationsFromServer: () => Promise<void>;
  mergeWhatsAppConversations: (items: WhatsAppConversation[]) => void;
}

const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

function mergeUsersWithSeedPasswords(users: VerifiedUser[]): VerifiedUser[] {
  return users.map((user) => {
    const seedMatch = seedUsers.find((seed) => seed.email === user.email);
    if (!seedMatch) return user;
    return {
      ...user,
      passwordHash: user.passwordHash || seedMatch.passwordHash,
      passwordPlain: user.passwordPlain || seedMatch.passwordPlain,
    };
  });
}

function mergeMarketplaceArtists(persisted?: Artist[]): Artist[] {
  const custom = (persisted ?? []).filter(
    (artist) => !seedArtists.some((seed) => seed.id === artist.id),
  );
  return seedArtists
    .map((seed) => {
      const saved = persisted?.find((artist) => artist.id === seed.id);
      const merged = saved ? { ...seed, ...saved } : seed;
      return {
        ...merged,
        marketplaceFeePercent: STUDIO_MARKETPLACE_FEE_PERCENT,
      };
    })
    .concat(
      custom.map((artist) => ({
        ...artist,
        marketplaceFeePercent: STUDIO_MARKETPLACE_FEE_PERCENT,
      })),
    );
}

function normalizeArtistSaleContracts(
  contracts?: ArtistSaleContract[],
): ArtistSaleContract[] {
  return (contracts ?? []).map((contract) => {
    const split = studioMarketplaceSplit(contract.artworkPrice);
    return {
      ...contract,
      studioFeePercent: split.feePercent,
      studioFee: split.platformFee,
      artistPayout: split.artistPayout,
    };
  });
}

function mergeMarketplaceListings(persisted?: ArtworkListing[]): ArtworkListing[] {
  const items = persisted ?? [];
  const missing = seedMarketplaceListings.filter(
    (seed) => !items.some((item) => item.id === seed.id),
  );
  return [...items, ...missing];
}

function mergePortfolio(persisted?: PortfolioItem[]): PortfolioItem[] {
  if (!persisted?.length) return [...seedPortfolio];
  return persisted;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeRut(value: string) {
  return value.replace(/[^0-9kK]/g, "").toUpperCase();
}

const initialState = {
  studio: seedStudio,
  artists: seedArtists,
  clients: seedClients,
  appointments: seedAppointments,
  payments: seedPayments,
  portfolio: seedPortfolio,
  consents: seedConsents,
  consentPreferences: { analytics: false, marketing: false },
  marketingEvents: [] as MarketingEvent[],
  auctions: seedAuctions,
  auctionRoomKicks: [] as AuctionRoomKick[],
  marketplaceListings: seedMarketplaceListings,
  marketplaceOrders: seedMarketplaceOrders,
  artistSaleContracts: seedArtistSaleContracts,
  conversations: seedConversations,
  crmBotConfig: DEFAULT_CRM_BOT_CONFIG,
  whatsappConnected: false,
  users: seedUsers,
  sessionUserId: null as string | null,
};

function createCarrizoStore() {
  return create<CarrizoState>()(
  persist(
    (set, get) => ({
      ...initialState,
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      resetDemo: () =>
        set({
          ...initialState,
          hydrated: true,
          consentPreferences: { analytics: false, marketing: false },
          marketingEvents: [],
          auctions: seedAuctions,
          marketplaceListings: seedMarketplaceListings,
          marketplaceOrders: seedMarketplaceOrders,
          users: seedUsers,
          crmBotConfig: DEFAULT_CRM_BOT_CONFIG,
          sessionUserId: null,
        }),

      setConsentPreferences: (preferences) => set({ consentPreferences: preferences }),

      registerMarketingEvent: (event) => {
        set((s) => ({
          marketingEvents: [
            {
              ...event,
              id: uid("mkt"),
              createdAt: new Date().toISOString(),
            },
            ...s.marketingEvents,
          ].slice(0, 250),
        }));
      },

      registerUser: async (input) => {
        const email = input.email.trim().toLowerCase();
        const exists = get().users.find((user) => user.email === email);
        if (exists) {
          return { ok: false, error: "Ya existe una cuenta con ese email." };
        }

        const strength = validatePasswordStrength(input.password);
        if (!strength.ok) {
          return { ok: false, error: strength.errors.join(" ") };
        }

        const passwordHash = await hashPassword(input.password);
        const passwordUpdatedAt = new Date().toISOString();
        const userId = uid("user");
        const user: VerifiedUser = {
          id: userId,
          name: input.name,
          email,
          phone: input.phone,
          rut: input.rut,
          documentType: input.documentType,
          passwordHash,
          passwordPlain: input.password,
          passwordUpdatedAt,
          verificationStatus: "pendiente_documento",
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          users: [user, ...s.users],
          sessionUserId: userId,
        }));
        writeTabSessionUserId(userId);
        broadcastAuctionUpdate();
        void pushVerificationUserToServer(user);
        return { ok: true, userId };
      },

      loginUser: async ({ email, password }) => {
        const normalizedEmail = email.trim().toLowerCase();
        const user = get().users.find((item) => item.email === normalizedEmail);
        if (!user) {
          return {
            ok: false,
            error: "Email o contraseña incorrectos.",
          };
        }

        if (!user.passwordHash) {
          return {
            ok: false,
            error: "Esta cuenta no tiene contraseña. Crea una cuenta nueva.",
          };
        }

        if (user.blocked) {
          return {
            ok: false,
            error:
              user.blockedReason?.trim() ||
              "Esta cuenta está bloqueada. Contacta al estudio.",
          };
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          // Si el admin ve una clave distinta al hash (desync), realinea y deja entrar.
          if (user.passwordPlain && user.passwordPlain === password) {
            const passwordHash = await hashPassword(password);
            const passwordUpdatedAt = new Date().toISOString();
            const healed: VerifiedUser = {
              ...user,
              passwordHash,
              passwordPlain: password,
              passwordUpdatedAt,
            };
            set((s) => ({
              users: s.users.map((item) =>
                item.id === user.id ? healed : item,
              ),
              sessionUserId: user.id,
            }));
            writeTabSessionUserId(user.id);
            void pushVerificationUserToServer(healed);
            broadcastAuctionUpdate();
            return { ok: true, isStudioAdmin: user.role === "studio_admin" };
          }

          return {
            ok: false,
            error: "Email o contraseña incorrectos.",
          };
        }

        set({ sessionUserId: user.id });
        writeTabSessionUserId(user.id);
        broadcastAuctionUpdate();
        return { ok: true, isStudioAdmin: user.role === "studio_admin" };
      },

      ensureStudioAdmin: async () => {
        const state = get();
        const email = STUDIO_ADMIN_EMAIL.toLowerCase();
        const legacyEmails = LEGACY_STUDIO_ADMIN_EMAILS.map((item) =>
          item.toLowerCase(),
        );
        const legacy = state.users.find((user) =>
          legacyEmails.includes(user.email),
        );
        const existing = state.users.find((user) => user.email === email);
        const passwordHash =
          existing?.passwordHash ??
          legacy?.passwordHash ??
          (await hashPassword("Enderxon2026!"));

        const admin: VerifiedUser = {
          id: existing?.id ?? legacy?.id ?? "user-studio-admin",
          name: state.studio.name,
          email,
          phone: state.studio.phone,
          rut: legacy?.rut ?? "—",
          documentType: "cedula",
          profilePhotoUrl: state.studio.avatarUrl,
          passwordHash,
          passwordPlain:
            existing?.passwordPlain ??
            legacy?.passwordPlain ??
            "Enderxon2026!",
          passwordUpdatedAt:
            existing?.passwordUpdatedAt ?? legacy?.passwordUpdatedAt,
          role: "studio_admin",
          verificationStatus: "verificado",
          createdAt:
            existing?.createdAt ??
            legacy?.createdAt ??
            new Date().toISOString(),
        };

        if (
          existing &&
          existing.role === "studio_admin" &&
          existing.passwordHash &&
          existing.email === email
        ) {
          if (!existing.passwordPlain) {
            set((s) => ({
              users: s.users.map((user) =>
                user.id === existing.id
                  ? {
                      ...user,
                      passwordPlain: "Enderxon2026!",
                    }
                  : user,
              ),
            }));
          }
          if (legacy && legacy.id !== existing.id) {
            set((s) => ({
              users: s.users.filter(
                (user) => !legacyEmails.includes(user.email),
              ),
            }));
          }
          return;
        }

        set((s) => ({
          users: [
            admin,
            ...s.users.filter(
              (user) =>
                user.email !== email && !legacyEmails.includes(user.email),
            ),
          ],
        }));
        broadcastAuctionUpdate();
      },

      ensureDemoUserPasswords: async () => {
        const demoPasswords: Record<string, string> = {
          "sofia@email.com": "Sofia2026!",
          "diego@email.com": "Diego2026!",
          "ana@email.com": "Ana2026!",
        };

        const current = get().users;
        let changed = false;
        const nextUsers: VerifiedUser[] = [];

        for (const user of current) {
          const demoPassword = demoPasswords[user.email.toLowerCase()];

          // Cualquier usuario: si hay passwordPlain, el hash debe coincidir.
          if (user.passwordPlain?.trim()) {
            const plain = user.passwordPlain;
            const matches =
              !!user.passwordHash &&
              (await verifyPassword(plain, user.passwordHash));
            if (!matches) {
              changed = true;
              nextUsers.push({
                ...user,
                passwordHash: await hashPassword(plain),
                passwordPlain: plain,
                passwordUpdatedAt: new Date().toISOString(),
              });
              continue;
            }
          }

          if (!demoPassword) {
            nextUsers.push(user);
            continue;
          }

          // Clave manual distinta a la demo: no pisar.
          if (user.passwordPlain && user.passwordPlain !== demoPassword) {
            nextUsers.push(user);
            continue;
          }

          if (
            user.passwordHash &&
            (await verifyPassword(demoPassword, user.passwordHash))
          ) {
            if (!user.passwordUpdatedAt || !user.passwordPlain) {
              changed = true;
              nextUsers.push({
                ...user,
                passwordPlain: demoPassword,
                passwordUpdatedAt:
                  user.passwordUpdatedAt ?? new Date().toISOString(),
              });
            } else {
              nextUsers.push(user);
            }
            continue;
          }

          if (user.passwordUpdatedAt) {
            const updatedMs = new Date(user.passwordUpdatedAt).getTime();
            if (Date.now() - updatedMs < 7 * 24 * 60 * 60 * 1000) {
              nextUsers.push(user);
              continue;
            }
          }

          changed = true;
          const passwordUpdatedAt = new Date().toISOString();
          nextUsers.push({
            ...user,
            passwordHash: await hashPassword(demoPassword),
            passwordPlain: demoPassword,
            passwordUpdatedAt,
          });
        }

        if (!nextUsers.some((user) => user.email === "ana@email.com")) {
          const seedAna = seedUsers.find((user) => user.email === "ana@email.com");
          if (seedAna) {
            changed = true;
            const passwordUpdatedAt = new Date().toISOString();
            nextUsers.push({
              ...seedAna,
              passwordHash: await hashPassword(demoPasswords["ana@email.com"]),
              passwordPlain: demoPasswords["ana@email.com"],
              passwordUpdatedAt,
            });
          }
        }

        if (!changed) return;
        set({ users: nextUsers });
        for (const email of Object.keys(demoPasswords)) {
          const updated = get().users.find((user) => user.email === email);
          if (updated) void pushVerificationUserToServer(updated);
        }
      },

      changePassword: async ({ userId, currentPassword, newPassword }) => {
        const user = get().users.find((item) => item.id === userId);
        if (!user?.passwordHash) {
          return { ok: false, error: "Usuario no encontrado." };
        }

        const valid = await verifyPassword(currentPassword, user.passwordHash);
        if (!valid) {
          return { ok: false, error: "La contraseña actual no es correcta." };
        }

        if (currentPassword === newPassword) {
          return {
            ok: false,
            error: "La nueva contraseña debe ser distinta a la actual.",
          };
        }

        const strength = validatePasswordStrength(newPassword);
        if (!strength.ok) {
          return { ok: false, error: strength.errors.join(" ") };
        }

        const passwordHash = await hashPassword(newPassword);
        const passwordUpdatedAt = new Date().toISOString();
        set((s) => ({
          users: s.users.map((item) =>
            item.id === userId
              ? {
                  ...item,
                  passwordHash,
                  passwordPlain: newPassword,
                  passwordUpdatedAt,
                }
              : item,
          ),
        }));
        broadcastAuctionUpdate();
        const updated = get().users.find((item) => item.id === userId);
        if (updated) void pushVerificationUserToServer(updated);
        return { ok: true };
      },

      resetPassword: async ({ email, phone, rut, newPassword }) => {
        const normalizedEmail = email.trim().toLowerCase();
        const user = get().users.find((item) => item.email === normalizedEmail);
        if (!user) {
          return {
            ok: false,
            error: "No encontramos una cuenta con esos datos.",
          };
        }

        if (normalizePhone(user.phone) !== normalizePhone(phone)) {
          return {
            ok: false,
            error: "No encontramos una cuenta con esos datos.",
          };
        }

        if (normalizeRut(user.rut) !== normalizeRut(rut)) {
          return {
            ok: false,
            error: "No encontramos una cuenta con esos datos.",
          };
        }

        const strength = validatePasswordStrength(newPassword);
        if (!strength.ok) {
          return { ok: false, error: strength.errors.join(" ") };
        }

        const passwordHash = await hashPassword(newPassword);
        const passwordUpdatedAt = new Date().toISOString();
        set((s) => ({
          users: s.users.map((item) =>
            item.id === user.id
              ? {
                  ...item,
                  passwordHash,
                  passwordPlain: newPassword,
                  passwordUpdatedAt,
                }
              : item,
          ),
        }));
        broadcastAuctionUpdate();
        const updated = get().users.find((item) => item.id === user.id);
        if (updated) void pushVerificationUserToServer(updated);
        return { ok: true };
      },

      logoutUser: () => {
        const userId = get().sessionUserId;
        if (userId) removePresence(userId);
        writeTabSessionUserId(null);
        set({ sessionUserId: null });
        broadcastAuctionUpdate();
      },

      submitIdentityDocument: ({
        userId,
        documentDataUrl,
        documentFileName,
      }) => {
        const user = get().users.find((item) => item.id === userId);
        if (!user) return { ok: false, error: "Usuario no encontrado." };
        if (!documentDataUrl) {
          return { ok: false, error: "Debes subir tu documento de identidad." };
        }

        set((s) => ({
          users: s.users.map((item) =>
            item.id === userId
              ? {
                  ...item,
                  documentDataUrl,
                  documentFileName,
                  verificationStatus: "en_revision" as const,
                  submittedAt: new Date().toISOString(),
                  reviewNote: undefined,
                  reviewedAt: undefined,
                  reviewedBy: undefined,
                }
              : item,
          ),
        }));
        broadcastAuctionUpdate();
        const updated = get().users.find((item) => item.id === userId);
        if (updated) void pushVerificationUserToServer(updated);
        return { ok: true };
      },

      updateProfilePhoto: ({ userId, profilePhotoUrl }) => {
        const user = get().users.find((item) => item.id === userId);
        if (!user) return { ok: false, error: "Usuario no encontrado." };
        if (!profilePhotoUrl) {
          return { ok: false, error: "Selecciona una imagen válida." };
        }

        set((s) => ({
          users: s.users.map((item) =>
            item.id === userId ? { ...item, profilePhotoUrl } : item,
          ),
        }));
        broadcastAuctionUpdate();
        return { ok: true };
      },

      reviewVerification: ({ userId, status, reviewNote }) => {
        const reviewedAt = new Date().toISOString();
        const reviewedBy = "Equipo Carrizo";
        set((s) => ({
          users: s.users.map((item) =>
            item.id === userId
              ? {
                  ...item,
                  verificationStatus: status,
                  reviewNote,
                  reviewedAt,
                  reviewedBy,
                }
              : item,
          ),
        }));
        broadcastAuctionUpdate();
        const updated = get().users.find((item) => item.id === userId);
        if (updated) void pushVerificationUserToServer(updated);
        void pushVerificationReviewToServer({
          userId,
          status,
          reviewNote,
          reviewedAt,
          reviewedBy,
        });
      },

      adminCreateUser: async (input) => {
        const email = input.email.trim().toLowerCase();
        const exists = get().users.find((user) => user.email === email);
        if (exists) {
          return { ok: false, error: "Ya existe una cuenta con ese email." };
        }

        const strength = validatePasswordStrength(input.password);
        if (!strength.ok) {
          return { ok: false, error: strength.errors.join(" ") };
        }

        const passwordHash = await hashPassword(input.password);
        const passwordUpdatedAt = new Date().toISOString();
        const userId = uid("user");
        const user: VerifiedUser = {
          id: userId,
          name: input.name.trim(),
          email,
          phone: input.phone.trim(),
          rut: input.rut.trim(),
          documentType: input.documentType,
          passwordHash,
          passwordPlain: input.password,
          passwordUpdatedAt,
          role: input.role ?? "user",
          verificationStatus: input.verificationStatus ?? "pendiente_documento",
          createdAt: new Date().toISOString(),
        };

        set((s) => ({ users: [user, ...s.users] }));
        broadcastAuctionUpdate();
        void pushVerificationUserToServer(user);
        return { ok: true, userId };
      },

      adminDeleteUser: (userId) => {
        const user = get().users.find((item) => item.id === userId);
        if (!user) return { ok: false, error: "Usuario no encontrado." };
        if (user.role === "studio_admin") {
          return { ok: false, error: "No puedes eliminar al admin del estudio." };
        }
        if (get().sessionUserId === userId) {
          return { ok: false, error: "No puedes eliminar tu propia sesión." };
        }

        set((s) => ({
          users: s.users.filter((item) => item.id !== userId),
          sessionUserId:
            s.sessionUserId === userId ? null : s.sessionUserId,
        }));
        if (get().sessionUserId === null) writeTabSessionUserId(null);
        broadcastAuctionUpdate();
        return { ok: true };
      },

      adminSetUserBlocked: ({ userId, blocked, reason }) => {
        const user = get().users.find((item) => item.id === userId);
        if (!user) return { ok: false, error: "Usuario no encontrado." };
        if (user.role === "studio_admin") {
          return { ok: false, error: "No puedes bloquear al admin del estudio." };
        }
        if (get().sessionUserId === userId && blocked) {
          return { ok: false, error: "No puedes bloquear tu propia sesión." };
        }

        set((s) => ({
          users: s.users.map((item) =>
            item.id === userId
              ? {
                  ...item,
                  blocked,
                  blockedAt: blocked ? new Date().toISOString() : undefined,
                  blockedReason: blocked
                    ? reason?.trim() || "Cuenta bloqueada por el estudio."
                    : undefined,
                }
              : item,
          ),
          sessionUserId:
            blocked && s.sessionUserId === userId ? null : s.sessionUserId,
        }));
        if (blocked && get().sessionUserId === null) writeTabSessionUserId(null);
        broadcastAuctionUpdate();
        const updated = get().users.find((item) => item.id === userId);
        if (updated) void pushVerificationUserToServer(updated);
        return { ok: true };
      },

      adminSetUserPassword: async ({ userId, newPassword }) => {
        const user = get().users.find((item) => item.id === userId);
        if (!user) return { ok: false, error: "Usuario no encontrado." };

        const strength = validatePasswordStrength(newPassword);
        if (!strength.ok) {
          return { ok: false, error: strength.errors.join(" ") };
        }

        const passwordHash = await hashPassword(newPassword);
        const passwordUpdatedAt = new Date().toISOString();
        set((s) => ({
          users: s.users.map((item) =>
            item.id === userId
              ? {
                  ...item,
                  passwordHash,
                  passwordPlain: newPassword,
                  passwordUpdatedAt,
                }
              : item,
          ),
        }));
        broadcastAuctionUpdate();
        const updated = get().users.find((item) => item.id === userId);
        if (updated) void pushVerificationUserToServer(updated);
        return { ok: true };
      },

      adminSetVerificationStatus: ({ userId, status, reviewNote }) => {
        const reviewedAt = new Date().toISOString();
        const reviewedBy = "Equipo Carrizo";
        set((s) => ({
          users: s.users.map((item) =>
            item.id === userId
              ? {
                  ...item,
                  verificationStatus: status,
                  reviewNote:
                    status === "rechazado"
                      ? reviewNote || item.reviewNote
                      : status === "verificado"
                        ? "Identidad validada por el equipo."
                        : undefined,
                  reviewedAt:
                    status === "verificado" || status === "rechazado"
                      ? reviewedAt
                      : item.reviewedAt,
                  reviewedBy:
                    status === "verificado" || status === "rechazado"
                      ? reviewedBy
                      : item.reviewedBy,
                }
              : item,
          ),
        }));
        broadcastAuctionUpdate();
        const updated = get().users.find((item) => item.id === userId);
        if (updated) void pushVerificationUserToServer(updated);
        if (status === "verificado" || status === "rechazado") {
          void pushVerificationReviewToServer({
            userId,
            status,
            reviewNote: updated?.reviewNote,
            reviewedAt,
            reviewedBy,
          });
        }
      },

      createAuction: (input) => {
        const artistId = get().artists[0]?.id ?? "artist-1";
        const now = new Date();
        const endsAt = new Date(now.getTime() + input.durationMinutes * 60 * 1000);
        const auctionId = uid("auction");
        const auction: TattooAuction = {
          id: auctionId,
          artistId,
          title: input.title,
          description: input.description,
          style: input.style,
          size: input.size,
          image: input.image,
          startingPrice: input.startingPrice,
          minIncrement: input.minIncrement,
          currentBid: input.startingPrice,
          status: "en_vivo",
          startsAt: now.toISOString(),
          endsAt: endsAt.toISOString(),
          bids: [],
          viewers: 1,
          createdAt: now.toISOString(),
        };

        set((s) => ({
          auctions: [
            auction,
            ...s.auctions.map((item) => {
              if (resolveAuctionStatus(item) !== "en_vivo") return item;
              const bids = sortBids(item.bids);
              const leader = bids[0];
              return {
                ...item,
                bids,
                currentBid: leader?.amount ?? item.startingPrice,
                status: "finalizada" as const,
                winnerName: leader?.bidderName,
                winnerPhone: leader?.bidderPhone,
              };
            }),
          ],
          auctionRoomKicks: [],
        }));
        broadcastAuctionUpdate({ pushServer: false });
        void pushLiveRoomToServer({
          auctions: sanitizeAuctionsForSync(get().auctions),
        });
        return auctionId;
      },

      extendAuction: (auctionId, extraMinutes) => {
        const minutes = Math.max(1, Math.min(240, Math.round(extraMinutes)));
        const auction = get().auctions.find((item) => item.id === auctionId);
        if (!auction) return { ok: false, error: "Subasta no encontrada" };

        const status = resolveAuctionStatus(auction);
        if (status !== "en_vivo") {
          return { ok: false, error: "Solo puedes extender una subasta en vivo" };
        }

        const base = Math.max(Date.now(), new Date(auction.endsAt).getTime());
        const endsAt = new Date(base + minutes * 60 * 1000).toISOString();

        set((s) => ({
          auctions: s.auctions.map((item) =>
            item.id === auctionId ? { ...item, endsAt, status: "en_vivo" } : item,
          ),
        }));
        broadcastAuctionUpdate({ pushServer: false });
        void pushLiveRoomToServer({
          auctions: sanitizeAuctionsForSync(get().auctions),
        });
        return { ok: true };
      },

      kickAuctionUser: ({ userId, reason }) => {
        const user = get().users.find((item) => item.id === userId);
        if (!user) return { ok: false, error: "Usuario no encontrado" };
        if (user.role === "studio_admin") {
          return { ok: false, error: "No puedes expulsar al admin del estudio" };
        }

        removePresence(userId);
        const kick = {
          userId,
          reason:
            reason?.trim() || "Expulsado de la sala por el administrador",
          kickedAt: new Date().toISOString(),
        };
        set((s) => ({
          auctionRoomKicks: [
            kick,
            ...s.auctionRoomKicks.filter((item) => item.userId !== userId),
          ],
        }));
        void pushLiveRoomToServer({ kickUser: kick }).then(() => {
          broadcastAuctionUpdate();
        });
        return { ok: true };
      },

      unkickAuctionUser: (userId) => {
        set((s) => ({
          auctionRoomKicks: s.auctionRoomKicks.filter(
            (item) => item.userId !== userId,
          ),
        }));
        void pushLiveRoomToServer({ unkickUserId: userId }).then(() => {
          broadcastAuctionUpdate();
        });
      },

      placeBid: ({ auctionId, amount }) => {
        get().syncAuctionStatuses();
        const sessionUserId = get().sessionUserId;
        if (!sessionUserId) {
          return {
            ok: false,
            error: "Debes iniciar sesión para pujar.",
          };
        }

        const user = get().users.find((item) => item.id === sessionUserId);
        if (!user) {
          return { ok: false, error: "Sesión inválida. Vuelve a ingresar." };
        }
        if (user.blocked) {
          return {
            ok: false,
            error:
              user.blockedReason?.trim() ||
              "Tu cuenta está bloqueada y no puedes pujar.",
          };
        }
        if (get().auctionRoomKicks.some((item) => item.userId === sessionUserId)) {
          return {
            ok: false,
            error: "Fuiste expulsado de la sala. No puedes pujar en esta subasta.",
          };
        }
        if (user.verificationStatus !== "verificado") {
          if (user.verificationStatus === "en_revision") {
            return {
              ok: false,
              error:
                "Tu documento está en revisión. Podrás pujar cuando el equipo lo apruebe.",
            };
          }
          if (user.verificationStatus === "rechazado") {
            return {
              ok: false,
              error:
                "Tu verificación fue rechazada. Sube un documento válido en Acceso para reintentar.",
            };
          }
          return {
            ok: false,
            error:
              "Debes tener tu documento aprobado para pujar. Súbelo en Acceso.",
          };
        }

        const auction = get().auctions.find((item) => item.id === auctionId);
        if (!auction) return { ok: false, error: "Subasta no encontrada" };

        const status = resolveAuctionStatus(auction);
        if (status !== "en_vivo") {
          return { ok: false, error: "La subasta no está en vivo" };
        }

        const minimum = nextMinBid(auction);
        if (amount < minimum) {
          return {
            ok: false,
            error: `La oferta mínima es ${minimum.toLocaleString("es-CL")}`,
          };
        }

        const bid = {
          id: uid("bid"),
          auctionId,
          bidderName: user.name,
          bidderPhone: user.phone,
          bidderUserId: user.id,
          verificationStatus: user.verificationStatus,
          amount,
          createdAt: new Date().toISOString(),
        };

        const endsAtMs = new Date(auction.endsAt).getTime();
        const remaining = endsAtMs - Date.now();
        const endsAt =
          remaining < 60_000
            ? new Date(Date.now() + 60_000).toISOString()
            : auction.endsAt;

        set((s) => ({
          auctions: s.auctions.map((item) => {
            if (item.id !== auctionId) return item;
            const bids = sortBids([bid, ...item.bids]);
            return {
              ...item,
              currentBid: bids[0]?.amount ?? amount,
              endsAt,
              status: "en_vivo" as const,
              bids,
            };
          }),
        }));

        broadcastAuctionUpdate({ pushServer: false });
        // Empuja al servidor de inmediato (navegadores distintos).
        void pushLiveRoomToServer({
          auctions: sanitizeAuctionsForSync(get().auctions),
        }).then((remote) => {
          if (!remote?.auctions?.length) return;
          const merged = mergeAuctionLists(get().auctions, remote.auctions);
          set({ auctions: merged });
        });
        return { ok: true };
      },

      syncAuctionStatuses: () => {
        const before = get().auctions;
        let changed = false;

        const auctions = before.map((auction) => {
          const status = resolveAuctionStatus(auction);
          const bids = sortBids(auction.bids);
          const leader = bids[0];
          const currentBid = leader?.amount ?? auction.startingPrice;
          const needsSort =
            bids.length !== auction.bids.length ||
            bids.some((bid, index) => bid.id !== auction.bids[index]?.id);

          const needsWinner =
            status === "finalizada" &&
            Boolean(leader) &&
            !auction.winnerName;

          if (
            status === auction.status &&
            !needsSort &&
            currentBid === auction.currentBid &&
            !needsWinner
          ) {
            return auction;
          }

          changed = true;

          if (status === "finalizada") {
            return {
              ...auction,
              bids,
              currentBid,
              status,
              winnerName: leader?.bidderName ?? auction.winnerName,
              winnerPhone: leader?.bidderPhone ?? auction.winnerPhone,
            };
          }

          return {
            ...auction,
            bids,
            currentBid,
            status,
          };
        });

        if (changed) {
          set({ auctions });
          // Persiste ganador/estado en el servidor (Netlify / otros navegadores).
          void pushLiveRoomToServer({
            auctions: sanitizeAuctionsForSync(get().auctions),
          });
        }
      },

      cancelAuction: (auctionId) => {
        set((s) => ({
          auctions: s.auctions.map((auction) =>
            auction.id === auctionId
              ? { ...auction, status: "cancelada" as const }
              : auction,
          ),
        }));
        broadcastAuctionUpdate({ pushServer: false });
        void pushLiveRoomToServer({
          auctions: sanitizeAuctionsForSync(get().auctions),
        });
      },

      bumpAuctionViewers: (auctionId) => {
        set((s) => ({
          auctions: s.auctions.map((auction) =>
            auction.id === auctionId
              ? { ...auction, viewers: auction.viewers + 1 }
              : auction,
          ),
        }));
        broadcastAuctionUpdate();
      },

      upsertMarketplaceArtist: (input) => {
        const existing = input.id
          ? get().artists.find((item) => item.id === input.id)
          : undefined;
        const slugBase = input.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 40);
        const artistId = existing?.id ?? uid("artist");
        const artist: Artist = {
          id: artistId,
          name: input.name.trim(),
          slug: existing?.slug ?? (slugBase || `artista-${artistId.slice(-4)}`),
          role: input.role.trim(),
          bio: input.bio.trim(),
          story: input.story.trim(),
          specialties: input.specialties.length ? input.specialties : ["otro"],
          avatar: input.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
          photoUrl: input.photoUrl ?? existing?.photoUrl ?? "/artists/enderxon/avatar.jpg",
          hourlyRate: input.hourlyRate ?? existing?.hourlyRate ?? 55000,
          commissionPercent:
            input.commissionPercent ?? existing?.commissionPercent ?? 70,
          marketplaceFeePercent: STUDIO_MARKETPLACE_FEE_PERCENT,
          rating: existing?.rating ?? 4.8,
          salesCount: existing?.salesCount ?? 0,
          active: existing?.active ?? true,
        };

        set((s) => ({
          artists: existing
            ? s.artists.map((item) => (item.id === artistId ? artist : item))
            : [artist, ...s.artists],
        }));
        return artistId;
      },

      updateMarketplaceArtist: (artistId, patch) => {
        set((s) => ({
          artists: s.artists.map((artist) =>
            artist.id === artistId ? { ...artist, ...patch } : artist,
          ),
        }));
      },

      createPortfolioItem: (input) => {
        const artistId = input.artistId ?? get().artists[0]?.id ?? "artist-1";
        const itemId = uid("port");
        const item: PortfolioItem = {
          id: itemId,
          artistId,
          title: input.title.trim() || "Sin título",
          style: input.style,
          image: input.image,
          featured: input.featured ?? true,
        };
        set((s) => ({ portfolio: [item, ...s.portfolio] }));
        return itemId;
      },

      updatePortfolioItem: (itemId, patch) => {
        set((s) => ({
          portfolio: s.portfolio.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  ...patch,
                  title: patch.title !== undefined ? patch.title.trim() || item.title : item.title,
                }
              : item,
          ),
        }));
      },

      deletePortfolioItem: (itemId) => {
        set((s) => ({
          portfolio: s.portfolio.filter((item) => item.id !== itemId),
          marketplaceListings: s.marketplaceListings.map((listing) =>
            listing.portfolioItemId === itemId
              ? { ...listing, portfolioItemId: undefined }
              : listing,
          ),
        }));
      },

      createMarketplaceListing: (input) => {
        const artistId = input.artistId;
        const artist = get().artists.find((item) => item.id === artistId);
        if (!artist) throw new Error("Artista no encontrado");
        const now = new Date().toISOString();
        const listingId = uid("artwork");
        const needsContract = requiresArtistSaleContract(artistId);
        const split = studioMarketplaceSplit(input.price);
        const contractId = needsContract ? uid("artist-contract") : undefined;
        const listing: ArtworkListing = {
          id: listingId,
          artistId,
          portfolioItemId: input.portfolioItemId,
          title: input.title,
          description: input.description,
          story: input.story,
          style: input.style,
          size: input.size,
          image: input.image,
          price: input.price,
          status: needsContract ? "borrador" : "publicada",
          unique: true,
          views: 0,
          clicks: 0,
          favorites: 0,
          createdAt: now,
          publishedAt: needsContract ? undefined : now,
          contractId,
        };

        const contract: ArtistSaleContract | null = needsContract
          ? {
              id: contractId!,
              artistId,
              artistName: artist.name,
              listingId,
              artworkTitle: input.title,
              artworkPrice: input.price,
              studioName: get().studio.name,
              studioFeePercent: split.feePercent,
              studioFee: split.platformFee,
              artistPayout: split.artistPayout,
              acceptedTerms: false,
              createdAt: now,
            }
          : null;

        set((s) => ({
          marketplaceListings: [listing, ...s.marketplaceListings],
          artistSaleContracts: contract
            ? [contract, ...s.artistSaleContracts]
            : s.artistSaleContracts,
        }));
        return listingId;
      },

      updateMarketplaceListing: (listingId, patch) => {
        set((s) => ({
          marketplaceListings: s.marketplaceListings.map((listing) =>
            listing.id === listingId ? { ...listing, ...patch } : listing,
          ),
        }));
      },

      updateMarketplaceListingStatus: (listingId, status) => {
        const state = get();
        const listing = state.marketplaceListings.find((item) => item.id === listingId);
        if (!listing) return;

        if (status === "publicada" && requiresArtistSaleContract(listing.artistId)) {
          const contract = state.artistSaleContracts.find(
            (item) => item.id === listing.contractId,
          );
          if (!contract?.signedAt) return;
        }

        const now = new Date().toISOString();
        set((s) => ({
          marketplaceListings: s.marketplaceListings.map((item) =>
            item.id === listingId
              ? {
                  ...item,
                  status,
                  publishedAt:
                    status === "publicada" ? item.publishedAt ?? now : item.publishedAt,
                  reservedAt: status === "reservada" ? now : item.reservedAt,
                  soldAt: status === "vendida" ? now : item.soldAt,
                }
              : item,
          ),
        }));
      },

      signArtistSaleContract: (contractId, data) => {
        const state = get();
        const contract = state.artistSaleContracts.find((item) => item.id === contractId);
        if (!contract || contract.signedAt) return;

        const now = new Date().toISOString();
        set((s) => ({
          artistSaleContracts: s.artistSaleContracts.map((item) =>
            item.id === contractId
              ? {
                  ...item,
                  signedAt: now,
                  signatureData: data.signatureData,
                  acceptedTerms: true,
                }
              : item,
          ),
          marketplaceListings: s.marketplaceListings.map((listing) =>
            listing.id === contract.listingId
              ? {
                  ...listing,
                  status: "publicada" as const,
                  publishedAt: listing.publishedAt ?? now,
                }
              : listing,
          ),
        }));
      },

      ensureArtistSaleContract: (listingId) => {
        const state = get();
        const listing = state.marketplaceListings.find((item) => item.id === listingId);
        if (!listing) {
          return { ok: false, error: "Obra no encontrada." };
        }
        if (!requiresArtistSaleContract(listing.artistId)) {
          return { ok: false, error: "Las obras de Enderxon no requieren contrato." };
        }

        if (listing.contractId) {
          const existing = state.artistSaleContracts.find(
            (item) => item.id === listing.contractId,
          );
          if (existing) {
            return { ok: true, contractId: existing.id };
          }
        }

        const artist = state.artists.find((item) => item.id === listing.artistId);
        if (!artist) {
          return { ok: false, error: "Artista no encontrado." };
        }

        const split = marketplaceSplit(listing.price, artist);
        const now = new Date().toISOString();
        const contractId = uid("artist-contract");
        const contract: ArtistSaleContract = {
          id: contractId,
          artistId: listing.artistId,
          artistName: artist.name,
          listingId: listing.id,
          artworkTitle: listing.title,
          artworkPrice: listing.price,
          studioName: state.studio.name,
          studioFeePercent: split.feePercent,
          studioFee: split.platformFee,
          artistPayout: split.artistPayout,
          acceptedTerms: false,
          createdAt: now,
        };

        set((s) => ({
          artistSaleContracts: [contract, ...s.artistSaleContracts],
          marketplaceListings: s.marketplaceListings.map((item) =>
            item.id === listingId
              ? {
                  ...item,
                  contractId,
                  status: item.status === "vendida" || item.status === "reservada"
                    ? item.status
                    : ("borrador" as const),
                  publishedAt:
                    item.status === "publicada" ? undefined : item.publishedAt,
                }
              : item,
          ),
        }));

        return { ok: true, contractId };
      },

      bumpListingView: (listingId) => {
        set((s) => ({
          marketplaceListings: s.marketplaceListings.map((listing) =>
            listing.id === listingId
              ? { ...listing, views: listing.views + 1 }
              : listing,
          ),
        }));
      },

      trackListingClick: (listingId) => {
        set((s) => ({
          marketplaceListings: s.marketplaceListings.map((listing) =>
            listing.id === listingId
              ? { ...listing, clicks: listing.clicks + 1 }
              : listing,
          ),
        }));
      },

      favoriteListing: (listingId) => {
        set((s) => ({
          marketplaceListings: s.marketplaceListings.map((listing) =>
            listing.id === listingId
              ? { ...listing, favorites: listing.favorites + 1 }
              : listing,
          ),
        }));
      },

      purchaseListing: ({ listingId, paymentMethod = "mercadopago" }) => {
        const state = get();
        const sessionUserId = state.sessionUserId;
        if (!sessionUserId) {
          return { ok: false, error: "Debes iniciar sesión para comprar esta obra." };
        }

        const user = state.users.find((item) => item.id === sessionUserId);
        if (!user) return { ok: false, error: "Sesión inválida. Vuelve a ingresar." };
        if (user.verificationStatus !== "verificado") {
          return {
            ok: false,
            error:
              user.verificationStatus === "en_revision"
                ? "Tu documento está en revisión. Podrás comprar cuando sea aprobado."
                : "Debes tener tu identidad verificada para comprar obras únicas.",
          };
        }

        const listing = state.marketplaceListings.find((item) => item.id === listingId);
        if (!listing) return { ok: false, error: "Obra no encontrada." };
        if (listing.status !== "publicada") {
          return { ok: false, error: "Esta obra ya no está disponible." };
        }

        const artist = state.artists.find((item) => item.id === listing.artistId);
        const split = marketplaceSplit(listing.price, artist);
        const now = new Date().toISOString();
        const orderId = uid("order");

        const order: MarketplaceOrder = {
          id: orderId,
          listingId,
          buyerUserId: user.id,
          buyerName: user.name,
          buyerPhone: user.phone,
          artistId: listing.artistId,
          amount: listing.price,
          platformFee: split.platformFee,
          artistPayout: split.artistPayout,
          status: "pendiente_pago",
          paymentMethod,
          createdAt: now,
        };

        set((s) => ({
          marketplaceOrders: [order, ...s.marketplaceOrders],
          marketplaceListings: s.marketplaceListings.map((item) =>
            item.id === listingId
              ? {
                  ...item,
                  status: "reservada" as const,
                  reservedAt: now,
                  buyerUserId: user.id,
                  buyerName: user.name,
                }
              : item,
          ),
        }));

        return { ok: true, orderId };
      },

      markMarketplaceOrderPaid: (orderId) => {
        const order = get().marketplaceOrders.find((item) => item.id === orderId);
        if (!order || order.status === "pagado" || order.status === "entregado") return;

        const payment: Payment = {
          id: uid("pay"),
          marketplaceOrderId: order.id,
          listingId: order.listingId,
          clientId: order.buyerUserId,
          artistId: order.artistId,
          type: "producto",
          amount: order.amount,
          method: order.paymentMethod,
          createdAt: new Date().toISOString(),
          note: `Marketplace obra única · comisión plataforma ${order.platformFee.toLocaleString("es-CL")} CLP`,
        };

        set((s) => ({
          payments: [payment, ...s.payments],
          marketplaceOrders: s.marketplaceOrders.map((item) =>
            item.id === orderId
              ? { ...item, status: "pagado" as const, paidAt: payment.createdAt }
              : item,
          ),
          marketplaceListings: s.marketplaceListings.map((listing) =>
            listing.id === order.listingId
              ? { ...listing, status: "vendida" as const, soldAt: payment.createdAt }
              : listing,
          ),
          artists: s.artists.map((artist) =>
            artist.id === order.artistId
              ? { ...artist, salesCount: (artist.salesCount ?? 0) + 1 }
              : artist,
          ),
        }));
      },

      markMarketplaceOrderDelivered: (orderId) => {
        const now = new Date().toISOString();
        set((s) => ({
          marketplaceOrders: s.marketplaceOrders.map((order) =>
            order.id === orderId
              ? { ...order, status: "entregado" as const, deliveredAt: now }
              : order,
          ),
        }));
      },

      cancelMarketplaceOrder: (orderId) => {
        const order = get().marketplaceOrders.find((item) => item.id === orderId);
        if (!order) return;
        const now = new Date().toISOString();
        set((s) => ({
          marketplaceOrders: s.marketplaceOrders.map((item) =>
            item.id === orderId
              ? { ...item, status: "cancelado" as const, cancelledAt: now }
              : item,
          ),
          marketplaceListings: s.marketplaceListings.map((listing) =>
            listing.id === order.listingId
              ? {
                  ...listing,
                  status: "publicada" as const,
                  reservedAt: undefined,
                  buyerUserId: undefined,
                  buyerName: undefined,
                }
              : listing,
          ),
        }));
      },

      createBookingRequest: (input) => {
        const state = get();

        const artist = state.artists.find((a) => a.id === input.artistId);
        if (!artist) throw new Error("Artista no encontrado");

        let client = state.clients.find(
          (c) =>
            c.email.toLowerCase() === input.email.toLowerCase() ||
            c.phone === input.phone,
        );

        const clientId = client?.id ?? uid("client");
        if (!client) {
          client = {
            id: clientId,
            name: input.name,
            email: input.email,
            phone: input.phone,
            allergies: "",
            notes: "Cliente nuevo vía página pública",
            totalSpent: 0,
            visits: 0,
            createdAt: new Date().toISOString(),
          };
        }

        const quote = quoteSessionPackage(
          input.sessionPackage,
          state.studio.depositPercent,
        );

        const start = input.preferredDate
          ? new Date(input.preferredDate)
          : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        if (!input.preferredDate) start.setHours(11, 0, 0, 0);
        const end = new Date(start);
        end.setHours(start.getHours() + Math.ceil(quote.estimatedHours));

        const appointmentId = uid("apt");
        const appointment: Appointment = {
          id: appointmentId,
          clientId,
          artistId: artist.id,
          title: `${input.style} — ${input.zone}`,
          style: input.style,
          zone: input.zone,
          size: input.size,
          description: input.description,
          references: input.referenceImageUrl ? [input.referenceImageUrl] : [],
          status: "solicitud",
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          estimatedHours: quote.estimatedHours,
          quotedPrice: quote.suggestedPrice,
          depositAmount: quote.depositAmount,
          depositPaid: false,
          balancePaid: false,
          consentSigned: false,
          budget: input.budget,
          sessionPackage: input.sessionPackage,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          clients: client && !s.clients.find((c) => c.id === clientId)
            ? [client, ...s.clients]
            : s.clients,
          appointments: [appointment, ...s.appointments],
        }));

        return { appointmentId, clientId };
      },

      approveQuote: (appointmentId, price) => {
        set((s) => ({
          appointments: s.appointments.map((a) => {
            if (a.id !== appointmentId) return a;
            const quotedPrice = price ?? a.quotedPrice;
            const depositAmount = Math.round(
              (quotedPrice * s.studio.depositPercent) / 100 / 1000,
            ) * 1000;
            return {
              ...a,
              quotedPrice,
              depositAmount,
              status: "seña_pendiente" as const,
            };
          }),
        }));
      },

      markDepositPaid: (appointmentId, method = "mercadopago") => {
        const apt = get().appointments.find((a) => a.id === appointmentId);
        if (!apt) return;

        const payment: Payment = {
          id: uid("pay"),
          appointmentId,
          clientId: apt.clientId,
          artistId: apt.artistId,
          type: "seña",
          amount: apt.depositAmount,
          method,
          createdAt: new Date().toISOString(),
        };

        const consentId = uid("consent");
        const client = get().clients.find((c) => c.id === apt.clientId);
        const consent: ConsentForm = {
          id: consentId,
          appointmentId,
          clientId: apt.clientId,
          clientName: client?.name ?? "Cliente",
          acceptedTerms: false,
          healthDeclaration: "",
        };

        set((s) => ({
          payments: [payment, ...s.payments],
          consents: [consent, ...s.consents],
          appointments: s.appointments.map((a) =>
            a.id === appointmentId
              ? {
                  ...a,
                  depositPaid: true,
                  status: "confirmado" as const,
                  consentId,
                }
              : a,
          ),
        }));
      },

      markCompleted: (appointmentId) => {
        const apt = get().appointments.find((a) => a.id === appointmentId);
        if (!apt) return;

        const balance = Math.max(0, apt.quotedPrice - apt.depositAmount);
        const payments: Payment[] = [];

        if (balance > 0 && !apt.balancePaid) {
          payments.push({
            id: uid("pay"),
            appointmentId,
            clientId: apt.clientId,
            artistId: apt.artistId,
            type: "saldo",
            amount: balance,
            method: "efectivo",
            createdAt: new Date().toISOString(),
          });
        }

        set((s) => ({
          payments: [...payments, ...s.payments],
          appointments: s.appointments.map((a) =>
            a.id === appointmentId
              ? {
                  ...a,
                  status: "completado" as const,
                  balancePaid: true,
                }
              : a,
          ),
          clients: s.clients.map((c) =>
            c.id === apt.clientId
              ? {
                  ...c,
                  totalSpent: c.totalSpent + apt.quotedPrice,
                  visits: c.visits + 1,
                  lastVisit: new Date().toISOString(),
                }
              : c,
          ),
        }));
      },

      registerPayment: (payment) => {
        set((s) => ({
          payments: [
            {
              ...payment,
              id: uid("pay"),
              createdAt: new Date().toISOString(),
            },
            ...s.payments,
          ],
        }));
      },

      signConsent: (consentId, data) => {
        set((s) => {
          const consent = s.consents.find((c) => c.id === consentId);
          return {
            consents: s.consents.map((c) =>
              c.id === consentId
                ? {
                    ...c,
                    ...data,
                    acceptedTerms: true,
                    signedAt: new Date().toISOString(),
                  }
                : c,
            ),
            appointments: consent
              ? s.appointments.map((a) =>
                  a.id === consent.appointmentId
                    ? { ...a, consentSigned: true, consentId }
                    : a,
                )
              : s.appointments,
          };
        });
      },

      createConsentForAppointment: (appointmentId) => {
        const apt = get().appointments.find((a) => a.id === appointmentId);
        if (!apt) return "";
        if (apt.consentId) return apt.consentId;

        const client = get().clients.find((c) => c.id === apt.clientId);
        const result = get().createConsent({
          clientId: apt.clientId,
          clientName: client?.name ?? "Cliente",
          appointmentId,
        });
        return result.consentId ?? "";
      },

      createConsent: ({
        clientId,
        clientName,
        appointmentId,
        sessionTitle,
        sessionAt,
      }) => {
        if (!clientName.trim()) {
          return { ok: false, error: "Indica el nombre del cliente." };
        }

        if (appointmentId) {
          const apt = get().appointments.find((a) => a.id === appointmentId);
          if (!apt) {
            return { ok: false, error: "Turno no encontrado." };
          }
          if (apt.consentId) {
            return { ok: true, consentId: apt.consentId };
          }
          if (apt.consentSigned) {
            return {
              ok: false,
              error: "Este turno ya tiene un consentimiento firmado.",
            };
          }
        }

        const consentId = uid("consent");
        const consent: ConsentForm = {
          id: consentId,
          clientId,
          clientName: clientName.trim(),
          appointmentId,
          sessionTitle: sessionTitle?.trim() || undefined,
          sessionAt: sessionAt || undefined,
          acceptedTerms: false,
          healthDeclaration: "",
        };

        set((s) => ({
          consents: [consent, ...s.consents],
          appointments: appointmentId
            ? s.appointments.map((a) =>
                a.id === appointmentId ? { ...a, consentId } : a,
              )
            : s.appointments,
        }));

        return { ok: true, consentId };
      },

      updateAppointmentStatus: (appointmentId, status) => {
        set((s) => ({
          appointments: s.appointments.map((a) =>
            a.id === appointmentId ? { ...a, status } : a,
          ),
        }));
      },

      sendClientMessage: (conversationId, text, options) => {
        const value = text.trim();
        if (!value && !options?.hasImage) return;
        const now = new Date().toISOString();
        const hasImage = Boolean(options?.hasImage);
        set((s) => ({
          conversations: s.conversations.map((conv) => {
            if (conv.id !== conversationId) return conv;
            const analysis = analyzeClientMessage(
              value || "Foto de referencia",
              conv.qualification,
              { hasImage },
            );
            const qualification = mergeQualification(
              conv.qualification,
              analysis.patch,
            );
            const messages = [
              ...conv.messages,
              {
                id: uid("msg"),
                author: "cliente" as const,
                text: hasImage
                  ? value || "📷 Foto de referencia del diseño"
                  : value,
                createdAt: now,
                hasImage,
              },
            ];
            const { score, temperature } = scoreLead(qualification, messages);
            const tags = new Set(conv.tags);
            if (hasImage) tags.add("referencia pendiente");

            return {
              ...conv,
              messages,
              qualification: hasImage
                ? { ...qualification, hasReference: true }
                : qualification,
              referenceStatus: hasImage ? "pendiente" : conv.referenceStatus,
              score,
              temperature,
              unread: conv.unread + 1,
              lastMessageAt: now,
              archived: false,
              tags: Array.from(tags),
            };
          }),
        }));
      },

      sendClientImage: (conversationId) => {
        get().sendClientMessage(conversationId, "", { hasImage: true });
      },

      reviewReference: (conversationId, status) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        const now = new Date().toISOString();
        const followUp =
          status === "aprobada"
            ? "Listo, revisé tu referencia y el diseño se puede hacer. Si quieres, vemos fecha y te explico cómo apartar cupo con el 30% del valor."
            : "Revisé la imagen y para ese diseño necesitaríamos ajustar tamaño o detalle. Si quieres, mándame otra referencia o lo conversamos.";

        if (conv?.source === "whatsapp") {
          void fetch(`/api/whatsapp/conversations/${conversationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ referenceStatus: status }),
          })
            .then(() => get().syncWhatsAppFromServer())
            .catch(() => undefined);
        }

        set((s) => ({
          conversations: s.conversations.map((item) => {
            if (item.id !== conversationId) return item;
            const tags = item.tags.filter((t) => t !== "referencia pendiente");
            if (status === "aprobada") tags.push("referencia aprobada");
            if (status === "rechazada") tags.push("referencia rechazada");

            return {
              ...item,
              referenceStatus: status,
              unread: 0,
              tags,
              messages: [
                ...item.messages,
                {
                  id: uid("msg"),
                  author: "artista" as const,
                  text: followUp,
                  createdAt: now,
                },
              ],
              lastMessageAt: now,
            };
          }),
        }));
      },

      runBotReply: async (conversationId) => {
        const state = get();
        const conv = state.conversations.find((c) => c.id === conversationId);
        if (!conv || !conv.botEnabled) return;
        const artist = state.artists.find((a) => a.active) ?? state.artists[0];
        if (!artist) return;
        const lastClient = conv.messages
          .filter((m) => m.author === "cliente")
          .at(-1);

        let reply: ReturnType<typeof generateBotReply>;
        let qualification = conv.qualification;
        let engine: string | undefined;
        let geminiModel: string | undefined;
        let geminiError: string | undefined;

        try {
          const response = await fetch("/api/crm/reply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversation: conv,
              studio: state.studio,
              artist,
              botConfig: state.crmBotConfig,
            }),
          });

          if (response.ok) {
            const data = (await response.json()) as {
              text: string;
              quotePrice?: number;
              tags?: string[];
              qualification?: typeof qualification;
              engine?: string;
              geminiModel?: string;
              geminiError?: string;
            };
            reply = {
              text: data.text,
              quotePrice: data.quotePrice,
              tags: data.tags ?? [],
            };
            if (data.qualification) qualification = data.qualification;
            engine = data.engine;
            geminiModel = data.geminiModel;
            geminiError = data.geminiError;
          } else {
            throw new Error("CRM reply failed");
          }
        } catch {
          reply = generateBotReply({
            conversation: conv,
            qualification: conv.qualification,
            studio: state.studio,
            hourlyRate: artist?.hourlyRate ?? 65000,
            artistName: artist?.name ?? state.studio.name,
            analysis: analyzeClientMessage(
              lastClient?.text ?? "",
              conv.qualification,
              { hasImage: lastClient?.hasImage },
            ),
          });
          engine = "rules";
        }

        const now = new Date().toISOString();
        set((s) => ({
          conversations: s.conversations.map((item) => {
            if (item.id !== conversationId) return item;
            const messages = [
              ...item.messages,
              {
                id: uid("msg"),
                author: "bot" as const,
                text: reply.text,
                createdAt: now,
                quotePrice: reply.quotePrice,
              },
            ];
            const tags = Array.from(new Set([...item.tags, ...reply.tags]));
            const { score, temperature } = scoreLead(qualification, messages);
            return {
              ...item,
              messages,
              tags,
              qualification,
              score,
              temperature,
              lastMessageAt: now,
            };
          }),
        }));

        return { engine, geminiModel, geminiError };
      },

      sendArtistMessage: async (conversationId, text) => {
        const value = text.trim();
        if (!value) return;
        const conv = get().conversations.find((c) => c.id === conversationId);

        if (conv?.source === "whatsapp") {
          try {
            const response = await fetch("/api/whatsapp/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversationId, text: value }),
            });
            if (response.ok) {
              const data = (await response.json()) as {
                conversation?: WhatsAppConversation;
              };
              if (data.conversation) {
                set((s) => ({
                  conversations: s.conversations.map((item) =>
                    item.id === conversationId ? data.conversation! : item,
                  ),
                }));
              }
            }
          } catch (error) {
            console.error("WhatsApp send failed", error);
          }
          return;
        }

        const now = new Date().toISOString();
        set((s) => ({
          conversations: s.conversations.map((item) =>
            item.id === conversationId
              ? {
                  ...item,
                  messages: [
                    ...item.messages,
                    {
                      id: uid("msg"),
                      author: "artista" as const,
                      text: value,
                      createdAt: now,
                    },
                  ],
                  unread: 0,
                  lastMessageAt: now,
                }
              : item,
          ),
        }));
      },

      toggleConversationBot: (conversationId) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        const next = !conv?.botEnabled;

        if (conv?.source === "whatsapp") {
          void fetch(`/api/whatsapp/conversations/${conversationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ botEnabled: next }),
          });
        }

        set((s) => ({
          conversations: s.conversations.map((item) =>
            item.id === conversationId
              ? { ...item, botEnabled: next }
              : item,
          ),
        }));
      },

      markConversationRead: (conversationId) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (conv?.source === "whatsapp") {
          void fetch(`/api/whatsapp/conversations/${conversationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markRead: true }),
          });
        }

        set((s) => ({
          conversations: s.conversations.map((item) =>
            item.id === conversationId ? { ...item, unread: 0 } : item,
          ),
        }));
      },

      archiveConversation: (conversationId) => {
        set((s) => ({
          conversations: s.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, archived: !conv.archived }
              : conv,
          ),
        }));
      },

      simulateIncomingLead: () => {
        const samples = [
          {
            name: "Camilo Fuentes",
            hue: 24,
            text: "hola! quiero un blackwork en el antebrazo, mediano",
          },
          {
            name: "Antonia Reyes",
            hue: 288,
            text: "buenas, cuanto sale un fine line chico en la muñeca?",
          },
          {
            name: "Ignacio Bravo",
            hue: 96,
            text: "hola, quiero hacerme un realismo en la pierna, tengo referencia",
          },
          {
            name: "Josefa Lagos",
            hue: 340,
            text: "hola! me quiero tatuar un lettering con una frase",
          },
        ];
        const sample = samples[Math.floor(Math.random() * samples.length)];
        const id = uid("conv");
        const now = new Date().toISOString();
        const base: WhatsAppConversation = {
          id,
          contactName: sample.name,
          phone: `+56 9 ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(
            1000 + Math.random() * 8999,
          )}`,
          avatarHue: sample.hue,
          botEnabled: true,
          temperature: "nuevo",
          score: 0,
          unread: 0,
          tags: ["nuevo contacto"],
          qualification: { hasReference: false, intent: "explorando" },
          referenceStatus: "sin_referencia",
          messages: [],
          createdAt: now,
          lastMessageAt: now,
        };
        set((s) => ({ conversations: [base, ...s.conversations] }));
        get().sendClientMessage(id, sample.text);
        return id;
      },

      convertConversationToRequest: (conversationId) => {
        const state = get();
        const conv = state.conversations.find((c) => c.id === conversationId);
        if (!conv) return { ok: false, error: "Conversación no encontrada." };
        const { style, zone, size } = conv.qualification;
        if (!style || !zone || !size) {
          return {
            ok: false,
            error:
              "Faltan datos del lead (estilo, zona o tamaño) para crear la solicitud.",
          };
        }
        const artist = state.artists.find((a) => a.active) ?? state.artists[0];
        if (!artist) return { ok: false, error: "No hay artista disponible." };

        const sessionPackage: SessionPackageId =
          conv.qualification.sessionPackage ??
          (size === "pequeño"
            ? "una_hora"
            : size === "mediano"
              ? "corta"
              : size === "grande"
                ? "estandar"
                : "larga");

        const emailSlug = conv.contactName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ".")
          .replace(/^\.|\.$/g, "");

        const { appointmentId } = get().createBookingRequest({
          name: conv.contactName,
          email: `${emailSlug || "lead"}@whatsapp.lead`,
          phone: conv.phone,
          artistId: artist.id,
          style,
          zone,
          size,
          description: `Lead de WhatsApp. Tags: ${conv.tags.join(", ") || "—"}.`,
          sessionPackage,
          budget: conv.qualification.budget,
        });

        set((s) => ({
          conversations: s.conversations.map((item) =>
            item.id === conversationId
              ? {
                  ...item,
                  convertedAppointmentId: appointmentId,
                  tags: Array.from(new Set([...item.tags, "convertido"])),
                  temperature: "listo",
                }
              : item,
          ),
        }));

        return { ok: true, appointmentId };
      },

      setCrmBotConfig: (patch) => {
        set((s) => ({
          crmBotConfig: { ...s.crmBotConfig, ...patch },
        }));
        void fetch("/api/whatsapp/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(() => undefined);
      },

      mergeWhatsAppConversations: (items) => {
        set((s) => {
          const demo = s.conversations.filter((c) => c.source !== "whatsapp");
          const waById = new Map(
            s.conversations
              .filter((c) => c.source === "whatsapp")
              .map((c) => [c.id, c]),
          );
          for (const item of items) {
            waById.set(item.id, item);
          }
          const merged = [...waById.values(), ...demo].sort(
            (a, b) =>
              new Date(b.lastMessageAt).getTime() -
              new Date(a.lastMessageAt).getTime(),
          );
          return { conversations: merged };
        });
      },

      syncWhatsAppFromServer: async () => {
        try {
          const statusRes = await fetch("/api/whatsapp/status");
          if (!statusRes.ok) return;
          const status = (await statusRes.json()) as {
            configured?: boolean;
          };
          if (!status.configured) {
            set({ whatsappConnected: false });
            return;
          }
          set({ whatsappConnected: true });

          const [convRes, settingsRes] = await Promise.all([
            fetch("/api/whatsapp/conversations"),
            fetch("/api/whatsapp/settings"),
          ]);

          if (convRes.ok) {
            const data = (await convRes.json()) as {
              conversations?: WhatsAppConversation[];
            };
            if (data.conversations) {
              get().mergeWhatsAppConversations(data.conversations);
            }
          }

          if (settingsRes.ok) {
            const data = (await settingsRes.json()) as {
              botConfig?: CrmBotConfig;
            };
            if (data.botConfig) {
              set({
                crmBotConfig: {
                  ...DEFAULT_CRM_BOT_CONFIG,
                  ...get().crmBotConfig,
                  ...data.botConfig,
                  replyMode:
                    data.botConfig.replyMode === "gemini"
                      ? "hybrid"
                      : data.botConfig.replyMode,
                },
              });
            }
          }
        } catch (error) {
          console.error("WhatsApp sync failed", error);
        }
      },

      syncVerificationsFromServer: async () => {
        try {
          const remoteUsers = await fetchVerificationUsersFromServer();
          if (!remoteUsers.length) return;

          const local = get().users;
          const merged = mergeUsers(local, remoteUsers);

          if (JSON.stringify(merged) === JSON.stringify(local)) return;
          set({ users: merged });
        } catch (error) {
          console.error("Verification sync failed", error);
        }
      },
    }),
    {
      name: CARIZO_STORE_KEY,
      version: 16,
      partialize: (state) => {
        // Sesión por pestaña (sessionStorage). No compartirla entre admin y postor.
        const {
          sessionUserId: _ignoredSession,
          hydrated: _ignoredHydrated,
          ...rest
        } = state;
        return rest;
      },
      migrate: (persisted) => {
        // Solo datos persistidos (sin acciones del store).
        const state = (persisted ?? {}) as Partial<typeof initialState>;
        const users = mergeUsersWithSeedPasswords(
          state.users?.length ? state.users : seedUsers,
        );
        const conversations = (state.conversations?.length
          ? state.conversations
          : seedConversations
        ).map((conv) => ({
          ...conv,
          referenceStatus: conv.referenceStatus ?? "sin_referencia",
        }));
        // Zustand tipa migrate como CarrizoState completo; solo devolvemos datos.
        return {
          ...initialState,
          ...state,
          studio: seedStudio,
          artists: mergeMarketplaceArtists(state.artists),
          portfolio: mergePortfolio(state.portfolio),
          auctions: state.auctions?.length ? state.auctions : seedAuctions,
          auctionRoomKicks: state.auctionRoomKicks ?? [],
          marketplaceListings: mergeMarketplaceListings(state.marketplaceListings),
          marketplaceOrders: state.marketplaceOrders?.length
            ? state.marketplaceOrders
            : seedMarketplaceOrders,
          artistSaleContracts: normalizeArtistSaleContracts(
            state.artistSaleContracts ?? seedArtistSaleContracts,
          ),
          conversations,
          crmBotConfig: {
            ...DEFAULT_CRM_BOT_CONFIG,
            ...state.crmBotConfig,
          },
          whatsappConnected: state.whatsappConnected ?? false,
          users,
          sessionUserId: null,
          consentPreferences: state.consentPreferences ?? initialState.consentPreferences,
          marketingEvents: state.marketingEvents ?? [],
        } as CarrizoState;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.studio = seedStudio;
        state.artists = mergeMarketplaceArtists(state.artists);
        state.portfolio = mergePortfolio(state.portfolio);
        if (!state.auctions?.length) state.auctions = seedAuctions;
        if (!state.auctionRoomKicks) state.auctionRoomKicks = [];
        state.sessionUserId = readTabSessionUserId();
        // Si hay una subasta real en vivo, cierra el demo seed para no taparla en admin.
        const hasCustomLive = state.auctions.some(
          (item) =>
            item.id !== "auction-live-1" &&
            item.status !== "cancelada" &&
            item.status !== "finalizada" &&
            new Date(item.endsAt).getTime() > Date.now(),
        );
        if (hasCustomLive) {
          state.auctions = state.auctions.map((item) =>
            item.id === "auction-live-1" && item.status === "en_vivo"
              ? { ...item, status: "finalizada" as const }
              : item,
          );
        }
        state.marketplaceListings = mergeMarketplaceListings(state.marketplaceListings);
        if (!state.marketplaceOrders?.length) {
          state.marketplaceOrders = seedMarketplaceOrders;
        }
        if (!state.artistSaleContracts?.length) {
          state.artistSaleContracts = seedArtistSaleContracts;
        }
        state.artistSaleContracts = normalizeArtistSaleContracts(state.artistSaleContracts);
        if (!state.conversations?.length) {
          state.conversations = seedConversations;
        } else {
          state.conversations = state.conversations.map((conv) => ({
            ...conv,
            referenceStatus: conv.referenceStatus ?? "sin_referencia",
          }));
        }
        if (!state.users?.length) {
          state.users = seedUsers;
        } else {
          state.users = mergeUsersWithSeedPasswords(state.users);
        }
        state.crmBotConfig = {
          ...DEFAULT_CRM_BOT_CONFIG,
          ...state.crmBotConfig,
        };
        state.whatsappConnected = state.whatsappConnected ?? false;
      },
    },
  ),
  );
}

const CARRIZO_STORE_GLOBAL = "__carrizo_zustand_singleton__";

type CarrizoHook = ReturnType<typeof createCarrizoStore>;

function getCarrizoStore(): CarrizoHook {
  const globalRef = globalThis as typeof globalThis & {
    [CARRIZO_STORE_GLOBAL]?: CarrizoHook;
  };
  if (!globalRef[CARRIZO_STORE_GLOBAL]) {
    globalRef[CARRIZO_STORE_GLOBAL] = createCarrizoStore();
  }
  return globalRef[CARRIZO_STORE_GLOBAL];
}

export const useCarrizo = getCarrizoStore();
