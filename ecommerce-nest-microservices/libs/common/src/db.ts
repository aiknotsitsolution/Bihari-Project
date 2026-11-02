import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CreateDateColumn,
  DataSource,
  DataSourceOptions,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';

/** Postgres returns NUMERIC as string – convert to number. */
export const numericTransformer: ValueTransformer = {
  to: (v?: number) => v,
  from: (v?: string | null) => (v === null || v === undefined ? v : parseFloat(v)),
};

export abstract class AppBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/**
 * Uses a database per service locally, or a separate schema per service when DATABASE_URL is set.
 * `dbEnvKey` e.g. AUTH_DB, `defaultDb` e.g. auth_db.
 */
export function postgresRoot(dbEnvKey: string, defaultDb: string, entities: any[]) {
  return TypeOrmModule.forRootAsync({
    inject: [ConfigService],
    dataSourceFactory: async (options?: DataSourceOptions) => {
      if (!options) {
        throw new Error('TypeORM options were not provided for database initialization.');
      }
      if (options.type !== 'postgres') {
        throw new Error(`Unsupported database type: ${options.type}`);
      }

      const schema = options.schema ?? 'public';
      const dataSource = new DataSource({ ...options, synchronize: false });
      await dataSource.initialize();

      try {
        if (options.url) {
          const quotedSchema = `"${String(schema).replace(/"/g, '""')}"`;
          await dataSource.query(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`);
        }

        if (options.synchronize) await dataSource.synchronize();
        return dataSource;
      } catch (error) {
        await dataSource.destroy();
        throw error;
      }
    },
    useFactory: (c: ConfigService) => {
      const databaseUrl = c.get<string>('DATABASE_URL');
      const schema = defaultDb;

      return {
        type: 'postgres' as const,
        ...(databaseUrl
          ? { url: databaseUrl, schema }
          : {
              host: c.get<string>('DB_HOST', 'localhost'),
              port: Number(c.get('DB_PORT', 5432)),
              username: c.get<string>('DB_USER', 'postgres'),
              password: c.get<string>('DB_PASSWORD', 'postgres'),
              database: c.get<string>(dbEnvKey, defaultDb),
            }),
        entities,
        // Retire idle clients before hosted PostgreSQL proxies close their sockets.
        extra: {
          keepAlive: true,
          keepAliveInitialDelayMillis: 10_000,
          idleTimeoutMillis: 30_000,
        },
        // Turn OFF in production and use migrations instead.
        synchronize: c.get('DB_SYNC', 'true') === 'true',
        logging: c.get('DB_LOGGING', 'false') === 'true',
      };
    },
  });
}

export function pageParams(page?: number, limit?: number, maxLimit = 100) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(maxLimit, Math.max(1, Number(limit) || 20));
  return { page: p, limit: l, skip: (p - 1) * l };
}

export function paged<T>(items: T[], total: number, page: number, limit: number) {
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export const percentOff = (mrp: number, selling: number) =>
  mrp > 0 ? Math.max(0, Math.round(((mrp - selling) / mrp) * 100)) : 0;

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
