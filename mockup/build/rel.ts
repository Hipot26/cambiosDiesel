// Enlaces relativos: cada página recibe el prefijo hasta la raíz del sitio
// estático, para que el mockup funcione detrás de cualquier servidor y en
// cualquier subcarpeta.

export function rootPrefix(path: string): string {
  const depth = path.split('/').filter(Boolean).length;
  return depth === 0 ? './' : '../'.repeat(depth);
}
