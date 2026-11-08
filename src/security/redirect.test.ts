import { describe, expect, it } from 'vitest';
import { ALLOWED_REDIRECT_PATHS, DEFAULT_REDIRECT, safeRedirect } from './redirect.js';

describe('safeRedirect', () => {
  it('SEC-53 safeRedirect', () => {
    expect(DEFAULT_REDIRECT).toBe('/account');
    // Lo que se conserva.
    expect(safeRedirect('/account')).toBe('/account');
    expect(safeRedirect('/account?tab=resume')).toBe('/account?tab=resume');
    expect(safeRedirect('/jobs?q=diesel&zip=75201')).toBe('/jobs?q=diesel&zip=75201');
    // El fragmento se descarta.
    expect(safeRedirect('/account#x')).toBe('/account');
    // Los casos de 02 §4.9 y las variantes codificadas.
    const peligrosos = [
      'https://evil.example',
      'http://evil.example/account',
      '//evil.example',
      '//evil.example/account',
      '/\\evil.example',
      '\\\\evil.example',
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'data:text/html,hola',
      '/%2F%2Fevil.example',
      '/%5Cevil.example',
      '/%5C%5Cevil.example',
      '\t/account',
      ' /account',
      '\n/account',
      '/acc\nount',
      '/account\r\nSet-Cookie: x=1',
      '/account/../panel',
      '/account/..',
      '/accountx',
      '/account/',
      '/Account',
      '/panel',
      '/jobs/../admin',
      '/áccount',
      'account',
      '',
      '/',
      '/.',
      '/..',
      `/${'a'.repeat(2048)}`,
    ];
    for (const valor of peligrosos) {
      expect(safeRedirect(valor), JSON.stringify(valor)).toBe('/account');
    }
    // Lo que no es texto cae al valor por defecto.
    for (const valor of [undefined, null, 42, ['/account'], { toString: () => '/account' }]) {
      expect(safeRedirect(valor), String(valor)).toBe('/account');
    }
    // Fallback y lista propios.
    expect(safeRedirect('//evil.example', '/jobs')).toBe('/jobs');
    expect(safeRedirect('/account', '/jobs', new Set(['/jobs']))).toBe('/jobs');
    expect(ALLOWED_REDIRECT_PATHS.has('/account')).toBe(true);
  });
});
