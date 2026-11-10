import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

@Injectable()
export class DatabaseService {
    readonly db: NeonHttpDatabase<typeof schema>;

    constructor(configService: ConfigService) {
        const databaseUrl = configService.getOrThrow<string>("DATABASE_URL");

        this.db = drizzle({
            client: neon(databaseUrl),
            schema,
        });
    }

    async checkConnection(): Promise<void> {
        await this.db.execute(sql`SELECT 1`);
    }
}