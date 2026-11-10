import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PgDialect } from 'drizzle-orm/pg-core';
import request from 'supertest';
import { DatabaseModule } from './database/database.module';
import { DatabaseService } from './database/database.service';
import { users, projects, tasks } from './database/schema';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';

describe('User, project, and task creation workflow', () => {
  let app: INestApplication;
  const ownerId = 'c0d4952d-9fe5-4659-9694-72979113f747';
  const projectId = '7b7632f8-1229-4cba-85d1-1877af6be99b';
  const taskId = '039c4135-b8a1-42ee-83b0-a546caf90d17';
  const returning = jest.fn();
  const values = jest.fn((_input: unknown) => ({ returning }));
  const offset = jest.fn();
  const limit = jest.fn((_value: number) => ({ offset }));
  const orderBy = jest.fn(() => ({ limit }));
  const where = jest.fn((_condition: unknown) => ({ orderBy }));
  const from = jest.fn(() => ({ where, orderBy }));
  const db = {
    insert: jest.fn((_table: unknown) => ({ values })),
    select: jest.fn(() => ({ from })),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [DatabaseModule, UsersModule, ProjectsModule, TasksModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({ db })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    returning.mockReset();
    offset.mockResolvedValue([]);
  });
  afterAll(async () => {
    await app.close();
  });

  it('creates an owner, their project, then a task using returned IDs', async () => {
    returning.mockResolvedValueOnce([
      { id: ownerId, name: 'Rannie', email: 'rannie@example.com' },
    ]);
    const owner = await request(app.getHttpServer())
      .post('/users')
      .send({ name: ' Rannie ', email: ' rannie@example.com ' })
      .expect(201);
    expect(db.insert).toHaveBeenLastCalledWith(users);
    expect(values).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Rannie', email: 'rannie@example.com' }),
    );

    returning.mockResolvedValueOnce([
      { id: projectId, name: 'TaskFlow', ownerId },
    ]);
    const project = await request(app.getHttpServer())
      .post('/projects')
      .send({ name: ' TaskFlow ', ownerId: owner.body.id })
      .expect(201);
    expect(db.insert).toHaveBeenLastCalledWith(projects);
    expect(values).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'TaskFlow', ownerId }),
    );

    returning.mockResolvedValueOnce([
      { id: taskId, title: 'First task', projectId },
    ]);
    await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'First task', projectId: project.body.id })
      .expect(201);
    expect(db.insert).toHaveBeenLastCalledWith(tasks);
    expect(values).toHaveBeenLastCalledWith(
      expect.objectContaining({ projectId }),
    );
  });

  it.each([
    ['/users', {}],
    ['/users', { name: ' ', email: 'person@example.com' }],
    ['/users', { name: 'Person', email: 'bad' }],
    ['/users', { name: null, email: 'person@example.com' }],
    ['/users', { name: 'Person', email: 'person@example.com', admin: true }],
    ['/projects', {}],
    ['/projects', { name: ' ', ownerId }],
    ['/projects', { name: 'Project', ownerId: 'bad' }],
    ['/projects', { name: 'Project', ownerId: null }],
    ['/projects', { name: 'Project', ownerId, description: 42 }],
    ['/projects', { name: 'Project', ownerId, unexpected: true }],
  ])(
    'rejects invalid %s body %j before database access',
    async (path, body) => {
      await request(app.getHttpServer())
        .post(path as string)
        .send(body)
        .expect(400);
      expect(db.insert).not.toHaveBeenCalled();
    },
  );

  it('returns 409 for an existing email without exposing database details', async () => {
    returning.mockRejectedValue(
      new Error('sensitive SQL', {
        cause: {
          code: '23505',
          constraint: 'users_email_unique',
        },
      }),
    );
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Person', email: 'person@example.com' })
      .expect(409);
    expect(response.body.message).toBe('A user with this email already exists');
  });

  it('returns 400 when a project owner does not exist', async () => {
    returning.mockRejectedValue({
      code: '23503',
      constraint: 'projects_owner_id_users_id_fk',
    });
    const response = await request(app.getHttpServer())
      .post('/projects')
      .send({ name: 'Project', ownerId })
      .expect(400);
    expect(response.body.message).toBe(
      'ownerId must reference an existing user',
    );
  });

  it.each(['/users', '/projects'])(
    'lists %s with default pagination',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(200).expect([]);
      expect(limit).toHaveBeenCalledWith(20);
      expect(offset).toHaveBeenCalledWith(0);
      if (path === '/projects') expect(where).toHaveBeenCalledWith(undefined);
    },
  );

  it('filters projects by owner and paginates the result', async () => {
    offset.mockResolvedValue([{ id: projectId, ownerId }]);
    await request(app.getHttpServer())
      .get('/projects')
      .query({ ownerId, page: 3, limit: 5 })
      .expect(200)
      .expect([{ id: projectId, ownerId }]);
    expect(limit).toHaveBeenCalledWith(5);
    expect(offset).toHaveBeenCalledWith(10);
    const sql = new PgDialect().sqlToQuery(
      where.mock.calls[0][0] as Parameters<PgDialect['sqlToQuery']>[0],
    );
    expect(sql.sql).toBe('"projects"."owner_id" = $1');
    expect(sql.params).toEqual([ownerId]);
  });

  it.each([
    '/users?page=0',
    '/users?limit=101',
    '/users?page=abc',
    '/projects?limit=0',
    '/projects?page=1.5',
    '/projects?ownerId=bad',
  ])('rejects invalid list query %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(400);
    expect(db.select).not.toHaveBeenCalled();
  });
});
