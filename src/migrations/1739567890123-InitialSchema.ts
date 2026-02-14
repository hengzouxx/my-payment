import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1739567890123 implements MigrationInterface {
  name = 'InitialSchema1739567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "orders_status_enum" AS ENUM (
        'RECEIVED', 'SUBMITTED', 'PENDING', 'COMPLETED', 'FAILED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "order_history_status_enum" AS ENUM (
        'RECEIVED', 'SUBMITTED', 'PENDING', 'COMPLETED', 'FAILED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "idempotencyKey" character varying NOT NULL,
        "status" "orders_status_enum" NOT NULL DEFAULT 'RECEIVED',
        "providerOrderId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_orders_idempotencyKey" UNIQUE ("idempotencyKey"),
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "order_history" (
        "id" SERIAL NOT NULL,
        "status" "order_history_status_enum" NOT NULL,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        "orderId" uuid NOT NULL,
        CONSTRAINT "PK_order_history_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_history_orderId" FOREIGN KEY ("orderId")
          REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_order_history_orderId" ON "order_history" ("orderId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_order_history_orderId"`);
    await queryRunner.query(`DROP TABLE "order_history"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TYPE "order_history_status_enum"`);
    await queryRunner.query(`DROP TYPE "orders_status_enum"`);
  }
}
