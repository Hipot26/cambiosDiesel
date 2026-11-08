// Centroides de ZIP del Census (03 §1.10 y §8.3; 01 decisión 28). Sin datos personales.
import { char, index, pgTable, text } from 'drizzle-orm/pg-core';
import { geometryPoint4326 } from './types.js';

export const zipCentroids = pgTable(
  'zip_centroids',
  {
    zip: char('zip', { length: 5 }).primaryKey(),
    location: geometryPoint4326('location').notNull(),
    state: char('state', { length: 2 }),
    sourceVersion: text('source_version'),
  },
  (t) => [index('zip_centroids_location_idx').using('gist', t.location)],
);
