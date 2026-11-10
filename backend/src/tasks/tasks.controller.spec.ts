import {
  INestApplication,
  BadRequestException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

describe('TasksController HTTP contract', () => {
  let app: INestApplication;
  const id = 'c0d4952d-9fe5-4659-9694-72979113f747';
  const task = { id, title: 'First task', projectId: id, status: 'todo' };
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
    // Match main.ts so these requests exercise production validation options.
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
    jest.resetAllMocks();
    service.create.mockResolvedValue(task);
    service.findAll.mockResolvedValue([task]);
    service.findOne.mockResolvedValue(task);
    service.update.mockResolvedValue({ ...task, status: 'done' });
    service.remove.mockResolvedValue(task);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a task with HTTP 201', async () => {
    const input = { title: task.title, projectId: id };
    await request(app.getHttpServer())
      .post('/tasks')
      .send(input)
      .expect(201)
      .expect(task);
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining(input));
  });

  it.each([
    {},
    { title: '', projectId: id },
    { title: 'Task', projectId: 'invalid' },
    { title: 'Task', projectId: id, unexpected: true },
    { title: 'Task', projectId: id, assigneeId: 'invalid' },
    { title: 'x'.repeat(256), projectId: id },
  ])('rejects invalid create input %j', async (body) => {
    await request(app.getHttpServer()).post('/tasks').send(body).expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('supplies default list options', async () => {
    await request(app.getHttpServer()).get('/tasks').expect(200).expect([task]);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'desc',
      }),
    );
  });

  it('transforms pagination strings and preserves filter options', async () => {
    await request(app.getHttpServer())
      .get('/tasks')
      .query({
        page: '2',
        limit: '5',
        status: 'done',
        sortBy: 'title',
        order: 'asc',
      })
      .expect(200);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 5,
        status: 'done',
        sortBy: 'title',
        order: 'asc',
      }),
    );
  });

  it.each([
    'page=0',
    'page=abc',
    'page=1.5',
    'limit=101',
    'limit=0',
    'status=invalid',
    'sortBy=invalid',
    'order=invalid',
    'projectId=not-a-uuid',
  ])('rejects invalid query %s', async (query) => {
    await request(app.getHttpServer()).get(`/tasks?${query}`).expect(400);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('retrieves a task by ID', async () => {
    await request(app.getHttpServer())
      .get(`/tasks/${id}`)
      .expect(200)
      .expect(task);
    expect(service.findOne).toHaveBeenCalledWith(id);
  });

  it('updates task status', async () => {
    await request(app.getHttpServer())
      .patch(`/tasks/${id}`)
      .send({ status: 'done' })
      .expect(200)
      .expect({ ...task, status: 'done' });
    expect(service.update).toHaveBeenCalledWith(
      id,
      expect.objectContaining({ status: 'done' }),
    );
  });

  it.each([
    { status: 'invalid' },
    { status: null },
    { title: null },
    { title: '' },
    { assigneeId: 'invalid' },
    { projectId: id },
  ])('rejects invalid update input %j', async (body) => {
    await request(app.getHttpServer())
      .patch(`/tasks/${id}`)
      .send(body)
      .expect(400);
    expect(service.update).not.toHaveBeenCalled();
  });

  it.each(['get', 'patch', 'delete'] as const)(
    'rejects malformed task IDs on %s',
    async (method) => {
      await request(app.getHttpServer())
        [method]('/tasks/not-a-uuid')
        .send({})
        .expect(400);
      expect(service.findOne).not.toHaveBeenCalled();
      expect(service.update).not.toHaveBeenCalled();
      expect(service.remove).not.toHaveBeenCalled();
    },
  );

  it('allows clearing nullable fields without requiring title or status', async () => {
    const input = { description: null, assigneeId: null };
    await request(app.getHttpServer())
      .patch(`/tasks/${id}`)
      .send(input)
      .expect(200);
    expect(service.update).toHaveBeenCalledWith(
      id,
      expect.objectContaining(input),
    );
  });

  it.each(['post', 'patch'] as const)(
    'returns a clear reference error on %s',
    async (method) => {
      const message = 'assigneeId must reference an existing user';
      const handler = method === 'post' ? service.create : service.update;
      handler.mockRejectedValue(new BadRequestException(message));
      const body =
        method === 'post'
          ? { title: task.title, projectId: id, assigneeId: id }
          : { assigneeId: id };
      const response = await request(app.getHttpServer())
        [method](method === 'post' ? '/tasks' : `/tasks/${id}`)
        .send(body)
        .expect(400);
      expect(response.body.message).toBe(message);
    },
  );

  it('deletes a task with HTTP 204 and no response body', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/tasks/${id}`)
      .expect(204);
    expect(response.text).toBe('');
    expect(service.remove).toHaveBeenCalledWith(id);
  });

  it.each(['get', 'patch', 'delete'] as const)(
    'returns 404 for a missing task on %s',
    async (method) => {
      const handler =
        method === 'get'
          ? service.findOne
          : method === 'patch'
            ? service.update
            : service.remove;
      handler.mockRejectedValue(new NotFoundException('Task not found'));
      await request(app.getHttpServer())
        [method](`/tasks/${id}`)
        .send({})
        .expect(404);
    },
  );
});
