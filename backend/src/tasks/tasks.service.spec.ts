import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PgDialect } from 'drizzle-orm/pg-core';
import { DatabaseService } from '../database/database.service';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  const task = {
    id: 'c0d4952d-9fe5-4659-9694-72979113f747',
    title: 'First task',
  };
  const returning = jest.fn();
  const offset = jest.fn();
  const limit = jest.fn((_limit: number) => ({ offset }));
  const orderBy = jest.fn((_sort: Parameters<PgDialect['sqlToQuery']>[0]) => ({
    limit,
  }));
  const where = jest.fn();
  const values = jest.fn((_input: unknown) => ({ returning }));
  const set = jest.fn((_input: unknown) => ({ where }));
  const from = jest.fn(() => ({ where }));
  const db = {
    insert: jest.fn(() => ({ values })),
    select: jest.fn(() => ({ from })),
    update: jest.fn(() => ({ set })),
    delete: jest.fn(() => ({ where })),
  };
  const dialect = new PgDialect();

  beforeEach(async () => {
    jest.clearAllMocks();
    where.mockReturnValue({ returning, orderBy });
    returning.mockResolvedValue([task]);
    offset.mockResolvedValue([task]);
    const module = await Test.createTestingModule({
      providers: [TasksService, { provide: DatabaseService, useValue: { db } }],
    }).compile();
    service = module.get(TasksService);
  });

  it('creates a task and returns the stored record', async () => {
    const input = { title: task.title, projectId: task.id };
    await expect(service.create(input)).resolves.toEqual(task);
    expect(values).toHaveBeenCalledWith(input);
  });

  it('retrieves the task matching the supplied ID', async () => {
    where.mockResolvedValue([task]);
    await expect(service.findOne(task.id)).resolves.toEqual(task);
    const predicate = dialect.sqlToQuery(where.mock.calls[0][0]);
    expect(predicate.sql).toBe('"tasks"."id" = $1');
    expect(predicate.params).toEqual([task.id]);
  });

  it('updates supplied fields and refreshes updatedAt', async () => {
    const updated = { ...task, title: 'Updated' };
    returning.mockResolvedValue([updated]);
    await expect(
      service.update(task.id, { title: 'Updated' }),
    ).resolves.toEqual(updated);
    expect(set).toHaveBeenCalledWith({
      title: 'Updated',
      updatedAt: expect.any(Date),
    });
    expect(dialect.sqlToQuery(where.mock.calls[0][0]).params).toEqual([
      task.id,
    ]);
  });

  it('deletes the requested task', async () => {
    await expect(service.remove(task.id)).resolves.toEqual(task);
    expect(dialect.sqlToQuery(where.mock.calls[0][0]).params).toEqual([
      task.id,
    ]);
  });

  it.each(['findOne', 'update', 'remove'] as const)(
    '%s reports missing records',
    async (operation) => {
      returning.mockResolvedValue([]);
      if (operation === 'findOne') where.mockResolvedValue([]);
      const result =
        operation === 'update'
          ? service.update(task.id, { title: 'Updated' })
          : service[operation](task.id);
      await expect(result).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('lists the first 20 tasks newest first by default', async () => {
    await expect(service.findAll(new ListTasksQueryDto())).resolves.toEqual([
      task,
    ]);
    expect(where).toHaveBeenCalledWith(undefined);
    expect(limit).toHaveBeenCalledWith(20);
    expect(offset).toHaveBeenCalledWith(0);
    expect(dialect.sqlToQuery(orderBy.mock.calls[0][0]).sql).toBe(
      '"tasks"."created_at" desc',
    );
  });

  it('applies status filtering, sorting, and pagination', async () => {
    await service.findAll({
      page: 3,
      limit: 5,
      status: 'done',
      sortBy: 'title',
      order: 'asc',
    });
    const predicate = dialect.sqlToQuery(where.mock.calls[0][0]);
    expect(predicate.sql).toBe('"tasks"."status" = $1');
    expect(predicate.params).toEqual(['done']);
    expect(dialect.sqlToQuery(orderBy.mock.calls[0][0]).sql).toBe(
      '"tasks"."title" asc',
    );
    expect(limit).toHaveBeenCalledWith(5);
    expect(offset).toHaveBeenCalledWith(10);
  });

  it.each([
    ['create', 'tasks_project_id_projects_id_fk', 'projectId'],
    ['create', 'tasks_assignee_id_users_id_fk', 'assigneeId'],
    ['update', 'tasks_assignee_id_users_id_fk', 'assigneeId'],
  ] as const)(
    'maps %s reference failure for %s to HTTP 400',
    async (operation, constraint, field) => {
      // Drizzle may wrap the original Neon error as its cause.
      const cause = Object.assign(new Error('sensitive database detail'), {
        code: '23503',
        constraint,
      });
      returning.mockRejectedValue(new Error('query failed', { cause }));
      const result =
        operation === 'create'
          ? service.create({
              title: task.title,
              projectId: task.id,
              assigneeId: task.id,
            })
          : service.update(task.id, { assigneeId: task.id });
      await expect(result).rejects.toMatchObject({
        status: 400,
        message: `${field} must reference an existing ${field === 'projectId' ? 'project' : 'user'}`,
      });
    },
  );

  it('also handles an unwrapped Neon reference error', async () => {
    returning.mockRejectedValue({
      code: '23503',
      constraint: 'tasks_project_id_projects_id_fk',
    });
    await expect(
      service.create({ title: task.title, projectId: task.id }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    { code: '23503', constraint: 'unknown_constraint' },
    { code: '08006', constraint: 'tasks_project_id_projects_id_fk' },
  ])('preserves unrelated database errors %j', async (error) => {
    returning.mockRejectedValue(error);
    await expect(service.update(task.id, { title: 'Updated' })).rejects.toBe(
      error,
    );
  });

  it('passes explicit nulls through to clear optional fields', async () => {
    await service.update(task.id, { description: null, assigneeId: null });
    expect(set).toHaveBeenCalledWith({
      description: null,
      assigneeId: null,
      updatedAt: expect.any(Date),
    });
  });

  it('combines project and status filters without including other projects', async () => {
    await service.findAll({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      order: 'desc',
      projectId: task.id,
      status: 'todo',
    });
    const predicate = dialect.sqlToQuery(where.mock.calls[0][0]);
    expect(predicate.sql).toBe(
      '("tasks"."status" = $1 and "tasks"."project_id" = $2)',
    );
    expect(predicate.params).toEqual(['todo', task.id]);
  });

  it('propagates database failures', async () => {
    returning.mockRejectedValue(new Error('Database unavailable'));
    await expect(
      service.create({ title: task.title, projectId: task.id }),
    ).rejects.toThrow('Database unavailable');
  });
});
