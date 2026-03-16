// import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// export const typeOrmConfig = (): TypeOrmModuleOptions => ({
//   type: 'postgres',
//   host: process.env.DB_HOST,
//   port: Number(process.env.DB_PORT),
//   username: process.env.DB_USERNAME,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   synchronize: process.env.DB_SYNCHRONIZE === 'false',
//   // logging: process.env.DB_LOGGING === 'true',
//   ssl: process.env.DB_SSL === 'true',
//   autoLoadEntities: true,
//   // synchronize: false, // IMPORTANT: false in production
//   migrations: ['dist/migrations/*.js'],
//   // entities: [Users]
// });

// import { TypeOrmModuleOptions } from '@nestjs/typeorm';
// export const typeOrmConfig = (): TypeOrmModuleOptions => {
//   return {
//     type: 'postgres',
//     host: 'db.myvjzmwnwwunbzwzwdso.supabase.co',
//     port: 5432,
//     username: 'postgres',
//     password: '#Ggnfy57h123456',
//     database: 'postgres',
//     synchronize: true,
//     ssl: { rejectUnauthorized: false },
//     autoLoadEntities: true,
//     extra: {
//       family: 4,  // 👈 force IPv4, fixes ENETUNREACH on Render
//     },
//   };
// };

import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig = (): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    url: 'postgresql://postgres:#Ggnfy57h123456@db.myvjzmwnwwunbzwzwdso.supabase.co:5432/postgres',
    synchronize: true,
    ssl: { rejectUnauthorized: false },
    autoLoadEntities: true,
    extra: {
      family: 4,  // force IPv4
    },
  };
};
