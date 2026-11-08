// Empleos inventados para el mockup. Reglas:
// - Oficios de la lista Trade y equipos de la lista Equipment, nunca a mano
//   (la prueba "mockup: todo oficio y equipo de los datos existe en el
//   vocabulario" lo vigila).
// - Empresas inventadas, salvo LaTrae Consulting Group.
// - ZIP y ciudades reales. Ninguna persona real.
// - Los roles de LaTrae muestran la empresa real con etiqueta de rol alojado;
//   nunca "Confidential employer".

import type { MockJob, PublicJobView } from './types.js';

export const LATRAE = 'LaTrae Consulting Group';

const latraeJobs: PublicJobView[] = [
  {
    slug: 'diesel-technician-charlotte-nc',
    title: 'Diesel Technician',
    companyName: LATRAE,
    hostedRole: true,
    city: 'Charlotte',
    state: 'NC',
    zip: '28206',
    employmentType: 'Full-time',
    trade: 'Diesel technician',
    equipment: ['Class 8 tractors', 'Medium duty trucks'],
    payRange: '$28–$36 / hr',
    postedAt: '2026-10-28',
    featured: false,
    summary:
      'Diagnose and repair Class 8 tractors and medium duty trucks at a busy fleet shop. Second shift differential available.',
  },
  {
    slug: 'generator-technician-atlanta-ga',
    title: 'Generator Technician',
    companyName: LATRAE,
    hostedRole: true,
    city: 'Atlanta',
    state: 'GA',
    zip: '30318',
    employmentType: 'Full-time',
    trade: 'Generator technician',
    equipment: ['Standby generators', 'Automatic transfer switches'],
    payRange: '$30–$40 / hr',
    postedAt: '2026-10-26',
    featured: true,
    summary:
      'Service and load-bank standby generator sets and transfer switches across metro Atlanta. Company truck provided.',
  },
  {
    slug: 'heavy-equipment-technician-dallas-tx',
    title: 'Heavy Equipment Technician — Field',
    companyName: LATRAE,
    hostedRole: true,
    city: 'Dallas',
    state: 'TX',
    zip: '75247',
    employmentType: 'Full-time',
    trade: 'Heavy equipment technician',
    equipment: ['Excavators', 'Wheel loaders', 'Dozers'],
    postedAt: '2026-10-24',
    featured: false,
    summary:
      'Field repairs on excavators, loaders and dozers for construction customers in the Dallas–Fort Worth area.',
  },
  {
    slug: 'trailer-technician-memphis-tn',
    title: 'Trailer Technician',
    companyName: LATRAE,
    hostedRole: true,
    city: 'Memphis',
    state: 'TN',
    zip: '38118',
    employmentType: 'Full-time',
    trade: 'Trailer technician',
    equipment: ['Dry van trailers', 'Refrigerated trailers'],
    payRange: '$24–$30 / hr',
    postedAt: '2026-10-21',
    featured: false,
    summary:
      'Inspect and repair dry van and refrigerated trailers. DOT inspection experience is a plus.',
  },
];

const aggregatedJobs: PublicJobView[] = [
  {
    slug: 'mobile-crane-technician-houston-tx',
    title: 'Mobile Crane Technician',
    companyName: 'Ironline Crane & Rigging',
    hostedRole: false,
    city: 'Houston',
    state: 'TX',
    zip: '77041',
    employmentType: 'Full-time',
    trade: 'Crane technician',
    equipment: ['Mobile cranes', 'Boom lifts'],
    postedAt: '2026-10-27',
    featured: true,
    applyUrl: 'https://example.com/careers/mobile-crane-technician',
    summary:
      'Maintain and troubleshoot a fleet of mobile cranes and boom lifts out of the northwest Houston yard.',
  },
  {
    slug: 'fleet-diesel-mechanic-columbus-oh',
    title: 'Fleet Diesel Mechanic',
    companyName: 'Redhawk Fleet Services',
    hostedRole: false,
    city: 'Columbus',
    state: 'OH',
    zip: '43228',
    employmentType: 'Full-time',
    trade: 'Diesel technician',
    equipment: ['Medium duty trucks', 'Light duty trucks'],
    postedAt: '2026-10-25',
    featured: false,
    applyUrl: 'https://example.com/careers/fleet-diesel-mechanic',
    summary: 'Keep a mixed delivery fleet of medium and light duty trucks on the road.',
  },
  {
    slug: 'shop-technician-phoenix-az',
    title: 'Shop Technician — Power Generation',
    companyName: 'Bluestem Power Systems',
    hostedRole: false,
    city: 'Phoenix',
    state: 'AZ',
    zip: '85009',
    employmentType: 'Full-time',
    trade: 'Shop technician',
    equipment: ['Mobile generators', 'Air compressors'],
    postedAt: '2026-10-22',
    featured: false,
    applyUrl: 'https://example.com/careers/shop-technician',
    summary: 'Shop-based service of mobile generators and air compressors for a rental fleet.',
  },
];

function newestFirst(jobs: PublicJobView[]): PublicJobView[] {
  return [...jobs].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

// Job Board como sale en el Sprint 1: solo LaTrae, los más recientes primero, sin filtros.
export const sprint1Jobs: PublicJobView[] = newestFirst(latraeJobs);

// Job Board completo: destacados arriba (los marca el staff en 3B; los compra
// un empleador en el Sprint 4), luego el resto, los más recientes primero.
export const allJobs: MockJob[] = [
  ...newestFirst([...latraeJobs, ...aggregatedJobs].filter((j) => j.featured)),
  ...newestFirst([...latraeJobs, ...aggregatedJobs].filter((j) => !j.featured)),
].map((job) => ({ job, sprint: job.hostedRole ? '1' : '3B' }));

export function findJob(slug: string): PublicJobView {
  const job = [...latraeJobs, ...aggregatedJobs].find((j) => j.slug === slug);
  if (!job) throw new Error(`No existe el empleo inventado "${slug}"`);
  return job;
}
