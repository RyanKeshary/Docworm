'use client';

import React, { useEffect, useTransition } from 'react';
import NextLink from 'next/link';
import {
  useRouter as useNextRouter,
  usePathname as useNextPathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from 'next/navigation';

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to?: string;
  href?: string;
  replace?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Link({ to, href, replace, children, className, ...rest }: LinkProps) {
  const target = to || href || '#';
  return (
    <NextLink href={target} replace={replace} prefetch={true} className={className} {...rest}>
      {children}
    </NextLink>
  );
}

export interface NavLinkProps extends Omit<LinkProps, 'className'> {
  end?: boolean;
  className?: string | ((props: { isActive: boolean }) => string);
}

export function NavLink({ to, href, end, className, children, ...rest }: NavLinkProps) {
  const pathname = useNextPathname();
  const target = to || href || '#';
  const isActive = end
    ? pathname === target
    : pathname === target || (target !== '/' && pathname.startsWith(target));

  const computedClassName = typeof className === 'function' ? className({ isActive }) : className;

  return (
    <NextLink href={target} prefetch={true} className={computedClassName} {...rest}>
      {children}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useNextRouter();
  const [, startTransition] = useTransition();

  return (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === 'number') {
      if (to === -1) {
        window.history.back();
      } else {
        window.history.go(to);
      }
      return;
    }

    startTransition(() => {
      if (options?.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    });
  };
}

export function useLocation() {
  const pathname = useNextPathname() || '/';
  const searchParams = useNextSearchParams();
  const search = searchParams ? `?${searchParams.toString()}` : '';

  return {
    pathname,
    search,
    hash: typeof window !== 'undefined' ? window.location.hash : '',
    state: null,
    key: 'default',
  };
}

export function useParams<T extends Record<string, string | string[]> = Record<string, string>>(): T {
  const params = useNextParams();
  return (params || {}) as T;
}

export function useSearchParams(): [
  URLSearchParams,
  (
    params:
      | URLSearchParams
      | Record<string, string>
      | ((prev: URLSearchParams) => URLSearchParams | Record<string, string>)
  ) => void,
] {
  const nextSearchParams = useNextSearchParams();
  const router = useNextRouter();
  const pathname = useNextPathname();

  const currentParams = React.useMemo(() => {
    return new URLSearchParams(nextSearchParams?.toString() || '');
  }, [nextSearchParams]);

  const setSearchParams = React.useCallback(
    (
      newParams:
        | URLSearchParams
        | Record<string, string>
        | ((prev: URLSearchParams) => URLSearchParams | Record<string, string>)
    ) => {
      const resolved =
        typeof newParams === 'function' ? newParams(new URLSearchParams(nextSearchParams?.toString() || '')) : newParams;
      const q = new URLSearchParams(resolved as any).toString();
      router.replace(`${pathname}${q ? `?${q}` : ''}`);
    },
    [router, pathname, nextSearchParams]
  );

  return [currentParams, setSearchParams];
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useNextRouter();
  useEffect(() => {
    if (replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [router, to, replace]);

  return null;
}
