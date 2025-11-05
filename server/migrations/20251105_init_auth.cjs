/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable('users', (t) => {
    t.bigIncrements('id').primary();
    t.string('email', 191).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.string('full_name', 191).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('roles', (t) => {
    t.bigIncrements('id').primary();
    t.string('name', 64).notNullable().unique();
    t.string('description', 191);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('user_roles', (t) => {
    t.bigInteger('user_id').unsigned().notNullable();
    t.bigInteger('role_id').unsigned().notNullable();
    t.primary(['user_id', 'role_id']);
    t.foreign('user_id').references('users.id').onDelete('CASCADE');
    t.foreign('role_id').references('roles.id').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('tokens', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE');
    t.string('token_hash', 255).notNullable().index(); // hashed refresh token
    t.string('type', 32).notNullable().defaultTo('refresh'); // future-proof for other types
    t.string('user_agent', 255);
    t.string('ip_address', 64);
    t.timestamp('expires_at').notNullable();
    t.timestamp('revoked_at');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('token_blacklist', (t) => {
    t.bigIncrements('id').primary();
    t.string('jti', 191).notNullable().unique(); // JWT ID for access tokens
    t.timestamp('expires_at').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // seed basic roles
  await knex('roles').insert([
    { name: 'admin', description: 'Administrator' },
    { name: 'editor', description: 'Editor' },
    { name: 'viewer', description: 'Viewer' },
  ]);
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('token_blacklist');
  await knex.schema.dropTableIfExists('tokens');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('users');
};


