import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F8FC] p-4 text-center">
      <h1 className="text-5xl font-extrabold text-[#263445]">404</h1>
      <p className="text-base text-[#64748B] mt-2">Page Not Found</p>
      <p className="text-xs text-[#64748B] mt-1 max-w-sm">The institutional page you requested could not be located.</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center px-4 py-2 rounded-lg bg-[#3975B7] text-white font-medium text-sm hover:bg-[#2F639B] transition-colors shadow-xs"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
