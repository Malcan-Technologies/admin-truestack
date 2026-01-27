import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";

interface SessionData {
  id: string;
  status: string;
  result: string | null;
  success_url: string | null;
  fail_url: string | null;
}

export default async function RedirectPage({
  params,
}: {
  params: Promise<{ session_id: string }>;
}) {
  const { session_id } = await params;

  // Get session data
  const session = await queryOne<SessionData>(
    `SELECT id, status, result, success_url, fail_url 
     FROM kyc_session 
     WHERE id = $1`,
    [session_id]
  );

  // If session not found, show error page
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="max-w-md rounded-lg border border-slate-800 bg-slate-900/80 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg
              className="h-8 w-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">Session Not Found</h1>
          <p className="mt-2 text-slate-400">
            This verification session does not exist or has expired.
          </p>
        </div>
      </div>
    );
  }

  // Determine outcome and redirect URL
  const isSuccess = session.status === "completed" && session.result === "approved";
  const redirectUrl = isSuccess ? session.success_url : session.fail_url;

  // If redirect URL is configured, redirect
  if (redirectUrl) {
    // Append session_id and result to redirect URL
    const url = new URL(redirectUrl);
    url.searchParams.set("session_id", session_id);
    url.searchParams.set("status", session.status);
    if (session.result) {
      url.searchParams.set("result", session.result);
    }
    redirect(url.toString());
  }

  // Otherwise, show hosted result page
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="max-w-md rounded-lg border border-slate-800 bg-slate-900/80 p-8 text-center">
        {isSuccess ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <svg
                className="h-8 w-8 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white">Verification Successful</h1>
            <p className="mt-2 text-slate-400">
              Your identity has been verified successfully. You may close this window.
            </p>
          </>
        ) : session.status === "pending" || session.status === "processing" ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
              <svg
                className="h-8 w-8 animate-spin text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white">Verification In Progress</h1>
            <p className="mt-2 text-slate-400">
              Your verification is being processed. Please wait.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <svg
                className="h-8 w-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white">Verification Failed</h1>
            <p className="mt-2 text-slate-400">
              Unfortunately, your identity verification was unsuccessful. 
              Please contact support for assistance.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
