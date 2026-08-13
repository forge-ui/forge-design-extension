import { createElement } from 'react';

export function usePathname() {
  return '/';
}

export function useRouter() {
  return { push() {}, replace() {}, back() {} };
}

export function Link({ href = '#', children, className, prefetch, replace, scroll, shallow, locale, ...props }) {
  return createElement('a', { href, className, ...props }, children);
}

export default Link;
