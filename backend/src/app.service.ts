import { Injectable } from "@nestjs/common";
import { DatabaseService } from "./database/database.service";

@Injectable()
export class AppService {
  constructor(private readonly databaseService: DatabaseService) { }

  getHello(): string {
    return "Hello World!";
  }

  async getDatabaseHealth(): Promise<{ status: "ok" }> {
    await this.databaseService.checkConnection();

    return { status: "ok" };
  }
}