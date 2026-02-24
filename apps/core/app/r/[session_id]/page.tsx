import Image from "next/image";
import Link from "next/link";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function KycRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ session_id: string }>;
  searchParams: SearchParams;
}) {
  const { session_id } = await params;
  const query = await searchParams;
  
  // Innovatif may pass status info in query params
  const status = query.status as string | undefined;
  const result = query.result as string | undefined;
  
  // Determine display state
  const isSuccess = status === "2" || result === "1" || result === "approved";
  const isFailed = result === "0" || result === "rejected";
  const isPending = !isSuccess && !isFailed;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 py-12">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/logo-light.png"
          alt="TrueStack"
          width={180}
          height={48}
          priority
        />
      </div>

      {/* Status Card */}
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center shadow-lg">
        {/* Status Icon */}
        <div className="mb-6">
          {isSuccess ? (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-10 w-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          ) : isFailed ? (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-10 w-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          ) : (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
              <svg
                className="h-10 w-10 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Status Text */}
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">
          {isSuccess
            ? "Verification Complete"
            : isFailed
            ? "Verification Failed"
            : "Verification in Progress"}
        </h1>

        <p className="mb-6 text-gray-600">
          {isSuccess
            ? "Your identity has been successfully verified. You may now close this window."
            : isFailed
            ? "Unfortunately, we were unable to verify your identity. Please contact support for assistance."
            : "Your verification is being processed. You will receive a notification once complete."}
        </p>

        {/* Session ID */}
        <div className="mb-6 rounded-lg bg-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Session Reference</p>
          <p className="font-mono text-sm text-gray-700">{session_id}</p>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          {isSuccess ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              <span className="mr-2 h-2 w-2 rounded-full bg-green-600"></span>
              Approved
            </span>
          ) : isFailed ? (
            <span className="inline-flex items-center rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
              <span className="mr-2 h-2 w-2 rounded-full bg-red-600"></span>
              Rejected
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-indigo-600"></span>
              Processing
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Powered by{" "}
          <Link href="https://truestack.my" className="text-indigo-600 hover:text-indigo-500">
            TrueStack
          </Link>
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Secure identity verification for Malaysia
        </p>
      </div>
    </div>
  );
}
