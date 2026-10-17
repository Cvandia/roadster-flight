import {sqliteTable,text,integer,real,index} from 'drizzle-orm/sqlite-core';
export const runs=sqliteTable('flight_runs',{
 id:text('id').primaryKey(),playerId:text('player_id').notNull(),createdAt:integer('created_at').notNull(),claimed:integer('claimed').notNull().default(0)
},t=>[index('runs_player_created').on(t.playerId,t.createdAt)]);
export const scores=sqliteTable('flight_scores',{
 id:text('id').primaryKey(),ruleset:text('ruleset'),playerId:text('player_id').notNull(),name:text('name').notNull(),distance:real('distance').notNull(),dx:real('dx').notNull(),dz:real('dz').notNull(),frames:integer('frames').notNull(),createdAt:integer('created_at').notNull()
},t=>[index('scores_distance').on(t.distance),index('scores_player').on(t.playerId)]);
