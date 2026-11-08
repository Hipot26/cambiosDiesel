// SEC-87: activa el hook de gitleaks. Con ignore-scripts=true (SEC-84) no corre al instalar:
// se ejecuta a mano una vez por clon con `npm run prepare`.
// Si gitleaks no responde, falla sin tocar la configuración de git (no queda activado a medias).
import { execFileSync } from 'node:child_process';

let version;
try {
  version = execFileSync('gitleaks', ['version'], { encoding: 'utf8' }).trim();
} catch {
  console.error(
    'gitleaks no está instalado o no está en el PATH, así que el hook no se activó.\n' +
      'Windows: winget install Gitleaks.Gitleaks (abrir una terminal nueva después).\n' +
      'Ubuntu o macOS: binario de la release de GitHub o brew install gitleaks.',
  );
  process.exit(1);
}

execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
console.log(`Hook de gitleaks activado: gitleaks ${version}, core.hooksPath = .githooks`);
