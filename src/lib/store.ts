"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  appointments as seedAppointments,
  artists as seedArtists,
  auctions as seedAuctions,
  clients as seedClients,
  consents as seedConsents,
  payments as seedPayments,
  portfolio as seedPortfolio,
  studio as seedStudio,
  verifiedUsers as seedUsers,
} from "./seed";
import { nextMinBid, resolveAuctionStatus, sortBids } from "./auction";
import { broadcastAuctionUpdate } from "./live-sync";
import { removePresence } from "./presence";
import { estimateQuote } from "./quote-engine";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from "./password";
import type {
  Appointment,
  Artist,
  BookingRequestInput,
  Client,
  ConsentForm,
  ConsentPreferences,
  CreateAuctionInput,
  DocumentType,
  MarketingEvent,
  Payment,
  PortfolioItem,
  Studio,
  TattooAuction,
  VerificationStatus,
  VerifiedUser,
} from "./types";

interface InkoraState {
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
  }) => Promise<{ ok: boolean; error?: string }>;
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
  createAuction: (input: CreateAuctionInput) => string;
  placeBid: (input: {
    auctionId: string;
    amount: number;
  }) => { ok: boolean; error?: string };
  syncAuctionStatuses: () => void;
  cancelAuction: (auctionId: string) => void;
  bumpAuctionViewers: (auctionId: string) => void;
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
  updateAppointmentStatus: (
    appointmentId: string,
    status: Appointment["status"],
  ) => void;
}

const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

function mergeUsersWithSeedPasswords(users: VerifiedUser[]): VerifiedUser[] {
  return users.map((user) => {
    if (user.passwordHash) return user;
    const seedMatch = seedUsers.find((seed) => seed.email === user.email);
    if (!seedMatch?.passwordHash) return user;
    return { ...user, passwordHash: seedMatch.passwordHash };
  });
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
  users: seedUsers,
  sessionUserId: null as string | null,
};

export const useInkora = create<InkoraState>()(
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
          users: seedUsers,
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
        const userId = uid("user");
        const user: VerifiedUser = {
          id: userId,
          name: input.name,
          email,
          phone: input.phone,
          rut: input.rut,
          documentType: input.documentType,
          passwordHash,
          verificationStatus: "pendiente_documento",
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          users: [user, ...s.users],
          sessionUserId: userId,
        }));
        broadcastAuctionUpdate();
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

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          return {
            ok: false,
            error: "Email o contraseña incorrectos.",
          };
        }

        set({ sessionUserId: user.id });
        broadcastAuctionUpdate();
        return { ok: true };
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
        set((s) => ({
          users: s.users.map((item) =>
            item.id === userId ? { ...item, passwordHash } : item,
          ),
        }));
        broadcastAuctionUpdate();
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
        set((s) => ({
          users: s.users.map((item) =>
            item.id === user.id ? { ...item, passwordHash } : item,
          ),
        }));
        broadcastAuctionUpdate();
        return { ok: true };
      },

      logoutUser: () => {
        const userId = get().sessionUserId;
        if (userId) removePresence(userId);
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
        set((s) => ({
          users: s.users.map((item) =>
            item.id === userId
              ? {
                  ...item,
                  verificationStatus: status,
                  reviewNote,
                  reviewedAt: new Date().toISOString(),
                  reviewedBy: "Equipo Inkora",
                }
              : item,
          ),
        }));
        broadcastAuctionUpdate();
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

        set((s) => ({ auctions: [auction, ...s.auctions] }));
        broadcastAuctionUpdate();
        return auctionId;
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
        if (user.verificationStatus === "rechazado") {
          return {
            ok: false,
            error:
              "Tu verificación fue rechazada. Sube un documento válido en Acceso para reintentar.",
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

        broadcastAuctionUpdate();
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

          if (
            status === auction.status &&
            !needsSort &&
            currentBid === auction.currentBid
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
              winnerName: leader?.bidderName,
              winnerPhone: leader?.bidderPhone,
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
        broadcastAuctionUpdate();
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

        const quote = estimateQuote({
          style: input.style,
          zone: input.zone,
          size: input.size,
          hourlyRate: artist.hourlyRate,
          depositPercent: state.studio.depositPercent,
        });

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
          references: [],
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
        const consentId = uid("consent");
        const consent: ConsentForm = {
          id: consentId,
          appointmentId,
          clientId: apt.clientId,
          clientName: client?.name ?? "Cliente",
          acceptedTerms: false,
          healthDeclaration: "",
        };

        set((s) => ({
          consents: [consent, ...s.consents],
          appointments: s.appointments.map((a) =>
            a.id === appointmentId ? { ...a, consentId } : a,
          ),
        }));

        return consentId;
      },

      updateAppointmentStatus: (appointmentId, status) => {
        set((s) => ({
          appointments: s.appointments.map((a) =>
            a.id === appointmentId ? { ...a, status } : a,
          ),
        }));
      },
    }),
    {
      name: "inkora-store-v6-password",
      version: 6,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<InkoraState>;
        const users = mergeUsersWithSeedPasswords(
          state.users?.length ? state.users : seedUsers,
        );
        return {
          ...initialState,
          ...state,
          studio: seedStudio,
          artists: seedArtists,
          portfolio: seedPortfolio,
          auctions: state.auctions?.length ? state.auctions : seedAuctions,
          users,
          sessionUserId: null,
          consentPreferences: state.consentPreferences ?? initialState.consentPreferences,
          marketingEvents: state.marketingEvents ?? [],
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.studio = seedStudio;
        state.artists = seedArtists;
        state.portfolio = seedPortfolio;
        if (!state.auctions?.length) state.auctions = seedAuctions;
        if (!state.users?.length) {
          state.users = seedUsers;
        } else {
          state.users = mergeUsersWithSeedPasswords(state.users);
        }
      },
    },
  ),
);
