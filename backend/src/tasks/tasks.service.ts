import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, asc, eq } from 'drizzle-orm';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { DatabaseService } from '../database/database.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { tasks } from '../database/schema';

@Injectable()
export class TasksService {
  constructor(private readonly databaseService: DatabaseService) {}
  // create task
  async create(createTaskDto: CreateTaskDto) {
    const [task] = await this.databaseService.db
      .insert(tasks)
      .values(createTaskDto)
      .returning()
      .catch((error: unknown) => this.handleWriteError(error));

    return task;
  }

  // find by id
  async findOne(id: string) {
    const [task] = await this.databaseService.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id));

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  // update task
  async update(id: string, updateTaskDto: UpdateTaskDto) {
    const [task] = await this.databaseService.db
      .update(tasks)
      .set({
        ...updateTaskDto,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning()
      .catch((error: unknown) => this.handleWriteError(error));

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }
  // Translate only known reference failures; preserve unrelated database errors.
  // The database checks references atomically, including concurrent deletion.
  private handleWriteError(error: unknown): never {
    let current = error;
    const seen = new Set<unknown>();
    while (
      typeof current === 'object' &&
      current !== null &&
      !seen.has(current)
    ) {
      seen.add(current);
      if (
        'code' in current &&
        current.code === '23503' &&
        'constraint' in current
      ) {
        if (current.constraint === 'tasks_project_id_projects_id_fk') {
          throw new BadRequestException(
            'projectId must reference an existing project',
          );
        }
        if (current.constraint === 'tasks_assignee_id_users_id_fk') {
          throw new BadRequestException(
            'assigneeId must reference an existing user',
          );
        }
      }
      current = 'cause' in current ? current.cause : undefined;
    }
    throw error;
  }

  // delete task
  async remove(id: string) {
    const [deletedTask] = await this.databaseService.db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning();

    if (!deletedTask) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return deletedTask;
  }

  // query taks:

  async findAll(query: ListTasksQueryDto) {
    const {
      page = 1,
      limit = 20,
      status,
      projectId,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const offset = (page - 1) * limit;

    const whereCondition = and(
      status ? eq(tasks.status, status) : undefined,
      projectId ? eq(tasks.projectId, projectId) : undefined,
    );

    const sortColumn = {
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      title: tasks.title,
    }[sortBy];

    const sortDirection = order === 'asc' ? asc(sortColumn) : desc(sortColumn);

    return this.databaseService.db
      .select()
      .from(tasks)
      .where(whereCondition)
      .orderBy(sortDirection, asc(tasks.id))
      .limit(limit)
      .offset(offset);
  }
}
