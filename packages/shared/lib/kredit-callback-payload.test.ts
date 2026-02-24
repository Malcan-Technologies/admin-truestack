import { describe, it, expect } from "vitest";
import { buildKreditCallbackPayload, type SessionLike } from "./kredit-callback-payload";

const baseSession: SessionLike = {
  id: "session-123",
  client_id: "client-456",
  ref_id: "ref-789",
  status: "completed",
  result: "approved",
  reject_message: null,
  document_name: "John Doe",
  document_number: "A12345678",
  document_type: "1",
  metadata: { tenant_id: "t1", borrower_id: "b1" },
  s3_front_document: "key/front.jpg",
  s3_back_document: "key/back.jpg",
  s3_face_image: "key/face.jpg",
  s3_best_frame: "key/best.jpg",
};

describe("buildKreditCallbackPayload", () => {
  it("includes director_id when metadata has director_id", () => {
    const session = {
      ...baseSession,
      metadata: { ...baseSession.metadata, director_id: "dir-abc" },
    };
    const payload = buildKreditCallbackPayload(session, { timestamp: "2025-02-18T12:00:00.000Z" });
    expect(payload.director_id).toBe("dir-abc");
  });

  it("normalizes directorId to director_id when metadata has directorId", () => {
    const session = {
      ...baseSession,
      metadata: { ...baseSession.metadata, directorId: "dir-xyz" },
    };
    const payload = buildKreditCallbackPayload(session, { timestamp: "2025-02-18T12:00:00.000Z" });
    expect(payload.director_id).toBe("dir-xyz");
  });

  it("prefers director_id over directorId when both present", () => {
    const session = {
      ...baseSession,
      metadata: { ...baseSession.metadata, director_id: "dir-prefer", directorId: "dir-ignore" },
    };
    const payload = buildKreditCallbackPayload(session, { timestamp: "2025-02-18T12:00:00.000Z" });
    expect(payload.director_id).toBe("dir-prefer");
  });

  it("omits director_id when not in metadata", () => {
    const payload = buildKreditCallbackPayload(baseSession, { timestamp: "2025-02-18T12:00:00.000Z" });
    expect(payload).not.toHaveProperty("director_id");
  });

  it("includes ic_front_url, ic_back_url, selfie_url, document_images for approved with presigned URLs", () => {
    const presigned = {
      front_document: "https://s3.../front.jpg",
      back_document: "https://s3.../back.jpg",
      best_frame: "https://s3.../best.jpg",
    };
    const payload = buildKreditCallbackPayload(baseSession, {
      presigned,
      adminBaseUrl: "https://admin.example.com",
      timestamp: "2025-02-18T12:00:00.000Z",
    });
    expect(payload.ic_front_url).toBe("https://s3.../front.jpg");
    expect(payload.ic_back_url).toBe("https://s3.../back.jpg");
    expect(payload.selfie_url).toBe("https://s3.../best.jpg");
    expect(payload.verification_detail_url).toBe("https://admin.example.com/clients/client-456");
    expect(payload.document_images).toEqual({
      DIRECTOR_IC_FRONT: { url: "https://s3.../front.jpg" },
      DIRECTOR_IC_BACK: { url: "https://s3.../back.jpg" },
      SELFIE_LIVENESS: { url: "https://s3.../best.jpg" },
    });
  });

  it("excludes all document URL fields for rejected", () => {
    const session = {
      ...baseSession,
      status: "completed",
      result: "rejected",
      reject_message: "Document verification failed",
    };
    const presigned = {
      front_document: "https://s3.../front.jpg",
      back_document: "https://s3.../back.jpg",
      best_frame: "https://s3.../best.jpg",
    };
    const payload = buildKreditCallbackPayload(session, {
      presigned,
      adminBaseUrl: "https://admin.example.com",
      timestamp: "2025-02-18T12:00:00.000Z",
    });
    expect(payload.result).toBe("rejected");
    expect(payload).not.toHaveProperty("ic_front_url");
    expect(payload).not.toHaveProperty("ic_back_url");
    expect(payload).not.toHaveProperty("selfie_url");
    expect(payload).not.toHaveProperty("verification_detail_url");
    expect(payload).not.toHaveProperty("document_images");
  });

  it("excludes all document URL fields for non-completed (e.g. processing)", () => {
    const session = {
      ...baseSession,
      status: "processing",
      result: null,
    };
    const presigned = {
      front_document: "https://s3.../front.jpg",
    };
    const payload = buildKreditCallbackPayload(session, {
      presigned,
      adminBaseUrl: "https://admin.example.com",
      timestamp: "2025-02-18T12:00:00.000Z",
    });
    expect(payload.event).toBe("kyc.session.processing");
    expect(payload).not.toHaveProperty("ic_front_url");
    expect(payload).not.toHaveProperty("ic_back_url");
    expect(payload).not.toHaveProperty("selfie_url");
    expect(payload).not.toHaveProperty("verification_detail_url");
    expect(payload).not.toHaveProperty("document_images");
  });

  it("omits verification_detail_url when adminBaseUrl is not set", () => {
    const presigned = { front_document: "https://s3.../front.jpg" };
    const payload = buildKreditCallbackPayload(baseSession, {
      presigned,
      timestamp: "2025-02-18T12:00:00.000Z",
    });
    expect(payload.ic_front_url).toBeDefined();
    expect(payload).not.toHaveProperty("verification_detail_url");
  });

  it("uses DIRECTOR_PASSPORT for document_type 2", () => {
    const session = { ...baseSession, document_type: "2" };
    const presigned = { front_document: "https://s3.../passport.jpg" };
    const payload = buildKreditCallbackPayload(session, {
      presigned,
      timestamp: "2025-02-18T12:00:00.000Z",
    });
    expect(payload.document_images).toEqual({
      DIRECTOR_PASSPORT: { url: "https://s3.../passport.jpg" },
    });
    expect(payload).not.toHaveProperty("ic_back_url");
  });

  it("strips trailing slash from adminBaseUrl", () => {
    const presigned = { front_document: "https://s3.../front.jpg" };
    const payload = buildKreditCallbackPayload(baseSession, {
      presigned,
      adminBaseUrl: "https://admin.example.com/",
      timestamp: "2025-02-18T12:00:00.000Z",
    });
    expect(payload.verification_detail_url).toBe("https://admin.example.com/clients/client-456");
  });
});
