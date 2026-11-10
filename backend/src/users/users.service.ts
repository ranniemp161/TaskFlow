import { ConflictException, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { users } from '../database/schema';
import { matchesDatabaseError } from '../database/matches-database-error';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(input: CreateUserDto) {
    try {
      const [user] = await this.databaseService.db
        .insert(users)
        .values(input)
        .returning();
      return user;
    } catch (error) {
      if (matchesDatabaseError(error, '23505', 'users_email_unique')) {
        throw new ConflictException('A user with this email already exists');
      }
      throw error;
    }
  }

  findAll(query: PaginationQueryDto) {
    return this.databaseService.db
      .select()
      .from(users)
      .orderBy(asc(users.createdAt), asc(users.id))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);
  }
}
