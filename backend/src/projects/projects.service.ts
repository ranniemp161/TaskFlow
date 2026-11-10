import { BadRequestException, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { projects } from '../database/schema';
import { matchesDatabaseError } from '../database/matches-database-error';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(input: CreateProjectDto) {
    try {
      const [project] = await this.databaseService.db
        .insert(projects)
        .values(input)
        .returning();
      return project;
    } catch (error) {
      if (
        matchesDatabaseError(error, '23503', 'projects_owner_id_users_id_fk')
      ) {
        throw new BadRequestException(
          'ownerId must reference an existing user',
        );
      }
      throw error;
    }
  }

  findAll(query: ListProjectsQueryDto) {
    return this.databaseService.db
      .select()
      .from(projects)
      .where(query.ownerId ? eq(projects.ownerId, query.ownerId) : undefined)
      .orderBy(asc(projects.createdAt), asc(projects.id))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);
  }
}
