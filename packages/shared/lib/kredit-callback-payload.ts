/**
 * Builds the Kredit status callback payload.
 * Document URLs and document_images are only included when result === "approved".
 * Rejected or non-completed callbacks exclude all document URL fields.
 */

export interface SessionLike {
  id: string;
  client_id: string;
  ref_id: string;
  status: string;
  result: string | null;
  reject_message: string | null;
  document_name: string;
  document_number: string;
  document_type: string;
  metadata: Record<string, unknown> | null;
  s3_front_document: string | null;
  s3_back_document: string | null;
  s3_face_image: string | null;
  s3_best_frame: string | null;
}

export interface PresignedUrls {
  front_document?: string;
  back_document?: string;
  face_image?: string;
  best_frame?: string;
}

export interface BuildPayloadOptions {
  presigned?: PresignedUrls;
  adminBaseUrl?: string;
  timestamp?: string;
}

/**
 * Build Kredit callback payload from session data.
 * Document URLs and document_images only when event is kyc.session.completed and result is approved.
 */
export function buildKreditCallbackPayload(
  session: SessionLike,
  options: BuildPayloadOptions = {}
): Record<string, unknown> {
  const { presigned = {}, adminBaseUrl, timestamp = new Date().toISOString() } = options;

  let eventType = "kyc.session.updated";
  switch (session.status) {
    case "pending":
      eventType = "kyc.session.started";
      break;
    case "processing":
      eventType = "kyc.session.processing";
      break;
    case "completed":
      eventType = "kyc.session.completed";
      break;
    case "expired":
      eventType = "kyc.session.expired";
      break;
  }

  const metadata = (session.metadata || {}) as Record<string, unknown>;

  // Normalize director_id from metadata (accept director_id or directorId from Kredit)
  const directorId =
    (metadata.director_id as string) ?? (metadata.directorId as string) ?? undefined;

  const isApproved =
    eventType === "kyc.session.completed" && session.result === "approved";

  let icFrontUrl: string | undefined;
  let icBackUrl: string | undefined;
  let selfieUrl: string | undefined;
  let verificationDetailUrl: string | undefined;
  const documentImages: Record<string, { url: string }> = {};

  if (isApproved) {
    const docType = session.document_type || "1";
    if (presigned.front_document) {
      icFrontUrl = presigned.front_document;
      documentImages[docType === "2" ? "DIRECTOR_PASSPORT" : "DIRECTOR_IC_FRONT"] = {
        url: presigned.front_document,
      };
    }
    if (presigned.back_document && docType === "1") {
      icBackUrl = presigned.back_document;
      documentImages["DIRECTOR_IC_BACK"] = { url: presigned.back_document };
    }
    const selfie = presigned.best_frame || presigned.face_image;
    if (selfie) {
      selfieUrl = selfie;
      documentImages["SELFIE_LIVENESS"] = { url: selfie };
    }

    if (adminBaseUrl?.trim() && session.client_id) {
      verificationDetailUrl = `${adminBaseUrl.replace(/\/$/, "")}/clients/${session.client_id}`;
    }
  }

  return {
    event: eventType,
    session_id: session.id,
    ref_id: session.ref_id,
    status: session.status,
    result: session.result,
    reject_message: session.reject_message,
    document_name: session.document_name,
    document_number: session.document_number,
    tenant_id: metadata.tenant_id ?? null,
    borrower_id: metadata.borrower_id ?? null,
    metadata: session.metadata,
    timestamp,
    ...(directorId && { director_id: directorId }),
    ...(isApproved && icFrontUrl && { ic_front_url: icFrontUrl }),
    ...(isApproved && icBackUrl && { ic_back_url: icBackUrl }),
    ...(isApproved && selfieUrl && { selfie_url: selfieUrl }),
    ...(isApproved && verificationDetailUrl && { verification_detail_url: verificationDetailUrl }),
    ...(isApproved && Object.keys(documentImages).length > 0 && { document_images: documentImages }),
  };
}
